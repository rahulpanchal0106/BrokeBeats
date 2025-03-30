import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Forward the request to the converter server
    const response = await fetch(`https://due-indianapolis-americans-fine.trycloudflare.com/download?url=${encodeURIComponent(url)}`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error processing download:', error)
    return NextResponse.json({ error: 'Failed to process download' }, { status: 500 })
  }
} 