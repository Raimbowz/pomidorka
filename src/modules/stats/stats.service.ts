import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Statistic } from '../../entities/statistic.entity';
import { Session, SessionStatus } from '../../entities/session.entity';
import { DateTime } from 'luxon';

export interface StatsResult {
  totalFocusTimeSecs: number;
  totalBreakTimeSecs: number;
  sessionsCount: number;
  cyclesCompleted: number;
  averageCyclesPerSession: number;
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Statistic)
    private statisticRepository: Repository<Statistic>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  async updateStatisticsForSession(session: Session): Promise<void> {
    const date = DateTime.fromJSDate(session.startAt).toFormat('yyyy-MM-dd');

    let stat = await this.statisticRepository.findOne({
      where: {
        userId: session.userId,
        date: new Date(date),
      },
    });

    if (!stat) {
      stat = this.statisticRepository.create({
        userId: session.userId,
        date: new Date(date),
        totalFocusSecs: 0,
        totalBreakSecs: 0,
        sessionsCount: 0,
        cyclesCompleted: 0,
      });
    }

    stat.totalFocusSecs += session.totalFocusTimeSecs || 0;
    stat.totalBreakSecs += session.totalBreakTimeSecs || 0;
    stat.sessionsCount += 1;
    stat.cyclesCompleted += session.currentCycleIndex || 0;

    await this.statisticRepository.save(stat);
  }

  async getStatsForPeriod(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<StatsResult> {
    const stats = await this.statisticRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
    });

    const result: StatsResult = {
      totalFocusTimeSecs: 0,
      totalBreakTimeSecs: 0,
      sessionsCount: 0,
      cyclesCompleted: 0,
      averageCyclesPerSession: 0,
    };

    for (const stat of stats) {
      result.totalFocusTimeSecs += stat.totalFocusSecs;
      result.totalBreakTimeSecs += stat.totalBreakSecs;
      result.sessionsCount += stat.sessionsCount;
      result.cyclesCompleted += stat.cyclesCompleted;
    }

    if (result.sessionsCount > 0) {
      result.averageCyclesPerSession = Math.round(
        result.cyclesCompleted / result.sessionsCount,
      );
    }

    return result;
  }

  async getTodayStats(userId: number): Promise<StatsResult> {
    const today = DateTime.now().startOf('day').toJSDate();
    const tomorrow = DateTime.now().plus({ days: 1 }).startOf('day').toJSDate();
    return this.getStatsForPeriod(userId, today, tomorrow);
  }

  async getWeekStats(userId: number): Promise<StatsResult> {
    const weekStart = DateTime.now().startOf('week').toJSDate();
    const weekEnd = DateTime.now().endOf('week').toJSDate();
    return this.getStatsForPeriod(userId, weekStart, weekEnd);
  }

  async getMonthStats(userId: number): Promise<StatsResult> {
    const monthStart = DateTime.now().startOf('month').toJSDate();
    const monthEnd = DateTime.now().endOf('month').toJSDate();
    return this.getStatsForPeriod(userId, monthStart, monthEnd);
  }

  async getStatsByMethod(userId: number, methodId: number): Promise<StatsResult> {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        methodId,
        status: SessionStatus.COMPLETED,
      },
    });

    const result: StatsResult = {
      totalFocusTimeSecs: 0,
      totalBreakTimeSecs: 0,
      sessionsCount: sessions.length,
      cyclesCompleted: 0,
      averageCyclesPerSession: 0,
    };

    for (const session of sessions) {
      result.totalFocusTimeSecs += session.totalFocusTimeSecs || 0;
      result.totalBreakTimeSecs += session.totalBreakTimeSecs || 0;
      result.cyclesCompleted += session.currentCycleIndex || 0;
    }

    if (result.sessionsCount > 0) {
      result.averageCyclesPerSession = Math.round(
        result.cyclesCompleted / result.sessionsCount,
      );
    }

    return result;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} ч ${minutes} мин`;
    }
    return `${minutes} мин`;
  }
}
