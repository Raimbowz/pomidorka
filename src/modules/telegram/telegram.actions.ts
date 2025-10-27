import { Action, Ctx, InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from 'telegraf';
import { UserService } from '../user/user.service';
import { MethodService } from '../method/method.service';
import { StatsService } from '../stats/stats.service';
import { NotificationService } from '../notification/notification.service';

interface SessionContext extends Context {
  session?: any;
}

export class TelegramActions {
  constructor(
    @InjectBot() private bot: Telegraf<SessionContext>,
    private userService: UserService,
    private methodService: MethodService,
    private statsService: StatsService,
    private notificationService: NotificationService,
  ) {}

  @Action(/stats_(.+)/)
  async handleStats(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const callbackQuery: any = ctx.callbackQuery;
    const action = callbackQuery.data;
    const period = action.split('_')[1];

    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.answerCbQuery('Сначала выполни /start');
      return;
    }

    let stats;
    let title;

    switch (period) {
      case 'today':
        stats = await this.statsService.getTodayStats(user.id);
        title = 'Статистика за сегодня';
        break;
      case 'week':
        stats = await this.statsService.getWeekStats(user.id);
        title = 'Статистика за неделю';
        break;
      case 'month':
        stats = await this.statsService.getMonthStats(user.id);
        title = 'Статистика за месяц';
        break;
      default:
        await ctx.answerCbQuery('Неизвестный период');
        return;
    }

    await ctx.answerCbQuery();
    await this.notificationService.sendStats(telegramUserId, title, stats);
  }

  @Action(/method_(.+)/)
  async handleMethodSelect(@Ctx() ctx: SessionContext) {
    if (!ctx.from) return;
    const callbackQuery: any = ctx.callbackQuery;
    const action = callbackQuery.data;
    const methodId = parseInt(action.split('_')[1]);

    const telegramUserId = ctx.from.id;
    const user = await this.userService.findByTelegramId(telegramUserId);

    if (!user) {
      await ctx.answerCbQuery('Сначала выполни /start');
      return;
    }

    const method = await this.methodService.findById(methodId);
    if (!method) {
      await ctx.answerCbQuery('Методика не найдена');
      return;
    }

    // Create a copy for the user
    const userMethod = await this.methodService.createFromTemplate(methodId, user.id);
    await this.userService.setDefaultMethod(user.id, userMethod.id);

    await ctx.answerCbQuery(`Выбрана методика: ${method.name}`);
    await ctx.reply(
      `✅ Методика ${method.name} установлена!\n\n` +
        `Параметры:\n` +
        `• Работа: ${method.workDuration} мин\n` +
        `• Короткий перерыв: ${method.shortBreakDuration} мин\n` +
        `• Длинный перерыв: ${method.longBreakDuration} мин\n` +
        `• Циклов до длинного перерыва: ${method.cyclesBeforeLongBreak}\n\n` +
        `Готов начать? Используй /start_session`,
    );
  }
}
