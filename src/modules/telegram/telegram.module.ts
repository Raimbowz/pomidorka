import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { TelegramActions } from './telegram.actions';
import { ReminderCommands } from './reminder.commands';
import { ReminderActions } from './reminder.actions';
import { UserModule } from '../user/user.module';
import { MethodModule } from '../method/method.module';
import { SessionModule } from '../session/session.module';
import { StatsModule } from '../stats/stats.module';
import { TimerModule } from '../timer/timer.module';
import { NotificationModule } from '../notification/notification.module';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [
    UserModule,
    MethodModule,
    SessionModule,
    StatsModule,
    TimerModule,
    NotificationModule,
    ReminderModule,
  ],
  providers: [TelegramUpdate, TelegramActions, ReminderCommands, ReminderActions],
})
export class TelegramModule {}
