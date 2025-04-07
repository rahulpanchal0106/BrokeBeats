"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { spotifyConfig } from '@/spotify';

interface User {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  userData: User | null;
  setUserData: (userData: User | null) => void;
  logout: () => void;
  login: () => void;
  loading: boolean; // add this line
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // NEW

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_access_token');
    const storedUser = localStorage.getItem('spotify_user');

    if (storedToken) {
      setAccessToken(storedToken);
    }
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setUserData(parsedUser);
    }

    setLoading(false); // Once restored
  }, []);

  const login = () => {
    const scope = spotifyConfig.scopes.join(' ');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: spotifyConfig.clientId,
      scope: scope,
      redirect_uri: spotifyConfig.redirectUri,
      state: generateRandomString(16)
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  const logout = () => {
    setUser(null);
    setUserData(null);
    setAccessToken(null);
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        userData,
        setUserData,
        login,
        logout,
        loading // include it in context
      }}
    >
      {!loading && children} {/* render children only when ready */}
    </AuthContext.Provider>
  );
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function generateRandomString(length: number) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}
