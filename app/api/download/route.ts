import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

// Keep track of ongoing downloads
const ongoingDownloads = new Set<string>()

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Check if this URL is already being processed
    if (ongoingDownloads.has(url)) {
      return NextResponse.json({ 
        error: 'This video is already being processed',
        details: 'Please wait for the current download to complete'
      }, { status: 409 })
    }

    // First, check if the file already exists
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/)?.[1]
    if (!videoId) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL',
        details: 'Please provide a valid YouTube video URL'
      }, { status: 400 })
    }

    const filename = `${videoId}.mp3`
    const musicDir = path.join(process.cwd(), 'public', 'music')
    const filePath = path.join(musicDir, filename)

    // Add URL to ongoing downloads
    ongoingDownloads.add(url)

    try {
      // First, get the video info to get the title and artist
      const infoResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      if (!infoResponse.ok) {
        const errorText = await infoResponse.text()
        console.error('Info API error:', errorText)
        return NextResponse.json({ 
          error: 'Failed to get video info',
          details: errorText
        }, { status: 500 })
      }

      const info = await infoResponse.json()
      const title = info.title || 'Unknown Title'
      const artist = info.author_name || 'Unknown Artist'

      // Check if the file already exists in the search directory
      const fileResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL || 'https://expressions-quilt-scholar-personals.trycloudflare.com'}/files/${filename}`)
      if (!fileResponse.ok) {
        const errorText = await fileResponse.text()
        console.error('File API error:', errorText)
        // return NextResponse.json({ 
        //   error: 'Failed to check for file existence',
        //   details: errorText
        // }, { status: 500 })
      }

      if (fileResponse.ok) {
        // File exists, directly save it
        if (!fs.existsSync(filePath)) {
          // Download the file from the search server
          const buffer = await fileResponse.arrayBuffer()
          fs.writeFileSync(filePath, Buffer.from(buffer))

          // Update metadata
          const metadataPath = path.join(musicDir, 'metadata.json')
          let metadata: Record<string, { title: string; artist: string }> = {}
          
          try {
            if (fs.existsSync(metadataPath)) {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
            }
          } catch (error) {
            console.error('Error reading metadata:', error)
          }

          metadata[filename] = { title, artist }
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

          return NextResponse.json({ 
            message: 'File downloaded successfully',
            filename: filename,
            title,
            artist,
            status: 'completed',
            exists: true
          })
        } else {
          return NextResponse.json({ 
            message: 'File is already downloaded',
            filename: filename,
            title,
            artist,
            status: 'completed',
            exists: true
          },{status: 200})
        }
      } else {
        // Start the download
        const response = await fetch(`${process.env.CONVERTER_SERVER_URL || 'https://expressions-quilt-scholar-personals.trycloudflare.com'}/download?url=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Download API error:', errorText)
          return NextResponse.json({ 
            error: 'Failed to start download',
            details: errorText
          }, { status: 500 })
        }

        const data = await response.json()
        
        // If the converter server indicates the file exists or is being processed
        if (data.message?.includes('already exists') || data.message?.includes('already processing')) {
          // Check if we need to download the file from the converter server
          if (!fs.existsSync(filePath)) {
            try {
              // Download the file from the converter server
              const fileResponse = await fetch(`${process.env.CONVERTER_SERVER_URL || 'https://expressions-quilt-scholar-personals.trycloudflare.com'}/files/${data.filename || filename}`)
              if (!fileResponse.ok) {
                throw new Error('Failed to download file from converter server')
              }
              
              // Ensure the music directory exists
              if (!fs.existsSync(musicDir)) {
                fs.mkdirSync(musicDir, { recursive: true })
              }

              // Save the file
              const buffer = await fileResponse.arrayBuffer()
              fs.writeFileSync(filePath, Buffer.from(buffer))

              // Update metadata
              const metadataPath = path.join(musicDir, 'metadata.json')
              let metadata: Record<string, { title: string; artist: string }> = {}
              
              try {
                if (fs.existsSync(metadataPath)) {
                  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
                }
              } catch (error) {
                console.error('Error reading metadata:', error)
              }

              metadata[data.filename || filename] = { title, artist }
              fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))

              return NextResponse.json({ 
                message: 'File downloaded successfully',
                filename: data.filename || filename,
                title,
                artist,
                status: 'completed',
                exists: true
              }, {status: 200})
            } catch (error) {
              console.error('Error downloading file from converter server:', error)
              return NextResponse.json({ 
                error: 'Failed to download existing file',
                details: error instanceof Error ? error.message : 'Unknown error'
              }, { status: 500 })
            }
          }

          return NextResponse.json({ 
            message: 'File is being processed or already exists',
            filename: data.filename || filename,
            title,
            artist,
            status: 'processing',
            exists: true
          })
        }

        // If no filename in response but we have a video ID, use that
        if (!data.filename && videoId) {
          return NextResponse.json({ 
            message: 'Download started', 
            filename: `${videoId}.mp3`,
            title,
            artist,
            status: 'processing'
          })
        }

        // If we have a filename in the response, use that
        if (data.filename) {
          return NextResponse.json({ 
            message: 'Download started', 
            filename: data.filename,
            title,
            artist,
            status: 'processing'
          })
        }

        return NextResponse.json({ 
          error: 'Invalid response from download server',
          details: 'No filename received'
        }, { status: 500 })
      }
    } finally {
      // Remove URL from ongoing downloads
      ongoingDownloads.delete(url)
    }

    return NextResponse.json({ success: true, message: 'File downloaded successfully' });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ success: false, error: 'Failed to initiate download' }, { status: 500 });
  }
} 

