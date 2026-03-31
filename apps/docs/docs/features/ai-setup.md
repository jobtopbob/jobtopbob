---
sidebar_position: 2
---

# AI Setup

JobTopBob's AI features are optional and use a BYOK (Bring Your Own Key) model. API keys are configured via environment variables on the server — they are never stored in the database.

## Supported providers

| Provider | Environment Variable | Notes |
|----------|---------------------|-------|
| OpenAI | `OPENAI_API_KEY` | Direct API access |
| Anthropic | `ANTHROPIC_API_KEY` | Native SDK (Messages API) |
| Gemini | `GOOGLE_API_KEY` | Native SDK (Google Gen AI) |
| OpenRouter | `OPENROUTER_API_KEY` | Access 100+ models via one key |
| Ollama | `OLLAMA_HOST` | Local, free, offline |

## Configuration

### Cloud providers

Set `AI_PROVIDER` and the matching API key in your `.env` file:

```bash
# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
AI_PROVIDER=gemini
GOOGLE_API_KEY=...

# OpenRouter (access Anthropic, Gemini, Meta, and 100+ other models)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
```

Optionally set `AI_MODEL` to override the default model (e.g., `AI_MODEL=gpt-4o`).

Then in the app, go to **Settings > AI Preferences** and select your provider.

### Ollama (local)

1. Install [Ollama](https://ollama.ai) on your host machine
2. Pull a model: `ollama pull llama3.2`
3. Set in `.env`:

```bash
AI_PROVIDER=ollama
OLLAMA_HOST=http://host.docker.internal:11434
```

4. In the app, select "Ollama (Local)" as your provider

### Advanced: custom endpoint

Set `AI_BASE_URL` to override any provider's default endpoint (useful for proxies, Azure OpenAI, or self-hosted instances):

```bash
AI_BASE_URL=https://my-proxy.example.com/v1
```

## Model overrides

By default, JobTopBob uses a sensible default model for each provider. You can override this per-user in **Settings > AI Preferences > Model Override**.

Examples:
- OpenAI: `gpt-4o`, `gpt-4o-mini`
- Anthropic: `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`
- Gemini: `gemini-2.5-flash`, `gemini-2.5-pro`
- OpenRouter: `anthropic/claude-sonnet-4-20250514`, `google/gemini-2.5-flash`
- Ollama: `llama3.2`, `mistral`

## AI features

Once configured, these features become available:

- **Suitability scoring** — automatic score (1-5) when a job is added
- **JD extraction** — structured fields parsed from raw job descriptions
- **Cover letter generation** — streaming AI-generated cover letters
- **Interview prep** — practice questions based on the job description
- **ATS scoring** — keyword match between your resume and the JD
- **Resume tailoring** — suggestions to improve resume fit
- **Ghostwriter** — conversational AI for drafting emails and messages

## Privacy

- API keys are set as environment variables, not stored in the database
- Job descriptions and resume content are sent to the configured AI provider for processing
- User content in prompts is wrapped in `<user_content>` XML tags for prompt injection defense
- No data is sent to any AI provider without an explicit user action
