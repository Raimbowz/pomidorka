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
import { Session } from './session.entity';

@Entity('methods')
export class Method {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.customMethods, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ name: 'work_duration', comment: 'Work duration in minutes' })
  workDuration: number;

  @Column({ name: 'short_break_duration', comment: 'Short break duration in minutes' })
  shortBreakDuration: number;

  @Column({ name: 'long_break_duration', comment: 'Long break duration in minutes' })
  longBreakDuration: number;

  @Column({ name: 'cycles_before_long_break', default: 4 })
  cyclesBeforeLongBreak: number;

  @Column({ name: 'auto_continue', default: false })
  autoContinue: boolean;

  @Column({ name: 'warning_before_end', default: 1, comment: 'Warning time in minutes' })
  warningBeforeEnd: number;

  @Column({ default: false, name: 'is_template' })
  isTemplate: boolean;

  @OneToMany(() => Session, (session) => session.method)
  sessions: Session[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
