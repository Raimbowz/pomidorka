import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Markup } from 'telegraf';

@Injectable()
export class NotificationService {
  constructor(@InjectBot() private bot: Telegraf) {}

  async sendWorkStart(chatId: number, duration: number) {
    const message = `🚀 Сессия запущена: ${duration} минут работы.\n\nСконцентрируйтесь на задаче!`;
    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getSessionKeyboard(),
    });
  }

  async sendBreakStart(chatId: number, duration: number, isLong: boolean = false) {
    const type = isLong ? 'Длинный перерыв' : 'Короткий перерыв';
    const emoji = isLong ? '🌟' : '☕';
    const message = `${emoji} ${type}: ${duration} минут.\n\nОтдохните и восстановите силы!`;
    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getBreakKeyboard(),
    });
  }

  async sendWarning(chatId: number, minutesLeft: number, phase: string) {
    const phaseText = phase === 'WORKING' ? 'работы' : 'перерыва';
    const message = `🔔 Через ${minutesLeft} мин ${phaseText} закончится.`;
    await this.bot.telegram.sendMessage(chatId, message);
  }

  async sendPaused(chatId: number, timeLeftMinutes: number) {
    const message = `⏸ Пауза. Осталось ${timeLeftMinutes} минут.`;
    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getPausedKeyboard(),
    });
  }

  async sendResumed(chatId: number) {
    const message = `▶️ Сессия возобновлена!`;
    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getSessionKeyboard(),
    });
  }

  async sendStopped(chatId: number) {
    const message = `⏹ Сессия прервана.`;
    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getMainKeyboard(),
    });
  }

  async sendCompleted(
    chatId: number,
    cycles: number,
    focusTimeMinutes: number,
    breakTimeMinutes: number,
  ) {
    const focusHours = Math.floor(focusTimeMinutes / 60);
    const focusMin = focusTimeMinutes % 60;
    const breakHours = Math.floor(breakTimeMinutes / 60);
    const breakMin = breakTimeMinutes % 60;

    const focusText =
      focusHours > 0 ? `${focusHours} ч ${focusMin} мин` : `${focusMin} мин`;
    const breakText =
      breakHours > 0 ? `${breakHours} ч ${breakMin} мин` : `${breakMin} мин`;

    const message =
      `✅ Сессия завершена! Вот твой отчёт:\n\n` +
      `• Циклов: ${cycles}\n` +
      `• Время работы: ${focusText}\n` +
      `• Время отдыха: ${breakText}\n\n` +
      `Молодец! Продолжай в том же духе! 💪`;

    await this.bot.telegram.sendMessage(chatId, message, {
      reply_markup: this.getMainKeyboard(),
    });
  }

  async sendStats(chatId: number, title: string, stats: any) {
    const focusHours = Math.floor(stats.totalFocusTimeSecs / 3600);
    const focusMin = Math.floor((stats.totalFocusTimeSecs % 3600) / 60);
    const breakHours = Math.floor(stats.totalBreakTimeSecs / 3600);
    const breakMin = Math.floor((stats.totalBreakTimeSecs % 3600) / 60);

    const focusText = focusHours > 0 ? `${focusHours} ч ${focusMin} мин` : `${focusMin} мин`;
    const breakText = breakHours > 0 ? `${breakHours} ч ${breakMin} мин` : `${breakMin} мин`;

    const message =
      `📊 ${title}:\n\n` +
      `— Сессий: ${stats.sessionsCount}\n` +
      `— Время фокусировки: ${focusText}\n` +
      `— Время отдыха: ${breakText}\n` +
      `— Среднее циклов/сессия: ${stats.averageCyclesPerSession}`;

    await this.bot.telegram.sendMessage(chatId, message);
  }

  async sendError(chatId: number, error: string) {
    const message = `❌ Ошибка: ${error}`;
    await this.bot.telegram.sendMessage(chatId, message);
  }

  async sendMessage(chatId: number, text: string, keyboard?: any) {
    await this.bot.telegram.sendMessage(chatId, text, keyboard);
  }

  private getSessionKeyboard() {
    return Markup.keyboard([['⏸ Пауза', '⏹ Стоп']])
      .resize()
      .reply_markup;
  }

  private getBreakKeyboard() {
    return Markup.keyboard([['⏭ Пропустить перерыв', '⏹ Стоп']])
      .resize()
      .reply_markup;
  }

  private getPausedKeyboard() {
    return Markup.keyboard([['▶️ Возобновить', '⏹ Стоп']])
      .resize()
      .reply_markup;
  }

  private getMainKeyboard() {
    return Markup.keyboard([
      ['🚀 Старт', '📊 Статистика'],
      ['⚙️ Настройки', '📋 Методики'],
    ])
      .resize()
      .reply_markup;
  }
}
