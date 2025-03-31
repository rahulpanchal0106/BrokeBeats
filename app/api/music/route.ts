import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import * as mm from 'music-metadata'

interface Metadata {
  [key: string]: {
    title: string
    artist: string
  }
}

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

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music')
    const metadataPath = path.join(musicDir, 'metadata.json')

    // Read metadata if it exists
    let metadata: Metadata = {}
    try {
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
      }
    } catch (error) {
      console.error('Error reading metadata:', error)
    }

    // Read all files in the music directory
    const files = fs.readdirSync(musicDir)
    const musicFiles = files
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const filePath = path.join(musicDir, file)
        const stats = fs.statSync(filePath)
        const fileMetadata = metadata[file] || { title: file.replace('.mp3', ''), artist: 'Unknown Artist' }

        return {
          id: parseInt(file.replace('.mp3', '')),
          title: fileMetadata.title,
          artist: fileMetadata.artist,
          duration: 0, // This will be updated by the client when the audio loads
          url: `/music/${file}`
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title))

    return NextResponse.json(musicFiles)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Failed to list music files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 