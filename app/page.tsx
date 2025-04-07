"use client"
import MusicPlayer from "@/components/music-player"
import { useAuth } from "@/components/AuthContext"
import LoginButton from "./components/LoginButton";
import { useEffect, useState } from "react";
import LogoutButton from "./components/LogoutButton";

export default function Home() {
  const { user, accessToken } = useAuth();
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const checkTokenExpiration = () => {

      alert(`AT: ${accessToken}, User: ${user}`)
      if (!user) {
        setIsExpired(true); // No access token means expired
        return;
      }

      fetch('https://api.spotify.com/v1/me/tracks', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(response => {
        if (response.status === 401) {
          // If we get a 401 response, the token is expired
          setIsExpired(true);
        } else {
          setIsExpired(false); // Token is valid
        }
      })
      .catch(error => {
        console.error('Error checking token expiration:', error);
        setIsExpired(true); // Assume expired on error
      });
    };

    checkTokenExpiration();
  }, [accessToken]);

  // Check if the access token is expired
  
  if (!user || isExpired) {
    return <LoginButton />
  }

  return (
    <main className="min-h-screen bg-black/75 text-white">
      <h1>Welcome {user.display_name}!</h1>
      <LogoutButton />
      <MusicPlayer />
    </main>
  )
}
