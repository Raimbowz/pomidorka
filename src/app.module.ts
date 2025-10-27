import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TelegrafModule } from 'nestjs-telegraf';
import { UserModule } from './modules/user/user.module';
import { MethodModule } from './modules/method/method.module';
import { SessionModule } from './modules/session/session.module';
import { StatsModule } from './modules/stats/stats.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TimerModule } from './modules/timer/timer.module';
import { NotificationModule } from './modules/notification/notification.module';
import typeormConfig from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => typeormConfig,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('TELEGRAM_BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
    UserModule,
    MethodModule,
    SessionModule,
    StatsModule,
    TelegramModule,
    TimerModule,
    NotificationModule,
  ],
})
export class AppModule {}
