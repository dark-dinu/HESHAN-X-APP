import mongoose from 'mongoose'

const MONGODB_URI = (
  process.env.MONGODB_URI ||
  'mongodb+srv://diniduheshan40_db_user:Heshan2007@cluster0.5gazebm.mongodb.net/heshan_ofc_db?retryWrites=true&w=majority&appName=Cluster0'
).trim()

const g = global as any
const cached = g.__mongoose || (g.__mongoose = { conn: null, promise: null })

export function dbConfigured() {
  return /^mongodb(\+srv)?:\/\//.test(MONGODB_URI)
}

export async function connectDB() {
  if (!dbConfigured()) throw new Error('MONGODB_URI not set')
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: 'heshan_ofc_db',
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
      })
      .catch((e) => {
        cached.promise = null
        throw e
      })
  }
  cached.conn = await cached.promise
  return cached.conn
}
