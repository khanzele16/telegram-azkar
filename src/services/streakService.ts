import { Types } from "mongoose";
import User from "../database/models/User";
import Reading from "../database/models/Reading";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export class StreakService {
  static async markRead(userId: Types.ObjectId, date: string, azkarId: Types.ObjectId): Promise<void> {
    const today = dayjs.utc(date);
    const yesterday = today.subtract(1, "day").format("YYYY-MM-DD");

    await Reading.findOneAndUpdate(
      { userId, date },
      {
        $set: { status: "read" },
        $addToSet: { azkarIds: azkarId },
        $inc: { readCount: 1 },
        startedAt: new Date(),
        finishedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    const yesterdayReading = await Reading.findOne({ userId, date: yesterday, status: "read" });
    const user = await User.findById(userId);
    const prev = user?.currentStreak.value || 0;
    const newVal = yesterdayReading ? prev + 1 : 1;

    await User.findByIdAndUpdate(userId, {
      lastReadAt: new Date(),
      "currentStreak.value": newVal,
      "currentStreak.lastUpdated": new Date(),
    });
  }

  static async markSkipped(userId: Types.ObjectId, date: string): Promise<void> {
    await Reading.findOneAndUpdate(
      { userId, date },
      { status: "skipped", readCount: 0, finishedAt: new Date() },
      { upsert: true }
    );
    await User.findByIdAndUpdate(userId, {
      "currentStreak.value": 0,
      "currentStreak.lastUpdated": new Date(),
    });
  }

  static async markPostponed(userId: Types.ObjectId, date: string, until: Date): Promise<void> {
    await Reading.findOneAndUpdate(
      { userId, date },
      { status: "postponed", postponedUntil: until },
      { upsert: true }
    );
  }

  /**
   * 📊 Получение статистики профиля
   */
  static async getProfileStats(userId: Types.ObjectId): Promise<{
    currentStreak: number;
    lastReadAt?: Date;
    totalReadDays: number;
    totalSkippedDays: number;
  }> {
    const user = await User.findById(userId);
    if (!user) {
      return { currentStreak: 0, totalReadDays: 0, totalSkippedDays: 0 };
    }

    const totalReadDays = await Reading.countDocuments({ userId, status: "read" });
    const totalSkippedDays = await Reading.countDocuments({ userId, status: "skipped" });

    return {
      currentStreak: user.currentStreak?.value || 0,
      lastReadAt: user.lastReadAt || undefined,
      totalReadDays,
      totalSkippedDays,
    };
  }
}
