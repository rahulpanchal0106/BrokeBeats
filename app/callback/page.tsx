"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';

export default function CallbackPage() {
  const router = useRouter();
  const { setUser, setAccessToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('Auth error:', error);
        router.push('/');
        return;
      }

      if (code) {
        try {
          // Exchange code for access token
          const tokenResponse = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          if (!tokenResponse.ok) {
            throw new Error('Failed to get access token');
          }

          const tokenData = await tokenResponse.json();
          localStorage.setItem('spotify_access_token', tokenData.access_token);
          setAccessToken(tokenData.access_token);

          // Get user profile
          const userResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`
            }
          });

          if (!userResponse.ok) {
            throw new Error('Failed to get user profile');
          }

          const userData = await userResponse.json();

          // Check if user already exists in the database
          const userCheckResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              spotifyId: userData.id,
              displayName: userData.display_name,
              email: userData.email,
              likedSongs: [],
              personalLibrary: []
            })
          });

          if (!userCheckResponse.ok) {
            throw new Error('Failed to check/create user');
          }

          // Store user data
          localStorage.setItem('spotify_user', JSON.stringify(userData));
          setUser(userData);

          // Redirect to home page
          router.push('/');
        } catch (error) {
          console.error('Callback error:', error);
          router.push('/');
        }
      }
    };

    handleCallback();
  }, [router, setUser, setAccessToken]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Logging you in...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}