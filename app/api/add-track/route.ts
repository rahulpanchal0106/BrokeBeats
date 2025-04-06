import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uri = process.env.MONGODB_URI!;

export async function GET(request: NextRequest) {
  const url = new URL(request.nextUrl);
  const trackUrl = url.searchParams.get('trackUrl');
 
  if (!trackUrl) {
    return NextResponse.json({ error: 'Missing trackUrl' }, { status: 400 });
  }
 
  try {
    // Upload directly to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(trackUrl, {
      resource_type: 'video',
      folder: 'music',
      format: 'mp3'
    });

    return NextResponse.json({
      message: 'Track saved successfully',
      filePath: uploadResponse.secure_url,
      name: uploadResponse.public_id
    });

  } catch (error: any) {
    console.error('Error saving track:', error);
    return NextResponse.json(
      { error: 'Failed to save track', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { trackUrl, trackData, shouldDownload } = await request.json();
    
    // Connect to MongoDB
    const client = await MongoClient.connect(uri);
    const db = client.db();
    const collection = db.collection('tracks');
    console.log("TRACK DATA: ", trackData, shouldDownload, trackUrl);
    
    let filepath;
    
    if (!shouldDownload) {
      // Upload directly to Cloudinary
      try {
        const uploadResponse = await cloudinary.uploader.upload(trackUrl, {
          resource_type: 'video',
          folder: 'music',
          format: 'mp3'
        });
        
        filepath = uploadResponse.secure_url;
        console.log("Cloudinary upload success: ", filepath);
      } catch (cloudinaryError: any) {
        console.error('Cloudinary upload error:', cloudinaryError);
        throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
      }
    } else {
      filepath = trackUrl;
    }
    
    // Store track data in MongoDB
    const result = await collection.insertOne({
      ...trackData,
      filepath,
      createdAt: new Date(),
      isDownloaded: shouldDownload
    });
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      trackId: result.insertedId,
      filepath,
      ...trackData
    });
  } catch (error: any) {
    console.error('Add track error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add track' },
      { status: 500 }
    );
  }
}