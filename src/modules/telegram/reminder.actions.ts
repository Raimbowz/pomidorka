import { Update, Ctx, Action, On } from 'nestjs-telegraf';
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
  };
}

@Injectable()
@Update()
export class ReminderActions {
  constructor(
    private reminderService: ReminderService,
    private userService: UserService,
  ) {}

  // Обработка кнопки "Выполнить"
  @Action(/reminder:complete:(\d+)/)
  async handleComplete(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const logId = parseInt(ctx.callbackQuery.data.split(':')[2]);

    try {
      await this.reminderService.completeReminder(logId);

      await ctx.answerCbQuery('✅ Отмечено как выполненное');
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
        const originalText = ctx.callbackQuery.message.text;
        await ctx.editMessageText(
          `${originalText}\n\n✅ *Выполнено* ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
          { parse_mode: 'Markdown' },
        );
      }
    } catch (error) {
      await ctx.answerCbQuery('❌ Ошибка при обработке');
    }
  }

  // Обработка кнопки "Перенести"
  @Action(/reminder:postpone:(\d+)/)
  async handlePostpone(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const logId = parseInt(ctx.callbackQuery.data.split(':')[2]);

    // Показываем клавиатуру с вариантами отсрочки
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('10 мин', `reminder:postpone:${logId}:10`),
        Markup.button.callback('30 мин', `reminder:postpone:${logId}:30`),
      ],
      [
        Markup.button.callback('1 час', `reminder:postpone:${logId}:60`),
        Markup.button.callback('2 часа', `reminder:postpone:${logId}:120`),
      ],
      [Markup.button.callback('« Назад', `reminder:back:${logId}`)],
    ]);

    await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    await ctx.answerCbQuery();
  }

  // Обработка выбора времени отсрочки
  @Action(/reminder:postpone:(\d+):(\d+)/)
  async handlePostponeWithTime(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const parts = ctx.callbackQuery.data.split(':');
    const logId = parseInt(parts[2]);
    const minutes = parseInt(parts[3]);

    try {
      await this.reminderService.postponeReminder(logId, minutes);

      await ctx.answerCbQuery(`⏰ Отложено на ${minutes} мин`);
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
        const originalText = ctx.callbackQuery.message.text;
        const postponeTime = new Date(Date.now() + minutes * 60 * 1000);
        await ctx.editMessageText(
          `${originalText}\n\n⏰ *Отложено до* ${postponeTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
          { parse_mode: 'Markdown' },
        );
      }
    } catch (error) {
      await ctx.answerCbQuery('❌ Ошибка при обработке');
    }
  }

