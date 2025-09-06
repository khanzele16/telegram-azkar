import cron from "node-cron";
import User from "../database/models/User";
import { scheduleAzkarNotification } from "../queue/azkarQueue";

export async function updatePrayerTimesAndSchedule(): Promise<void> {
  const users = await User.find({
    "timings.fajrUTC": { $exists: true },
    telegramId: { $exists: true },
  });
  const today = new Date().toISOString().slice(0, 10);
  for (const user of users) {
    if (user.timings?.FajrUTC && user.preferences?.notifyMorning) {
      await scheduleAzkarNotification(
        user._id.toString(),
        user.telegramId,
        "Fajr",
        today,
        user.timings.FajrUTC
      );
    }
    if (user.timings?.MaghribUTC && user.preferences?.notifyEvening) {
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
