import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { SessionService } from '../session/session.service';
import { NotificationService } from '../notification/notification.service';
import { StatsService } from '../stats/stats.service';
import { TimerService, PhaseEndJobData, WarningJobData } from './timer.service';
import { SessionState, SessionStatus } from '../../entities/session.entity';

@Processor('timers')
@Injectable()
export class TimerProcessor extends WorkerHost {
  constructor(
    private sessionService: SessionService,
    private notificationService: NotificationService,
    private statsService: StatsService,
    private timerService: TimerService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'phase-end':
        return this.handlePhaseEnd(job);
      case 'warning':
        return this.handleWarning(job);
      default:
        console.log(`Unknown job type: ${job.name}`);
    }
  }

  private async handlePhaseEnd(job: Job<PhaseEndJobData>) {
    const { sessionId, userId, chatId } = job.data;

    const session = await this.sessionService.getActiveSession(userId);
    if (!session || session.id !== sessionId) {
      console.log(`Session ${sessionId} not active anymore`);
      return;
    }

    const method = session.method;

    // Update time statistics
    if (session.state === SessionState.WORKING) {
      await this.sessionService.updateSessionTime(sessionId, method.workDuration * 60, 0);
    } else {
      const breakDuration =
        session.state === SessionState.LONG_BREAK
          ? method.longBreakDuration
          : method.shortBreakDuration;
      await this.sessionService.updateSessionTime(sessionId, 0, breakDuration * 60);
    }

    // Determine next phase
    if (session.state === SessionState.WORKING) {
      session.currentCycleIndex += 1;
      const isLongBreak = session.currentCycleIndex % method.cyclesBeforeLongBreak === 0;

      const newState = isLongBreak ? SessionState.LONG_BREAK : SessionState.SHORT_BREAK;
      const duration = isLongBreak ? method.longBreakDuration : method.shortBreakDuration;

      await this.sessionService.changePhase(sessionId, newState, duration, 1);
      await this.notificationService.sendBreakStart(chatId, duration, isLongBreak);

      const updatedSession = await this.sessionService.getActiveSession(userId);
      await this.timerService.startBreakPhase(updatedSession, method, isLongBreak);
    } else {
      // Break ended, start work or complete
      const updatedSession = await this.sessionService.getActiveSession(userId);

      if (method.autoContinue) {
        await this.sessionService.changePhase(sessionId, SessionState.WORKING, method.workDuration, 0);
        await this.notificationService.sendWorkStart(chatId, method.workDuration);

        const workSession = await this.sessionService.getActiveSession(userId);
        await this.timerService.startWorkPhase(workSession, method);
      } else {
        // Complete the session
        const completedSession = await this.sessionService.completeSession(sessionId);
        await this.statsService.updateStatisticsForSession(completedSession);

        const focusMin = Math.floor(completedSession.totalFocusTimeSecs / 60);
        const breakMin = Math.floor(completedSession.totalBreakTimeSecs / 60);

        await this.notificationService.sendCompleted(
          chatId,
          completedSession.currentCycleIndex,
          focusMin,
          breakMin,
        );
      }
    }
  }

  private async handleWarning(job: Job<WarningJobData>) {
    const { sessionId, chatId, phase, minutesLeft } = job.data;

    await this.notificationService.sendWarning(chatId, minutesLeft, phase);
  }
}
