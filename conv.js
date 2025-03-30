const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 5000;

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Create downloads directory if it doesn't exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// Utility function to run yt-dlp commands with promises
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Download route
app.get('/download', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).send({
        message: 'No URL provided',
        success: false
    });
  }
  
  try {
    // Get the video ID filename
    const filenameCommand = `yt-dlp --get-filename -o "%(id)s.%(ext)s" ${url}`;

    let filename = await runCommand(filenameCommand);
    
    // Check if it's already an mp3, if not change extension to mp3
    if (!filename.endsWith('.mp3')) {
      filename = filename.replace(/\.[^/.]+$/, '') + '.mp3';
    }
    
    const filepath = path.join(DOWNLOAD_DIR, filename);
    
    // Check if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`File ${filename} already exists, skipping download`);
      return res.json({
        message: `File already exists! Access at: /files/${filename}`,
        url: `/files/${filename}`,
        success: true
      });
    }
    
    // Start download process in background
    console.log(`Starting download for ${url} to ${filepath}`);
    
    const downloadProcess = spawn('yt-dlp', [
      '-x', 
      '--audio-format', 'mp3', 
      '-o', filepath, 
      url
    ]);
    
    downloadProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    downloadProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    downloadProcess.on('close', (code) => {
      console.log(`Download process exited with code ${code}`);
    });
    
    return res.json({
        message: `Download started! Once ready, access: /files/${filename}`,
        success: true
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send(`Error processing request: ${error.message}`);
  }
});

// Serve file route
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(DOWNLOAD_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('File not found');
  }
  
  // Send the file directly
  res.sendFile(filepath, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  }, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error sending file');
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Music server listening at http://0.0.0.0:${port}`);
});