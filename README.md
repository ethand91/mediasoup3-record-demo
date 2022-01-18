# Simple video/audio Record Demo Using mediasoup 3 and GStreamer/FFmpeg

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
sudo apt-get install libgstreamer1.0-0 gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly gstreamer1.0-libav gstreamer1.0-doc gstreamer1.0-tools gstreamer1.0-x gstreamer1.0-alsa gstreamer1.0-gl gstreamer1.0-gtk3 gstreamer1.0-qt5 gstreamer1.0-pulseaudio
```

### Install Server Modules

```bash
cd server && npm i
```

### Install App Modules

```bash
cd app && npm i
```

### Configure the server

Change the announced IP in src/config.js to your local ip (config -> webRtcTransport -> listenIps)

### Start the server

```bash
# The server uses FFmpeg as default
cd server && node src/server

# To use GStreamer
PROCESS_NAME="GStreamer" node src/server
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


By default recorded videos will be available in `server/files` directory.

---

## Server ENV Options

| Argument | Type | Explanation |
| -------- | :--: | :---------: |
| RECORD_FILE_LOCATION_PATH | string | Path to store the recorded files (user running node MUST have read/write permission) |
| GSTREAMER_DEBUG_LEVEL | number | GStreamer Debug Level (GStreamer only) |
| PROCESS_NAME | string | The command to use (GStreamer/FFmpeg) (case sensitive) default is FFmpeg |
| SERVER_PORT | number | Server port number (default is 3000). Note if you change this you will also need to edit the WebSocket connection url. |

---

## TODO

- video/audio only recording
- Multiple formats (mp4/avi etc)
- Docker support

---

Like my work? Any support is appreciated.

<a href="https://www.buymeacoffee.com/ethand9999" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>
