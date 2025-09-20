import { Menu } from "@grammyjs/menu";
import { MyContext } from "../types";
import { location, stats, profile, admin } from "./commands";
import User from "../database/models/User";

export const menuButtons = new Menu<MyContext>("menu")
  .text("👤 Мой профиль", async (ctx) => {
    await ctx.answerCallbackQuery("👤 Мой профиль");
    ctx.menu.close();
    await profile(ctx);
  })
  .row()
  .text("📍 Геолокация", async (ctx) => {
    await ctx.answerCallbackQuery("📍 Геолокация");
    ctx.menu.close();
    await location(ctx);
  })
  .text("🗓 Статистика", async (ctx) => {
    await ctx.answerCallbackQuery("🗓  Статистика");
    ctx.menu.close();
    await stats(ctx);
  })
  .row()
  .text("❓ Помощь", async (ctx) => {
    await ctx.answerCallbackQuery("❓ Помощь");
    ctx.menu.close();
    await ctx.reply(
      "<b>❓ Помощь</b>\n\nМы отправляем азкары для чтения и запоминания.\nЕсли возникли какие-то трудности — @khanzele",
      { parse_mode: "HTML" }
    );
  });

export const adminMenuButtons = new Menu<MyContext>("admin-menu")
  .text("👤 Статистика", async (ctx) => {
    await ctx.answerCallbackQuery("👤 Статистика");
    ctx.menu.close();
    const users = await User.countDocuments({});
    const notifyUsers = await User.countDocuments({
      blocked: false,
      "timings.FajrUTC": { $exists: true, $ne: null },
      "timings.MaghribUTC": { $exists: true, $ne: null },
    });
    const blockedUsers = await User.countDocuments({ blocked: true });
    await ctx.reply(
      `<b>👤 Статистика:</b>\n\n👥 Количество пользователей: ${users}\n🔔 Количество пользователей, которым приходят азкары: ${notifyUsers}\n🚫 Количество пользователей, которые заблокировали бот: ${blockedUsers}`,
      { parse_mode: "HTML" }
    );
  })
  .row()
  .text("📥 Рассылка", async (ctx) => {
    await ctx.answerCallbackQuery("📥 Рассылка");
    ctx.menu.close();
    await ctx.conversation.enter('broadcastConversation');
  });
