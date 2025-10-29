import { Update, Ctx, Command, Action } from 'nestjs-telegraf';
import { Injectable } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { ReminderService } from '../reminder/reminder.service';
import { UserService } from '../user/user.service';

interface SessionContext extends Context {
  session?: {
    reminderCreation?: {
      step: 'title' | 'description' | 'time' | 'days' | 'confirmation';
      title?: string;
      description?: string;
      time?: string;
      days?: number[];
    };
    reminderEdit?: {
      reminderId: number;
      field: 'title' | 'description' | 'time' | 'days';
    };
  };
}

@Injectable()
@Update()
export class ReminderCommands {
  constructor(
    private reminderService: ReminderService,
    private userService: UserService,
  ) {}

  @Command('reminders')
  async listReminders(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;

    const user = await this.userService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('Пожалуйста, сначала выполните /start');
      return;
    }

    const reminders = await this.reminderService.findAllByUser(user.id);

    if (reminders.length === 0) {
      await ctx.reply(
        '📋 У вас пока нет напоминаний.\n\nИспользуйте /add_reminder чтобы создать первое напоминание.',
      );
      return;
    }

    let message = '📋 *Ваши напоминания:*\n\n';

    for (const reminder of reminders) {
      const status = reminder.isActive ? '✅' : '⏸️';
      const days = this.formatDays(reminder.days);
      message += `${status} *${reminder.title}*\n`;
      message += `⏰ ${reminder.time} | ${days}\n`;
      if (reminder.description) {
        message += `📝 ${reminder.description}\n`;
      }
      message += `ID: \`${reminder.id}\`\n\n`;
    }

    message += '\n_Используйте команды:_\n';
    message += '/add\\_reminder - создать напоминание\n';
    message += '/edit\\_reminder - редактировать\n';
    message += '/delete\\_reminder - удалить\n';
    message += '/toggle\\_reminder - включить/выключить';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Command('add_reminder')
  async addReminder(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;

    const user = await this.userService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('Пожалуйста, сначала выполните /start');
      return;
    }

    // Инициализируем сессию создания напоминания
    if (!ctx.session) ctx.session = {};
    ctx.session.reminderCreation = {
      step: 'title',
    };

    await ctx.reply(
      '✏️ *Создание нового напоминания*\n\n' +
        'Шаг 1/5: Введите название напоминания\n\n' +
        '_Например: "Выпить таблетку" или "Позвонить врачу"_',
      { parse_mode: 'Markdown' },
    );
  }

  @Command('toggle_reminder')
  async toggleReminder(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;

    const args = ctx.message && 'text' in ctx.message
      ? ctx.message.text.split(' ').slice(1)
      : [];

    if (args.length === 0) {
      await ctx.reply(
        'Использование: /toggle_reminder <ID>\n\n' +
        'Используйте /reminders чтобы посмотреть список напоминаний и их ID.',
      );
      return;
    }

    const reminderId = parseInt(args[0]);
    if (isNaN(reminderId)) {
      await ctx.reply('❌ Неверный ID напоминания');
      return;
    }

    try {
      const reminder = await this.reminderService.toggleActive(reminderId);
      const status = reminder.isActive ? '✅ Включено' : '⏸️ Выключено';
      await ctx.reply(
        `${status}\n\n*${reminder.title}*\n⏰ ${reminder.time}`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      await ctx.reply('❌ Напоминание не найдено');
    }
  }

  @Command('delete_reminder')
  async deleteReminder(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;

    const args = ctx.message && 'text' in ctx.message
      ? ctx.message.text.split(' ').slice(1)
      : [];

    if (args.length === 0) {
      await ctx.reply(
        'Использование: /delete_reminder <ID>\n\n' +
        'Используйте /reminders чтобы посмотреть список напоминаний и их ID.',
      );
      return;
    }

    const reminderId = parseInt(args[0]);
    if (isNaN(reminderId)) {
      await ctx.reply('❌ Неверный ID напоминания');
      return;
    }

    try {
      const reminder = await this.reminderService.findById(reminderId);
      if (!reminder) {
        await ctx.reply('❌ Напоминание не найдено');
        return;
      }

      await this.reminderService.delete(reminderId);
      await ctx.reply(`✅ Напоминание "${reminder.title}" удалено`);
    } catch (error) {
      await ctx.reply('❌ Ошибка при удалении напоминания');
    }
  }

  @Command('reminder_stats')
  async reminderStats(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;

    const user = await this.userService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply('Пожалуйста, сначала выполните /start');
      return;
    }

    const stats = await this.reminderService.getUserStats(user.id);

    const message =
      '📊 *Статистика напоминаний*\n\n' +
      `📋 Всего напоминаний: ${stats.total}\n` +
      `✅ Активных: ${stats.active}\n\n` +
      `*История выполнения:*\n` +
      `✅ Выполнено: ${stats.completed}\n` +
      `⏰ Перенесено: ${stats.postponed}\n` +
      `❌ Отменено: ${stats.cancelled}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  private formatDays(days: number[] | null): string {
    if (!days || days.length === 0) return '—';
    if (days.length === 7) return 'Каждый день';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
      return 'Будни';
    }
    if (days.length === 2 && days.includes(0) && days.includes(6)) {
      return 'Выходные';
    }

    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days.map((d) => dayNames[d]).join(', ');
  }
}
