import dotenv from "dotenv";
import Day from "../database/models/Day";
import User from "../database/models/User";
import Azkar from "../database/models/Azkar";
import timezone from "dayjs/plugin/timezone";
import { Api, InlineKeyboard } from "grammy";
import { StreakService } from "../services/StreakService";
import {
  cancelAzkarNotification,
  scheduleAzkarNotify,
} from "../cron/prayerTimesCron";
import { Types } from "mongoose";
import { MyContext } from "../types";
import { IAzkar } from "../types/models";
import dayjs from "dayjs";
import { openAzkar } from "../shared/keyboards";
import { prayerToType, STATUS } from "../config";

dotenv.config({ path: "src/.env" });

dayjs.extend(timezone);

const api = new Api(process.env.BOT_TOKEN as string);

export const sliderStates = new Map<
  string,
  {
    index: number;
    date: string;
    userId: Types.ObjectId;
    chatId: number;
    type: "morning" | "evening";
    azkar: IAzkar[];
  }
>();

export async function sendAzkarNotify(
  telegramId: number,
  prayer: "Fajr" | "Asr",
  date: string,
  utcTime?: string,
  chatId?: number
): Promise<void> {
  const targetChatId = chatId ?? telegramId;
  const user = await User.findOne({ telegramId });

  if (!user) return;
  const type = prayerToType(prayer);
  const existingDay = await Day.findOne({ userId: user._id, date, type });

  if (
    existingDay &&
    (existingDay.status === "read" || existingDay.status === "skipped")
  ) {
    console.log(
      `Пропускаем напоминание для пользователя ${telegramId}, статус: ${existingDay.status}`
    );
    return;
  }

  const currentReminders = existingDay?.remindersSent || 0;

  if (currentReminders === 1) {
    if (existingDay?.messageId) {
      await api.deleteMessage(targetChatId, existingDay.messageId);
    }
    const message = await api.sendMessage(
      targetChatId,
      `⏰ Не забудьте прочитать ${
        prayer === "Fajr" ? "утренние" : "вечерние"
      } азкары! Это важно для вашего стрика.`,
      { reply_markup: openAzkar, parse_mode: "HTML" }
    );
    await Day.findOneAndUpdate(
      { _id: existingDay?._id },
      { $set: { messageId: message.message_id } }
    );
  } else if (currentReminders === 2) {
    if (existingDay?.messageId) {
      await api.deleteMessage(targetChatId, existingDay.messageId);
    }
    const message = await api.sendMessage(
      targetChatId,
      `🕌 Последнее напоминание на сегодня: ${
        prayer === "Fajr" ? "утренние" : "вечерние"
      } азкары ждут вашего внимания.\n\nПоддержите свой стрик и завершите день с пользой!`,
      { reply_markup: openAzkar, parse_mode: "HTML" }
    );
    await Day.findOneAndUpdate(
      { _id: existingDay?._id },
      { $set: { messageId: message.message_id } }
    );
  } else if (currentReminders >= 3) {
    const updatedDay = await Day.findOneAndUpdate(
      { userId: user._id, date, type },
      { $set: { status: STATUS.SKIPPED } }
    );
    if (!updatedDay) {
      await api.sendMessage(
        targetChatId,
        `❌ Время ${
          prayer === "Fajr" ? "утренних" : "вечерних"
        } азкаров истекло. Вы пропустили чтение.`
      );
      return;
    }
    await api.editMessageText(
      targetChatId,
      updatedDay.messageId,
      `❌ Время ${
        prayer === "Fajr" ? "утренних" : "вечерних"
      } азкаров истекло. Вы пропустили чтение.`,
      { parse_mode: "HTML" }
    );

    return;
  }

  await Day.updateOne(
    { userId: user._id, date, type },
    { $inc: { remindersSent: 1 } }
  );
}

