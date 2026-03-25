# Email Integration Setup Guide

This guide covers how to set up Gmail integration for your JobTopBob deployment. The email integration automatically detects interview invitations, rejections, and offer emails from your job applications.

## How It Works

1. Users click "Connect Gmail" in Settings and authorize read-only access
2. Gmail sends push notifications to your server via Google Cloud Pub/Sub when new emails arrive
3. The worker fetches the email, classifies it with AI, and creates an email event
4. Users review and confirm/dismiss events in the Tracking Inbox before any tracker updates

## Prerequisites

- A Google Cloud project (free tier is sufficient)
- A publicly accessible HTTPS endpoint for your JobTopBob API
- An AI provider API key (OpenAI, OpenRouter, or local Ollama)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** > **New Project**
3. Name it (e.g., "jobtopbob") and click **Create**
4. Enable the following APIs from **APIs & Services > Library**:
   - **Gmail API**
   - **Cloud Pub/Sub API**

## Step 2: Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **External** (or Internal for Workspace)
   - App name: "JobTopBob"
   - Scopes: Add `https://www.googleapis.com/auth/gmail.readonly`
4. Back in Credentials, create an OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URI: `https://<your-domain>/api/v1/email/oauth/callback`
5. Copy the **Client ID** and **Client Secret**

> **For production (>100 users):** Submit the OAuth consent screen for Google verification. This requires a privacy policy URL and may take several weeks.

## Step 3: Set Up Pub/Sub Topic

1. Go to **Pub/Sub > Topics**
2. Click **Create Topic**
3. Topic ID: `gmail-watch`
4. Click **Create**
5. On the topic page, click **Permissions** tab > **Add Principal**:
   - New principal: `gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**

## Step 4: Create Push Subscription

1. On the topic page, click **Create Subscription**
2. Subscription ID: `gmail-push`
3. Delivery type: **Push**
4. Endpoint URL: `https://<your-domain>/api/v1/email/webhook`
5. Click **Create**

## Step 5: Set Environment Variables

Add these to your `.env`:

```bash
# Gmail OAuth (from Step 2)
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=https://<your-domain>/api/v1/email/oauth/callback

# Google Cloud Pub/Sub (from Step 3)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
PUBSUB_TOPIC_NAME=gmail-watch

# Encryption key for OAuth tokens (generate once, keep secret)
API_ENCRYPTION_KEY=<run: openssl rand -hex 32>

# AI provider for email classification
AI_PROVIDER=openai          # or: openrouter, ollama
AI_API_KEY=your-api-key     # not needed for Ollama
AI_MODEL=gpt-4o-mini        # cost-effective for classification
```

## Step 6: Restart Services

```bash
docker compose restart api worker
```

## Verification

1. Go to **Settings > Integrations** in JobTopBob
2. Click **Connect Gmail** and complete the Google consent flow
3. You should be redirected back to Settings with "Connected" status
4. Send a test email to your connected Gmail (e.g., a mock interview invite)
5. Within seconds, a new event should appear in the **Email Integration** page

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook not receiving notifications | Ensure your endpoint is publicly accessible with a valid HTTPS certificate |
| "App not verified" warning | Expected during development. Add test users in Google Console, or submit for verification |
| OAuth redirect error | Verify the redirect URI matches exactly (including protocol and path) |
| No email events appearing | Check worker logs for AI provider errors. Ensure `AI_API_KEY` is set |
| Token refresh failures | The refresh token may have been revoked. Ask the user to reconnect |

## Security Notes

- **Read-only access**: We only request `gmail.readonly` scope — no ability to send or modify emails
- **Email body never stored**: The full email body is sent to the AI provider for classification, then discarded. Only a 1-3 line snippet and the classification result are stored
- **Encrypted tokens**: OAuth tokens are encrypted at rest using AES-256-GCM with per-user key derivation (HKDF)
- **Instant revocation**: Users can disconnect Gmail anytime, which revokes access and deletes all stored data
- **Open source**: All code is auditable — no hidden data collection
