import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SessionService } from '../session/session.service';
import { Session, SessionState } from '../../entities/session.entity';
import { Method } from '../../entities/method.entity';

export interface PhaseEndJobData {
  sessionId: number;
  userId: number;
  chatId: number;
}

export interface WarningJobData {
  sessionId: number;
  chatId: number;
  phase: string;
  minutesLeft: number;
}

@Injectable()
export class TimerService implements OnModuleInit {
  constructor(
    @InjectQueue('timers') private timerQueue: Queue,
    private sessionService: SessionService,
  ) {}

  async onModuleInit() {
    await this.restoreActiveSessions();
  }

  async schedulePhaseEnd(session: Session, delayMs: number) {
    const jobData: PhaseEndJobData = {
      sessionId: session.id,
      userId: session.userId,
      chatId: session.user.telegramUserId,
    };

    await this.timerQueue.add('phase-end', jobData, {
      delay: delayMs,
      jobId: `phase-end-${session.id}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async scheduleWarning(session: Session, method: Method, delayMs: number) {
    const jobData: WarningJobData = {
      sessionId: session.id,
      chatId: session.user.telegramUserId,
      phase: session.state,
      minutesLeft: method.warningBeforeEnd,
    };

    await this.timerQueue.add('warning', jobData, {
      delay: delayMs,
      jobId: `warning-${session.id}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async startWorkPhase(session: Session, method: Method) {
    const durationMs = method.workDuration * 60 * 1000;
    const warningMs = durationMs - method.warningBeforeEnd * 60 * 1000;

    await this.schedulePhaseEnd(session, durationMs);
    if (warningMs > 0) {
      await this.scheduleWarning(session, method, warningMs);
    }
  }

  async startBreakPhase(session: Session, method: Method, isLong: boolean) {
    const duration = isLong ? method.longBreakDuration : method.shortBreakDuration;
    const durationMs = duration * 60 * 1000;

    await this.schedulePhaseEnd(session, durationMs);
  }

  async cancelTimers(sessionId: number) {
    try {
      await this.timerQueue.remove(`phase-end-${sessionId}`);
    } catch (e) {
      // Job might not exist
    }
    try {
      await this.timerQueue.remove(`warning-${sessionId}`);
    } catch (e) {
      // Job might not exist
    }
  }

  async pauseTimers(sessionId: number) {
    await this.cancelTimers(sessionId);
  }

  async resumeTimers(session: Session, method: Method) {
    const timeLeftMs = session.timeLeftSecs * 1000;
    await this.schedulePhaseEnd(session, timeLeftMs);

    const warningMs = timeLeftMs - method.warningBeforeEnd * 60 * 1000;
    if (warningMs > 0) {
      await this.scheduleWarning(session, method, warningMs);
    }
  }

  private async restoreActiveSessions() {
    console.log('Restoring active sessions...');
    const activeSessions = await this.sessionService.getActiveSessions();

    for (const session of activeSessions) {
      if (!session.phaseEndAt) continue;

      const now = new Date();
      const timeLeft = session.phaseEndAt.getTime() - now.getTime();

      if (timeLeft <= 0) {
        console.log(`Session ${session.id} time already expired, processing...`);
        continue;
      }

      console.log(`Restoring session ${session.id}, time left: ${timeLeft}ms`);
      await this.schedulePhaseEnd(session, timeLeft);

      const warningTime =
        timeLeft - (session.method.warningBeforeEnd || 1) * 60 * 1000;
      if (warningTime > 0) {
        await this.scheduleWarning(session, session.method, warningTime);
      }
    }

    console.log(`Restored ${activeSessions.length} active sessions`);
  }
}
