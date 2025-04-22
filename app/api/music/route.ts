import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import * as mm from 'music-metadata'
import { MongoClient } from 'mongodb'
import { NextRequest } from 'next/server'
import { getUserBySpotifyId } from '@/app/lib/db'
import { connectToDatabase } from '@/app/lib/db'
import { User } from '@/app/models/User'
import { Track } from '@/app/types/music'
//mport { MongoClient } from 'mongodb'


interface Metadata {
  [key: string]: {
    title: string
    artist: string
  }
}

const uri = process.env.MONGODB_URI!

// Function to get metadata
function getMetadata(): Metadata {
  const metadataPath = path.join(process.cwd(), 'public', 'music', 'metadata.json')
  
  try {
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    }
  } catch (error) {
    console.error('Error reading metadata:', error)
  }
  
  return {}
}

// Function to get audio duration using music-metadata
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const buffer = fs.readFileSync(filePath)
    const metadata = await mm.parseBuffer(buffer)
    return metadata.format.duration || 0
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error)
    return 0
  }
}

// Function to fetch track data from the database
async function fetchTrackData(videoId: string) {
  const client = await MongoClient.connect(uri)
  const db = client.db() // Replace with your database name
  const collection = db.collection('tracks')

  // Find track by videoId in filepath
  const trackData = await collection.findOne({
    filepath: { $regex: videoId, $options: 'i' } // Case-insensitive search for videoId in filepath
  })

  client.close()
  return trackData
}

// Dummy example — implement according to your token system
async function getUserIdFromToken(token: string): Promise<string | null> {
  // Example for token containing user ID as base64 JSON: { "id": "abc123" }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.id || null
  } catch {
    return null
  }
}
//onst uri = process.env.MONGODB_URI!

export async function POST(req: NextRequest) {
  try {
    const reqData = await req.json();
    const userId = reqData.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    await connectToDatabase();
    const user = await User.findOne({ spotifyId: userId });
    const userObj = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
    console.log("🔥🔥🔥 ",userObj);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const personalList = userObj.personalLibrary || [];
    
    // Sort tracks by title
  //   const sortedTracks = personalList.sort((a: Track, b: Track) => 
  //     a.title.localeCompare(b.title)
  // );
  console.log("🥲🥲🥲 ",userObj.personalLibrary);

    return NextResponse.json({tracks: personalList});
  } catch (error) {
    console.error('Error fetching music list:', error);
    return NextResponse.json({
      error: 'Failed to fetch user tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


