# Cricket Analytics - AI Coding Agent Instructions

## Project Overview

A full-stack cricket analytics platform built with **Next.js 14**, **Prisma ORM**, **PostgreSQL**, and **BetterAuth**. The app provides real-time cricket scores, team/player statistics, and user authentication with personalized favorites.

## Architecture & Data Flow

### Key Components

- **Frontend**: Next.js 14 App Router with React/TypeScript (client/server components)
- **Backend**: Next.js API routes (REST endpoints)
- **Database**: PostgreSQL with Prisma models (User, Match, Team, Player, Favorite, auth tables)
- **External API**: Cricket API (cricapi.com) for live match data
- **Auth**: BetterAuth with email/password, session-based (7 days expiry)

### Critical Patterns

1. **Data Flow**: External Cricket API → Next.js API routes → Prisma → Database → Frontend
2. **API Route Caching**: Routes use `export const revalidate = 60` (e.g., `/api/matches/route.ts`) for on-demand ISR
3. **Client-side Auth**: Use `useSession()` and `signIn/signOut` from `lib/auth-client.ts` (BetterAuth React client)
4. **Server vs Client**: Mark interactive components with `'use client'` (e.g., `Navbar.tsx`, `LiveMatches.tsx`); keep data fetching on server when possible

### Database Schema

- **User**: Handles auth with better-auth adapter; `sessions` and `accounts` for OAuth/multi-auth
- **Match**: Stores `matchId` (external API ID), `teams`, `teamInfo`, `score` (JSON for flexibility)
- **Team/Player**: `playerId`/`teamId` are external API IDs; `stats` field stores JSON data
- **Favorite**: Junction table (userId, matchId) with unique constraint to prevent duplicates

## Developer Workflows

### Local Setup

```bash
npm install
npm run db:generate
npm run db:push
```

Set `.env` with: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL` (http://localhost:3000), `CRICKET_API_KEY`.

### Development

```bash
npm run dev        # Start dev server (localhost:3000)
npm run db:studio  # Open Prisma Studio for data browsing
npm run lint       # Run ESLint
npm run build      # Verify build (checks errors)
```

### Database Migrations

```bash
npx prisma migrate dev --name <description>  # Create & apply migration
npx prisma db push                            # Push schema changes without migrations
```

## Project-Specific Conventions

### API Route Pattern

- Routes in `app/api/` use `NextResponse` and `export const revalidate = 60` for 1-minute revalidation
- Error handling: Return `{ success: false, error: string }` with appropriate HTTP status
- Example: `/api/matches/route.ts` calls `getCurrentMatches()` from `lib/cricket-api.ts`

### UI Components

- Use **Lucide React** icons (`lucide-react`)
- **Tailwind CSS** for styling (no CSS modules currently)
- **Responsive**: Use `hidden md:flex` for mobile-first responsive design
- Color scheme: Blue (`bg-blue-600`, `text-blue-600`), gray for text/backgrounds

### Auth Integration

- `lib/auth.ts`: Server-side BetterAuth config with Prisma adapter
- `lib/auth-client.ts`: Client hooks (`useSession`, `signIn`, `signOut`)
- Protected pages: Redirect unauthenticated users via client-side checks in components
- Session headers: Automatically sent by BetterAuth; no manual JWT handling needed

### Data Fetching

- **Cricket API wrapper** (`lib/cricket-api.ts`): Axios instance with API key in params
- **Server components**: Fetch directly from Cricket API or database in async component bodies
- **Client components**: Use fetch() with API routes (e.g., `fetch('/api/matches')`)
- No caching layer beyond ISR; rely on route `revalidate` settings

## Important Files & Directories

- `lib/auth.ts` — BetterAuth server setup (Prisma adapter)
- `lib/auth-client.ts` — BetterAuth React hooks
- `lib/cricket-api.ts` — Cricket API integration (currentMatches, matchInfo, etc.)
- `lib/prisma.ts` — Prisma client singleton
- `prisma/schema.prisma` — Database schema (start here for model structure)
- `components/Navbar.tsx` — Auth state display, navigation links
- `app/matches/page.tsx` — Main matches listing (uses LiveMatches component)
- `app/api/matches/route.ts` — REST endpoint for fetching matches

## Common Tasks

### Adding a New API Endpoint

1. Create file in `app/api/[feature]/route.ts`
2. Import helpers from `lib/` (cricket-api, prisma, etc.)
3. Add `export const revalidate = 60` and `export const dynamic = 'force-dynamic'` if needed
4. Return `NextResponse.json({ success: true, data: ... })`

### Adding a Database Model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name describe_change`
3. Use `prisma` client from `lib/prisma.ts` to query

### Adding a Page

1. Create `app/[feature]/page.tsx`
2. Use Next.js metadata API for SEO
3. Fetch data server-side when possible; use Client Components for interactivity
4. Import components from `components/`

### Styling New Components

- Always use Tailwind CSS (`className` prop)
- Follow existing color/spacing: blue accents, gray text, `max-w-7xl` containers
- Responsive: Mobile-first with `hidden md:flex` for desktop-only elements

## External Dependencies

- **better-auth**: Authentication (v1.4.17) — Email/password only, no social providers configured
- **@prisma/client**: ORM (v7.4.0)
- **axios**: HTTP client (v1.7.0) — Used for Cricket API calls
- **recharts**: Charts (v2.12.0) — Already imported but minimal use currently
- **zod**: Schema validation (v3.23.0) — Not heavily used yet; available for input validation

## Configuration Files

- `next.config.js`: Image domains (flagcdn.com, upload.wikimedia.org) and server actions limit
- `tsconfig.json`: Path alias `@/*` for imports (e.g., `@/lib/auth.ts`)
- `tailwind.config.js`: Standard Tailwind setup
- `.env.example`: Template for environment variables

## Notes for AI Agents

- Always prioritize the Prisma schema and migration history to avoid conflicts
- BetterAuth handles user sessions; don't manually parse JWTs
- Cricket API response structure may vary; add error handling for missing fields in external data
- Environment variables are required to run locally; provide setup instructions in PR descriptions
