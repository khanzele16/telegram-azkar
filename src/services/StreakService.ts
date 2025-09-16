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

    const statsAgg = await Day.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    let morningRead = 0,
      eveningRead = 0,
      morningSkipped = 0,
      eveningSkipped = 0;

    for (const s of statsAgg) {
      if (s._id.type === "morning" && s._id.status === "read")
        morningRead = s.count;
      if (s._id.type === "evening" && s._id.status === "read")
        eveningRead = s.count;
      if (s._id.type === "morning" && s._id.status === "skipped")
        morningSkipped = s.count;
      if (s._id.type === "evening" && s._id.status === "skipped")
        eveningSkipped = s.count;
    }

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
