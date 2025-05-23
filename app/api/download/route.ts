import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Keep track of ongoing downloads
const ongoingDownloads = new Set<string>()

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Check if this URL is already being processed
    if (ongoingDownloads.has(url)) {
      return NextResponse.json({ 
        error: 'This video is already being processed',
        details: 'Please wait for the current download to complete'
      }, { status: 409 })
    }

    // First, check if the file already exists
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/)?.[1]
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL',
        details: 'Please provide a valid YouTube video URL'
      }, { status: 400 })
    }

    const filename = `${videoId}.mp3`
    const musicDir = path.join(process.cwd(), 'public', 'music')
    const filePath = path.join(musicDir, filename)

    // Add URL to ongoing downloads
    ongoingDownloads.add(url)

    try {
      // First, get the video info to get the title and artist
      const infoResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      if (!infoResponse.ok) {
        const errorText = await infoResponse.text()
        console.error('Info API error:', errorText)
        return NextResponse.json({ 
          error: 'Failed to get video info',
          details: errorText
        }, { status: 500 })
      }

      const info = await infoResponse.json()
      const title = info.title || 'Unknown Title'
      const artist = info.author_name || 'Unknown Artist'

      // Start the download
      const response = await fetch(`${process.env.CONVERTER_SERVER_URL || 'https://ni-exit-symphony-sheer.trycloudflare.com'}/download?url=${encodeURIComponent(url)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Download API error:', errorText)
        return NextResponse.json({ 
          error: 'Failed to start download',
          details: errorText
        }, { status: 500 })
      }

      const data = await response.json()
      
      // If the converter server indicates the file exists or is being processed
      if (data.message?.includes('already exists') || data.message?.includes('already processing')) {
        // Check if we need to download the file from the converter server
        if (!fs.existsSync(filePath)) {
          try {
            // Download the file from the converter server
            const fileResponse = await fetch(`${process.env.CONVERTER_SERVER_URL || 'https://ni-exit-symphony-sheer.trycloudflare.com'}/files/${data.filename || filename}`)
            if (!fileResponse.ok) {
              throw new Error('Failed to download file from converter server')
            }
            
            // Ensure the music directory exists
            if (!fs.existsSync(musicDir)) {
              fs.mkdirSync(musicDir, { recursive: true })
            }

            // Save the file
            const buffer = await fileResponse.arrayBuffer()
            fs.writeFileSync(filePath, Buffer.from(buffer))

            // Update metadata
            const metadataPath = path.join(musicDir, 'metadata.json')
            let metadata: Record<string, { title: string; artist: string }> = {}
            
            try {
              if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
              }
            } catch (error) {
              console.error('Error reading metadata:', error)
            }

            metadata[filename] = { title, artist }
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

            return NextResponse.json({ 
              message: 'File downloaded successfully',
              filename: data.filename || filename,
              title,
              artist,
              status: 'completed',
              exists: true
            })
          } catch (error) {
            console.error('Error downloading file from converter server:', error)
            return NextResponse.json({ 
              error: 'Failed to download existing file',
              details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 })
          }
        }

        return NextResponse.json({ 
          message: 'File is being processed or already exists',
          filename: data.filename || filename,
          title,
          artist,
          status: 'processing',
          exists: true
        })
      }

      // If no filename in response but we have a video ID, use that
      if (!data.filename && videoId) {
        return NextResponse.json({ 
          message: 'Download started', 
          filename: `${videoId}.mp3`,
          title,
          artist,
          status: 'processing'
        })
      }

      // If we have a filename in the response, use that
      if (data.filename) {
        return NextResponse.json({ 
          message: 'Download started', 
          filename: data.filename,
          title,
          artist,
          status: 'processing'
        })
      }

      return NextResponse.json({ 
        error: 'Invalid response from download server',
        details: 'No filename received'
      }, { status: 500 })
    } finally {
      // Remove URL from ongoing downloads
      ongoingDownloads.delete(url)
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 