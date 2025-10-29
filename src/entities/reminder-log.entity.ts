import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Reminder } from './reminder.entity';

export enum ReminderLogStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  POSTPONED = 'postponed',
  CANCELLED = 'cancelled',
}

@Entity('reminder_logs')
export class ReminderLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'reminder_id' })
  reminderId: number;

  @ManyToOne(() => Reminder, (reminder) => reminder.logs)
  @JoinColumn({ name: 'reminder_id' })
  reminder: Reminder;

  // Когда было запланировано напоминание
  @Column({ type: 'timestamp', name: 'scheduled_at' })
  scheduledAt: Date;

  // Когда было выполнено (если выполнено)
  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  // Статус выполнения
  @Column({
    type: 'enum',
    enum: ReminderLogStatus,
    default: ReminderLogStatus.PENDING,
  })
  status: ReminderLogStatus;

  // Если перенесено, до какого времени
  @Column({ type: 'timestamp', nullable: true, name: 'postponed_until' })
  postponedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
