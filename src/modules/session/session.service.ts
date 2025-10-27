import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus, SessionState } from '../../entities/session.entity';
import { SessionEvent, SessionEventType } from '../../entities/session-event.entity';
import { Method } from '../../entities/method.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(SessionEvent)
    private sessionEventRepository: Repository<SessionEvent>,
  ) {}

  async getActiveSession(userId: number): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: {
        userId,
        status: SessionStatus.RUNNING,
      },
      relations: ['method'],
    });
  }

  async getPausedSession(userId: number): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: {
        userId,
        status: SessionStatus.PAUSED,
      },
      relations: ['method'],
    });
  }

  async createSession(userId: number, method: Method): Promise<Session> {
    const now = new Date();
    const phaseEndAt = new Date(now.getTime() + method.workDuration * 60 * 1000);

    const session = this.sessionRepository.create({
      userId,
      methodId: method.id,
      startAt: now,
      status: SessionStatus.RUNNING,
      state: SessionState.WORKING,
      currentCycleIndex: 0,
      phaseEndAt,
      totalFocusTimeSecs: 0,
      totalBreakTimeSecs: 0,
    });

    const savedSession = await this.sessionRepository.save(session);

    await this.addEvent(savedSession.id, SessionEventType.START, {
      methodName: method.name,
      workDuration: method.workDuration,
    });

    const createdSession = await this.sessionRepository.findOne({
      where: { id: savedSession.id },
      relations: ['method'],
    });
    if (!createdSession) {
      throw new Error('Session not found after creation');
    }
    return createdSession;
  }

  async pauseSession(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });

    if (!session || session.status !== SessionStatus.RUNNING) {
      throw new Error('Session is not running');
    }

    const now = new Date();
    const timeLeftSecs = Math.floor((session.phaseEndAt.getTime() - now.getTime()) / 1000);

    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.PAUSED,
      state: SessionState.PAUSED,
      timeLeftSecs: Math.max(0, timeLeftSecs),
    });

    await this.addEvent(sessionId, SessionEventType.PAUSE, {
      timeLeftSecs,
      previousState: session.state,
    });

    const pausedSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });
    if (!pausedSession) {
      throw new Error('Session not found after pause');
    }
    return pausedSession;
  }

  async resumeSession(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });

    if (!session || session.status !== SessionStatus.PAUSED) {
      throw new Error('Session is not paused');
    }

    const now = new Date();
    const phaseEndAt = new Date(now.getTime() + (session.timeLeftSecs || 0) * 1000);

    const previousState = session.state;
    let newState = SessionState.WORKING;
    if (previousState === SessionState.SHORT_BREAK) {
      newState = SessionState.SHORT_BREAK;
    } else if (previousState === SessionState.LONG_BREAK) {
      newState = SessionState.LONG_BREAK;
    }

    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.RUNNING,
      state: newState,
      phaseEndAt,
    });

    await this.addEvent(sessionId, SessionEventType.RESUME, {
      timeLeftSecs: session.timeLeftSecs,
    });

    const resumedSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });
    if (!resumedSession) {
      throw new Error('Session not found after resume');
    }
    return resumedSession;
  }

  async stopSession(sessionId: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });

    if (!session) {
      throw new Error('Session not found');
    }

    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.CANCELLED,
      endAt: new Date(),
    });

    await this.addEvent(sessionId, SessionEventType.STOP, {
      totalFocusTime: session.totalFocusTimeSecs,
      totalBreakTime: session.totalBreakTimeSecs,
      cyclesCompleted: session.currentCycleIndex,
    });

    const stoppedSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });
    if (!stoppedSession) {
      throw new Error('Session not found after stop');
    }
    return stoppedSession;
  }

  async completeSession(sessionId: number): Promise<Session> {
    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.COMPLETED,
      endAt: new Date(),
    });

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });
    if (!session) {
      throw new Error('Session not found');
    }

    await this.addEvent(sessionId, SessionEventType.COMPLETE, {
      totalFocusTime: session.totalFocusTimeSecs,
      totalBreakTime: session.totalBreakTimeSecs,
      cyclesCompleted: session.currentCycleIndex,
    });

    return session;
  }

  async changePhase(
    sessionId: number,
    newState: SessionState,
    duration: number,
    cycleIncrement: number = 0,
  ): Promise<Session> {
    const now = new Date();
    const phaseEndAt = new Date(now.getTime() + duration * 60 * 1000);

    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found');
    }

    const updates: any = {
      state: newState,
      phaseEndAt,
    };

    if (cycleIncrement > 0) {
      updates.currentCycleIndex = session.currentCycleIndex + cycleIncrement;
    }

    if (newState === SessionState.WORKING) {
      updates.totalBreakTimeSecs = session.totalBreakTimeSecs;
    } else {
      updates.totalFocusTimeSecs = session.totalFocusTimeSecs;
    }

    await this.sessionRepository.update(sessionId, updates);

    await this.addEvent(sessionId, SessionEventType.PHASE_CHANGE, {
      newState,
      duration,
      cycleIndex: session.currentCycleIndex + cycleIncrement,
    });

    const updatedSession = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['method'],
    });
    if (!updatedSession) {
      throw new Error('Session not found after update');
    }
    return updatedSession;
  }

  async updateSessionTime(sessionId: number, focusTimeSecs: number, breakTimeSecs: number) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) {
      throw new Error('Session not found');
    }
    await this.sessionRepository.update(sessionId, {
      totalFocusTimeSecs: session.totalFocusTimeSecs + focusTimeSecs,
      totalBreakTimeSecs: session.totalBreakTimeSecs + breakTimeSecs,
    });
  }

  async addEvent(sessionId: number, eventType: SessionEventType, metadata?: any): Promise<void> {
    const event = this.sessionEventRepository.create({
      sessionId,
      eventType,
      timestamp: new Date(),
      metadata,
    });
    await this.sessionEventRepository.save(event);
  }

  async getActiveSessions(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: [{ status: SessionStatus.RUNNING }, { status: SessionStatus.PAUSED }],
      relations: ['method', 'user'],
    });
  }

  async getUserSessions(userId: number, limit: number = 10): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId },
      relations: ['method'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
