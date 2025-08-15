# API Documentation

## Edge Functions

### Music Generation

#### Generate Suno Track
**POST** `/functions/v1/generate-suno-track`

Generates music tracks using Suno AI.

**Request:**
```json
{
  "prompt": "string (required)",
  "customLyrics": "string (optional)",
  "stylePrompt": "string (optional)",
  "tempo": "string (optional)",
  "duration": 120,
  "instrumental": false,
  "voiceStyle": "string (optional)",
  "language": "string (optional)"
}
```

#### Extend Suno Track
**POST** `/functions/v1/extend-suno-track`

Extends existing music tracks.

**Request:**
```json
{
  "audioId": "string (required)",
  "prompt": "string (required)",
  "continueAt": 60
}
```

### Lyrics Generation

#### Generate Lyrics
**POST** `/functions/v1/generate-suno-lyrics`

Generates song lyrics using Suno AI.

**Request:**
```json
{
  "prompt": "string (required)"
}
```

**Response:**
```json
{
  "taskId": "string",
  "status": "pending|success|failed"
}
```

#### Get Lyrics Info
**GET** `/functions/v1/get-suno-lyrics-info`

Retrieves lyrics generation status and results.

**Query Parameters:**
- `taskId`: string (required)

**Response:**
```json
{
  "taskId": "string",
  "status": "PENDING|SUCCESS|FAILED",
  "lyrics": "string",
  "title": "string"
}
```

### Audio Processing

#### Convert to WAV
**POST** `/functions/v1/convert-suno-to-wav`

Converts audio tracks to WAV format.

**Request:**
```json
{
  "taskId": "string (required)",
  "audioId": "string (required)"
}
```

#### Get WAV Conversion Info
**GET** `/functions/v1/get-suno-wav-info`

Retrieves WAV conversion status and download URL.

**Query Parameters:**
- `taskId`: string (required)

**Response:**
```json
{
  "taskId": "string",
  "status": "PENDING|SUCCESS|FAILED",
  "wavUrl": "string"
}
```

#### Separate Vocals
**POST** `/functions/v1/separate-suno-vocals`

Separates vocals and instruments from audio tracks.

**Request:**
```json
{
  "taskId": "string (required)",
  "audioId": "string (required)",
  "type": "separate_vocal|split_stem"
}
```

#### Get Vocal Separation Info
**GET** `/functions/v1/get-suno-vocal-separation-info`

Retrieves vocal separation status and download URLs.

**Query Parameters:**
- `taskId`: string (required)

**Response:**
```json
{
  "taskId": "string",
  "status": "PENDING|SUCCESS|FAILED",
  "vocalUrl": "string",
  "instrumentalUrl": "string",
  "stems": {
    "drums": "string",
    "bass": "string",
    "guitar": "string",
    "keyboard": "string"
  }
}
```

### Video Generation

#### Generate Music Video
**POST** `/functions/v1/generate-suno-video`

Creates MP4 videos with visualizations for music tracks.

**Request:**
```json
{
  "taskId": "string (required)",
  "audioId": "string (required)",
  "author": "string (optional)",
  "domainName": "string (optional)"
}
```

#### Get Video Info
**GET** `/functions/v1/get-suno-video-info`

Retrieves video generation status and download URL.

**Query Parameters:**
- `taskId`: string (required)

**Response:**
```json
{
  "taskId": "string",
  "status": "PENDING|SUCCESS|FAILED",
  "videoUrl": "string"
}
```

### AI Services

#### Generate Artist Info
**POST** `/functions/v1/generate-artist-info`

Generates artist profile using AI.

**Request:**
```json
{
  "name": "string (required)",
  "provider": "openai|anthropic|deepseek",
  "model": "string",
  "temperature": 0.8,
  "maxTokens": 1000
}
```

**Response:**
```json
{
  "artistInfo": {
    "description": "string",
    "genre": "string", 
    "location": "string",
    "background": "string",
    "style": "string",
    "influences": ["string"]
  }
}
```

#### Boost Style
**POST** `/functions/v1/boost-suno-style`

Enhances style prompts using AI.

**Request:**
```json
{
  "stylePrompt": "string (required)",
  "provider": "openai|anthropic",
  "temperature": 0.7
}
```

#### Generate Cover Image
**POST** `/functions/v1/generate-cover-image`

Generates album cover images using AI.

**Request:**
```json
{
  "prompt": "string (required)",
  "style": "string (optional)"
}
```

## Database Tables

### artists
- User-owned artist profiles with RLS
- Contains metadata for AI context

### user_settings  
- AI provider preferences
- Custom prompts configuration

## Security
- All API keys in Supabase Secrets
- RLS policies enforce data isolation
- Input validation on all endpoints