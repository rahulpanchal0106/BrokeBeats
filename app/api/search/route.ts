import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    // Use a timeout to ensure the request waits for the full 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
    clearTimeout(timeoutId); // Clear the timeout once the response is received

    if (!response.ok) {
      throw new Error('Failed to fetch search results');
    }
    const data = await response.json();

    return NextResponse.json({
      query,
      results: data.results,
      count: data.results.length,
      success: true,
    });
  } catch (error:any) {
    console.error('Error searching tracks:', error);
    return NextResponse.json({
      message: 'Error searching tracks',
      error: error.message,
      success: false
    }, { status: 500 });
  }
}