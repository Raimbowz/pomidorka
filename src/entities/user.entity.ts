import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Method } from './method.entity';
import { Session } from './session.entity';
import { Statistic } from './statistic.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, name: 'telegram_user_id', type: 'bigint' })
  telegramUserId: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({ type: 'json', nullable: true })
  settings: {
    enableWarnings?: boolean;
    soundEnabled?: boolean;
    workingHours?: { start: string; end: string };
    quietHours?: { start: string; end: string };
    language?: string;
  };

  @Column({ nullable: true, name: 'default_method_id' })
  defaultMethodId: number;

  @ManyToOne(() => Method, { nullable: true })
  @JoinColumn({ name: 'default_method_id' })
  defaultMethod: Method;

  @OneToMany(() => Method, (method) => method.user)
  customMethods: Method[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => Statistic, (statistic) => statistic.user)
  statistics: Statistic[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
