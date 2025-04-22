import mongoose from 'mongoose';
import { User as UserType } from '../types/music';

const userSchema = new mongoose.Schema<UserType>({
  spotifyId: { type: String, required: true, unique: true },
  personalLibrary: [{
    title: { type: String, required: true },
    artist: { type: String, required: true },
    filepath: { type: String, required: true },
    duration: { type: Number }
  }]
});

export const User = mongoose.models.User || mongoose.model<UserType>('User', userSchema); 