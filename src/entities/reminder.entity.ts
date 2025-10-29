import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ReminderLog } from './reminder-log.entity';

export enum ReminderType {
  SCHEDULE = 'schedule', // Фиксированное время + дни недели
  INTERVAL = 'interval', // Каждые N минут
}

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.reminders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Тип напоминания: расписание или интервал
  @Column({
    type: 'enum',
    enum: ReminderType,
    default: ReminderType.SCHEDULE,
    name: 'reminder_type',
  })
  reminderType: ReminderType;

  // === Поля для SCHEDULE типа ===
  // Время в формате HH:mm (для schedule)
  @Column({ length: 5, nullable: true })
  time: string | null;

  // Дни недели: [0-6] где 0 = Воскресенье, 1 = Понедельник, и т.д. (для schedule)
  @Column({ type: 'json', nullable: true })
  days: number[] | null;

  // === Поля для INTERVAL типа ===
  // Интервал в минутах (для interval)
  @Column({ nullable: true, name: 'interval_minutes' })
  intervalMinutes: number | null;

  // Требуется ли подтверждение выполнения
  @Column({ default: true, name: 'require_confirmation' })
  requireConfirmation: boolean;

  // Активно ли напоминание
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Следующее запланированное время отправки
  @Column({ type: 'timestamp', nullable: true, name: 'next_scheduled_at' })
  nextScheduledAt: Date | null;

  @OneToMany(() => ReminderLog, (log) => log.reminder)
  logs: ReminderLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
