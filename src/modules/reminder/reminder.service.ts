import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Reminder } from '../../entities/reminder.entity';
import { ReminderLog, ReminderLogStatus } from '../../entities/reminder-log.entity';
import { DateTime } from 'luxon';

export interface CreateReminderDto {
  userId: number;
  title: string;
  description?: string;
  time: string; // HH:mm
  days: number[]; // [0-6]
  requireConfirmation?: boolean;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  time?: string;
  days?: number[];
  requireConfirmation?: boolean;
  isActive?: boolean;
}

@Injectable()
export class ReminderService implements OnModuleInit {
  constructor(
    @InjectRepository(Reminder)
    private reminderRepository: Repository<Reminder>,
    @InjectRepository(ReminderLog)
    private reminderLogRepository: Repository<ReminderLog>,
    @InjectQueue('reminders')
    private reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    // При старте приложения восстанавливаем все активные напоминания
    await this.restoreActiveReminders();
  }

  async create(dto: CreateReminderDto): Promise<Reminder> {
    const reminder = this.reminderRepository.create({
      userId: dto.userId,
      title: dto.title,
      description: dto.description,
      time: dto.time,
      days: dto.days,
      requireConfirmation: dto.requireConfirmation ?? true,
      isActive: true,
    });

    const saved = await this.reminderRepository.save(reminder);
    await this.scheduleReminder(saved);
    return saved;
  }

  async findAllByUser(userId: number): Promise<Reminder[]> {
    return this.reminderRepository.find({
      where: { userId },
      order: { time: 'ASC' },
    });
  }

