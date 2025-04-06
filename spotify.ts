export const spotifyConfig = {
    clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback',
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'playlist-read-private',
      'user-library-modify',
      'playlist-modify-public',
      'playlist-modify-private'
    ]
  };