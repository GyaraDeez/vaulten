# Vaulten Storage Bot

## Overview
A Discord bot with a web dashboard for password-protected text and file storage. Users can store, retrieve, update, and delete text entries and files using unique IDs and passwords via Discord slash commands or the web interface. Supports user keys for grouping entries by owner.

## Architecture
- **Frontend**: React + TypeScript with shadcn/ui components, served via Vite
- **Backend**: Express.js API server with multer for file uploads
- **Discord Bot**: discord.js with slash commands, integrated into the Express server
- **Database**: SQLite (local `data.db` file) via Drizzle ORM + better-sqlite3
- **Storage**: Key-value text entries + file entries with bcrypt-hashed passwords; files stored on disk in `uploads/` directory, metadata in DB

## Key Files
- `shared/schema.ts` - Data models (users, textEntries, fileEntries)
- `server/bot.ts` - Discord bot with slash commands (registers globally on startup)
- `server/routes.ts` - REST API endpoints
- `server/storage.ts` - Database storage layer (IStorage interface)
- `server/db.ts` - Database connection
- `client/src/pages/home.tsx` - Main dashboard page

## Discord Bot Slash Commands
### Text
- `/store id password text [userkey]` - Store text with a unique ID, password, and optional user key
- `/get id password` - Retrieve text by ID
- `/update id password text` - Update existing text
- `/delete id password` - Delete text entry

### Files
- `/storefile id password file [userkey]` - Store an attached file
- `/getfile id password` - Retrieve and download a stored file
- `/deletefile id password` - Delete a file entry

### Utility
- `/keys userkey` - List all entry IDs (text & files) for a user key
- `/help` - Show all commands

All slash command responses are ephemeral (only visible to the user who ran the command).

## API Endpoints
- `GET /api/bot/status` - Bot status
- `GET /api/entries/count` - Text entry count
- `GET /api/entries/file-count` - File entry count
- `POST /api/entries/store` - Store new text entry
- `POST /api/entries/retrieve` - Retrieve text entry with password
- `POST /api/entries/update` - Update text entry with password
- `POST /api/entries/delete` - Delete text entry with password
- `POST /api/entries/keys` - List entries by user key (returns both text & file entries)
- `POST /api/files/store` - Upload and store file (multipart/form-data)
- `POST /api/files/info` - Get file metadata with password (returns JSON info)
- `POST /api/files/download` - Download file binary with password (streams binary response)
- `POST /api/files/delete` - Delete file entry with password

## Environment Variables
- `DISCORD_BOT_TOKEN` - Discord bot token (required for bot functionality)
- `SESSION_SECRET` - Session secret

## Setup Notes
- The bot uses slash commands which only require the `Guilds` intent (no privileged intents needed).
- Slash commands are registered globally on bot startup. They may take up to an hour to appear in all servers after first registration.
- The bot needs the `applications.commands` scope when invited to a server.
- Text entries and file metadata are stored in a local SQLite file (`data.db`) using WAL journal mode.
- Files are stored on disk in the `uploads/` directory. No file size limit is enforced.
- Entry IDs are unique across both text and file entries (collision check on store).
- `/storefile` has no size limit (Discord still limits attachments to 25 MB or more with Nitro).
