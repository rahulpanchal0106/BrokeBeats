"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useMusicPlayer } from "@/components/MusicPlayerProvider";
import SpotifyLikedSongs from "../components/SpotifyLikedSongs"

export default function DownloadPage() {
  const {
    tracks,
    downloadedTracks,
    setDownloadedTracks,
    addTrack,
    setCurrentTrack,
    setIsPlaying
  } = useMusicPlayer();

  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "processing" | "completed"
  >("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [offlineTracks, setOfflineTracks] = useState<any[]>([]);
  const MAX_RETRIES = 60; // 2 minutes maximum wait time (60 * 2 seconds)
  const CONVERTER_TIMEOUT = 120000; // 2 minute timeout for converter requests

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTracks = JSON.parse(localStorage.getItem("tracks") || "[]");
      setOfflineTracks(storedTracks);
      console.log("############OFFLINE ",offlineTracks)
      setDownloadedTracks(storedTracks);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    setDownloadStatus("processing");
  
    try {
      // Validate the URL format
      if (!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
        throw new Error("Please enter a valid YouTube URL");
      }
  
      let info;
      try {
        // Get video info from YouTube
        const infoResponse = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url
          )}&format=json`
        );
        if (!infoResponse.ok) {
          throw new Error("Failed to get video info");
        }
        info = await infoResponse.json();
      } catch (infoError) {
        console.error("Error fetching video info:", infoError);
        info = { title: "YouTube Video" };
      }
  
      setTitle(info.title);
  
      // Generate a predictable filename based on video ID
      const videoId = url.includes("youtu.be/")
        ? url.split("youtu.be/")[1].split("?")[0]
        : url.includes("v=")
        ? url.split("v=")[1].split("&")[0]
        : Date.now().toString(36);
      const predictedFilename = `${videoId}.mp3`;
  
      // Check if file already exists
      try {
        const fileCheckResponse = await fetch(
          `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${predictedFilename}`
        );
        
        if (fileCheckResponse.ok) {
          // File exists, proceed to add to library
          setFilename(predictedFilename);
          setSuccess(`"${info.title}" is already available! Adding to library...`);
          await handleAddTrackToLibrary(
            { filepath: `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${predictedFilename}`, name: info.title, author: "Unknown", length: "Unknown" },
            true
          );
          setDownloadStatus("completed");
          setIsLoading(false);
          return;
        }
        // If file doesn't exist (fileCheckResponse is not OK), continue with download process
      } catch (fileCheckError) {
        console.error("Error checking if file exists:", fileCheckError);
        // Continue with download process, don't throw error here
      }
  
      // File doesn't exist, initiate download
      setSuccess(`Starting download for "${info.title}"...`);
      const downloadResponse = await fetch(
        `${
          process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL
        }/download?url=${encodeURIComponent(url)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );
  
      if (!downloadResponse.ok) {
        throw new Error(`Server responded with status: ${downloadResponse.status}`);
      }
  
      const data = await downloadResponse.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to initiate download");
      }
  
      let extractedFilename = predictedFilename;
      if (data.url) {
        extractedFilename = data.url.split("/").pop();
      } else if (data.message) {
        extractedFilename = data.message.match(/\/files\/(.+?)(?:\s|$)/)?.[1] || predictedFilename;
      }
  
      setFilename(extractedFilename);
      // Start polling for the file
      pollForFileCompletion(extractedFilename, info.title);
    } catch (error) {
      console.error("Download error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to start download"
      );
      setDownloadStatus("idle");
      setIsLoading(false);
    }
  };

  const pollForFileCompletion = async (filename: string, title: string) => {
    let retries = 0;

    const checkFile = async () => {
      if (retries >= MAX_RETRIES) {
        setError(
          "Download is taking longer than expected. It may still complete in the background."
        );
        setDownloadStatus("idle");
        setIsLoading(false);
        return;
      }

      try {
        const fileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${filename}`
        );

        if (fileResponse.ok) {
          setDownloadStatus("completed");
          setSuccess(`"${title}" is ready! Adding to library...`);
          // Automatically add to library
          await handleAddTrackToLibrary(
            { filepath: `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${filename}`, name: title, author: "Unknown", length: "Unknown" },
            true
          );
          return;
        }

        // File not ready yet, retry after 2 seconds
        retries++;
        setTimeout(checkFile, 2000);
      } catch (error) {
        console.error("Error checking file:", error);
        retries++;
        setTimeout(checkFile, 2000);
      }
    };

    checkFile();
  };

  const handleAddTrackToLibrary = async (result: any, download: boolean) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const trackUrl = result.filepath;

      if (!trackUrl) {
        throw new Error("Track URL is undefined");
      }

      if (download) {
        // First, get metadata from the API
        const response = await fetch(`/api/add-track?trackUrl=${encodeURIComponent(trackUrl)}`);
        if (!response.ok) {
          throw new Error("Failed to add track to library");
        }
        const trackData = await response.json();
        
        // Create a properly structured track object with all metadata
        const track = {
          _id: trackData._id.$oid || result._id?.$oid || Date.now().toString(),
          title: result.title || trackData.title || "Unknown Title",
          author: result.author || trackData.author || "Unknown Artist",
          length: parseInt(result.length?.$numberInt || trackData.length?.$numberInt || "0"),
          bitrate: parseInt(result.bitrate?.$numberInt || trackData.bitrate?.$numberInt || "128"),
          ext: result.ext || trackData.ext || "mp3",
          filepath: trackUrl,
          createdAt: parseInt(trackData.createdAt?.$date?.$numberLong || Date.now().toString()),
          // Add additional metadata if available
          isDownloaded: true,
          size: trackData.size || 0,
          duration: trackData.duration || 0,
        };

        console.log("Adding track with metadata:", track);

        // Add to both downloaded tracks and library
        addTrack(track);
        setDownloadedTracks(prev => [...prev, track]);
        
        // Store in localStorage for persistence
        const existingTracks = JSON.parse(localStorage.getItem('tracks') || '[]');
        localStorage.setItem('tracks', JSON.stringify([...existingTracks, track]));
        
        setSuccess(`"${track.title}" has been added to your library!`);
      } else {
        // For streaming, create a track object with available metadata
        const streamTrack = {
          _id: result._id.$oid || Date.now().toString(),
          title: result.title || "Unknown Title",
          author: result.author || "Unknown Artist",
          length: parseInt(result.length?.$numberInt || "0"),
          bitrate: parseInt(result.bitrate?.$numberInt || "128"),
          ext: result.ext || "mp3",
          filepath: trackUrl,
          createdAt: parseInt(result.createdAt?.$date?.$numberLong || Date.now().toString()),
          isDownloaded: false,
        };

        // Set as current track for streaming
        setCurrentTrack(streamTrack);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Add track error:", error);
      setError(error instanceof Error ? error.message : "Failed to add track");
    } finally {
      setIsLoading(false);
    }
  };

  // ... Rest of the component (search, UI, etc.) remains unchanged ...
  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }
      const data = await response.json();
      setSearchResults(data.results);
      console.log("SEARCH RESULT: ", data);
    } catch (error) {
      console.error("Search error:", error);
      setError(error instanceof Error ? error.message : "Failed to search");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Download YouTube Music</h1>

        <div className="mb-8">
          <SpotifyLikedSongs />
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} className="min-w-[120px]">
              Search
            </Button>
          </div>

          {searchResults.map((result) => (
            <li key={result.id} className="py-2">
              <a
                href="#"
                className="text-blue-500 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  const download = confirm("Do you want to download this track?");
                  handleAddTrackToLibrary(result, download);
                }}
              >
                {result.title} - {result.author}
              </a>
            </li>
          ))}

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter YouTube URL or playlist URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !url}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Download"
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
              {success}
            </div>
          )}

          {downloadStatus === "processing" && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500">
              <p>Your song is being processed. This may take a few minutes.</p>
              <p className="text-sm mt-2">
                It will be added to your library automatically when ready.
              </p>
            </div>
          )}

          <div className="text-sm text-gray-500 mt-4">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside">
              <li>YouTube video URLs</li>
              <li>YouTube playlist URLs</li>
            </ul>
          </div>

          {offlineTracks.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-bold">Offline Tracks:</h2>
              <ul>
                {offlineTracks.map((track, index) => (
                  <li key={index} className="py-2">
                    <a
                      href={track.filepath}
                      className="text-blue-500 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        console.log(`Playing ${track.title}`);
                      }}
                    >
                      {track.title} - {track.length} by {track.author}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tracks.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-bold">Library Tracks:</h2>
              <ul>
                {tracks.map((track) => (
                  <li key={track._id} className="py-2">
                    <a
                      href="#"
                      className="text-blue-500 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentTrack(track);
                        setIsPlaying(true);
                      }}
                    >
                      {track.title} - {track.length} by {track.author}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="text-xl font-bold mt-8">Downloaded Songs:</h2>
          <ul>
            {downloadedTracks.map((track) => (
              <li key={track._id} className="py-2">
                <a
                  href="#"
                  className="text-blue-500 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentTrack(track);
                    setIsPlaying(true);
                  }}
                >
                  {track.title} by {track.author}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}