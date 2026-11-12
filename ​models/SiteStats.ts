import mongoose, { Schema, models } from 'mongoose'

const ActiveUserSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  lastActive: { type: Date, default: Date.now, expires: 40 },
})

const cat = { type: Number, default: 0 }
const GlobalStatsSchema = new Schema({
  key: { type: String, default: 'main', unique: true },
  totalDownloads: { type: Number, default: 0 },
  categories: { youtube: cat, tiktok: cat, instagram: cat, facebook: cat, spotify: cat, pinterest: cat, x: cat, whatsapp: cat },
  recent: [{ _id: false, p: String, t: Date }],
})

export const ActiveUser = models.ActiveUser || mongoose.model('ActiveUser', ActiveUserSchema)
export const GlobalStats = models.GlobalStats || mongoose.model('GlobalStats', GlobalStatsSchema)
