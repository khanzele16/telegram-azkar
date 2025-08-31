import { MyContext } from "../../types";
import User from "../models/User";

export const register = async (ctx: MyContext): Promise<boolean> => {
  try {
    if (!ctx.from?.id) {
      throw new Error("User ID not found in context");
    }

    const isUserExist = await User.findOne({ telegramId: ctx.from.id });
    if (!isUserExist) {
      if (!ctx.from?.username) {
        const user = new User({
          telegramId: ctx.from.id,
        });
        await user.save();
        console.log(`✅ New user registered: ${ctx.from.id} (no username)`);
      } else {
        const user = new User({
          telegramId: ctx.from.id,
          username: ctx.from.username,
        });
        await user.save();
        console.log(`✅ New user registered: ${ctx.from.id} (${ctx.from.username})`);
      }
      return false; // Новый пользователь зарегистрирован
    }
    return true; // Пользователь уже существует
  } catch (err) {
    console.error("❌ Error in user registration:", err);
    throw err;
  }
};
