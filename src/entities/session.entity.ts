import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Method } from './method.entity';
import { SessionEvent } from './session-event.entity';

export enum SessionStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum SessionState {
  WORKING = 'WORKING',
  SHORT_BREAK = 'SHORT_BREAK',
  LONG_BREAK = 'LONG_BREAK',
  PAUSED = 'PAUSED',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.sessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'method_id' })
  methodId: number;

  @ManyToOne(() => Method, (method) => method.sessions)
  @JoinColumn({ name: 'method_id' })
  method: Method;

  @Column({ name: 'start_at', type: 'timestamp' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.RUNNING,
  })
  status: SessionStatus;

  @Column({ name: 'current_cycle_index', default: 0 })
  currentCycleIndex: number;

  @Column({
    type: 'enum',
    enum: SessionState,
    default: SessionState.WORKING,
  })
  state: SessionState;

  @Column({ name: 'time_left_secs', nullable: true })
  timeLeftSecs: number;

  @Column({ name: 'phase_end_at', type: 'timestamp', nullable: true })
  phaseEndAt: Date;

  @Column({ name: 'total_focus_time_secs', default: 0 })
  totalFocusTimeSecs: number;

  @Column({ name: 'total_break_time_secs', default: 0 })
  totalBreakTimeSecs: number;

  @OneToMany(() => SessionEvent, (event) => event.session)
  events: SessionEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
