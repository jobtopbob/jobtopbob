---
sidebar_label: Gmail
sidebar_position: 2
---

# Gmail Setup

Connect your Gmail account to automatically detect job-search-related emails. Gmail uses Google Cloud Pub/Sub for real-time push notifications.

On first connect, the worker backfills emails from the last 7 days. After that, only new emails are processed as they arrive. Gmail watches expire after 7 days — the worker automatically renews them every 6 days, so no manual intervention is needed.

## Prerequisites

- A Google Cloud project (free tier is sufficient)
- A publicly accessible HTTPS endpoint for your JobTopBob API (required for Pub/Sub push delivery)
- An [AI provider configured](../features/ai-setup) (used for email classification)

## Step 1: Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** > **New Project**
3. Name it (e.g., "jobtopbob") and click **Create**
4. Enable the following APIs from **APIs & Services > Library**:
   - **Gmail API**
   - **Cloud Pub/Sub API**

## Step 2: Configure the OAuth consent screen

1. In the Google Cloud Console, go to **Google Auth platform** > **Branding**
   - If you see "Google Auth platform not configured yet", click **Get Started**
2. Under **App Information**:
   - App name: "JobTopBob"
   - User support email: your email address
3. Click **Next**
4. Under **Audience**, select **External** (or **Internal** for Google Workspace organizations)
5. Click **Next**, fill in contact email, then **Continue** > **Create**
6. Go to **Google Auth platform** > **Data Access** and add the scope:
   - `https://www.googleapis.com/auth/gmail.readonly`

> `gmail.readonly` is classified as **non-sensitive** by Google, so only basic app verification is required. For deployments with more than 100 users, you will need to submit for full Google verification (requires a privacy policy URL and may take several weeks).

## Step 3: Create OAuth 2.0 credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add an **Authorized redirect URI**:
   - Local development: `http://localhost:8080/api/v1/email/oauth/callback`
   - Production: `https://<your-domain>/api/v1/email/oauth/callback`
5. Click **Create** and copy the **Client ID** and **Client Secret**

## Step 4: Set up Pub/Sub topic

1. Go to **Pub/Sub** > **Topics** in the Cloud Console
2. Click **Create Topic**
3. Topic ID: `gmail-watch`
4. Click **Create**
5. On the topic page, go to the **Permissions** tab and click **Add Principal**:
   - New principal: `gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**
6. Click **Save**

This grants the Gmail API permission to publish notifications to your topic.

## Step 5: Create push subscription

### Production

1. On the topic page, click **Create Subscription**
2. Subscription ID: `gmail-push`
3. Delivery type: **Push**
4. Endpoint URL: `https://<your-domain>/api/v1/email/webhook`
5. Click **Create**

### Local development

Google Cloud Pub/Sub push subscriptions require a publicly accessible HTTPS endpoint. To receive real-time notifications on `localhost`, you need to expose your local API server via a tunnel.

**Using ngrok:**

1. Install [ngrok](https://ngrok.com) and authenticate:

   ```bash
   ngrok http 8080
   ```

2. Copy the forwarding URL (e.g., `https://abc123.ngrok-free.app`)

3. In **Pub/Sub > Subscriptions**, create a push subscription:
   - Subscription ID: `gmail-push-dev`
   - Delivery type: **Push**
   - Endpoint URL: `https://abc123.ngrok-free.app/api/v1/email/webhook`

4. Update your `.env` to use the tunnel URL for the OAuth redirect as well:

   ```bash
   GOOGLE_REDIRECT_URI=https://abc123.ngrok-free.app/api/v1/email/oauth/callback
   ```

5. Add the same tunnel URL as an **Authorized redirect URI** in your Google Cloud OAuth credentials (Step 3)

**Using Cloudflare Tunnel:**

```bash
cloudflared tunnel --url http://localhost:8080
```

Then follow the same steps above with the generated `*.trycloudflare.com` URL.

> **Note:** Free ngrok and Cloudflare Tunnel URLs change on restart. You will need to update the push subscription endpoint and OAuth redirect URI each time. For a stable local URL, use a paid ngrok plan with a fixed domain or a named Cloudflare Tunnel.

**Without a tunnel (limited):**

If you skip the push subscription, the email integration still works partially — the initial 7-day backfill runs when a user connects Gmail, but you won't receive real-time notifications for new emails. This can be sufficient for testing the OAuth flow and email classification without setting up a tunnel.

## Step 6: Set environment variables

Add these to your `.env`:

```bash
# Gmail OAuth (from Step 3)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://<your-domain>/api/v1/email/oauth/callback

# Google Cloud Pub/Sub (from Step 4)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
PUBSUB_TOPIC_NAME=gmail-watch

# Encryption key for OAuth tokens (generate once, keep secret)
# Generate with: openssl rand -hex 32
API_ENCRYPTION_KEY=your-64-char-hex-string
```

Then restart your services:

```bash
docker compose restart api worker
```

## Connecting Gmail

1. Go to **Settings > Integrations** in the app
2. Click **Connect Gmail**
3. Complete the Google OAuth consent flow
4. Grant read-only access to your email
5. You should be redirected back to Settings with a "Connected" status

To verify, send a test email to your connected Gmail (e.g., a mock interview invite). Within seconds, a new event should appear on the **Email Integration** page.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Webhook not receiving notifications | Ensure your endpoint is publicly accessible with a valid HTTPS certificate |
| "App not verified" warning | Expected during development. Add test users in the Google Console, or submit for verification |
| OAuth redirect error | Verify the redirect URI in Google Console matches your `GOOGLE_REDIRECT_URI` exactly (including protocol and path) |
| No email events appearing | Check worker logs for AI provider errors. Ensure your AI provider is configured correctly |
| Token refresh failures | The refresh token may have been revoked. Ask the user to reconnect via Settings |
