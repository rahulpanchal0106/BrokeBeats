import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    }

    // If file doesn't exist, fetch it from the converter server
    const converterUrl = process.env.CONVERTER_SERVER_URL || 'https://due-indianapolis-americans-fine.trycloudflare.com'
    const response = await fetch(`${converterUrl}/files/${filename}`)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Save the file to music directory
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(filePath, Buffer.from(buffer))

    // Return the file
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error handling file:', error)
    return NextResponse.json({ error: 'Failed to handle file' }, { status: 500 })
  }
} 