import { Api, InlineKeyboard } from "grammy";
import User from "../database/models/User";
import Azkar from "../database/models/Azkar";
import { StreakService } from "../services/StreakService";
import { postponeAzkarNotification, cancelAzkarNotification } from "../";
import { Types } from "mongoose";
import { MyContext } from "../types";
import dotenv from "dotenv";
import Day from "../database/models/Day";

dotenv.config({ path: "src/.env" });

const api = new Api(process.env.BOT_TOKEN as string);

function prayerToType(prayer: "Fajr" | "Maghrib"): "morning" | "evening" {
  return prayer === "Fajr" ? "morning" : "evening";
}

export async function sendAzkarNotification(
  telegramId: number,
  prayer: "Fajr" | "Maghrib",
  date: string,
  chatId?: number
): Promise<void> {
  const targetChatId = chatId ?? telegramId;
  const user = await User.findOne({ telegramId });

  if (!user) return;

  try {
    const existingDay = await Day.findOne({
      userId: user._id,
      date,
      type: prayerToType(prayer),
    });

    if (existingDay && ["read", "skipped"].includes(existingDay.status)) {
      console.log("❌ Уведомление уже было или день пропущен");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("📖 Прочитать", `azkarnotify:read:${prayer}:${date}`)
      .text("⏰ Отложить (1 ч)", `azkarnotify:postpone:${prayer}:${date}`)
      .row()
      .text("❌ Сегодня не буду", `azkarnotify:skip:${prayer}:${date}`);

    const ctx_message = await api.sendMessage(
      targetChatId,
      `🕌 Время ${prayer === "Fajr" ? "утренних" : "вечерних"} азкаров.`,
      { reply_markup: keyboard }
    );

    if (!existingDay) {
      await Day.create({
        userId: user._id,
        date,
        type: prayerToType(prayer),
        status: "pending",
        startedAt: new Date(),
        messageId: ctx_message.message_id,
      });
    } else {
      await Day.updateOne(
        { _id: existingDay._id },
        { messageId: ctx_message.message_id }
      );
    }
  } catch (err) {
    console.log("sendAzkarNotification error:", err);
    throw err;
  }
}

const sliderStates = new Map<
  string,
  {
    azkarIds: Types.ObjectId[];
    index: number;
    date: string;
    userId: Types.ObjectId;
    chatId: number;
    type: "morning" | "evening";
  }
>();

async function startAzkarSlider(
  ctx: MyContext,
  userId: Types.ObjectId,
  chatId: number,
  prayer: "Fajr" | "Maghrib",
  date: string
) {
  const type = prayerToType(prayer);

  const dayRecord = await Day.findOne({ userId, date, type });
  const alreadyReadIds = dayRecord?.azkarIds || [];

  const azkar = await Azkar.aggregate([
    { $match: { category: type, _id: { $nin: alreadyReadIds } } },
  ]);

  if (azkar.length === 0) {
    await ctx.api.sendMessage(chatId, "Нет азкаров для отображения");
    return;
  }

  const sliderId = `${ctx.from!.id}:${Date.now()}`;
  sliderStates.set(sliderId, {
    azkarIds: azkar.map((a: any) => a._id),
    index: 0,
    date,
    userId,
    chatId,
    type,
  });

  const keyboard = buildSliderKeyboard(sliderId, 0, azkar.length);

  await ctx.api.sendMessage(
    chatId,
    formatAzkarMessage(azkar[0], 1, azkar.length),
    {
      reply_markup: keyboard,
      parse_mode: "HTML",
    }
  );
}

function buildSliderKeyboard(
  sliderId: string,
  index: number,
  total: number
): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏪", `slider:${sliderId}:prev`)
    .text(`${index + 1}/${total}`, `slider:${sliderId}:info`)
    .text("⏩", `slider:${sliderId}:next`)
    .row()
    .text("+1", `slider:${sliderId}:plus`)
    .text("✅ Завершить", `slider:${sliderId}:finish`);
}

function formatAzkarMessage(azkar: any, i: number, total: number): string {
  let msg = `<b>📖 Азкар ${i}/${total}</b>\n\n`;
  msg += `<b>Текст:</b>\n${azkar.text}\n\n`;
  if (azkar.translation) msg += `<b>Перевод:</b>\n${azkar.translation}\n\n`;
  if (azkar.transcription)
    msg += `<b>Транскрипция:</b>\n${azkar.transcription}\n\n`;
  return msg;
}

