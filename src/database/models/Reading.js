"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ReadingSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    status: { type: String, enum: ["pending", "read", "skipped", "postponed"], default: "pending" },
    readCount: { type: Number, default: 0 },
    azkarIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Azkar" }],
    startedAt: Date,
    finishedAt: Date,
    postponedUntil: Date,
}, { timestamps: true, collection: "readings" });
ReadingSchema.index({ userId: 1, date: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("Reading", ReadingSchema);
