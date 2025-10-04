import { MyContext } from "../types";
import { handleCalendarNavigation } from "./index";
import {
  buildSliderKeyboard,
  formatAzkarMessage,
  handleAzkarNotifyCallback,
  handleSliderCallback,
  sliderStates,
} from "./azkarNotification";
import Day from "../database/models/Day";
import User from "../database/models/User";
import Azkar from "../database/models/Azkar";
import { STATUS } from "../config";

export async function handleOpenAzkar(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery("❌ Некорректные данные");
    return;
  }

  if (data !== "open:azkar") {
    await ctx.answerCallbackQuery("❌ Неизвестное действие");
    return;
  }

  const cbMessage = ctx.callbackQuery?.message;
  if (!cbMessage || !ctx.from) {
    await ctx.answerCallbackQuery(
      "❌ Некорректные данные (message/from отсутствует)"
    );
    return;
  }

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.answerCallbackQuery("❌ Пользователь не найден");
    return;
  }

  const messageId = (cbMessage as any).message_id as number;
  const dayRecord = await Day.findOne({
    userId: user._id,
    messageId,
  });

  if (!dayRecord) {
    await ctx.answerCallbackQuery(
      "❌ Запись дня не найдена для этого сообщения"
    );
    return;
  }

  const type = dayRecord.type as "morning" | "evening";
  const prayer = type === "morning" ? "Fajr" : "Asr";

  const azkar = await Azkar.find({ category: type }).lean();
  if (!azkar || azkar.length === 0) {
    try {
      await ctx.editMessageText("Нет азкаров для отображения");
    } catch (err) {
      console.error(
        "Ошибка при редактировании сообщения об отсутствии азкаров:",
        err
      );
    }
    await ctx.answerCallbackQuery();
    return;
  }

  const sliderId = `${ctx.from.id}:${Date.now()}`;
  sliderStates.set(sliderId, {
    index: 0,
    date: dayRecord.date,
    userId: user._id,
    chatId: cbMessage.chat.id,
    type,
    azkar,
  });

  const kb = buildSliderKeyboard(
    sliderId,
    prayer as "Fajr" | "Asr",
    dayRecord.date
  );

  try {
    await ctx.editMessageText(formatAzkarMessage(azkar[0], 1, azkar.length), {
      reply_markup: kb,
      parse_mode: "HTML",
    });
  } catch (err) {
    console.error("Ошибка при редактировании сообщения в слайдер:", err);
    await ctx.answerCallbackQuery("❌ Не удалось открыть азкары");
    sliderStates.delete(sliderId);
    return;
  }
  try {
    await Day.updateOne(
      { _id: dayRecord._id },
      { $set: { status: STATUS.PENDING, startedAt: new Date() } }
    );
  } catch (err) {
    console.error("Ошибка при обновлении Day после открытия слайдера:", err);
  }

  await ctx.answerCallbackQuery();
}

export async function handleCallbackQuery(ctx: MyContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) {
      await ctx.answerCallbackQuery("❌ Некорректные данные");
      return;
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
