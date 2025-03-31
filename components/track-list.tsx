"use client"

import { Music } from "lucide-react"
import { cn } from "@/lib/utils"

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
}

interface TrackListProps {
  tracks: Track[]
  currentTrackIndex: number
  onTrackSelect: (index: number) => void
  isPlaying: boolean
  isLoading: boolean
}

export default function TrackList({ tracks, currentTrackIndex, onTrackSelect, isPlaying, isLoading }: TrackListProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4 w-full md:w-96 bg-black/50 backdrop-blur-md rounded-xl h-[75vh] overflow-hidden flex flex-col justify-start">
      <div className="text-xl px-6 pt-2 pb-0 font-semibold backdrop-blur-md z-10">
        <p className="py-2">
          Your Library
        </p>
        <hr />
      </div>
      <div className="space-y-1 h-full overflow-y-auto px-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading tracks...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No tracks found</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <div
              key={`${track.id || 'track'}-${index}`}
              onClick={() => onTrackSelect(index)}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                index === currentTrackIndex ? "bg-primary/20 text-primary" : "hover:bg-white/5",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center",
                    index === currentTrackIndex ? "bg-primary text-primary-foreground" : "bg-black/30",
                  )}
                >
                  {index === currentTrackIndex && isPlaying ? (
                    <span className="flex items-center justify-center">
                      <span className="sr-only">Now playing</span>
                      <span className="flex space-x-1">
                        {[1, 2, 3].map((bar) => (
                          <span
                            key={bar}
                            className="w-0.5 h-3 bg-current animate-pulse"
                            style={{
                              animationDelay: `${bar * 0.2}s`,
                              animationDuration: "0.8s",
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <Music className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{track.title}</span>
                  <span className="text-sm text-gray-400">{track.artist}</span>
                </div>
              </div>
              <span className="text-sm text-gray-400">{formatTime(track.duration)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
