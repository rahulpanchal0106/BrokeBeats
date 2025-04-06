"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface Track {
  _id: string;
  title: string;
  author: string;
  length: number;
  bitrate: number;
  ext: string;
  filepath: string;
  createdAt: number;
  isDownloaded?: boolean;
  size?: number;
  duration?: number;
}

interface MusicPlayerContextType {
  tracks: Track[];
  setTracks: (tracks: Track[]) => void;
  currentTrack: Track | null;
  setCurrentTrack: (track: Track | null) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  addTrack: (track: Track) => void;
  downloadedTracks: Track[];
  setDownloadedTracks: (tracks: Track[]) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load tracks from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTracks = JSON.parse(localStorage.getItem('tracks') || '[]');
      setTracks(storedTracks);
      setDownloadedTracks(storedTracks.filter((track: Track) => track.isDownloaded));
    }
  }, []);

  const addTrack = (track: Track) => {
    setTracks(prevTracks => {
      const newTracks = [...prevTracks, track];
      if (typeof window !== 'undefined') {
        localStorage.setItem('tracks', JSON.stringify(newTracks));
      }
      return newTracks;
    });
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        tracks,
        setTracks,
        currentTrack,
        setCurrentTrack,
        isPlaying,
        setIsPlaying,
        addTrack,
        downloadedTracks,
        setDownloadedTracks,
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}