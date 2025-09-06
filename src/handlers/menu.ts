import { Menu } from "@grammyjs/menu";
import { MyContext } from "../types";
import { profileHandler } from "./index";
import { statsHandler } from "./statsHandler";

export const menuButtons = new Menu<MyContext>("menu")
  .text("👤 Мой профиль", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.menu.close();
    await profileHandler(ctx);
  })
  .row()
  .text("🗓 Статистика", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.menu.close();
    await statsHandler(ctx);
  })
  .row()
  .text("❓ Помощь", async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.menu.close();
    await ctx.reply("<b>Помощь</b>\n\nМы отправляем азкары для чтения и запоминания.", { parse_mode: "HTML" });
  });
