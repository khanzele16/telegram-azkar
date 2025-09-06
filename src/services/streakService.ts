import dayjs from "dayjs";
import { Types } from "mongoose";
import Day from "../database/models/Day";
import User from "../database/models/User";

export class StreakService {
  static async markRead(userId: Types.ObjectId, date: string, type: "morning" | "evening", azkarId: Types.ObjectId) {
    const day = await Day.findOneAndUpdate(
      { userId, date, type },
      {
        $set: { status: "read", finishedAt: new Date() },
        $addToSet: { azkarIds: azkarId },
        $setOnInsert: { startedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    const yesterday = dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
    const yesterdayRead = await Day.findOne({ userId, date: yesterday, status: "read" });

    const user = await User.findById(userId);
    const prevStreak = user?.currentStreak.value || 0;
    const newStreak = yesterdayRead ? prevStreak + 1 : 1;

    await User.findByIdAndUpdate(userId, {
      lastReadAt: new Date(),
      "currentStreak.value": newStreak,
      "currentStreak.lastUpdated": new Date(),
    });
  }

  static async markSkipped(userId: Types.ObjectId, date: string, type: "morning" | "evening") {
    await Day.findOneAndUpdate(
      { userId, date, type },
      { status: "skipped", finishedAt: new Date() },
      { upsert: true }
    );

    await User.findByIdAndUpdate(userId, {
      "currentStreak.value": 0,
      "currentStreak.lastUpdated": new Date(),
    });
  }

  static async markPostponed(userId: Types.ObjectId, date: string, type: "morning" | "evening", until: Date) {
    await Day.findOneAndUpdate(
      { userId, date, type },
      { status: "postponed", postponedUntil: until },
      { upsert: true }
    );
  }

  static async getProfileStats(userId: Types.ObjectId) {
    const user = await User.findById(userId);
    const totalRead = await Day.countDocuments({ userId, status: "read" });
    const totalSkipped = await Day.countDocuments({ userId, status: "skipped" });

    return {
      currentStreak: user?.currentStreak.value || 0,
      lastReadAt: user?.lastReadAt,
      totalReadDays: totalRead,
      totalSkippedDays: totalSkipped,
    };
  }
}
