import Day from "../database/models/Day";
import User from "../database/models/User";
import { Types } from "mongoose";
import { getLocalDateFromUTC } from "../shared";

export class StreakService {
  static async markRead(
    userId: Types.ObjectId,
    utcDateString: string,
    type: "morning" | "evening",
    azkarId: Types.ObjectId
  ) {
    const localDate = getLocalDateFromUTC(utcDateString);

    await Day.updateOne(
      { userId, date: localDate, type },
      {
        $setOnInsert: { startedAt: new Date() },
        $addToSet: { azkarIds: azkarId },
        status: "read",
        finishedAt: new Date(),
      },
      { upsert: true }
    );

    await User.updateOne(
      { _id: userId },
      { $set: { lastReadAt: new Date(), lastReadDate: localDate } }
    );
  }

  static async markSkipped(
    userId: Types.ObjectId,
    date: string,
    type: "morning" | "evening"
  ) {
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

  static async markPostponed(
    userId: Types.ObjectId,
    date: string,
    type: "morning" | "evening",
    until: Date
  ) {
    await Day.findOneAndUpdate(
      { userId, date, type },
      { status: "postponed", postponedUntil: until },
      { upsert: true }
    );
  }

  static async getProfileStats(userId: Types.ObjectId) {
    const user = await User.findById(userId);
    const totalRead = await Day.countDocuments({ userId, status: "read" });
    const totalSkipped = await Day.countDocuments({
      userId,
      status: "skipped",
    });

    return {
      currentStreak: user?.currentStreak.value || 0,
      lastReadAt: user?.lastReadAt,
      totalReadDays: totalRead,
      totalSkippedDays: totalSkipped,
    };
  }
}
