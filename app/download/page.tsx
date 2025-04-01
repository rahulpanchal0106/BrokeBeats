"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export default function DownloadPage() {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'processing' | 'completed'>('idle')
  const [filename, setFilename] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [offlineTracks, setOfflineTracks] = useState<any[]>([])
  const MAX_RETRIES = 60; // 2 minutes maximum wait time (60 * 2 seconds)
  const CONVERTER_TIMEOUT = 120000; // 2 minute timeout for converter requests - much longer to handle slow conversions

  useEffect(() => {
    // Load tracks from local storage
    const storedTracks = JSON.parse(localStorage.getItem('tracks') || '[]');
    setOfflineTracks(storedTracks);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)
    setDownloadStatus('processing')

    try {
      // First, validate the URL format
      if (!url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
        throw new Error('Please enter a valid YouTube URL')
      }

      let info;
      try {
        // Get video info from YouTube
        const infoResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        
        if (!infoResponse.ok) {
          throw new Error('Failed to get video info')
        }
        info = await infoResponse.json();
      } catch (infoError) {
        // If YouTube oembed fails, we'll still try to download but with a generic title
        console.error('Error fetching video info:', infoError);
        info = { title: 'YouTube Video' };
      }
      
      setTitle(info.title);
      
      // Create a unique ID for this download to use in status messages
      const downloadId = Date.now().toString(36);
      
      // Rather than using timeouts, we'll implement a progress check approach
      try {
        // Initial download request - don't wait for it to complete
        const downloadPromise = fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/download?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        // Set a message to the user immediately
        setSuccess(`Download started for "${info.title}"! Please wait while we process your request.`);
        
        // Wait for the initial response with a generous timeout
        let response;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), CONVERTER_TIMEOUT);
          
          response = await downloadPromise;
          clearTimeout(timeoutId);
        } catch (timeoutError) {
          // If we time out here, we'll still continue with status polling
          console.warn('Initial download request timed out, continuing with polling');
          
          // Generate a predictable filename based on video ID
          const videoId = url.includes('youtu.be/') 
            ? url.split('youtu.be/')[1].split('?')[0]
            : url.includes('v=') 
              ? url.split('v=')[1].split('&')[0]
              : downloadId;
          
          // Use video ID as filename for poll checking
          const predictedFilename = `${videoId}.mp3`;
          setFilename(predictedFilename);
          
          // Start polling without waiting for initial response
          pollForFileCompletion(predictedFilename, info.title);
          return;
        }

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Error parsing JSON:', jsonError);
          throw new Error('Invalid response from converter server');
        }
        
        if (data.success) {
          // Handle both cases: file exists or download started
          let extractedFilename: string | null = null;
          
          if (data.url) {
            // File exists case - extract filename from the URL
            extractedFilename = data.url.split('/').pop();
          } else if (data.message) {
            // Download started case - extract filename from the message
            extractedFilename = data.message.match(/\/files\/(.+?)(?:\s|$)/)?.[1];
          }

          if (extractedFilename) {
            setFilename(extractedFilename);
            
            // If the file already exists (we have a direct URL), check immediately
            if (data.url) {
              try {
                const fileResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${extractedFilename}`);
                
                if (fileResponse.ok) {
                  setDownloadStatus('completed');
                  setSuccess(`"${info.title}" is ready to be added to your library!`);
                  return;
                }
              } catch (fileCheckError) {
                console.error('Error checking file:', fileCheckError);
                // Continue with polling if immediate check fails
              }
            }
            
            // Start polling for the file
            pollForFileCompletion(extractedFilename, info.title);
          } else {
            throw new Error('Could not determine filename from response');
          }
        } else {
          throw new Error(data.message || 'Download failed');
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Connection to converter timed out. The server might be busy, but your download may still be processing in the background.');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start download');
      setDownloadStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const pollForFileCompletion = (filename: string, title: string) => {
    let retries = 0;
    
    const checkFile = async () => {
      if (retries >= MAX_RETRIES) {
        setError('Download is taking longer than expected. It may still complete in the background.');
        setDownloadStatus('idle');
        setIsLoading(false);
        return;
      }
      
      try {
        const fileResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${filename}`);
        
        if (fileResponse.ok) {
          setDownloadStatus('completed');
          setSuccess(`"${title}" is ready to be added to your library!`);
          setIsLoading(false);
          return;
        }
        // If file is not ready, try again in 2 seconds
        retries++;
        setTimeout(checkFile, 2000);
      } catch (error) {
        console.error('Error in checkFile:', error);
        // If error, try again in 2 seconds
        retries++;
        setTimeout(checkFile, 2000);
      }
    };
    
    // Start checking for the file
    checkFile();
  };

  const handleFetchSong = async () => {
    if (!filename) return;

    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      const response = await fetch(`/api/music/${filename}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error("Failed to fetch song");
      }

      setSuccess("Song added to your library!");
      setDownloadStatus("completed");
    } catch (err) {
      console.error('Fetch song error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError("Connection timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch song");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return;

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to search');
    }
  };

  const handleAddTrackToLibrary = async (trackUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/add-track?trackUrl=${encodeURIComponent(trackUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to add track to library');
      }

      const { filePath } = await response.json();
      setSuccess('Track added to your library!');

      // Save track to local storage
      const track = {
        name: trackUrl.split('/').pop(), // Extract the track name from the URL
        url: filePath,
        length: 'Unknown', // You can modify this to fetch actual length if available
        author: 'Unknown', // Modify this to fetch actual author if available
      };

      // Get existing tracks from local storage
      const existingTracks = JSON.parse(localStorage.getItem('tracks') || '[]');
      existingTracks.push(track);
      localStorage.setItem('tracks', JSON.stringify(existingTracks));

    } catch (error) {
      console.error('Add track error:', error);
      setError(error instanceof Error ? error.message : 'Failed to add track');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Download YouTube Music</h1>
        
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
                href={`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}${result.url}`} 
                className="text-blue-500 hover:underline" 
                onClick={(e) => {
                  e.preventDefault(); // Prevent the default link navigation
                  handleAddTrackToLibrary(result.url);
                }}
              >
                {result.name} - {result.length} by {result.author}
              </a>
            </li>
          ))}
          {/* {searchResults.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-bold">Search Results:</h2>
              <ul>
                {searchResults.map((result) => (
                  <li key={result.id} className="py-2">
                    <a href={`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}${result.url}`} className="text-blue-500 hover:underline" onClick={() => handleAddTrackToLibrary(result.url)}>
                      {result.name} - {result.length} by {result.author}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )} */}

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

          {downloadStatus === 'processing' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500">
              <p>Your song is being processed. This may take a few minutes.</p>
              <p className="text-sm mt-2">You can check back later to add it to your library.</p>
            </div>
          )}

          {downloadStatus === 'completed' && filename && (
            <Button
              onClick={handleFetchSong}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Add to Library'
              )}
            </Button>
          )}

          <div className="text-sm text-gray-500 mt-4">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside">
              <li>YouTube video URLs</li>
              <li>YouTube playlist URLs</li>
            </ul>
          </div>

          {/* Display Offline Tracks */}
          {offlineTracks.length > 0 && (
            <div className="mt-4">
              <h2 className="text-xl font-bold">Offline Tracks:</h2>
              <ul>
                {offlineTracks.map((track, index) => (
                  <li key={index} className="py-2">
                    <a 
                      href={track.url} 
                      className="text-blue-500 hover:underline"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent default link navigation
                        // Implement your logic to play the track
                        console.log(`Playing ${track.name}`);
                      }}
                    >
                      {track.name} - {track.length} by {track.author}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}