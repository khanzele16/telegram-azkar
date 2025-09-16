import Day from "../database/models/Day";
import User from "../database/models/User";
import { Types } from "mongoose";
import { getLocalDateFromUTC } from "../shared";

export class StreakService {
  static async markRead(
    userId: Types.ObjectId,
    utcDateString: string,
    type: "morning" | "evening"
  ) {
    const localDate = getLocalDateFromUTC(utcDateString);

    await Day.updateOne(
      { userId, date: localDate, type },
      {
        $setOnInsert: { startedAt: new Date() },
        $set: { status: "read", finishedAt: new Date() },
      },
      { upsert: true }
    );

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          lastReadAt: localDate,
          lastReadDate: localDate,
        },
      }
    );
  }

  static async markSkipped(
    userId: Types.ObjectId,
    date: string,
    type: "morning" | "evening"
  ) {
    await Day.updateOne(
      { userId, date, type },
      {
        $setOnInsert: { startedAt: new Date() },
        $set: { status: "skipped", finishedAt: new Date() },
      },
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
    await Day.updateOne(
      { userId, date, type },
      {
        $setOnInsert: { startedAt: new Date() },
        $set: { status: "postponed", postponedUntil: until },
      },
      { upsert: true }
    );
  }

  static async getProfileStats(userId: Types.ObjectId) {
    const user = await User.findById(userId);

    const morningRead = await Day.countDocuments({
      userId,
      type: "morning",
      status: "read",
    });

    const eveningRead = await Day.countDocuments({
      userId,
      type: "evening",
      status: "read",
    });

    const morningSkipped = await Day.countDocuments({
      userId,
      type: "morning",
      status: "skipped",
    });

    const eveningSkipped = await Day.countDocuments({
      userId,
      type: "evening",
      status: "skipped",
    });

    return {
      streak: user?.currentStreak.value || 0,
      lastReadAt: user?.lastReadAt
        ? getLocalDateFromUTC(user.lastReadAt.toISOString())
        : null,
      morningRead,
      eveningRead,
      morningSkipped,
      eveningSkipped,
    };
  }
}
