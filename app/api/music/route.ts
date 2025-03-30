import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import * as mm from 'music-metadata'

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
    const files = fs.readdirSync(musicDir)
    
    const musicFiles = await Promise.all(
      files
        .filter(file => file.endsWith('.mp3'))
        .map(async (file, index) => {
          // Extract title from filename (remove .mp3 and replace hyphens/underscores with spaces)
          const title = file
            .replace('.mp3', '')
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')

          const filePath = path.join(musicDir, file)
          let duration = 0

          try {
            duration = await getAudioDuration(filePath)
          } catch (error) {
            console.error(`Error getting duration for ${file}:`, error)
          }

          return {
            id: index + 1,
            title,
            artist: "Unknown Artist", // You might want to add metadata handling later
            duration,
            url: `/music/${file}`
          }
        })
    )

    return NextResponse.json(musicFiles)
  } catch (error) {
    console.error('Error reading music directory:', error)
    return NextResponse.json({ error: 'Failed to read music files' }, { status: 500 })
  }
} 