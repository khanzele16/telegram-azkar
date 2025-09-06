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
exports.azkarWorker = exports.azkarQueueEvents = exports.azkarQueue = void 0;
exports.scheduleAzkarNotification = scheduleAzkarNotification;
exports.postponeAzkarNotification = postponeAzkarNotification;
exports.cancelAzkarNotification = cancelAzkarNotification;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
const bullmq_1 = require("bullmq");
const azkarNotification_1 = require("../handlers/azkarNotification");
dotenv_1.default.config({ path: "src/.env" });
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("REDIS_URL is not set. Provide Upstash rediss:// URL in env.");
}
const connection = new ioredis_1.default(redisUrl, {
    tls: {},
    maxRetriesPerRequest: null,
});
exports.azkarQueue = new bullmq_1.Queue("azkar", { connection });
exports.azkarQueueEvents = new bullmq_1.QueueEvents("azkar", { connection });
function jobKey(userId, prayer, date) {
    return `${userId}:${prayer}:${date}`;
}
function scheduleAzkarNotification(userId, telegramId, prayer, date, runAtISO, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const delay = Math.max(0, new Date(runAtISO).getTime() - Date.now());
        const jobId = jobKey(userId, prayer, date);
        const opts = {
            jobId,
            delay,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: 50,
        };
        yield exports.azkarQueue.add("send", { userId, telegramId, prayer, date, chatId }, opts);
    });
}
function postponeAzkarNotification(userId, telegramId, prayer, date, chatId) {
    return __awaiter(this, void 0, void 0, function* () {
        const jobId = jobKey(userId, prayer, date);
        try {
            yield exports.azkarQueue.remove(jobId);
        }
        catch (_a) { }
        const delay = 60 * 60 * 1000;
        yield exports.azkarQueue.add("send", { userId, telegramId, prayer, date, chatId }, {
            jobId,
            delay,
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: 50,
        });
    });
}
function cancelAzkarNotification(userId, prayer, date) {
    return __awaiter(this, void 0, void 0, function* () {
        const jobId = jobKey(userId, prayer, date);
        try {
            yield exports.azkarQueue.remove(jobId);
        }
        catch (_a) { }
    });
}
exports.azkarWorker = new bullmq_1.Worker("azkar", (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { telegramId, prayer, date, chatId } = job.data;
    yield (0, azkarNotification_1.sendAzkarNotification)(telegramId, prayer, date, chatId);
}), { connection });
