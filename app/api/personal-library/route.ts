import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

const uri = process.env.MONGODB_URI!;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('user-id'); // Get user ID from headers
    const client = await MongoClient.connect(uri);
    const db = client.db();
    const collection = db.collection('users');

    // Fetch user's personal library tracks
    const user = await collection.findOne({ spotifyId: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ tracks: user.personalLibrary });
  } catch (error) {
    console.error('Error fetching personal library:', error);
    return NextResponse.json({ error: 'Failed to fetch personal library' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { trackUrl, trackData, userId } = await request.json();
    console.log("♾️♾️♾️ ",trackData, userId, trackUrl)
    const client = await MongoClient.connect(uri);
    const db = client.db();
    const collection = db.collection('users');

    // Update user's personal library
    await collection.updateOne(
      { spotifyId: userId },
      { $push: { personalLibrary: { ...trackData, filepath: trackUrl } } } // Store the Cloudinary URL
    );

    await client.close();

    return NextResponse.json({
      success: true,
      trackId: trackData._id,
      filepath: trackUrl,
      ...trackData
    });
  } catch (error) {
    console.error('Error adding track to personal library:', error);
    return NextResponse.json({ error: 'Failed to add track' }, { status: 500 });
  }
} 