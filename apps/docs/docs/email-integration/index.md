---
sidebar_label: Overview
sidebar_position: 1
---

# Email Integration

JobTopBob can connect to your email account to automatically detect job-search-related emails in real time. New emails trigger push notifications, are classified by AI, and appear in the Tracking Inbox for your review.

## Supported providers

| Provider | Status |
|----------|--------|
| [Gmail](./gmail) | Available |
| Outlook | Planned |

## How it works

1. You connect your email account via OAuth (read-only access)
2. Your email provider sends a push notification to your server whenever a new email arrives
3. The background worker fetches the email and classifies it with your configured AI provider
4. Detected events appear in the **Tracking Inbox** for you to confirm, dismiss, or override
5. Confirmed events automatically update the linked job application's stage

## Classification categories

| Intent | Description |
|--------|-------------|
| `interview_invite` | Scheduling an interview, phone screen, or video call |
| `rejection` | Application not successful, position filled, or moving forward with other candidates |
| `offer` | Job offer, compensation details, or offer letter |
| `assessment` | Coding challenge, take-home assignment, or skills test |
| `follow_up` | Acknowledgment of application received, status update, or request for additional info |
| `other` | Not related to a job application, or too ambiguous to classify |

Emails classified as `other` or with a confidence score below 0.5 are automatically skipped.

## Tracking Inbox

The Tracking Inbox shows detected email events with:

- Email snippet and detected type
- Confidence score from AI classification
- **Confirm** / **Dismiss** / **Override** actions
- Link to the matched job application

Unconfirmed events appear as a badge count in the sidebar. Confirming an event automatically advances the linked job to the appropriate stage.

## Security & privacy

- **Read-only access**: JobTopBob only requests read-only scopes — it cannot send, delete, or modify your emails
- **Email body never stored**: The full email body is sent to the AI provider for classification, then discarded. Only a 1-3 line snippet and the classification result are stored
- **Encrypted tokens**: OAuth tokens are encrypted at rest using AES-256-GCM with per-user key derivation (HKDF)
- **Instant revocation**: Disconnecting an email account from Settings revokes the OAuth token, stops the watch, and deletes all stored tokens and email events
- **Open source**: All email integration code is auditable — no hidden data collection
