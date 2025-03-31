"use client"

import { useState } from "react"
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

  const handleDownload = async () => {
    if (!url) {
      setError("Please enter a YouTube URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setDownloadStatus('processing')

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to start download")
      }

      setFilename(data.filename)
      setTitle(data.title)
      
      if (data.status === "completed") {
        setSuccess(`Successfully downloaded "${data.title}"!`)
        setDownloadStatus('completed')
      } else {
        setSuccess(`Download started for "${data.title}"! You will be able to add this song to your library shortly.`)
        setDownloadStatus('processing')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start download")
      setDownloadStatus('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFetchSong = async () => {
    if (!filename) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/music/${filename}`)
      if (!response.ok) {
        throw new Error("Failed to fetch song")
      }

      setSuccess("Song added to your library!")
      setDownloadStatus("completed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch song")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Download YouTube Music</h1>
        
        <div className="space-y-4">
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
              onClick={handleDownload} 
              disabled={isLoading || !url}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {downloadStatus === 'processing' ? 'Processing...' : 'Downloading...'}
                </>
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding to library...
                </>
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
        </div>
      </div>
    </div>
  )
} 