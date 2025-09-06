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
exports.CalendarService = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const Day_1 = __importDefault(require("../database/models/Day"));
class CalendarService {
    static getMonthCalendar(userId, year, month) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = (0, dayjs_1.default)(`${year}-${month}-01`).startOf("month");
            const end = (0, dayjs_1.default)(start).endOf("month");
            const days = yield Day_1.default.find({
                userId,
                date: { $gte: start.toDate(), $lte: end.toDate() },
            });
            const dayMap = new Map();
            days.forEach((d) => {
                const status = d.status === "pending" ? "none" : d.status;
                dayMap.set((0, dayjs_1.default)(d.date).format("YYYY-MM-DD"), status);
            });
            const result = [];
            for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
                const dateStr = d.format("YYYY-MM-DD");
                result.push({
                    date: dateStr,
                    status: dayMap.get(dateStr) || "none",
                });
            }
            return result;
        });
    }
    static getStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const days = yield Day_1.default.find({ userId }).sort({ date: 1 });
            let morningRead = 0;
            let eveningRead = 0;
            let currentStreak = 0;
            let maxStreak = 0;
            let lastSkipped = null;
            days.forEach((d) => {
                if (d.status === "read") {
                    if (d.type === "morning")
                        morningRead++;
                    if (d.type === "evening")
                        eveningRead++;
                    currentStreak++;
                    maxStreak = Math.max(maxStreak, currentStreak);
                }
                else {
                    if (d.status === "skipped") {
                        lastSkipped = (0, dayjs_1.default)(d.date).format("YYYY-MM-DD");
                    }
                    currentStreak = 0;
                }
            });
            return { morningRead, eveningRead, currentStreak, lastSkipped, maxStreak };
        });
    }
}
exports.CalendarService = CalendarService;
