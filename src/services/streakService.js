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
exports.StreakService = void 0;
const User_1 = __importDefault(require("../database/models/User"));
const Reading_1 = __importDefault(require("../database/models/Reading"));
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
dayjs_1.default.extend(utc_1.default);
class StreakService {
    static markRead(userId, date, azkarId) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = dayjs_1.default.utc(date);
            const yesterday = today.subtract(1, "day").format("YYYY-MM-DD");
            yield Reading_1.default.findOneAndUpdate({ userId, date }, {
                $set: { status: "read" },
                $addToSet: { azkarIds: azkarId },
                $inc: { readCount: 1 },
                startedAt: new Date(),
                finishedAt: new Date(),
            }, { upsert: true, new: true });
            const yesterdayReading = yield Reading_1.default.findOne({ userId, date: yesterday, status: "read" });
            const user = yield User_1.default.findById(userId);
            const prev = (user === null || user === void 0 ? void 0 : user.currentStreak.value) || 0;
            const newVal = yesterdayReading ? prev + 1 : 1;
            yield User_1.default.findByIdAndUpdate(userId, {
                lastReadAt: new Date(),
                "currentStreak.value": newVal,
                "currentStreak.lastUpdated": new Date(),
            });
        });
    }
    static markSkipped(userId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Reading_1.default.findOneAndUpdate({ userId, date }, { status: "skipped", readCount: 0, finishedAt: new Date() }, { upsert: true });
            yield User_1.default.findByIdAndUpdate(userId, {
                "currentStreak.value": 0,
                "currentStreak.lastUpdated": new Date(),
            });
        });
    }
    static markPostponed(userId, date, until) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Reading_1.default.findOneAndUpdate({ userId, date }, { status: "postponed", postponedUntil: until }, { upsert: true });
        });
    }
    /**
     * 📊 Получение статистики профиля
     */
    static getProfileStats(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield User_1.default.findById(userId);
            if (!user) {
                return { currentStreak: 0, totalReadDays: 0, totalSkippedDays: 0 };
            }
            const totalReadDays = yield Reading_1.default.countDocuments({ userId, status: "read" });
            const totalSkippedDays = yield Reading_1.default.countDocuments({ userId, status: "skipped" });
            return {
                currentStreak: ((_a = user.currentStreak) === null || _a === void 0 ? void 0 : _a.value) || 0,
                lastReadAt: user.lastReadAt || undefined,
                totalReadDays,
                totalSkippedDays,
            };
        });
    }
}
exports.StreakService = StreakService;
