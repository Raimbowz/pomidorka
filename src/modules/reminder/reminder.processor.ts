import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ReminderService } from './reminder.service';
import { Markup } from 'telegraf';

@Injectable()
@Processor('reminders')
export class ReminderProcessor extends WorkerHost {
  constructor(
    @InjectBot() private bot: Telegraf,
    private reminderService: ReminderService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'send-reminder') {
      await this.handleSendReminder(job.data);
    }
  }

  private async handleSendReminder(data: {
    reminderId: number;
    logId: number;
  }): Promise<void> {
    const reminder = await this.reminderService.findById(data.reminderId);
    if (!reminder) {
      console.log(`Reminder ${data.reminderId} not found`);
      return;
    }

    if (!reminder.isActive) {
      console.log(`Reminder ${data.reminderId} is not active`);
      return;
    }

    const user = reminder.user;
    const chatId = user.telegramUserId;

    let message = `⏰ ${reminder.title}`;
    if (reminder.description) {
      message += `\n\n${reminder.description}`;
    }

    try {
      if (reminder.requireConfirmation) {
        // Отправляем с кнопками действий
        await this.bot.telegram.sendMessage(chatId, message, {
          reply_markup: this.getReminderActionKeyboard(data.logId),
        });
      } else {
        // Просто отправляем напоминание без кнопок
        await this.bot.telegram.sendMessage(chatId, message);

        // Автоматически отмечаем как выполненное
        await this.reminderService.completeReminder(data.logId);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  private getReminderActionKeyboard(logId: number) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Выполнить', `reminder:complete:${logId}`),
        Markup.button.callback('⏰ Перенести', `reminder:postpone:${logId}`),
      ],
      [Markup.button.callback('❌ Отменить', `reminder:cancel:${logId}`)],
    ]).reply_markup;
  }
}
