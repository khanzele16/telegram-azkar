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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCallbackQuery = handleCallbackQuery;
const statsHandler_1 = require("./statsHandler");
const azkarNotification_1 = require("./azkarNotification");
function handleCallbackQuery(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const data = (_a = ctx.callbackQuery) === null || _a === void 0 ? void 0 : _a.data;
            if (!data) {
                yield ctx.answerCallbackQuery("❌ Некорректные данные");
                return;
            }
            if (data.startsWith("calendar:")) {
                const [, y, m] = data.split(":");
                const year = parseInt(y, 10);
                const month = parseInt(m, 10);
                if (!isNaN(year) && !isNaN(month)) {
                    yield (0, statsHandler_1.handleCalendarNavigation)(ctx, year, month);
                    return;
                }
            }
            if (data.startsWith("azkarnotify:")) {
                yield (0, azkarNotification_1.handleAzkarNotifyCallback)(ctx);
                return;
            }
            if (data.startsWith("slider:")) {
                yield (0, azkarNotification_1.handleSliderCallback)(ctx);
                return;
            }
            yield ctx.answerCallbackQuery("❌ Неизвестное действие");
        }
        catch (e) {
            console.error(e);
            try {
                yield ctx.answerCallbackQuery("❌ Ошибка");
            }
            catch (_b) { }
        }
    });
}
