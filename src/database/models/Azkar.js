"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const Azkar = new mongoose_1.Schema({
    text: { type: String, required: true },
    category: { type: String, required: true, index: true },
    translation: String,
    transcription: String,
    audio: String,
}, { timestamps: true, collection: "azkar" });
exports.default = (0, mongoose_1.model)("Azkar", Azkar);
