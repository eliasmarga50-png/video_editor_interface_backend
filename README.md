# CineAI Backend

Express + TypeScript service that sits between the Flutter CineAI app and cloud AI providers (OpenAI Whisper, Anthropic Claude / GPT-4o, Runway, Luma).

## Architecture

```
src/
  config/           Zod-validated environment
  domain/           Errors and service contracts
  services/         Provider adapters (no Express types)
  controllers/      HTTP orchestration
  routes/           Versioned /api/v1 surface
  middleware/       Upload, validation, rate limits, errors
  infrastructure/   In-memory generation task store
```

Services never import Express. Controllers depend on interfaces; `container.ts` is the composition root.

## Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Required keys in `.env`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `RUNWAYML_API_KEY`
- `LUMA_API_KEY`

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness |
| POST | `/api/v1/transcribe` | Multipart `file` (audio/video) → timestamped transcript |
| POST | `/api/v1/broll-keywords` | JSON transcript → scene concepts + stock keywords |
| POST | `/api/v1/generate-video` | Start Runway or Luma job → `taskId` + `statusUrl` |
| GET | `/api/v1/generate-video/:taskId` | Poll progress / CDN `outputUrl` |
| POST | `/api/v1/generate-video/webhooks/:provider` | Luma (and optional Runway) callbacks |

Responses are always:

```json
{ "success": true, "data": {}, "meta": { "requestId": "...", "timestamp": "..." } }
```

or

```json
{ "success": false, "error": { "code": "...", "message": "..." }, "meta": {} }
```

### Transcribe

`multipart/form-data` field `file`. Optional query: `language`, `translate=true`, `targetLanguage=en`, `prompt`.

If Whisper detects Amharic, Afaan Oromoo, or Tigrinya, the translation service cleans and translates automatically.

### Generate video

```json
{
  "prompt": "golden hour over Addis skyline, cinematic 35mm",
  "provider": "runway",
  "durationSeconds": 5,
  "aspectRatio": "16:9"
}
```

`provider` is `runway` or `luma`. Runway Gen-3 Alpha Turbo (`gen3a_turbo`) was retired; the default model is `gen4.5` via `RUNWAY_MODEL`.

Set `PUBLIC_BASE_URL` to a reachable origin so Luma webhooks and `statusUrl` resolve correctly.
