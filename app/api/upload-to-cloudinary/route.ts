import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const file = await request.blob();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("Uploading file:", { size: file.size, type: file.type });
    
    // Use promise to handle the upload stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',  // Try using 'raw' instead of 'video'
          folder: 'music',
          public_id: `music_${Date.now()}`,  // Generate unique ID
          access_mode: 'public',
          format: 'mp3'  // Force the format to MP3
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error details:", error);
            reject(error);
            return;
          }
          resolve(result);
        }
      );
      
      // Write buffer to upload stream
      uploadStream.end(buffer);
    });
    
    console.log("Upload successful:", result);
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      result
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}