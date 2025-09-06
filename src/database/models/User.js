"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const User = new mongoose_1.Schema({
    telegramId: { type: Number, required: true, unique: true },
    username: { type: String, unique: true, sparse: true },
    location: {
        latitude: { type: String },
        longitude: { type: String },
    },
    date: {
        readable: { type: String },
        timestamp: { type: Number },
    },
    timings: {
        Fajr: { type: String },
        Maghrib: { type: String },
        fajrUTC: { type: String },
        maghribUTC: { type: String },
    },
    currentStreak: {
        value: { type: Number, default: 0 },
        lastUpdated: { type: Date },
    },
    lastReadAt: { type: Date },
    preferences: {
        notifyMorning: { type: Boolean, default: true },
        notifyEvening: { type: Boolean, default: true },
    },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("User", User);
