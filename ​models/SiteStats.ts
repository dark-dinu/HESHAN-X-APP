import mongoose, { Schema, models } from 'mongoose'

const ActiveUserSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  lastActive: { type: Date, default: Date.now, expires: 45 },
})

const GlobalStatsSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  totalDownloads: { type: Number, default: 1250 },
  categories: {
    youtube: { type: Number, default: 420 },
    tiktok: { type: Number, default: 510 },
    instagram: { type: Number, default: 180 },
    facebook: { type: Number, default: 90 },
    spotify: { type: Number, default: 30 },
    pinterest: { type: Number, default: 10 },
    x: { type: Number, default: 6 },
    whatsapp: { type: Number, default: 4 },
  },
})

export const ActiveUser = models.ActiveUser || mongoose.model('ActiveUser', ActiveUserSchema)
export const GlobalStats = models.GlobalStats || mongoose.model('GlobalStats', GlobalStatsSchema)
