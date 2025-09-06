"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrayerTimesAndSchedule = updatePrayerTimesAndSchedule;
exports.startPrayerTimesCron = startPrayerTimesCron;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = __importDefault(require("../database/models/User"));
const azkarQueue_1 = require("../queue/azkarQueue");
function updatePrayerTimesAndSchedule() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const users = yield User_1.default.find({ "timings.fajrUTC": { $exists: true }, telegramId: { $exists: true } });
        const today = new Date().toISOString().slice(0, 10);
        for (const user of users) {
            if (((_a = user.timings) === null || _a === void 0 ? void 0 : _a.fajrUTC) && ((_b = user.preferences) === null || _b === void 0 ? void 0 : _b.notifyMorning)) {
                yield (0, azkarQueue_1.scheduleAzkarNotification)(user._id.toString(), user.telegramId, "Fajr", today, user.timings.fajrUTC.toString());
            }
            if (((_c = user.timings) === null || _c === void 0 ? void 0 : _c.maghribUTC) && ((_d = user.preferences) === null || _d === void 0 ? void 0 : _d.notifyEvening)) {
                yield (0, azkarQueue_1.scheduleAzkarNotification)(user._id.toString(), user.telegramId, "Maghrib", today, user.timings.maghribUTC.toString());
            }
        }
    });
}
function startPrayerTimesCron() {
    node_cron_1.default.schedule("0 0 * * *", () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield updatePrayerTimesAndSchedule();
        }
        catch (e) {
            console.error(e);
        }
    }), { scheduled: true, timezone: "UTC" });
    updatePrayerTimesAndSchedule().catch(console.error);
}
