import cron from "node-cron";
import dayjs from "dayjs";
import User from "../database/models/User";
import { scheduleAzkarNotification, PrayerType } from "../index";

export async function updatePrayerTimesAndSchedule(): Promise<void> {
  try {
    const users = await User.find({
      "timings.FajrUTC": { $exists: true },
      "timings.MaghribUTC": { $exists: true },
    });

    const now = dayjs().utc();

    for (const user of users) {
      if (!user.timings) continue;

      const userId = user._id.toString();
      const telegramId = user.telegramId;

      const prayers: PrayerType[] = ["Fajr", "Maghrib"];

      for (const prayer of prayers) {
        const timingUTC = user.timings[`${prayer}UTC`];
        if (!timingUTC) continue;

        let runAt = dayjs(timingUTC);
        if (runAt.isBefore(now)) {
          runAt = runAt.add(1, "day");
        }

        const date = runAt.format("YYYY-MM-DD");
        const runAtISO = runAt.toISOString();

        try {
          await scheduleAzkarNotification(
            userId,
            telegramId,
            prayer,
            date,
            runAtISO
          );
        } catch (err) {
          console.error(
            `❌ Ошибка при планировании ${prayer} для ${telegramId}:`,
            err
          );
        }
      }
    }
    console.log(
      `✅ Обновлены задачи напоминаний для ${users.length} пользователей`
    );
  } catch (err) {
    console.error("❌ Ошибка при обновлении расписания намазов:", err);
  }
}

export function startPrayerTimesCron(): void {
  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await updatePrayerTimesAndSchedule();
      } catch (e) {
        console.error("❌ Ошибка в cron при обновлении расписания:", e);
      }
    },
    { scheduled: true, timezone: "UTC" }
  );
}
