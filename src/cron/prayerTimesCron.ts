import cron from "node-cron";
import dayjs from "dayjs";
import User from "../database/models/User";
import { getPrayTime } from "../shared/requests";
import { scheduleAzkarNotification, PrayerType } from "../index";

export async function updatePrayerTimesAndSchedule(): Promise<void> {
  try {
    const users = await User.find({
      "location.latitude": { $exists: true },
      "location.longitude": { $exists: true },
    });

    for (const user of users) {
      if (!user.location) continue;

      const { latitude, longitude } = user.location;
      const userId = user._id.toString();
      const telegramId = user.telegramId;

      try {
        const prayTime = await getPrayTime(
          latitude.toString(),
          longitude.toString()
        );
        if (!prayTime) continue;

        const fajrUTC = dayjs
          .unix(prayTime.date.timestamp)
          .tz(prayTime.meta.timezone)
          .hour(Number(prayTime.timings.Fajr.split(":")[0]))
          .minute(Number(prayTime.timings.Fajr.split(":")[1]))
          .utc()
          .toISOString();

        const maghribUTC = dayjs
          .unix(prayTime.date.timestamp)
          .tz(prayTime.meta.timezone)
          .hour(Number(prayTime.timings.Maghrib.split(":")[0]))
          .minute(Number(prayTime.timings.Maghrib.split(":")[1]))
          .utc()
          .toISOString();

        await User.findByIdAndUpdate(userId, {
          "timings.FajrUTC": fajrUTC,
          "timings.MaghribUTC": maghribUTC,
          date: prayTime.date,
          localTimings: prayTime.timings,
        });

        const prayers: PrayerType[] = ["Fajr", "Maghrib"];
        for (const prayer of prayers) {
          const runAt = dayjs(prayer === "Fajr" ? fajrUTC : maghribUTC);
          const date = runAt.format("YYYY-MM-DD");
          const runAtISO = runAt.toISOString();

          await scheduleAzkarNotification(
            userId,
            telegramId,
            prayer,
            date,
            runAtISO
          );
        }
      } catch (err) {
        console.error(
          `❌ Ошибка при обновлении времени намаза для ${telegramId}:`,
          err
        );
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
    "10 0 * * *",
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