import { MongoClient, ServerApiVersion } from 'mongodb';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority';
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

interface Track {
  videoId: string;
  filename: string;
  title: string;
  artist: string;
  status: 'completed' | 'processing';
  filepath: string;
  createdAt: Date;
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (ongoingDownloads.has(url)) {
      return NextResponse.json({
        error: 'This video is already being processed',
        details: 'Please wait for the current download to complete',
      }, { status: 409 });
    }

    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?]+)/)?.[1];
    if (!videoId) {
      return NextResponse.json({
        error: 'Invalid YouTube URL',
        details: 'Please provide a valid YouTube video URL',
      }, { status: 400 });
    }

    const filename = `${videoId}.mp3`;
    ongoingDownloads.add(url);

    try {
      // Get video info
      const infoResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (!infoResponse.ok) {
        const errorText = await infoResponse.text();
        console.error('Info API error:', errorText);
        return NextResponse.json({
          error: 'Failed to get video info',
          details: errorText,
        }, { status: 500 });
      }

      const info = await infoResponse.json();
      const title = info.title || 'Unknown Title';
      const artist = info.author_name || 'Unknown Artist';

      // Check file existence in MongoDB
      await client.connect();
      const db = client.db(''); // Replace with your database name
      const collection = db.collection<Track>('tracks'); // Replace with your collection name

      const track = await collection.findOne({filepath: {
    $regex: videoId, 
    $options: 'i'    
  }});
      if (track) {
        return NextResponse.json({
          message: track.status === 'completed' ? 'File already exists' : 'File is being processed',
          filename: track.filename,
          title: track.title,
          artist: track.artist,
          url: track.filepath,
          status: track.status,
          exists: true,
        },{ status: 200 });
      }

      // Start download via converter API
     /// const downloadUrl = `${process.env.CONVERTER_SERVER_URL || 'https://expressions-quilt-scholar-personals.trycloudflare.com'}/download?url=${encodeURIComponent(url)}`;
      const downloadUrl = `${process.env.NEXT_PUBLIC_CONVERTER_API_BASE_URL}/download?url=${url}`;
      console.log('Requesting download:', downloadUrl);
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      //const data = await response.json();
      //console.log('Download response:', data);

      //if (!response.ok) {
        //console.error('Download API error:', data);
        //return NextResponse.json({
         // error: 'Failed to start download',
          //details: data.error || data.message || 'Unknown error',
        //}, { status: 500 });
     // }

      // Assume converter API adds track to MongoDB
      //const trackData: Track = {
       // videoId,
       /// filename: data.filename || filename,
        //title,
        //artist,
      //  status: data.message?.includes('already exists') ? 'completed' : 'processing',
       // filepath: `/files/${data.filename || filename}`,
      //  createdAt: new Date(),
      //};

      // Upsert track to ensure it’s in MongoDB (in case converter API fails to add)
      //await collection.updateOne(
       // { videoId },
        //{ $set: trackData },
        //{ upsert: true }
      //);

      return NextResponse.json({
        message: 'Download started',
       // filename: data.filename || filename,
        //title,
        //artist,
        //url: `/files/${data.filename || filename}`,
        //status: data.message?.includes('already exists') ? 'completed' : 'processing',
        //exists: data.message?.includes('already exists'),
      }, { status: 200 });

    } finally {
      ongoingDownloads.delete(url);
      await client.close();
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({
      error: 'Failed to initiate download',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
