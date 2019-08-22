# Simple video/audio Record Demo Using mediasoup 3 and GStreamer

---

## Introduction

Simple video/audio record application using Mediasoup and GStreamer

Recorded files are stored in the server's files directory or the directory set by the user (via process.env.RECORD_FILE_LOCATION_PATH)

File names are simply the current timestamp

This sample currently only uses VP8/opus and the output file is .webm

---

## How to use

### Install GStreamer

```bash
# For Ubuntu
sudo apt-get install -y \
  gstreamer1.0-libav \
  gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-base \
  gstreamer1.0-plugins-good \
  gstreamer1.0-tools
```

### Install Server Modules

```bash
cd server && npm i
```

### Install App Modules

```bash
cd app && npm i
```

### Start the server

```bash
# Change the listen IP in src/config.js to your local ip (config -> webRtcTransport -> listenIps)
cd server && node src/server
```

### Build and start the application

```bash
cd app
npm run build

# Copy the files from dist to a webserver etc.
# OR start the dev server
npm run dev
```

### Access the sample page
https://localhost:8080


---

## Server ENV Options

| Argument | Type | Explanation |
| -------- | :--: | :---------: |
| RECORD_FILE_LOCATION_PATH | string | Path to store the recorded files (user running node MUST have read/write permission) |
| GSTREAMER_DEBUG_LEVEL | number | GStreamer Debug Level |

---

## TODO

- video/audio only recording
- FFmpeg Sample?
- Multiple formats (mp4/avi etc)
- Multiple Codec support (VP9/VP8/H264)
- Option to play the recorded file using RTP Producer after recording   
- Docker support
