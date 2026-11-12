import mongoose, { Schema, models } from 'mongoose'

const ActiveUserSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  lastActive: { type: Date, default: Date.now, expires: 40 },
})

const GlobalStatsSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  totalDownloads: { type: Number, default: 0 },
  categories: {
    youtube: { type: Number, default: 0 },
    tiktok: { type: Number, default: 0 },
    instagram: { type: Number, default: 0 },
    facebook: { type: Number, default: 0 },
    spotify: { type: Number, default: 0 },
    pinterest: { type: Number, default: 0 },
    x: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
  },
})

export const ActiveUser = models.ActiveUser || mongoose.model('ActiveUser', ActiveUserSchema)
export const GlobalStats = models.GlobalStats || mongoose.model('GlobalStats', GlobalStatsSchema)
