import { MyContext } from "../types";
import { handleCalendarNavigation } from "./statsHandler";
import {
  handleAzkarNotifyCallback,
  handleSliderCallback,
} from "./azkarNotification";

export async function handleCallbackQuery(ctx: MyContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) {
      await ctx.answerCallbackQuery("❌ Некорректные данные");
      return;
    }
    if (data === "menu") {
      await ctx.answerCallbackQuery("🏠 Главное меню");
    }
    if (data.startsWith("calendar:")) {
      const [, y, m] = data.split(":");
      const year = parseInt(y, 10);
      const month = parseInt(m, 10);
      if (!isNaN(year) && !isNaN(month)) {
        await handleCalendarNavigation(ctx, year, month);
        return;
      }
    }

    if (data.startsWith("azkarnotify:")) {
      await handleAzkarNotifyCallback(ctx);
      return;
    }
    if (data.startsWith("slider:")) {
      await handleSliderCallback(ctx);
      return;
    }

    await ctx.answerCallbackQuery("❌ Неизвестное действие");
  } catch (e) {
    console.error(e);
    try {
      await ctx.answerCallbackQuery("❌ Ошибка");
    } catch {}
  }
}
