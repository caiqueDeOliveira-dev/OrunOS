# Privacy Policy

**Last updated: July 2026**

## 1. Introduction

Orun OS ("we", "our", or "the Software") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect information when you use our desktop application.

## 2. Data We Collect

### 2.1 Data Processed Locally
- **Conversations**: All chat messages are stored locally in an SQLite database on your device
- **Settings**: Application preferences, AI provider configurations, and API keys
- **Usage logs**: Application logs stored locally for debugging purposes
- **Voice data**: Audio recordings for wake word detection are processed locally and not transmitted

### 2.2 Data Sent to Third Parties
When you send a message through the Software, the following data is transmitted to your selected AI provider:

- The message content you type
- System prompts (including agent personality definitions)
- Conversation history (for context)

**We do NOT send:**
- API keys (stored locally in encrypted storage)
- Voice recordings
- File attachments (unless you explicitly attach them to a message)
- Personal information beyond what you choose to include in messages

### 2.3 Third-Party Services

| Service | What's Sent | Purpose |
|---------|-------------|---------|
| Groq | Messages, system prompts | AI inference |
| OpenRouter | Messages, system prompts | AI inference |
| OpenCodeZen | Messages, system prompts | AI inference |
| GitHub Models | Messages, system prompts | AI inference |
| WhatsApp (Baileys) | Messages, agent responses | Messaging integration |
| Telegram (grammY) | Messages, agent responses | Messaging integration |
| Discord | Messages, agent responses | Messaging integration |
| Spotify | Playback data, search queries | Music integration |
| Supabase | Encrypted conversation backups | Cloud backup (optional) |

## 3. How We Use Data

- To provide AI-powered conversations and responses
- To enable messaging integrations (WhatsApp, Telegram, Discord)
- To process voice commands and wake word detection
- To maintain conversation history and context
- To improve application performance through local logging

## 4. Data Storage and Security

### 4.1 Local Storage
- All data is stored in an SQLite database at your application data directory
- API keys are encrypted using Electron's `secretStore`
- Database can be optionally encrypted with a user-provided password

### 4.2 Transmission Security
- All API communications use HTTPS/TLS encryption
- WebSocket connections (WhatsApp, Discord) use WSS encryption

### 4.3 Data Retention
- Local data is retained until you delete it
- Cloud backups (if enabled) are retained until you disable sync or delete your account
- Logs are rotated and limited in size

## 5. Your Rights

You have the right to:

- **Access** all data stored locally by the Software
- **Export** your conversations and settings
- **Delete** any or all of your data
- **Disable** cloud sync at any time
- **Configure** which AI providers receive your data

## 6. Children's Privacy

The Software is not intended for use by children under 13 years of age. We do not knowingly collect information from children.

## 7. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the Software after changes constitutes acceptance of the updated policy.

## 8. Contact

For questions about this Privacy Policy, contact us at: [your-email@orun.ai]