  // Обработка кнопки "Отменить"
  @Action(/reminder:cancel:(\d+)/)
  async handleCancel(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const logId = parseInt(ctx.callbackQuery.data.split(':')[2]);

    try {
      await this.reminderService.cancelReminder(logId);

      await ctx.answerCbQuery('❌ Отменено');
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      if (ctx.callbackQuery.message && 'text' in ctx.callbackQuery.message) {
        const originalText = ctx.callbackQuery.message.text;
        await ctx.editMessageText(
          `${originalText}\n\n❌ *Отменено* ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
          { parse_mode: 'Markdown' },
        );
      }
    } catch (error) {
      await ctx.answerCbQuery('❌ Ошибка при обработке');
    }
  }

  // Обработка кнопки "Назад" (возврат к основным действиям)
  @Action(/reminder:back:(\d+)/)
  async handleBack(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const logId = parseInt(ctx.callbackQuery.data.split(':')[2]);

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Выполнить', `reminder:complete:${logId}`),
        Markup.button.callback('⏰ Перенести', `reminder:postpone:${logId}`),
      ],
      [Markup.button.callback('❌ Отменить', `reminder:cancel:${logId}`)],
    ]);

    await ctx.editMessageReplyMarkup(keyboard.reply_markup);
    await ctx.answerCbQuery();
  }

  // Обработка текстовых сообщений для создания напоминания
  @On('text')
  async handleText(@Ctx() ctx: SessionContext) {
    if (!ctx.from || !ctx.session?.reminderCreation) return;
    if (!ctx.message || !('text' in ctx.message)) return;

    const text = ctx.message.text;
    const creation = ctx.session.reminderCreation;

    // Пропускаем команды
    if (text.startsWith('/')) return;

    const user = await this.userService.findByTelegramId(ctx.from.id);
    if (!user) return;

    switch (creation.step) {
      case 'title':
        creation.title = text;
        creation.step = 'description';
        await ctx.reply(
          '📝 Шаг 2/5: Введите описание напоминания\n\n' +
            '_Или отправьте "-" чтобы пропустить_',
          { parse_mode: 'Markdown' },
        );
        break;

      case 'description':
        if (text !== '-') {
          creation.description = text;
        }
        creation.step = 'time';
        await ctx.reply(
          '⏰ Шаг 3/5: Введите время напоминания\n\n' +
            '_Формат: HH:MM (например, 09:00 или 14:30)_',
          { parse_mode: 'Markdown' },
        );
        break;

      case 'time':
        if (!this.isValidTime(text)) {
          await ctx.reply('❌ Неверный формат времени. Используйте HH:MM (например, 09:00)');
          return;
        }
        creation.time = text;
        creation.step = 'days';
        await ctx.reply(
          '📅 Шаг 4/5: Выберите дни недели:',
          {
            reply_markup: this.getDaySelectionKeyboard([]),
          },
        );
        break;

      default:
        return;
    }
  }

  // Обработка выбора дней недели
  @Action(/day:(\d):(.+)/)
  async handleDaySelection(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    if (!ctx.session?.reminderCreation) return;

    const parts = ctx.callbackQuery.data.split(':');
    const day = parseInt(parts[1]);
    const selectedDaysStr = parts[2];

    let selectedDays: number[] = selectedDaysStr === 'none'
      ? []
      : selectedDaysStr.split(',').map(Number);

    // Переключаем выбор дня
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter((d) => d !== day);
    } else {
      selectedDays.push(day);
      selectedDays.sort();
    }

    await ctx.editMessageReplyMarkup(this.getDaySelectionKeyboard(selectedDays));
    await ctx.answerCbQuery();
  }

  // Подтверждение выбора дней
  @Action(/days:confirm:(.+)/)
  async handleDaysConfirm(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    if (!ctx.session?.reminderCreation) return;

    const selectedDaysStr = ctx.callbackQuery.data.split(':')[2];
    const selectedDays = selectedDaysStr === 'none'
      ? []
      : selectedDaysStr.split(',').map(Number);

    if (selectedDays.length === 0) {
      await ctx.answerCbQuery('❌ Выберите хотя бы один день');
      return;
    }

    ctx.session.reminderCreation.days = selectedDays;
    ctx.session.reminderCreation.step = 'confirmation';

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

    await ctx.reply(
      '✅ Шаг 5/5: Требуется ли подтверждение выполнения?',
      {
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Да, с кнопками', 'reminder:create:confirm:true'),
            Markup.button.callback('❌ Нет, просто напомнить', 'reminder:create:confirm:false'),
          ],
        ]).reply_markup,
      },
    );

    await ctx.answerCbQuery();
  }

  // Финальное создание напоминания
  @Action(/reminder:create:confirm:(true|false)/)
  async handleCreateConfirm(@Ctx() ctx: SessionContext) {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    if (!ctx.from || !ctx.session?.reminderCreation) return;

    const requireConfirmation = ctx.callbackQuery.data.endsWith('true');
    const creation = ctx.session.reminderCreation;

    if (!creation.title || !creation.time || !creation.days) {
      await ctx.answerCbQuery('❌ Ошибка: неполные данные');
      return;
    }

    const user = await this.userService.findByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.answerCbQuery('❌ Пользователь не найден');
      return;
    }

    try {
      const reminder = await this.reminderService.create({
        userId: user.id,
        title: creation.title,
        description: creation.description,
        time: creation.time,
        days: creation.days,
        requireConfirmation,
      });

      delete ctx.session.reminderCreation;

      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });

      const daysStr = this.formatDays(reminder.days);
      const confirmStr = requireConfirmation ? 'с подтверждением' : 'без подтверждения';

      await ctx.reply(
        `✅ *Напоминание создано!*\n\n` +
        `📋 ${reminder.title}\n` +
        `⏰ ${reminder.time}\n` +
        `📅 ${daysStr}\n` +
        `🔔 ${confirmStr}\n\n` +
        `ID: \`${reminder.id}\`\n\n` +
        `_Используйте /reminders чтобы посмотреть все напоминания_`,
        { parse_mode: 'Markdown' },
      );

      await ctx.answerCbQuery('✅ Создано');
    } catch (error) {
      console.error('Error creating reminder:', error);
      await ctx.answerCbQuery('❌ Ошибка при создании');
      await ctx.reply('❌ Произошла ошибка при создании напоминания. Попробуйте еще раз.');
    }
  }

  private isValidTime(time: string): boolean {
    const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  }

  private getDaySelectionKeyboard(selectedDays: number[]) {
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const selectedStr = selectedDays.length > 0 ? selectedDays.join(',') : 'none';

    const dayButtons = dayNames.map((name, index) => {
      const isSelected = selectedDays.includes(index);
      const label = isSelected ? `✅ ${name}` : name;
      return Markup.button.callback(label, `day:${index}:${selectedStr}`);
    });

    return Markup.inlineKeyboard([
      [dayButtons[1], dayButtons[2], dayButtons[3]],
      [dayButtons[4], dayButtons[5], dayButtons[6], dayButtons[0]],
      [Markup.button.callback('✅ Подтвердить', `days:confirm:${selectedStr}`)],
    ]).reply_markup;
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
