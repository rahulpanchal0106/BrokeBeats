"use client";
import { useState, useEffect } from 'react';
import { useAuth } from "@/components/AuthContext";
import { useMusicPlayer } from '@/components/MusicPlayerProvider';
import { Button } from '@/components/ui/button';
import { Loader2 } from "lucide-react";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  duration_ms: number;
}

export default function SpotifyLikedSongs() {
  const { accessToken, userData } = useAuth();
  const { addTrack, setCurrentTrack, setIsPlaying } = useMusicPlayer();
  const [likedSongs, setLikedSongs] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<{ [key: string]: boolean }>({});
  const [batchImporting, setBatchImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [personalLibrary, setPersonalLibrary] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    if (accessToken) {
      fetchLikedSongs();
      fetchPersonalLibrary();
    }
  }, [accessToken]);

  const fetchLikedSongs = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch liked songs');
      }

      const data = await response.json();
      setLikedSongs(data.items.map((item: any) => item.track));
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      setError('Failed to load liked songs');
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalLibrary = async () => {
    try {
      const response = await fetch('/api/personal-library', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'user-id': userData?.id || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch personal library');
      }

      const data = await response.json();
      const libraryTracks = data
      // const data = await response.json();
      // const libraryTracks = data.tracks.reduce((acc: any, track: any) => {
      //   acc[track._id] = track;
      //   return acc;
      // }, {});
      console.log("libraryTracks  ",libraryTracks)
      setPersonalLibrary(libraryTracks);
    } catch (error) {
      console.error('Error fetching personal library:', error);
    }
  };

  const searchYouTube = async (query: string) => {
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('YouTube search failed');
      }

      const data = await response.json();
      return data.url || null;
    } catch (error) {
      console.error('YouTube search error:', error);
      return null;
    }
  };

  const initiateDownload = async (youtubeUrl: string) => {
    try {
      const downloadResponse = await fetch(
        `/api/download?url=${encodeURIComponent(youtubeUrl)}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!downloadResponse.ok) {
        throw new Error(`Server responded with status: ${downloadResponse.status}`);
      }

      const data = await downloadResponse.json();
      
      // if (!data.success) {
      //   throw new Error(data.message || 'Failed to initiate download');
      // }

      return data;
    } catch (error) {
      console.error('Download initiation error:', error);
      return null;
    }
  };

  const importAllLikedSongs = async () => {
    setBatchImporting(true);
    setImportProgress({ current: 0, total: likedSongs.length });

    for (const [index, track] of likedSongs.entries()) {
      try {
        setImportProgress(prev => ({ ...prev, current: index + 1 }));
        
        // Search for the track on YouTube
        const searchQuery = `${track.name} ${track.artists[0].name} official audio`;
        const youtubeUrl = await searchYouTube(searchQuery);
        
        if (!youtubeUrl) {
          console.warn(`No YouTube result found for: ${searchQuery}`);
          continue;
        }

        // Initiate download through converter API
        const downloadData = await initiateDownload(youtubeUrl);
        
        if (!downloadData) {
          console.warn(`Failed to initiate download for: ${searchQuery}`);
          continue;
        }

        // Create a track object with metadata
        const newTrack = {
          _id: track.id,
          title: track.name,
          author: track.artists[0].name,
          length: Math.floor(track.duration_ms / 1000),
          bitrate: 128, // Default bitrate
          ext: 'mp3',
          filepath: `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/files/${downloadData.filename || youtubeUrl.split('v=')[1]}`,
          createdAt: Date.now(),
          isDownloaded: true,
        };

        // Store in MongoDB
        // await fetch('/api/tracks', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(newTrack),
        // });

        // Add to library
        addTrack(newTrack);

        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing track ${track.name}:`, error);
      }
    }

    setBatchImporting(false);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleAddToLibrary = async (track: SpotifyTrack) => {
    setImporting(prev => ({ ...prev, [track.id]: true }));

    try {
      console.log(`Attempting to add track to library: ${track.name}`);

      // Step 1: Check if the track exists in our database
      const response = await fetch(`/api/search?q=${encodeURIComponent(track.name + ' ' + track.artists[0].name)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let trackData;
      if (response.ok) {
        const searchResults = await response.json();
        // Find best match from search results
        trackData = searchResults.results?.find((result: any) => {
          return result.title.toLowerCase().includes(track.name.toLowerCase()) 
                //  result.title.toLowerCase().includes(track.artists[0].name.toLowerCase());
        });
        console.log('Track data retrieved:', trackData, searchResults, track);
      }

      if (trackData) {
        // Step 2: If the track exists, upload the MP3 file to Cloudinary
        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}${trackData.filepath}`, {
          headers: {
            'Accept': 'audio/mpeg',
            'Origin': window.location.origin
          },
          mode: 'cors'
        }); // Assuming filepath is the URL to the MP3 file
        const blob = await uploadResponse.blob();

        const cloudinaryResponse = await fetch('/api/upload-to-cloudinary', {
          method: 'POST',
          body: blob,
          headers: {
            'Content-Type': 'audio/mpeg', // Adjust based on your file type
          },
        });

        if (!cloudinaryResponse.ok) {
          throw new Error('Failed to upload track to Cloudinary');
        }

        const cloudinaryData = await cloudinaryResponse.json();
        console.log('Track uploaded to Cloudinary successfully!');

        // Step 3: Update the user's personal library in MongoDB
        const userId = userData?.id; // Get the user ID from userData
        console.log("EEEEEEEEEEEEEEEEEEEEE  ",userData, cloudinaryData)
        const updateResponse = await fetch('/api/personal-library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trackUrl: cloudinaryData.result.url, // Use the Cloudinary URL
            trackData: {
              title: track.name,
              author: track.artists[0].name,
              length: Math.floor(track.duration_ms / 1000),
              bitrate: 128,
              ext: 'mp3',
              url: cloudinaryData.result.url,
            },
            userId: userId,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update personal library');
        }

        const updateData = await updateResponse.json();
        console.log('Personal library updated:', updateData);
        alert('Track added to your personal library!');
        return;
      } else {
        // Step 4: If the track does not exist, search for it on YouTube
        const youtubeUrl = await searchYouTube(`${track.name} ${track.artists[0].name} official audio`);
        if (!youtubeUrl) throw new Error('No YouTube result found');

        // Step 5: Add the YouTube URL to the converter API queue
        const downloadData = await initiateDownload(youtubeUrl);
        if (!downloadData) {
          throw new Error('Failed to initiate download');
        }

        alert('Track is being processed for download!');
      }

    } catch (error) {
      console.error('Error adding track to library:', error);
      alert(`Error: ${error.message}`); // Show error to user
    } finally {
      setImporting(prev => ({ ...prev, [track.id]: false }));
    }
  };

  if (!accessToken) {
    return <div>Please log in to view your liked songs</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Liked Songs</h2>
        <Button
          onClick={importAllLikedSongs}
          disabled={batchImporting}
          className="bg-green-500 hover:bg-green-600"
        >
          {batchImporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Importing {importProgress.current}/{importProgress.total}
            </>
          ) : (
            'Import All'
          )}
        </Button>
      </div>

      <div className="space-y-2">
        {likedSongs.map((track) => (
          <div key={track.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <div>
              <div className="font-medium">{track.name}</div>
              <div className="text-sm text-gray-600">
                {track.artists.map(artist => artist.name).join(', ')}
              </div>
            </div>
            {!personalLibrary[track.id] && ( // Check if track is already in personal library
              <Button
                onClick={() => handleAddToLibrary(track)}
                disabled={!!importing[track.id]}
              >
                Add to Personal Library
              </Button>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mt-8">Your Personal Library</h2>
      <div className="space-y-2">
        {personalLibrary.tracks && personalLibrary.tracks.map((track: any) => (
          <div key={track._id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <div>
              <div className="font-medium">{track.title}</div>
              <div className="text-sm text-gray-600">{track.author}</div>
            </div>
            <Button onClick={() => {
              setCurrentTrack(track); // Set the current track in the music player
              setIsPlaying(true); // Start playing the track
            }}>
              Play
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 