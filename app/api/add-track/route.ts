// For App Router (/app/api/add-track/route.js)
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fetch from 'node-fetch';

export async function GET(request: NextRequest) {
  const url = new URL(request.nextUrl);
  const trackUrl = url.searchParams.get('trackUrl');
  
  if (!trackUrl) {
    return NextResponse.json({ error: 'Missing trackUrl' }, { status: 400 });
  }
  
  try {
    console.log("************** ",trackUrl)
    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}${trackUrl}`);
    if (!response.ok) throw new Error('Failed to download track');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Define save paths

    let fileName;
try {
    fileName = path.basename(new URL(trackUrl).pathname);
} catch (err) {
    fileName = path.basename(trackUrl);
}

    const savePath = path.join(process.cwd(), 'public/music', fileName);
    
    // Ensure directory exists
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(savePath, buffer);
    
    return NextResponse.json({ 
      message: 'Track saved successfully', 
      filePath: `/music/${fileName}` 
    });
  } catch (error: any) {
    console.error('Error saving track:', error);
    return NextResponse.json(
      { error: 'Failed to save track', details: error.message }, 
      { status: 500 }
    );
  }
}