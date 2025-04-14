"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Menu, X } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import TrackList from "@/components/track-list"
import { cn } from "@/lib/utils"

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
  artwork?: string
}

// Background images with placeholder API
const backgroundImages = [
  "https://img.freepik.com/premium-photo/illustration-girl-sitting-balcony-with-her-cat-watching-sunset_1260208-167.jpg?semt=ais_hybrid?height=1080&width=1920",
  "https://wallpapers.com/images/hd/lofi-background-s07yfutvxbplhmng.jpg",
  "https://c4.wallpaperflare.com/wallpaper/908/34/383/lofi-digital-anthro-hd-wallpaper-preview.jpg",
  "https://a-static.besthdwallpaper.com/balcony-lofi-wallpaper-1600x600-106546_84.jpg",
  "/bg/ghibli-1.gif",
  "/bg/ghibly-3.gif",
  "/bg/lofi-1.gif",
  "/bg/ghibli-2.jpg",
  "/bg/pixal-1.jpg",
  "/bg/pixel-2.jpg",
  "/bg/pixel-3.jpg",
  "/bg/pixel5.gif",
  "/bg/sharp-1.gif",
]

export default function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [backgroundIndex, setBackgroundIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrack = tracks[currentTrackIndex]

  // Add offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial state
    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update fetchTracks to handle offline state
  // Update the fetchTracks function in your useEffect:
useEffect(() => {
  const fetchTracks = async () => {
    setIsLoading(true);
    console.log("Attempting to fetch tracks from /api/music");
    
    try {
      // Get the authentication token from wherever you store it
      // This could be localStorage, a cookie, your auth context, etc.
      alert("RIGJT BEFORE THE TOKEN FETCH")
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      alert(`sending token to /music ${token}`);
      if (!token) {
        throw new Error('No authentication token found');
      }

    
      
      const response = await fetch('/api/music', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Fetch response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch music files: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Tracks fetched successfully:", data);
      
      if (Array.isArray(data) && data.length > 0) {
        setTracks(data);
      } else {
        console.warn("API returned empty or non-array data");
        setTracks([]);
      }
    } catch (err) {
      console.error('Error fetching tracks:', err);
      
      // Don't show error if we're offline, just use cached tracks
      if (!isOffline) {
        setError(`Failed to load music library: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  fetchTracks();
}, []);
  // Update the fetchTracks function in your useEffect:

  // Improved background image transition every 30 seconds when playing
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        // Start transition
        setIsTransitioning(true)
        
        // After 1.5 seconds (duration of fade out), change the background
        setTimeout(() => {
          setBackgroundIndex((prev) => (prev + 1) % backgroundImages.length)
          
          // After changing the background, wait a bit and start fade in
          setTimeout(() => {
            setIsTransitioning(false)
          }, 100)
        }, 400)
      }, 30000)
    }

    return () => clearInterval(interval)
  }, [isPlaying])

  // Handle track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const handleTrackChange = async () => {
      setIsLoading(true)
      setError(null)
      audio.src = currentTrack.url
      setCurrentTime(0)
      
      try {
        await audio.load()
      } catch (err) {
        console.error('Error loading track:', err)
        setError('Failed to load track')
      }
    }

    handleTrackChange()
  }, [currentTrackIndex])

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack || isLoading) return

    if (isPlaying) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing audio:', error)
          setError('Failed to play audio. Please check if the file exists and is accessible.')
          setIsPlaying(false)
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, currentTrackIndex, isLoading])

  // Handle audio loading and errors
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setError(null)
      if (isPlaying) {
        audio.play().catch(error => {
          console.error('Error playing audio:', error)
          setError('Failed to play audio')
          setIsPlaying(false)
        })
      }
    }

    const handleError = () => {
      setIsLoading(false)
      setError(`Failed to load audio: ${audio.error?.message || 'Unknown error'}`)
      setIsPlaying(false)
    }

    const handleLoadedMetadata = () => {
      if (currentTrack) {
        setTracks(prevTracks => 
          prevTracks.map((track, index) => 
            index === currentTrackIndex 
              ? { ...track, duration: audio.duration }
              : track
          )
        )
      }
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [currentTrackIndex, isPlaying])

  // Handle audio time updates
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      handleTrackEnd()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrackIndex])

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted])

  const handleTrackEnd = () => {
    if (repeat) {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play()
      }
      return
    }

    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length)
      setCurrentTrackIndex(randomIndex)
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)
    }
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handlePrevious = () => {
    setCurrentTrackIndex((prev) => (prev === 0 ? tracks.length - 1 : prev - 1))
    setCurrentTime(0)
  }

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)
    setCurrentTime(0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleShuffle = () => {
    setShuffle(!shuffle)
  }

  const toggleRepeat = () => {
    setRepeat(!repeat)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleTrackSelect = (index: number) => {
    // Only pause if we're not selecting the currently playing track
    if (currentTrackIndex !== index) {
      setCurrentTrackIndex(index);
      setCurrentTime(0);
    }
    // Always ensure playback starts (or continues) after selection
    setIsPlaying(true);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
    setCurrentTime(value[0])
  }

  // Force a background change
  const changeBackground = () => {
    setIsTransitioning(true);
    
    setTimeout(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgroundImages.length);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Background wallpapers with smooth transitions */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {backgroundImages.map((image, index) => (
          <div
            key={`background-${index}`}
            className={cn(
              "absolute inset-0 transition-all duration-1500 ease-in-out",
              backgroundIndex === index 
                ? isTransitioning 
                  ? "opacity-0 scale-105"
                  : "opacity-100 scale-100"
                : "opacity-0 scale-110"
            )}
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.7)',
              transitionProperty: 'opacity, transform',
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6 md:p-10">
        <header className="mb-8 flex justify-between items-center px-4 py-2 text-white">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">BrokeBeats</h1>
          
          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={changeBackground}>
              Change Background
            </Button>
            <Button variant="ghost" asChild>
              <a href="/download">Download Music</a>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </header>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden fixed top-20 right-6 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-50">
            <div className="flex flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={changeBackground} className="w-full justify-start">
                Change Background
              </Button>
              <Button variant="ghost" asChild className="w-full justify-start">
                <a href="/download">Download Music</a>
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 flex-1">
          {/* Now Playing Section */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="text-center mb-12 space-y-4">
              <h2 className="text-5xl font-bold tracking-tighter">
                {isLoading ? 'Loading...' : currentTrack?.title || 'No Track Selected'}
              </h2>
              <p className="text-2xl text-gray-400">
                {currentTrack?.artist || 'Unknown Artist'}
              </p>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-xl mb-8">
              <Slider
                value={[currentTime]}
                max={currentTrack?.duration || 0}
                step={1}
                onValueChange={handleSeek}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(currentTrack?.duration || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn("rounded-full", shuffle ? "text-primary" : "text-gray-400")}
                disabled={isLoading || !currentTrack}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevious} 
                className="rounded-full h-12 w-12"
                disabled={isLoading || !currentTrack}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                variant="default"
                size="icon"
                onClick={togglePlay}
                className="rounded-full h-16 w-16 bg-primary hover:bg-primary/90"
                disabled={isLoading || !currentTrack}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </Button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNext} 
                className="rounded-full h-12 w-12"
                disabled={isLoading || !currentTrack}
              >
                <SkipForward className="h-6 w-6" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRepeat}
                className={cn("rounded-full", repeat ? "text-primary" : "text-gray-400")}
                disabled={isLoading || !currentTrack}
              >
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 mt-8">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMute} 
                className="rounded-full"
                disabled={isLoading || !currentTrack}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0])}
                className="w-32"
                disabled={isLoading || !currentTrack}
              />
            </div>
          </div>

          {/* Track List */}
          <TrackList
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            onTrackSelect={handleTrackSelect}
            isPlaying={isPlaying}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Audio element */}
      <audio 
        ref={audioRef} 
        className="hidden"
        preload="auto"
        crossOrigin="anonymous"
      />

      {/* Add offline indicator */}
      {isOffline && (
        <div className="fixed top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-full text-sm font-medium">
          Offline Mode
        </div>
      )}
    </div>
  )
}