export async function sendAzkarNotification(
  telegramId: number,
  prayer: "Fajr" | "Asr",
  date: string,
  chatId?: number
): Promise<void> {
  const targetChatId = chatId ?? telegramId;
  const user = await User.findOne({ telegramId });
  if (!user) return;

  const type = prayerToType(prayer);

  const existingDay = await Day.findOne({ userId: user._id, date, type });
  if (
    existingDay &&
    (existingDay.status === STATUS.READ ||
      existingDay.status === STATUS.SKIPPED)
  ) {
    return;
  }

  const azkar = await Azkar.find({ category: type }).lean();
  if (!azkar || azkar.length === 0) {
    try {
      await api.sendMessage(targetChatId, "Нет азкаров для отображения");
    } catch (err) {
      console.error(
        "Ошибка при отправке сообщения об отсутствии азкаров:",
        err
      );
    }
    return;
  }

  const sliderId = `${telegramId}:${Date.now()}`;
  sliderStates.set(sliderId, {
    index: 0,
    date,
    userId: user._id,
    chatId: targetChatId,
    type,
    azkar,
  });

  let messageId: number | undefined;
  try {
    const msg = await api.sendMessage(
      targetChatId,
      formatAzkarMessage(azkar[0], 1, azkar.length),
      {
        reply_markup: buildSliderKeyboard(sliderId, prayer, date),
        parse_mode: "HTML",
      }
    );
    messageId = msg.message_id as number;
  } catch (err) {
    console.error("Ошибка при отправке слайдера пользователю", telegramId, err);
  }

  await Day.updateOne(
    { userId: user._id, date, type },
    {
      $set: { ...(messageId ? { messageId } : {}) },
      $setOnInsert: { status: STATUS.PENDING, startedAt: new Date() },
      $inc: { remindersSent: 1 },
    },
    { upsert: true }
  );

  const updatedDay = await Day.findOne({ userId: user._id, date, type });
  if (
    updatedDay &&
    updatedDay.status === STATUS.PENDING &&
    updatedDay.remindersSent === 1
  ) {
    const firstReminderISO = dayjs().add(1, "minutes").utc().toISOString();
    console.log("Планируем первое напоминание через 4 часа:", firstReminderISO);

    await scheduleAzkarNotify(
      user._id.toString(),
      telegramId,
      prayer,
      date,
      firstReminderISO,
      1
    );

    const secondReminderISO = dayjs().add(2, "minutes").utc().toISOString();
    console.log(
      "Планируем второе напоминание через 8 часа:",
      secondReminderISO
    );

    await scheduleAzkarNotify(
      user._id.toString(),
      telegramId,
      prayer,
      date,
      secondReminderISO,
      2
    );

    const thirdReminderISO = dayjs().add(3, "minutes").utc().toISOString();
    console.log(
      "Планируем третье напоминание через 9 часов:",
      thirdReminderISO
    );

    await scheduleAzkarNotify(
      user._id.toString(),
      telegramId,
      prayer,
      date,
      thirdReminderISO,
      3
    );
  }
}

async function startAzkarSlider(
  ctx: MyContext,
  userId: Types.ObjectId,
  chatId: number,
  prayer: "Fajr" | "Asr",
  date: string
) {
  const type = prayerToType(prayer);
  const azkar = await Azkar.find({ category: type }).lean();
  if (azkar.length === 0) {
    await ctx.api.sendMessage(chatId, "Нет азкаров для отображения");
    return;
  }

  if (!ctx.from) {
    await ctx.api.sendMessage(chatId, "❌ Ошибка контекста");
    return;
  }

  const sliderId = `${ctx.from.id}:${Date.now()}`;
  sliderStates.set(sliderId, { index: 0, date, userId, chatId, type, azkar });

  const keyboard = buildSliderKeyboard(sliderId, prayer, date);
  await ctx.api.sendMessage(
    chatId,
    formatAzkarMessage(azkar[0], 1, azkar.length),
    { reply_markup: keyboard, parse_mode: "HTML" }
  );
}

