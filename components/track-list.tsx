"use client"

import { Music } from "lucide-react"
import { cn } from "@/lib/utils"

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
  bitrate: string
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
    <div className="w-full md:w-96 bg-black/50 backdrop-blur-md rounded-xl h-[75vh] flex flex-col">
      <div className="sticky top-0 bg-black/70 backdrop-blur-md px-4 py-3 rounded-t-xl z-10">
        <h2 className="text-xl font-semibold">Your Library</h2>
        <div className="h-px bg-gray-800 mt-2"></div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent px-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading tracks...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No tracks found</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {tracks.map((track, index) => (
              <div
                key={`${track.id || "track"}-${index}`}
                onClick={() => onTrackSelect(index)}
                className={cn(
                  "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                  index === currentTrackIndex ? "bg-primary/20 text-primary" : "hover:bg-white/5",
                )}
              >
                <div
                  className={cn(
                    "min-w-8 h-8 rounded-md flex items-center justify-center mr-3",
                    index === currentTrackIndex ? "bg-primary text-primary-foreground" : "bg-black/30",
                  )}
                >
                  {index === currentTrackIndex && isPlaying ? (
                    <div className="flex items-center justify-center">
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
                    </div>
                  ) : (
                    <Music className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{track.title}</span>
                    <span className="text-sm text-gray-400 truncate">{track.artist}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end ml-2 min-w-fit">
                  <span className="text-sm text-gray-400">{formatTime(track.duration)}</span>
                  {track.bitrate && track.bitrate !== "NaN" && (
                    <span className="text-xs text-gray-500">{track.bitrate} kbps</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

