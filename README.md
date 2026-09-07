# Countermeasures

Discord bot to uwuify messages from targeted users via webhook impersonation and suppress embeds on matching links. Built with `discord.js` (v14).

## Setup

1. Enable **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers/applications) under **Bot**.
2. Invite bot with permissions: `Manage Messages`, `Manage Webhooks`, `Send Messages`, `Read Message History`.
3. Configure environment:
   ```bash
   cp .env.example .env
   # Set DISCORD_TOKEN and CLIENT_ID
   npm install --omit=dev
   npm run deploy-commands
   ```

## Commands

Requires `Manage Server` permission:
- `/toggle <feature> [enabled]`: Toggle bot features (`Uwuify` or `Embed Suppression`) on/off.
- `/uwu toggle` / `/suppress toggle`: Toggle individual features on/off.
- `/uwu add <user>` / `/uwu remove <user>` / `/uwu list`: Manage target users.
- `/uwu chance <percent>`: Set server-wide random chance (0-100%) for everyone.
- `/uwu mode <webhook|reply>`: Switch between Webhook impersonation and Reply mode.
- `/suppress add <keyword>` / `/suppress remove <keyword>` / `/suppress list`: Manage link domains/keywords/filenames to strip embeds from.

*Changes persist automatically in `config.json`.*

## Deploy on Ubuntu

### Option 1: Systemd (Native)
```bash
sudo cp countermeasures.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now countermeasures
sudo journalctl -u countermeasures -f
```

### Option 2: Docker
```bash
docker compose up -d --build
```
