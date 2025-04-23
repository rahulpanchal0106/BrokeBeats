import { NextResponse } from 'next/server';
import YouTube, { Video, SearchOptions } from 'youtube-sr'; // Import youtube-sr with types

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

    // Use youtube-sr for unofficial search
    const searchOptions = {
      limit: 1,
      type: 'all' as const
    };
    const videos = await YouTube.search(query + ' official audio', searchOptions);

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: 'No results found' }, { status: 404 });
    }

    const video = videos[0] as Video;

    return NextResponse.json({
      url: video.url,
      title: video.title,
      duration: video.durationFormatted
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
}