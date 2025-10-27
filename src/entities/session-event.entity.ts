import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';

export enum SessionEventType {
  START = 'START',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  PHASE_CHANGE = 'PHASE_CHANGE',
  WARNING = 'WARNING',
  STOP = 'STOP',
  COMPLETE = 'COMPLETE',
}

@Entity('session_events')
export class SessionEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @ManyToOne(() => Session, (session) => session.events)
  @JoinColumn({ name: 'session_id' })
  session: Session;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: SessionEventType,
    name: 'event_type',
  })
  eventType: SessionEventType;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
