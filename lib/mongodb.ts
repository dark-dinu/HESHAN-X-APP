import mongoose from 'mongoose'

const FALLBACK_URI =
  'mongodb+srv://diniduheshan2007_db_user:SZD7sfcIU6Einajx@cluster0.ah8jggk.mongodb.net/dark-dinu?retryWrites=true&w=majority&appName=Cluster0'

const envUri = (process.env.MONGODB_URI || '').trim()
const MONGODB_URI = /^mongodb(\+srv)?:\/\//.test(envUri) ? envUri : FALLBACK_URI

const g = global as any
const cached = g.__mongoose || (g.__mongoose = { conn: null, promise: null })

export function dbConfigured() {
  return /^mongodb(\+srv)?:\/\//.test(MONGODB_URI)
}

export async function connectDB() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .catch((e) => {
        cached.promise = null
        throw e
      })
  }
  cached.conn = await cached.promise
  return cached.conn
}
