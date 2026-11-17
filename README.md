# Lokal Lens Client

The Lokal Lens frontend is a responsive business directory built with Next.js and React. It provides public business discovery and profile pages, saved listings, owner tools, and an admin review dashboard. Directory and dashboard data come from the separate Lokal Lens API.

## Requirements

- Node.js compatible with Next.js 16
- npm
- The Lokal Lens API, for directory data, authentication, and dashboard workflows

## Setup

From the `Client` directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To use another port, run `npm run dev -- --port 3001`.

Create `.env.local` in this directory when you need to override the API or public site URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` should point to the API base URL, including `/api/v1`. If omitted, API requests use the configured production API URL. `NEXT_PUBLIC_SITE_URL` is used for canonical and metadata URLs; set it to the deployed website origin in production. These values are public browser configuration. Do not put API credentials, OAuth client secrets, or other private keys in `NEXT_PUBLIC_*` variables.

## Available commands

```bash
npm run dev    # Start the development server
npm run build  # Create a production build
npm run start  # Serve the production build
npm run lint   # Run ESLint
```

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Homepage and business discovery |
| `/directory` | Search and browse listings |
| `/directory/[slug]` | Business profile |
| `/[city]/[term]/[entry]` | Search-engine-friendly business profile URL |
| `/categories` | Browse business categories |
| `/saved` | Saved businesses on this device/account |
| `/login` and `/register` | Account access |
| `/business-owner` | Business owner dashboard |
| `/admin` | Listing review and administration |

## Project structure

- `src/app/` — App Router pages and route-level loading/error states
- `src/components/` — Shared public-site UI
- `src/dashboard/` — Owner and admin dashboards, API client, and dashboard components
- `src/lib/` — Public API helpers and shared business utilities
- `public/` — Static public assets

The backend repository contains server configuration, API details, and deployment-specific setup. Business Profile reviews and other Google integrations require server-side configuration and Google API access; keep their credentials on the backend.

## Deployment

Build the app with `npm run build`, set `NEXT_PUBLIC_API_URL` to the deployed API base URL, and configure `NEXT_PUBLIC_SITE_URL` to the public website origin. Deploy the Client directory as the Next.js application. Keep backend secrets in the backend hosting environment, never in this frontend repository or browser-visible variables.
