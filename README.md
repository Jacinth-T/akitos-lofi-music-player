# Akito's Music

> A premium lofi player web app with ambient sounds, visual themes, Discord Rich Presence, and Picture-in-Picture, inspired by Doscord's LoFi Activity

![screenshot](docs/screenshot.png)

## Features

- **Visual Themes**: 7 immersive backgrounds (e.g., Cozy Bedroom, Cyberpunk City) with smooth crossfades and dynamic canvas-based particle animations (rain, fireflies, dust).
- **Ambience Mixer**: Layer 4 ambient sound loops (Rain, Fireplace, Thunder, Wind) with individual volume controls to set the perfect mood. //(Need to fix and improve this.)
- **Seamless Playback**: Paste any YouTube or SoundCloud link to play audio invisibly. Supports YouTube single videos and playlists.
- **Queue System**: View and manage your upcoming tracks with automatic scrolling and active track indicators.
- **Discord Rich Presence**: Show your currently playing track on your Discord profile using one of two methods (Companion App or direct Token).
- **Picture-in-Picture**: Mini floating player to control playback while using other apps.
- **Focus Mode**: Hide the entire UI with a single click for a distraction-free listening experience.
- **State Persistence**: Your theme, volume, and ambience settings are automatically saved and restored via `localStorage`.

## Tech Stack

- **Main App**: Pure Vanilla JavaScript (ES Modules), HTML, and CSS. No heavy frameworks! Served via Vite.
- **Companion App**: Electron (Node.js backend, BrowserWindow UI) packaged into a portable executable.

## Project Structure

```text
akitos-music/
├── index.html           # Main application entry point
├── package.json         # Project metadata and scripts
├── vite.config.js       # Vite dev server configuration
├── assets/              # Audio loops and theme background images
├── css/                 # Vanilla CSS (main, themes, animations, components)
├── js/                  # ES modules (app.js, player.js, animations.js, etc.)
└── companion-app/       # Electron companion app for Discord RPC
    ├── main.js          # Electron main process
    ├── discord-ipc.js   # Discord local pipe connection logic
    ├── ws-server.js     # WebSocket server for browser communication
    ├── preload.js       # Safe IPC bridge for renderer
    └── renderer/        # Status window UI (HTML/CSS/JS)
```

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jacinth-T/akitos-lofi-music-player.git
   cd akitos-lofi-music-player
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```
   *This will launch Vite on `http://localhost:3000` and automatically open your browser.*

## Companion App (Discord RPC)

To get Discord Rich Presence without sharing your token, use the companion app. It runs locally and bridges the web app to your Discord desktop client.

### Features
- **Status Window**: Live display of Discord connection status, browser connection status, and current track info.
- **Close-to-Tray**: Closing the window hides it to the system tray, keeping it running in the background.

### Running & Building
Navigate to the `companion-app` directory:
```bash
cd companion-app
npm install

# Run in development mode:
npm start

# Build the portable .exe:
npm run build
```

*Note: The Discord OAuth Application ID found in `discord-ipc.js` (`1487995300059676672`) is a public identifier, exactly like any Discord bot's app ID. It is not a secret.*

## Discord Rich Presence: Two Methods

This app offers two ways to display your listening status on Discord:

1. **Companion App (Recommended)**: Runs a local WebSocket server that securely communicates with Discord's local IPC pipe. This is the standard, safe approach used by most games and applications.
2. **Direct Token Connection (Alternative)**: The settings panel includes an option to connect directly using your personal Discord user token. 
   - ⚠️ **Disclaimer**: Automating user accounts (using a user token to connect to the gateway) is technically against Discord's Terms of Service. While the token is never saved to disk and only kept in `sessionStorage` during your session, this method is provided solely as an alternative convenience. Use it at your own discretion!


## Credits

- **YouTube IFrame API**: For invisible YouTube audio playback.
- **SoundCloud Widget API**: For SoundCloud playback support.
- **noembed.com**: Used for fetching accurate YouTube playlist track titles.
