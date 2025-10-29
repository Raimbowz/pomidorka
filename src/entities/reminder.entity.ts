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

  // Время в формате HH:mm
  @Column({ length: 5 })
  time: string;

  // Дни недели: [0-6] где 0 = Воскресенье, 1 = Понедельник, и т.д.
  @Column({ type: 'json' })
  days: number[];

  // Требуется ли подтверждение выполнения
  @Column({ default: true, name: 'require_confirmation' })
  requireConfirmation: boolean;

  // Активно ли напоминание
  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Следующее запланированное время отправки
  @Column({ type: 'timestamp', nullable: true, name: 'next_scheduled_at' })
  nextScheduledAt: Date;

  @OneToMany(() => ReminderLog, (log) => log.reminder)
  logs: ReminderLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
