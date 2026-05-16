# WAV Analyzer

A web application for analyzing and editing WAV audio files.
Bachelor's thesis, VUT FEKT, Audio Engineering.

---

## Features

- Upload and parse WAV files
- Browse chunk structure (type, size, offset)
- Interactive hex viewer for each chunk with field highlighting
- Edit metadata chunks (LIST/INFO, bext, cue, smpl, inst, cart, and more)
- Add and delete chunks
- Multi-channel waveform visualization with audio player
- Filter files by name, upload date, and contained chunk types
- Full support for WAVE_FORMAT_EXTENSIBLE (multi-channel, 24/32-bit)
- Download the modified file as a valid WAV

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20, TypeScript, Signals API |
| Backend | NestJS, TypeScript |
| Database | SQLite (via Prisma ORM) |
| Monorepo | Nx 22 |
| Package manager | yarn |

---

## Prerequisites

Make sure the following are installed before running the app:

- **Node.js 18+** – https://nodejs.org
- **yarn** – install via npm:
  ```bash
  npm install -g yarn
  ```
- **Git** – https://git-scm.com

Verify your installation:
```bash
node -v   # must be v18 or higher
yarn -v
git --version
```

---

## Installation & Setup

### Step 1 – Clone the repository

```bash
git clone https://github.com/FankySs/wavAnalyzator.git
cd wavAnalyzator
```

### Step 2 – Install dependencies

```bash
yarn install
```

### Step 3 – Initialize the database

```bash
yarn nx run wav-api:prisma-migrate
```

This creates a SQLite database at `apps/wav-api/prisma/dev.db`.

### Step 4 – Start the backend

```bash
yarn nx serve wav-api
```

Backend runs at **http://localhost:3000**

### Step 5 – Start the frontend *(new terminal)*

```bash
yarn nx serve wav-viewer
```

Frontend runs at **http://localhost:4200**

### Step 6 – Open the app

Navigate to **http://localhost:4200** in your browser.

---

## Project Structure

```
apps/
  wav-viewer/    ← Angular frontend (port 4200)
  wav-api/       ← NestJS backend (port 3000)
libs/
  shared-types/  ← Shared TypeScript types (DTOs)
  riff-parser/   ← WAV/RIFF parser and serializer
```

---

## Troubleshooting

### Backend won't start

- Make sure port 3000 is not occupied by another process
- Make sure the database migration has been run (Step 3)

### Frontend shows a server connection error

- Make sure the backend is running on port 3000 (Step 4)
- Check the backend terminal output for errors

### `yarn install` fails

- Check your Node.js version: `node -v` (must be 18+)
- Clear the cache and try again:
  ```bash
  yarn cache clean && yarn install
  ```

---

## Useful Commands

```bash
# Start both apps at once
yarn nx run-many -t serve -p wav-api wav-viewer

# Production build
yarn nx build wav-api
yarn nx build wav-viewer

# Prisma Studio – manage the database in the browser
yarn prisma:studio

# Run tests
yarn nx test wav-api
yarn nx test wav-viewer
```

---

## API Overview

All endpoints are available at `http://localhost:3000/api`.

```
POST   /wav/upload                      Upload a WAV file
GET    /wav                             List all uploaded files
GET    /wav/:id                         File detail (metadata + chunks)
DELETE /wav/:id                         Delete a file
PATCH  /wav/:id                         Rename a file
GET    /wav/:id/download                Download the modified file as WAV
GET    /wav/:id/stream                  Audio stream (supports Range requests)
GET    /wav/:id/waveform                Waveform data for visualization
GET    /wav/:id/chunks                  List chunks of a file
GET    /wav/:id/chunks/:chunkId         Chunk detail (including parsed data)
GET    /wav/:id/chunks/:chunkId/raw     Raw bytes of a chunk
POST   /wav/:id/chunks                  Create a new chunk
PATCH  /wav/:id/chunks/:chunkId         Update a chunk
DELETE /wav/:id/chunks/:chunkId         Delete a chunk
```
