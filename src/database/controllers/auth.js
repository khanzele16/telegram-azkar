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
exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const register = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!((_a = ctx.from) === null || _a === void 0 ? void 0 : _a.id)) {
            throw new Error("User ID not found in context");
        }
        const isUserExist = yield User_1.default.findOne({ telegramId: ctx.from.id });
        if (!isUserExist) {
            if (!((_b = ctx.from) === null || _b === void 0 ? void 0 : _b.username)) {
                const user = new User_1.default({
                    telegramId: ctx.from.id,
                });
                yield user.save();
            }
            else {
                const user = new User_1.default({
                    telegramId: ctx.from.id,
                    username: ctx.from.username,
                });
                yield user.save();
            }
            return false;
        }
        return true;
    }
    catch (err) {
        console.error("❌ Error in user registration:", err);
        throw err;
    }
});
exports.register = register;
