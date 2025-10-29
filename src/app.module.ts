import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TelegrafModule } from 'nestjs-telegraf';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { UserModule } from './modules/user/user.module';
import { MethodModule } from './modules/method/method.module';
import { SessionModule } from './modules/session/session.module';
import { StatsModule } from './modules/stats/stats.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { TimerModule } from './modules/timer/timer.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReminderModule } from './modules/reminder/reminder.module';
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
      useFactory: (configService: ConfigService) => {
        const token = configService.get('TELEGRAM_BOT_TOKEN') || 'dummy-token';
        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

        const options: any = {
          token,
          middlewares: [
            // Добавляем простую session middleware
            (ctx: any, next: any) => {
              if (!ctx.session) {
                ctx.session = {};
              }
              return next();
            },
          ],
        };

        if (proxyUrl) {
          console.log(`Configuring Telegram bot with proxy: ${proxyUrl}`);
          // Pass agent at root level for Telegraf
          options.agent = new HttpsProxyAgent(proxyUrl);
          // Also try telegram property for compatibility
          options.telegram = {
            agent: new HttpsProxyAgent(proxyUrl),
          };
        }

        return options;
      },
      inject: [ConfigService],
    }),
    UserModule,
    MethodModule,
    SessionModule,
    StatsModule,
    TelegramModule,
    TimerModule,
    NotificationModule,
    ReminderModule,
  ],
})
export class AppModule {}
