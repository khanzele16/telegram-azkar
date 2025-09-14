import { Menu } from "@grammyjs/menu";
import { MyContext } from "../types";
import { location } from "./commands";
import { profileHandler } from "./index";
import { statsHandler } from "./index";

export const menuButtons = new Menu<MyContext>("menu")
  .text("👤 Мой профиль", async (ctx) => {
    await ctx.answerCallbackQuery("👤 Мой профиль");
    ctx.menu.close();
    await profileHandler(ctx);
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
    await statsHandler(ctx);
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

