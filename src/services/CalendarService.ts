import dayjs from "dayjs";
import { Types } from "mongoose";
import Day from "../database/models/Day";

export interface ICalendarDay {
  date: string;
  status: "read" | "skipped" | "postponed" | "none";
}

export interface IUserStats {
  morningRead: number;
  eveningRead: number;
  currentStreak: number;
  lastSkipped: string | null;
  maxStreak: number;
}

export class CalendarService {
  static async getMonthCalendar(
    userId: Types.ObjectId,
    year: number,
    month: number
  ): Promise<ICalendarDay[]> {
    const start = dayjs(`${year}-${month}-01`).startOf("month");
    const end = dayjs(start).endOf("month");

    const days = await Day.find({
      userId,
      date: { $gte: start.toDate(), $lte: end.toDate() },
    });

    const dayMap = new Map<string, ICalendarDay["status"]>();
    days.forEach((d) => {
      const status: ICalendarDay["status"] =
        d.status === "pending" ? "none" : d.status;
      dayMap.set(dayjs(d.date).format("YYYY-MM-DD"), status);
    });

    const result: ICalendarDay[] = [];
    for (
      let d = start;
      d.isBefore(end) || d.isSame(end, "day");
      d = d.add(1, "day")
    ) {
      const dateStr = d.format("YYYY-MM-DD");
      result.push({
        date: dateStr,
        status: dayMap.get(dateStr) || "none",
      });
    }

    return result;
  }

  static async getStats(userId: Types.ObjectId): Promise<IUserStats> {
    const days = await Day.find({ userId }).sort({ date: 1 });

    let morningRead = 0;
    let eveningRead = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let lastSkipped: string | null = null;

    days.forEach((d) => {
      if (d.status === "read") {
        if (d.type === "morning") morningRead++;
        if (d.type === "evening") eveningRead++;

        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (d.status === "skipped") {
          lastSkipped = dayjs(d.date).format("YYYY-MM-DD");
        }
        currentStreak = 0;
      }
    });

    return { morningRead, eveningRead, currentStreak, lastSkipped, maxStreak };
  }
}
