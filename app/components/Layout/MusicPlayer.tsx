"use client";
import { useEffect, useRef, useState } from 'react';
import { useMusicPlayer } from '@/components/MusicPlayerProvider';

export default function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { currentTrack, isPlaying, setIsPlaying, setCurrentTime, setDuration } = useMusicPlayer();
  
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      {currentTrack && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{currentTrack.title}</h3>
            <p className="text-sm text-gray-600">{currentTrack.artist}</p>
          </div>
          {/* Add your player controls here */}
        </div>
      )}
    </div>
  );
} 