import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Day from "../database/models/Day";
import User from "../database/models/User";
import timezone from "dayjs/plugin/timezone";
import { Types } from "mongoose";
import { getLocalDateFromUTC } from "../shared";

dayjs.extend(utc);
dayjs.extend(timezone);

export class StreakService {
  static async markRead(
    userId: Types.ObjectId,
    utcDateString: string,
    type: "morning" | "evening"
  ) {
    const localDate = getLocalDateFromUTC(utcDateString);
    let newStreak = 0;

    const updatedDay = await Day.findOneAndUpdate(
      { userId, date: localDate, type },
      {
        $setOnInsert: { startedAt: new Date() },
        $set: { status: "read", finishedAt: new Date() },
      },
      { upsert: true }
    );
    console.log(localDate)

    const user = await User.findById(userId);
    if (!user) return;

    if (updatedDay) {
      user.lastReadAt = dayjs().tz(updatedDay.timezone).toDate();
      await user.save();
    }

    const morning = await Day.findOne({
      userId,
      date: localDate,
      type: "morning",
      status: "read",
    });
    const evening = await Day.findOne({
      userId,
      date: localDate,
      type: "evening",
      status: "read",
    });

    if (morning && evening) {
      newStreak += 1;
    }

    if (updatedDay) {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            lastReadAt: dayjs().tz(updatedDay.timezone).toDate(),
            "currentStreak.value": newStreak,
            "currentStreak.lastUpdated": dayjs()
              .tz(updatedDay.timezone)
              .toDate(),
          },
        }
      );
    } else {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            "currentStreak.value": newStreak,
            "currentStreak.lastUpdated": new Date(),
          },
        }
      );
    }
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

    const lastReadAtFormatted = user?.lastReadAt
      ? dayjs(user.lastReadAt).format("DD.MM.YYYY HH:mm")
      : null;

    return {
      streak: user?.currentStreak.value || 0,
      lastReadAt: lastReadAtFormatted,
      morningRead,
      eveningRead,
      morningSkipped,
      eveningSkipped,
    };
  }
}
