import mongoose from 'mongoose';
import { Track as TrackType } from '../types/music';

const trackSchema = new mongoose.Schema<TrackType>({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  filepath: { type: String, required: true },
  duration: { type: Number }
});

export const Track = mongoose.models.Track || mongoose.model<TrackType>('Track', trackSchema); 