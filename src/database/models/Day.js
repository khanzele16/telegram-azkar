"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const Day = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    azkarsId: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Azkar",
            required: true,
        }],
    date: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
    type: { type: String, enum: ["morning", "evening"], required: true },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Day", Day);
