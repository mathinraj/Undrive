# Undrive

**Your Drive, unseen.**

Store personal files in Google Drive's hidden `appDataFolder` — invisible from the Drive UI, accessible only through Undrive. Uses your own Google Drive storage quota. Zero server cost.

## What is this?

Google Drive has a special hidden folder called `appDataFolder` that apps can use to store data. Files in this folder:

- Don't appear in Google Drive's web UI, mobile app, or desktop sync
- Don't show up in search within Google Drive
- Use your existing Google Drive storage quota (15GB free)
- Can only be accessed by the app that created them

Undrive turns this into a personal hidden file vault.

## Features

- **Google Sign-In** — Authenticate with your Google account (only `drive.appdata` scope — we can't see your regular Drive files)
- **Upload files** — Drag-and-drop or file picker with progress tracking
- **File browser** — Grid/list views, search, sort by name/date/size
- **Virtual folders** — Organize files into folders (stored as metadata, not actual Drive folders)
- **Preview** — View images and PDFs directly in the app
- **Download** — Download files with their original filenames
- **Bulk actions** — Select multiple files for download or delete
- **Export vault** — Download everything as a ZIP
- **Storage quota** — See how much Drive space you're using
- **Dark mode** — Light, dark, and system theme support
- **Responsive** — Works on desktop and mobile
- **Zero server cost** — Files transfer directly between your browser and Google. No data passes through our backend.

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [NextAuth v4](https://next-auth.js.org/) (Google OAuth)
- [Zustand](https://zustand.docs.pmnd.rs/) (state management)
- [Google Drive API v3](https://developers.google.com/drive/api/v3/about-sdk) (appDataFolder)
- [Lucide React](https://lucide.dev/) (icons)
- [JSZip](https://stuk.github.io/jszip/) (vault export)

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud Project with the Google Drive API enabled
- An OAuth 2.0 Client ID (Web Application)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd undrive
npm install
```

### 2. Set up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Drive API**
4. Go to **APIs & Services > OAuth consent screen** — configure as External, app name "Undrive"
5. Go to **APIs & Services > Credentials** — create an **OAuth 2.0 Client ID** (Web Application)
6. Add authorized JavaScript origin: `http://localhost:3000`
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Configure environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_SECRET=run-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
openssl rand -base64 32
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET` (do **not** set `NEXTAUTH_URL` — Vercel handles it automatically)
4. Deploy
5. Add your Vercel URL to Google OAuth authorized origins and redirect URIs

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout
│   ├── api/auth/[...nextauth]/ # NextAuth route
│   └── vault/
│       ├── page.tsx            # File browser
│       └── settings/page.tsx   # Settings
├── components/
│   ├── vault-header.tsx        # Header with user menu + quota
│   ├── folder-sidebar.tsx      # Folder navigation
│   ├── file-browser.tsx        # Grid/list file browser
│   ├── upload-zone.tsx         # Drag-and-drop upload
│   ├── file-preview.tsx        # Image/PDF preview modal
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth.ts                 # NextAuth config + token refresh
│   ├── drive.ts                # Google Drive API wrapper
│   ├── store.ts                # Zustand store
│   └── file-utils.ts           # File icons, formatting
└── types/
    └── next-auth.d.ts          # Session type augmentation
```

## Roadmap

- **Phase 1** (current): Web app with hidden Drive storage
- **Phase 2**: End-to-end encryption (AES-256-GCM, vault password, zero-knowledge)
- **Phase 3**: Chrome extension (context menu "Save to Undrive", popup, Drive page integration)

See [prompt.md](./prompt.md) for the full build specification.

## License

MIT
