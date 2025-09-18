import { model, Schema, Types } from "mongoose";
import { IAzkar } from "../../types/models";

const Azkar = new Schema<IAzkar>(
  {
    text: { type: String, required: true },
    category: { type: String, required: true, index: true },
    translation: String,
    transcription: String,
    audio: String,
  },
  { collection: "azkars" }
);

export default model<IAzkar>("Azkar", Azkar);
