import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // Explicitly set runtime to nodejs

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    // First try official YouTube API if key exists
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          return NextResponse.json({
            url: `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`
          });
        }
      } catch (error) {
        console.log('Official YouTube API failed, falling back to unofficial search');
      }
    }

    // Dynamic import
    const { default: yts } = await import('yt-search');
    
    const result = await yts(query + ' official audio');
    const video = result.videos[0];

    if (!video) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    return NextResponse.json({
      url: video.url,
      title: video.title,
      duration: video.duration
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
} 