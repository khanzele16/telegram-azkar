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
    if (user.timings?.FajrUTC && user.preferences?.notifyMorning) {
      const fajrTime = dayjs(user.timings.FajrUTC);
      const scheduleFajrTime = fajrTime.isBefore(now)
        ? now.add(1, "minute")
        : fajrTime;
      await scheduleAzkarNotification(
        user._id.toString(),
        user.telegramId,
        "Fajr",
        today,
        scheduleFajrTime.toISOString()
      );
    }

    if (user.timings?.MaghribUTC && user.preferences?.notifyEvening) {
      const maghribTime = dayjs(user.timings.MaghribUTC);
      const scheduleMaghribTime = maghribTime.isBefore(now)
        ? now.add(1, "minute")
        : maghribTime;
      await scheduleAzkarNotification(
        user._id.toString(),
        user.telegramId,
        "Maghrib",
        today,
        scheduleMaghribTime.toISOString()
      );
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
}
