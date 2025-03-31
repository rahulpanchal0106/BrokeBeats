import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

interface Metadata {
  [key: string]: { title: string }
}

// Function to save metadata
function saveMetadata(filename: string, title: string) {
  const metadataPath = path.join(process.cwd(), 'public', 'music', 'metadata.json')
  let metadata: Metadata = {}
  
  try {
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
    }
  } catch (error) {
    console.error('Error reading metadata:', error)
  }

  metadata[filename] = { title }
  
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
  } catch (error) {
    console.error('Error saving metadata:', error)
  }
}

// Function to get metadata
function getMetadata(filename: string) {
  const metadataPath = path.join(process.cwd(), 'public', 'music', 'metadata.json')
  
  try {
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      return metadata[filename]?.title || filename.replace('.mp3', '')
    }
  } catch (error) {
    console.error('Error reading metadata:', error)
  }
  
  return filename.replace('.mp3', '')
}

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = await params
    const musicDir = path.join(process.cwd(), 'public', 'music')

    // Create music directory if it doesn't exist
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true })
    }

    const filePath = path.join(musicDir, filename)

    // Check if file exists in music directory
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath)
      const title = getMetadata(filename)
      
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000',
          'X-Title': title
        },
      })
    }

    // If file doesn't exist, fetch it from the converter server
    const converterUrl = process.env.CONVERTER_SERVER_URL || 'https://ni-exit-symphony-sheer.trycloudflare.com                                          '
    const response = await fetch(`${converterUrl}/files/${filename}`)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get the title from the response headers if available
    const title = response.headers.get('X-Title') || filename.replace('.mp3', '')
    
    // Save the file to music directory
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(filePath, Buffer.from(buffer))
    
    // Save the metadata
    saveMetadata(filename, title)

    // Return the file
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
        'X-Title': title
      },
    })
  } catch (error) {
    console.error('Error handling file:', error)
    return NextResponse.json({ error: 'Failed to handle file' }, { status: 500 })
  }
} 