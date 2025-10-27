import { Update, Ctx, Start, Command, Hears, InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup } from 'telegraf';
import { Context } from 'telegraf';
import { UserService } from '../user/user.service';
import { MethodService } from '../method/method.service';
import { SessionService } from '../session/session.service';
import { StatsService } from '../stats/stats.service';
import { TimerService } from '../timer/timer.service';
import { NotificationService } from '../notification/notification.service';
import { SessionState, SessionStatus } from '../../entities/session.entity';

interface SessionContext extends Context {
  session?: any;
}

@Update()
export class TelegramUpdate {
  constructor(
    @InjectBot() private bot: Telegraf<SessionContext>,
    private userService: UserService,
    private methodService: MethodService,
    private sessionService: SessionService,
    private statsService: StatsService,
    private timerService: TimerService,
    private notificationService: NotificationService,
  ) {}

  @Start()
  async start(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    let user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      user = await this.userService.create(telegramUserId, 'Europe/Moscow');

      const templates = await this.methodService.getTemplates();
      const pomodoroTemplate = templates.find((t) => t.name === 'Pomodoro');

      if (pomodoroTemplate) {
        const userMethod = await this.methodService.createFromTemplate(
          pomodoroTemplate.id,
          user.id,
        );
        await this.userService.setDefaultMethod(user.id, userMethod.id);
      }

      await ctx.reply(
        'Привет! Я помогу тебе фокусироваться и работать блоками времени.\n\n' +
          'Для тебя уже настроена техника Pomodoro (25/5 × 4).\n\n' +
          'Используй команды:\n' +
          '/start_session - начать сессию\n' +
          '/stats - статистика\n' +
          '/methods - выбрать другую методику\n' +
          '/settings - настройки\n' +
          '/help - справка',
        { reply_markup: this.getMainKeyboard() },
      );
    } else {
      await ctx.reply(
        'С возвращением! Готов к новой сессии фокусировки?',
        { reply_markup: this.getMainKeyboard() },
      );
    }
  }

  @Command('help')
  async help(@Ctx() ctx: SessionContext) {
    const helpText =
      '📖 Справка по командам:\n\n' +
      '/start_session - начать новую сессию\n' +
      '/pause - поставить сессию на паузу\n' +
      '/resume - возобновить сессию\n' +
      '/stop - остановить сессию\n' +
      '/stats - показать статистику\n' +
      '/methods - выбрать методику работы\n' +
      '/settings - настройки бота\n\n' +
      'Также можно использовать кнопки в меню.';

    await ctx.reply(helpText);
  }

  @Command('start_session')
  @Hears('🚀 Старт')
  async startSession(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const activeSession = await this.sessionService.getActiveSession(user.id);
    if (activeSession) {
      await ctx.reply('У тебя уже есть активная сессия! Сначала останови её командой /stop');
      return;
    }

    const pausedSession = await this.sessionService.getPausedSession(user.id);
    if (pausedSession) {
      await ctx.reply('У тебя есть приостановленная сессия. Используй /resume для продолжения или /stop для отмены.');
      return;
    }

    if (!user.defaultMethod) {
      await ctx.reply('У тебя не выбрана методика. Выполни /methods чтобы выбрать.');
      return;
    }

    const method = user.defaultMethod;
    const session = await this.sessionService.createSession(user.id, method);

    await this.notificationService.sendWorkStart(telegramUserId, method.workDuration);
    await this.timerService.startWorkPhase(session, method);
  }

  @Command('pause')
  @Hears('⏸ Пауза')
  async pauseSession(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const activeSession = await this.sessionService.getActiveSession(user.id);
    if (!activeSession) {
      await ctx.reply('Нет активной сессии.');
      return;
    }

    await this.sessionService.pauseSession(activeSession.id);
    await this.timerService.pauseTimers(activeSession.id);

    const now = new Date();
    const timeLeftMs = activeSession.phaseEndAt.getTime() - now.getTime();
    const timeLeftMin = Math.ceil(timeLeftMs / 60000);

    await this.notificationService.sendPaused(telegramUserId, timeLeftMin);
  }

  @Command('resume')
  @Hears('▶️ Возобновить')
  async resumeSession(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const pausedSession = await this.sessionService.getPausedSession(user.id);
    if (!pausedSession) {
      await ctx.reply('Нет приостановленной сессии.');
      return;
    }

    const session = await this.sessionService.resumeSession(pausedSession.id);
    await this.timerService.resumeTimers(session, session.method);

    await this.notificationService.sendResumed(telegramUserId);
  }

  @Command('stop')
  @Hears('⏹ Стоп')
  async stopSession(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const activeSession =
      (await this.sessionService.getActiveSession(user.id)) ||
      (await this.sessionService.getPausedSession(user.id));

    if (!activeSession) {
      await ctx.reply('Нет активной сессии.');
      return;
    }

    await this.sessionService.stopSession(activeSession.id);
    await this.timerService.cancelTimers(activeSession.id);

    await this.notificationService.sendStopped(telegramUserId);
  }

  @Command('stats')
  @Hears('📊 Статистика')
  async stats(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('Сегодня', 'stats_today'),
        Markup.button.callback('Неделя', 'stats_week'),
      ],
      [Markup.button.callback('Месяц', 'stats_month')],
    ]);

    await ctx.reply('Выбери период:', keyboard);
  }

  @Command('methods')
  @Hears('📋 Методики')
  async methods(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const templates = await this.methodService.getTemplates();

    const buttons = templates.map((template) =>
      Markup.button.callback(
        `${template.name} (${template.workDuration}/${template.shortBreakDuration})`,
        `method_${template.id}`,
      ),
    );

    const keyboard = Markup.inlineKeyboard(buttons.map((btn) => [btn]));

    await ctx.reply('Выбери методику:', keyboard);
  }

  @Command('settings')
  @Hears('⚙️ Настройки')
  async settings(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.reply('Сначала выполни /start');
      return;
    }

    const currentMethod = user.defaultMethod?.name || 'не выбрана';
    const warnings = user.settings?.enableWarnings ? 'включены' : 'выключены';

    const message =
      `⚙️ Текущие настройки:\n\n` +
      `Методика: ${currentMethod}\n` +
      `Предупреждения: ${warnings}\n` +
      `Часовой пояс: ${user.timezone}\n\n` +
      `Используй /methods чтобы сменить методику.`;

    await ctx.reply(message);
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
