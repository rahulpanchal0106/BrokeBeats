import mongoose from 'mongoose';
import { User, Track } from '../types/music';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Define global mongoose cache
let cached: {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      ssl: true,
      tls: true,
      tlsInsecure: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Define Mongoose schemas and models
const UserSchema = new mongoose.Schema({
  spotifyId: { type: String, required: true, unique: true },
  // Add other user fields based on your User type
});

const TrackSchema = new mongoose.Schema({
  filepath: { type: String, required: true },
  // Add other track fields based on your Track type
});

// Only create the models if they don't already exist
const UserModel = mongoose.models.User || mongoose.model<User & mongoose.Document>('User', UserSchema);
const TrackModel = mongoose.models.Track || mongoose.model<Track & mongoose.Document>('Track', TrackSchema);

export async function getUserBySpotifyId(spotifyId: string): Promise<User | null> {
  await connectToDatabase();
  // Use the Mongoose model to query
  const user = await UserModel.findOne({ spotifyId }).lean();
  return user;
}

export async function getTrackByVideoId(videoId: string): Promise<Track | null> {
  await connectToDatabase();
  // Use the Mongoose model to query
  return await TrackModel.findOne({
    filepath: { $regex: videoId, $options: 'i' }
  }).lean();
}