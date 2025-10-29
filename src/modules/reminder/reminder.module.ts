import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Reminder } from '../../entities/reminder.entity';
import { ReminderLog } from '../../entities/reminder-log.entity';
import { ReminderService } from './reminder.service';
import { ReminderProcessor } from './reminder.processor';
import { ReminderController } from './reminder.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder, ReminderLog]),
    BullModule.registerQueue({
      name: 'reminders',
    }),
  ],
  controllers: [ReminderController],
  providers: [ReminderService, ReminderProcessor],
  exports: [ReminderService],
})
export class ReminderModule {}