export function buildSliderKeyboard(
  sliderId: string,
  prayer: "Fajr" | "Asr" = "Fajr",
  date: string
): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏪", `slider:${sliderId}:prev`)
    .text("⏩", `slider:${sliderId}:next`)
    .row()
    .text("✅ Прочитал", `azkarnotify:read:${prayer}:${date}`)
    .row()
    .text("❌ Сегодня не читаю", `azkarnotify:skip:${prayer}:${date}`);
}

export function formatAzkarMessage(
  azkar: IAzkar,
  i: number,
  total: number
): string {
  return `<b>📖 Азкар ${i}/${total}</b>\n\n<blockquote>${azkar.text}\n\n${azkar.translation}</blockquote>\n\n<b>Транскрипция:</b> ${azkar.transcription}`;
}

export async function handleAzkarNotifyCallback(ctx: MyContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery("❌ Некорректные данные");
    return;
  }

  const [, action, prayer, date] = data.split(":");
  if (!ctx.from) return;
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) {
    await ctx.answerCallbackQuery("❌ Пользователь не найден");
    return;
  }

  const typeLabel = prayer === "Fajr" ? "утренних" : "вечерних";
  const dbType = prayerToType(prayer as "Fajr" | "Asr");
  const dayRecord = await Day.findOne({ userId: user._id, date, type: dbType });

  if (action === "skip") {
    await cancelAzkarNotification(
      user._id.toString(),
      prayer as "Fajr" | "Asr",
      date
    );
    await StreakService.markSkipped(user._id, date, dbType);
    if (dayRecord?.messageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          dayRecord.messageId,
          `❌ Вы сегодня пропустили чтение ${typeLabel} азкаров`
        );
      } catch (err) {
        console.log("Не получилось отредактировать сообщение: ", err);
      }
    }
    await ctx.answerCallbackQuery("День отмечен как пропущенный");
    return;
  }

  if (action === "read") {
    await Day.updateOne(
      { userId: user._id, date, type: dbType },
      { $set: { status: STATUS.READ, startedAt: new Date() } },
      { upsert: true }
    );
    if (dayRecord?.messageId && ctx.chat) {
      try {
        await ctx.api.editMessageText(
          ctx.chat.id,
          dayRecord.messageId,
          "✅ Вы прочитали сегодня утренние азкары"
        );
      } catch (err) {
        console.log("Не получилось отредактировать сообщение: ", err);
      }
    }
    await ctx.answerCallbackQuery("День отмечен как прочитанный");
  }

  await ctx.answerCallbackQuery("❌ Неизвестное действие");
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

  const total = state.azkar.length;

  if (action === "prev") {
    state.index = Math.max(0, state.index - 1);
    await ctx.answerCallbackQuery("👈 Предыдущий");
  } else if (action === "next") {
    state.index = Math.min(total - 1, state.index + 1);
    await ctx.answerCallbackQuery("👉 Следующий");
  } else if (action === "finish") {
    sliderStates.delete(sliderId);
    try {
      await Day.updateOne(
        { userId: state.userId, date: state.date, type: state.type },
        { $set: { status: STATUS.READ, finishedAt: new Date() } }
      );
      await ctx.editMessageText("🎉 Вы прочитали сегодня азкары, поздравляем!");
    } catch {
      await ctx.answerCallbackQuery("Слайдер устарел");
      return;
    }
    await ctx.answerCallbackQuery("🎉 Завершено");
    return;
  }

  const currentAzkar = state.azkar[state.index];
  if (!currentAzkar) {
    await ctx.answerCallbackQuery("❌ Ошибка загрузки");
    return;
  }
  const prayer = state.type === "morning" ? "Fajr" : "Asr";
  const kb = buildSliderKeyboard(sliderId, prayer, state.date);
  const messageText = formatAzkarMessage(currentAzkar, state.index + 1, total);

  try {
    await ctx.editMessageText(messageText, {
      reply_markup: kb,
      parse_mode: "HTML",
    });
  } catch {
    await ctx.answerCallbackQuery("❌ Ошибка обновления сообщения");
  }
}
