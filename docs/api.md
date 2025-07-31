# API Documentation

## Edge Functions

### Generate Artist Info
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