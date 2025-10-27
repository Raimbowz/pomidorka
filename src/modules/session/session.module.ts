import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../../entities/session.entity';
import { SessionEvent } from '../../entities/session-event.entity';
import { SessionService } from './session.service';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionEvent])],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
