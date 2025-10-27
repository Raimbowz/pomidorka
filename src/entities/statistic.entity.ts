import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('statistics')
@Index(['userId', 'date'], { unique: true })
export class Statistic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.statistics)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'total_focus_secs', default: 0 })
  totalFocusSecs: number;

  @Column({ name: 'total_break_secs', default: 0 })
  totalBreakSecs: number;

  @Column({ name: 'sessions_count', default: 0 })
  sessionsCount: number;

  @Column({ name: 'cycles_completed', default: 0 })
  cyclesCompleted: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
