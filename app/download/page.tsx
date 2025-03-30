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

  const handleDownload = async () => {
    if (!url) {
      setError("Please enter a YouTube URL")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // First, trigger the download on the server
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`)
      
      if (!response.ok) {
        throw new Error("Failed to initiate download")
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || "Failed to process download")
      }

      // Extract video ID from URL
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/)?.[1]
      if (!videoId) {
        throw new Error("Invalid YouTube URL")
      }

      // If the file already exists, use the provided URL
      if (data.url) {
        // Download and save the file
        const downloadResponse = await fetch(`/api/files/${videoId}.mp3`)
        if (!downloadResponse.ok) {
          throw new Error("Failed to download file")
        }

        const blob = await downloadResponse.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${videoId}.mp3`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)

        setSuccess("Download completed successfully! The file has been saved to your music library.")
      } else {
        // If the file is being downloaded, wait and check again
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Try to download the file
        const downloadResponse = await fetch(`/api/files/${videoId}.mp3`)
        
        if (!downloadResponse.ok) {
          throw new Error("Failed to download file")
        }

        const blob = await downloadResponse.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `${videoId}.mp3`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)

        setSuccess("Download completed successfully! The file has been saved to your music library.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Download YouTube Music</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Enter YouTube URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleDownload} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              "Download"
            )}
          </Button>
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {success && (
          <div className="text-green-500 text-sm">{success}</div>
        )}
      </div>
    </div>
  )
} 