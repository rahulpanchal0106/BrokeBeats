const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const app = express();
const port = 5000;

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Create downloads directory if it doesn't exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  console.log(`[${new Date().toISOString()}] Created downloads directory`);
}

// Connect to MongoDB
mongoose.connect('mongodb+srv://rm5901960:dDFc21h2hdKuA1kk@cluster0.qglhj5y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log(`[${new Date().toISOString()}] Connected to MongoDB`);
}).catch(err => {
  console.error(`[${new Date().toISOString()}] MongoDB connection error:`, err);
});

// Define schema
const trackSchema = new mongoose.Schema({
  title: String,
  author: String,
  length: Number,
  bitrate: Number,
  ext: String,
  filepath: String,
  createdAt: { type: Date, default: Date.now }
});

const Track = mongoose.model('Track', trackSchema);

// Queue logic
let downloadQueue = [];
let isProcessing = false;

// Routes
const pastDurations = []; // e.g., [15, 18, 13, 20] seconds

function recordDownloadTime(seconds) {
  pastDurations.push(seconds);
  if (pastDurations.length > 10) pastDurations.shift(); // Keep last 10
}

function getAverageDownloadTime() {
  if (pastDurations.length === 0) return 15; // Default estimate
  return Math.round(pastDurations.reduce((a, b) => a + b, 0) / pastDurations.length);
}

const processQueue = async () => {
  if (isProcessing || downloadQueue.length === 0) return;
  isProcessing = true;

  const { url } = downloadQueue.shift();
  console.log(`[${new Date().toISOString()}] Processing URL: ${url}`);

  try {
    const metadataJson = await runCommand(`yt-dlp -j ${url}`);
    const metadata = JSON.parse(metadataJson);

    const title = metadata.title || 'Unknown Title';
    const author = metadata.uploader || 'Unknown Author';
    const duration = metadata.duration || 0;
    const ext = 'mp3';
    const id = metadata.id;
    const filename = `${id}.${ext}`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.log(`[${new Date().toISOString()}] File already exists: ${filename}`);
      isProcessing = false;
      return processQueue();
    }

    console.log(`[${new Date().toISOString()}] Downloading ${title} by ${author}...`);

    const dl = spawn('yt-dlp', [
      '-x', '--audio-format', ext,
      '-o', filepath,
      url
    ]);

    dl.stdout.on('data', (data) => {
      console.log(`[${new Date().toISOString()}] yt-dlp stdout: ${data.toString().trim()}`);
    });

    dl.stderr.on('data', (data) => {
      console.error(`[${new Date().toISOString()}] yt-dlp stderr: ${data.toString().trim()}`);
    });

    dl.on('close', async (code) => {
      if (code === 0) {
        const stats = fs.statSync(filepath);
        const bitrate = stats.size > 0 && duration > 0
          ? Math.floor((stats.size * 8) / duration / 1000)
          : 0;

        console.log(`[${new Date().toISOString()}] Download finished: ${filename} (${bitrate} kbps)`);

        const newTrack = new Track({
          title,
          author,
          length: duration,
          bitrate,
          ext,
          filepath
        });

        await newTrack.save();
        console.log(`[${new Date().toISOString()}] Track metadata saved to DB: ${title} - ${author}`);
      } else {
        console.error(`[${new Date().toISOString()}] Download process exited with code ${code}`);
      }

      isProcessing = false;
      processQueue();
    });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error during download: ${err.message}`);
    isProcessing = false;
    processQueue();
  }
};




// Utility
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout.trim());
    });
  });
}


function extractVideoId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|$)/);
  return match ? match[1] : null;
}


app.get('/download', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ success: false, message: 'No URL provided' });

  try {
    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });

    const filename = `${videoId}.mp3`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.log(`[SKIP] Already exists: ${filename}`);
      return res.json({
        success: true,
        message: 'File already exists!',
        url: '/files/' + filename,
      });
    }

    const queuePosition = downloadQueue.length;
    const estTime = getAverageDownloadTime() * queuePosition;

    downloadQueue.push({ url, filename });
    console.log(`[QUEUE] Added: ${url} | Position: ${queuePosition} | ETA: ~${estTime}s`);

    res.json({
      success: true,
      message: `Track added to queue. Estimated wait: ~${estTime} seconds.`,
      position: queuePosition,
      estimated_seconds: estTime
    });

    processQueue();

  } catch (err) {
    console.error('[ERROR] Queuing track:', err);
    res.status(500).json({ success: false, message: 'Server error while queuing track.' });
  }
});


app.get('/files/:filename', (req, res) => {
  const filepath = path.join(DOWNLOAD_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`[${new Date().toISOString()}] File not found: ${filepath}`);
    return res.status(404).send('File not found');
  }

  console.log(`[${new Date().toISOString()}] Serving file: ${filepath}`);
  res.sendFile(filepath, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${req.params.filename}"`
    }
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] 🎵 Music server is live at http://0.0.0.0:${port}`);
});
