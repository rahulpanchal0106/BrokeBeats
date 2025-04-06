import { NextResponse } from 'next/server';
import { spotifyConfig } from '@/spotify';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: spotifyConfig.redirectUri,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          spotifyConfig.clientId + ':' + spotifyConfig.clientSecret
        ).toString('base64'),
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}