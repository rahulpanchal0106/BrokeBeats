import fs from 'fs';
import path from 'path';
import * as mm from 'music-metadata';
import { Metadata } from '../types/music';

export function getMetadata(): Metadata {
  const metadataPath = path.join(process.cwd(), 'public', 'music', 'metadata.json');
  
  try {
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error reading metadata:', error);
  }
  
  return {};
}

export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const buffer = fs.readFileSync(filePath);
    const metadata = await mm.parseBuffer(buffer);
    return metadata.format.duration || 0;
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    return 0;
  }
} 