  async findById(id: number): Promise<Reminder | null> {
    return this.reminderRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async update(id: number, dto: UpdateReminderDto): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({ where: { id } });
    if (!reminder) {
      throw new Error('Reminder not found');
    }

    Object.assign(reminder, dto);
    const updated = await this.reminderRepository.save(reminder);

    // Пересоздаем расписание
    await this.cancelScheduledReminder(id);
    if (updated.isActive) {
      await this.scheduleReminder(updated);
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.cancelScheduledReminder(id);
    await this.reminderRepository.delete(id);
  }

  async toggleActive(id: number): Promise<Reminder> {
    const reminder = await this.reminderRepository.findOne({ where: { id } });
    if (!reminder) {
      throw new Error('Reminder not found');
    }

    reminder.isActive = !reminder.isActive;
    const updated = await this.reminderRepository.save(reminder);

    if (updated.isActive) {
      await this.scheduleReminder(updated);
    } else {
      await this.cancelScheduledReminder(id);
    }

    return updated;
  }

  private async scheduleReminder(reminder: Reminder): Promise<void> {
    const nextSchedule = this.calculateNextSchedule(reminder.time, reminder.days);
    if (!nextSchedule) return;

    reminder.nextScheduledAt = nextSchedule.toJSDate();
    await this.reminderRepository.save(reminder);

    // Создаем лог для будущего напоминания
    const log = this.reminderLogRepository.create({
      reminderId: reminder.id,
      scheduledAt: nextSchedule.toJSDate(),
      status: ReminderLogStatus.PENDING,
    });
    await this.reminderLogRepository.save(log);

    // Планируем задачу в очереди
    await this.reminderQueue.add(
      'send-reminder',
      {
        reminderId: reminder.id,
        logId: log.id,
      },
      {
        delay: nextSchedule.diff(DateTime.now()).milliseconds,
        jobId: `reminder-${reminder.id}`,
      },
    );
  }

  private async cancelScheduledReminder(reminderId: number): Promise<void> {
    // Удаляем запланированную задачу из очереди
    const jobId = `reminder-${reminderId}`;
    const job = await this.reminderQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  private calculateNextSchedule(
    time: string,
    days: number[],
  ): DateTime | null {
    if (!days || days.length === 0) return null;

    const [hours, minutes] = time.split(':').map(Number);
    const now = DateTime.now();

    // Проверяем сегодня
    let candidate = now.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    for (let i = 0; i < 8; i++) {
      // Проверяем максимум 7 дней вперед
      const checkDate = candidate.plus({ days: i });
      const dayOfWeek = checkDate.weekday === 7 ? 0 : checkDate.weekday; // Luxon: 7=Sunday, convert to 0

      if (days.includes(dayOfWeek) && checkDate > now) {
        return checkDate;
      }
    }

    return null;
  }

  async completeReminder(logId: number): Promise<void> {
    const log = await this.reminderLogRepository.findOne({ where: { id: logId } });
    if (!log) return;

    log.status = ReminderLogStatus.COMPLETED;
    log.completedAt = new Date();
    await this.reminderLogRepository.save(log);

    // Планируем следующее напоминание
    const reminder = await this.findById(log.reminderId);
    if (reminder && reminder.isActive) {
      await this.scheduleReminder(reminder);
    }
  }

  async postponeReminder(logId: number, minutes: number): Promise<void> {
    const log = await this.reminderLogRepository.findOne({
      where: { id: logId },
      relations: ['reminder'],
    });
    if (!log) return;

    const postponedUntil = DateTime.now().plus({ minutes }).toJSDate();
    log.status = ReminderLogStatus.POSTPONED;
    log.postponedUntil = postponedUntil;
    await this.reminderLogRepository.save(log);

    // Создаем новый лог для отложенного напоминания
    const newLog = this.reminderLogRepository.create({
      reminderId: log.reminderId,
      scheduledAt: postponedUntil,
      status: ReminderLogStatus.PENDING,
    });
    await this.reminderLogRepository.save(newLog);

    // Планируем отложенное напоминание
    await this.reminderQueue.add(
      'send-reminder',
      {
        reminderId: log.reminderId,
        logId: newLog.id,
      },
      {
        delay: minutes * 60 * 1000,
        jobId: `reminder-${log.reminderId}-postponed-${newLog.id}`,
      },
    );
  }

  async cancelReminder(logId: number): Promise<void> {
    const log = await this.reminderLogRepository.findOne({ where: { id: logId } });
    if (!log) return;

    log.status = ReminderLogStatus.CANCELLED;
    log.completedAt = new Date();
    await this.reminderLogRepository.save(log);

    // Планируем следующее напоминание
    const reminder = await this.findById(log.reminderId);
    if (reminder && reminder.isActive) {
      await this.scheduleReminder(reminder);
    }
  }

  async getReminderHistory(
    reminderId: number,
    limit: number = 10,
  ): Promise<ReminderLog[]> {
    return this.reminderLogRepository.find({
      where: { reminderId },
      order: { scheduledAt: 'DESC' },
      take: limit,
    });
  }

  async getUserStats(userId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    postponed: number;
    cancelled: number;
  }> {
    const reminders = await this.reminderRepository.find({ where: { userId } });
    const reminderIds = reminders.map((r) => r.id);

    const logs = await this.reminderLogRepository.find({
      where: { reminderId: In(reminderIds) },
    });

    return {
      total: reminders.length,
      active: reminders.filter((r) => r.isActive).length,
      completed: logs.filter((l) => l.status === ReminderLogStatus.COMPLETED).length,
      postponed: logs.filter((l) => l.status === ReminderLogStatus.POSTPONED).length,
      cancelled: logs.filter((l) => l.status === ReminderLogStatus.CANCELLED).length,
    };
  }

  private async restoreActiveReminders(): Promise<void> {
    console.log('Restoring active reminders...');

    const activeReminders = await this.reminderRepository.find({
      where: {
        isActive: true,
        nextScheduledAt: MoreThan(new Date()),
      },
    });

    for (const reminder of activeReminders) {
      // Проверяем, есть ли pending лог
      const pendingLog = await this.reminderLogRepository.findOne({
        where: {
          reminderId: reminder.id,
          status: ReminderLogStatus.PENDING,
          scheduledAt: MoreThan(new Date()),
        },
        order: { scheduledAt: 'ASC' },
      });

      if (pendingLog) {
        const delay = DateTime.fromJSDate(pendingLog.scheduledAt)
          .diff(DateTime.now())
          .milliseconds;

        if (delay > 0) {
          await this.reminderQueue.add(
            'send-reminder',
            {
              reminderId: reminder.id,
              logId: pendingLog.id,
            },
            {
              delay,
              jobId: `reminder-${reminder.id}`,
            },
          );
        }
      } else {
        // Если нет pending логов, пересоздаем расписание
        await this.scheduleReminder(reminder);
      }
    }

    console.log(`Restored ${activeReminders.length} active reminders`);
  }
}

// Helper import для getUserStats
import { In } from 'typeorm';
