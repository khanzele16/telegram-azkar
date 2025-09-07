import cron from "node-cron";
import dayjs from "dayjs";
import User from "../database/models/User";
import Day from "../database/models/Day";
import { scheduleAzkarNotification } from "../";

export async function updatePrayerTimesAndSchedule(): Promise<void> {
  const users = await User.find({
    "timings.FajrUTC": { $exists: true },
    telegramId: { $exists: true },
  });

  const today = dayjs().format("YYYY-MM-DD");
  const now = dayjs();

  for (const user of users) {
    // Утренний азкар
    if (user.timings?.FajrUTC && user.preferences?.notifyMorning) {
      const fajrTime = dayjs(user.timings.FajrUTC);
      if (fajrTime.isBefore(now)) {
        await Day.findOneAndUpdate(
          { userId: user._id, date: today, type: "morning" },
          { status: "skipped", startedAt: fajrTime.toDate(), finishedAt: now.toDate() },
          { upsert: true }
        );
      } else {
        await scheduleAzkarNotification(
          user._id.toString(),
          user.telegramId,
          "Fajr",
          today,
          user.timings.FajrUTC
        );
      }
    }

    // Вечерний азкар
    if (user.timings?.MaghribUTC && user.preferences?.notifyEvening) {
      const maghribTime = dayjs(user.timings.MaghribUTC);
      if (maghribTime.isBefore(now)) {
        await Day.findOneAndUpdate(
          { userId: user._id, date: today, type: "evening" },
          { status: "skipped", startedAt: maghribTime.toDate(), finishedAt: now.toDate() },
          { upsert: true }
        );
      } else {
        await scheduleAzkarNotification(
          user._id.toString(),
          user.telegramId,
          "Maghrib",
          today,
          user.timings.MaghribUTC
        );
      }
    }
  }
}

export function startPrayerTimesCron(): void {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await updatePrayerTimesAndSchedule();
      } catch (e) {
        console.error(e);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );

  updatePrayerTimesAndSchedule().catch(console.error);
}
