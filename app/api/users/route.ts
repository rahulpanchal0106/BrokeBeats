import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { createUser, findUserBySpotifyId } from '@/app/models/User';
const uri = process.env.MONGODB_URI!;

export async function POST(request: Request) {
  try {
    const { spotifyId, displayName, email, likedSongs, personalLibrary } = await request.json();

    const existingUser = await findUserBySpotifyId(spotifyId);
    if (existingUser) {
      return NextResponse.json(existingUser);
    }

    const newUserId = await createUser({
      spotifyId,
      displayName,
      email,
      likedSongs,
      personalLibrary
    });

    return NextResponse.json({ _id: newUserId });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 