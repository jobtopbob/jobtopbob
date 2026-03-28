---
sidebar_position: 3
---

# Email Integration

JobTopBob can connect to Gmail to automatically detect job-search-related emails — interview invitations, rejections, offers, and follow-up responses.

## How it works

1. You connect your Gmail account via OAuth (read-only access)
2. The background worker polls for new emails every 5 minutes
3. Each email is classified by the AI provider into categories: `interview`, `rejection`, `offer`, `follow_up`
4. Detected events appear in the **Tracking Inbox** for you to confirm, dismiss, or override
5. Confirmed events update the linked job application automatically

## Prerequisites

- A Google Cloud project with Gmail API enabled
- OAuth 2.0 credentials (Web application type)
- An AI provider configured (for email classification)

## Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Enable the **Gmail API** under APIs & Services
4. Configure the **OAuth consent screen**:
   - User type: External (or Internal for Workspace)
   - App name: "JobTopBob"
   - Scopes: `gmail.readonly`
5. Create **OAuth 2.0 credentials**:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:8080/api/v1/email/oauth/callback` (adjust for your domain)
6. Copy the Client ID and Client Secret

## Environment variables

Add to your `.env`:

```bash
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REDIRECT_URI=http://localhost:8080/api/v1/email/oauth/callback
```

## Connecting Gmail

1. Go to **Settings > Integrations** in the app
2. Click **Connect Gmail**
3. Complete the Google OAuth flow
4. Grant read-only access to your email

## Security

- JobTopBob only requests `gmail.readonly` scope — it cannot send, delete, or modify emails
- OAuth tokens are encrypted at rest with AES-256-GCM (per-user key derivation via HKDF)
- You can disconnect Gmail at any time from Settings, which deletes all stored tokens and email events

## Tracking Inbox

The Tracking Inbox shows detected email events with:

- Email snippet and detected type
- Confidence score from AI classification
- Confirm / Dismiss / Override actions
- Link to the matched job application

Unconfirmed events appear as a badge count in the sidebar.
