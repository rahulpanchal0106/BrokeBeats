"use client";
import MusicPlayer from "@/components/music-player";
import { useAuth } from "@/components/AuthContext";
import LoginButton from "./components/LoginButton";
import { useEffect, useState } from "react";
import LogoutButton from "./components/LogoutButton";

export default function Home() {
  const { user, accessToken, loading } = useAuth();
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const checkTokenExpiration = () => {
      alert(`Token: ${accessToken}, USER: ${user}`);
      if (!accessToken) {
        setIsExpired(true);
        return;
      }

      fetch("https://api.spotify.com/v1/me/tracks", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then((response) => {
          if (response.status === 401) {
            setIsExpired(true);
          } else {
            setIsExpired(false);
          }
        })
        .catch((error) => {
          console.error("Error checking token expiration:", error);
          setIsExpired(true);
        });
    };

    if (!loading) {
      checkTokenExpiration(); // Only check after loading
    }
  }, [accessToken, loading]);

  // Don't render anything until auth context is ready
  if (loading) {
    return <div className="text-white p-4">Loading...</div>;
  }

  if (!user || isExpired) {
    return <LoginButton />;
  }

  return (
    <main className="min-h-screen bg-black/75 text-white">
      <h1>Welcome {user.display_name}!</h1>
      <LogoutButton />
      <MusicPlayer />
    </main>
  );
  }
