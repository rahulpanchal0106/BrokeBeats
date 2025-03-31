import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = await params
    const musicDir = path.join(process.cwd(), 'public', 'music')
    const filePath = path.join(musicDir, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found',
        details: 'The requested song is not available in the library'
      }, { status: 404 })
    }

    // Read metadata
    const metadataPath = path.join(musicDir, 'metadata.json')
    let metadata: Record<string, { title: string }> = {}
    
    try {
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      }
    } catch (error) {
      console.error('Error reading metadata:', error)
    }

    const title = metadata[filename]?.title || filename.replace('.mp3', '')

    return NextResponse.json({
      message: 'Song added to library',
      filename,
      title
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 