export async function handleAzkarNotifyCallback(ctx: MyContext): Promise<void> {
  try {
    const data = ctx.callbackQuery?.data;
    if (!data) {
      await ctx.answerCallbackQuery("❌ Некорректные данные");
      return;
    }

    const [, action, prayer, date] = data.split(":");
    const user = await User.findOne({ telegramId: ctx.from!.id });
    if (!user) {
      await ctx.answerCallbackQuery("❌ Пользователь не найден");
      return;
    }

    const typeLabel = prayer === "Fajr" ? "утренних" : "вечерних";
    const dbType = prayerToType(prayer as "Fajr" | "Maghrib");

    const dayRecord = await Day.findOne({
      userId: user._id,
      date,
      type: dbType,
    });

    if (action === "postpone") {
      await postponeAzkarNotification(
        user._id.toString(),
        ctx.from!.id,
        prayer as any,
        date
      );

      if (dayRecord?.messageId) {
        try {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            dayRecord.messageId,
            `⏰ Вы отложили чтение ${typeLabel} азкаров на 1 час`,
          );
        } catch (err) {
          console.log("Не удалось обновить сообщение (postpone):", err);
        }
      }
      await ctx.answerCallbackQuery("⏰ Отложено на 1 час");
      return;
    }

    if (action === "skip") {
      await cancelAzkarNotification(user._id.toString(), prayer as any, date);
      await StreakService.markSkipped(user._id, date, dbType);

      if (dayRecord?.messageId) {
        try {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            dayRecord.messageId,
            `❌ Вы сегодня пропустили чтение ${typeLabel} азкаров`,
          );
        } catch (err) {
          console.log("Не удалось обновить сообщение (skip):", err);
        }
      }
      await ctx.answerCallbackQuery("День отмечен как пропущенный");
      return;
    }
    if (action === "read") {
      if (dayRecord?.messageId) {
        try {
          await ctx.api.editMessageText(
            ctx.chat!.id,
            dayRecord.messageId,
            `📖 Чтение ${typeLabel} азкаров`,
          );
        } catch (err) {
          console.log("Не удалось обновить сообщение (read):", err);
        }
      }

      await startAzkarSlider(ctx, user._id, ctx.from!.id, prayer as any, date);
      await ctx.answerCallbackQuery();
      return;
    }

    await ctx.answerCallbackQuery("❌ Неизвестное действие");
  } catch (err) {
    console.error("Error in handleAzkarNotifyCallback:", err);
    throw err;
  }
}

export async function handleSliderCallback(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery("❌ Некорректные данные");
    return;
  }

  const parts = data.split(":");
  const action = parts.pop();
  const sliderId = parts.slice(1).join(":");

  const state = sliderStates.get(sliderId);

  if (!state) {
    await ctx.answerCallbackQuery("Слайдер устарел");
    return;
  }

  const total = state.azkarIds.length;

  if (action === "prev") {
    state.index = Math.max(0, state.index - 1);
  } else if (action === "next") {
    state.index = Math.min(total - 1, state.index + 1);
  } else if (action === "plus") {
    const azkarId = state.azkarIds[state.index];
    await StreakService.markRead(
      state.userId,
      state.date,
      state.type,
      azkarId as any
    );
    await ctx.answerCallbackQuery("+1 записан");
  } else if (action === "finish") {
    sliderStates.delete(sliderId);
    try {
      await ctx.editMessageText(
        "🎉 Вы прочитали сегодня азкары, поздравляем!",
        {
          reply_markup: new InlineKeyboard(),
          parse_mode: "HTML",
        }
      );
    } catch (err) {
      console.log(
        "Не удалось обновить сообщение при завершении слайдера:",
        err
      );
    }
    await ctx.answerCallbackQuery("Завершено");
    return;
  }

  const azkar = await Azkar.findById(state.azkarIds[state.index]);
  if (!azkar) {
    await ctx.answerCallbackQuery("❌ Ошибка загрузки");
    return;
  }

  const kb = buildSliderKeyboard(sliderId, state.index, total);
  const messageText = formatAzkarMessage(azkar, state.index + 1, total);

  try {
    await ctx.editMessageText(messageText, {
      reply_markup: kb,
      parse_mode: "HTML",
    });
  } catch (error) {
    console.log("Error editing message:", error);
    await ctx.answerCallbackQuery("❌ Ошибка обновления сообщения");
  }
}
