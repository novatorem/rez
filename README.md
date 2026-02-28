# Rez (Rezonate)

A real-time social status app where you can share what you're up to with your friends. Think of it as a lightweight, privacy-focused "what are you doing right now?" feed.

---

## Table of Contents

- [Rez (Rezonate)](#rez-rezonate)
	- [Table of Contents](#table-of-contents)
	- [Overview](#overview)
	- [Features](#features)
	- [Tech Stack](#tech-stack)
	- [Getting Started](#getting-started)
		- [Prerequisites](#prerequisites)
		- [Environment Variables](#environment-variables)
		- [Installation](#installation)
		- [Development](#development)
		- [Building for Production](#building-for-production)
	- [Infrastructure Setup (Supabase)](#infrastructure-setup-supabase)
		- [Create a Supabase Project](#create-a-supabase-project)
		- [Run the SQL Setup](#run-the-sql-setup)
		- [Enable Realtime](#enable-realtime)
		- [Auth Configuration](#auth-configuration)
	- [Architecture](#architecture)
		- [Project Structure](#project-structure)
		- [Data Flow](#data-flow)
		- [Database Schema](#database-schema)
		- [Key Design Decisions](#key-design-decisions)
	- [Security](#security)
		- [Authentication \& Session Management](#authentication--session-management)
		- [Row Level Security](#row-level-security)
		- [Cookie Security](#cookie-security)
		- [Database Functions](#database-functions)
		- [Development Mode Caveats](#development-mode-caveats)
	- [Real-time Updates](#real-time-updates)
	- [Local Storage Usage](#local-storage-usage)
	- [Potential Improvements](#potential-improvements)

---

## Overview

Rez lets you:
- Post a short status (up to 42 characters) so friends know what you're up to
- See your friends' statuses and when they last updated them
- Send, accept, and reject friend requests by username
- Reorder your friends list via drag and drop
- Pick from quick-select status presets you define yourself
- Choose from 35 DaisyUI themes

---

## Features

| Feature | Details |
|---|---|
| Authentication | Email/password with optional email confirmation |
| Status updates | 42-character limit, with quick-status presets |
| Friend requests | Send by username, accept/reject/cancel |
| Real-time sync | Supabase Realtime (optional, gracefully degrades) |
| Friend ordering | Drag-and-drop reorder, persisted in `localStorage` |
| Themes | 35 built-in DaisyUI themes, cookie-persisted |
| Profile | Username (3–20 chars) + optional display name (up to 50 chars) |
| Data export | Download all your data as JSON |
| Account deletion | Password-confirmed, cascades all data including auth user |
| Debug panel | Accessible on iOS, on error, or via `localStorage` flag |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [SvelteKit 2](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI v5](https://daisyui.com/) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime) |
| Auth integration | `@supabase/ssr` |
| Avatars | `svelte-boring-avatars` (deterministic from user ID) |
| Theme switching | `theme-change` |
| Build tool | Vite 7 |
| Linting | ESLint 9 + `eslint-plugin-svelte` |
| Formatting | Prettier + `prettier-plugin-svelte` + `prettier-plugin-tailwindcss` |

---

## Getting Started

### Prerequisites

- Node.js 18+ (or compatible runtime)
- A [Supabase](https://supabase.com/) project (free tier is fine)
- npm (or pnpm / yarn)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are safe to expose client-side (they are prefixed with `PUBLIC_`). The anon key is restricted by Row Level Security policies on the database.

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
# or open in browser automatically:
npm run dev -- --open
```

> **Note:** In development mode, TLS certificate verification is disabled (`NODE_TLS_REJECT_UNAUTHORIZED=0`) to allow self-signed certificates when running Supabase locally. This is guarded by `NODE_ENV === 'development'` and never applies to production builds.

Other useful scripts:

```bash
npm run check          # Type-check the project
npm run check:watch    # Type-check in watch mode
npm run lint           # Check formatting + ESLint
npm run format         # Auto-format all files
```

### Building for Production

```bash
npm run build
npm run preview        # Preview the production build locally
```

The project uses `@sveltejs/adapter-auto`, which automatically selects the right adapter for your deployment platform (Vercel, Netlify, Node, etc.). For a specific platform you may want to swap in a dedicated adapter.

---

## Infrastructure Setup (Supabase)

### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and create a new project
2. Note your **Project URL** and **anon public key** from **Project Settings → API**

### Run the SQL Setup

All SQL is stored in `src/sql/`. Run each file in order in the Supabase **SQL Editor**:

**1. Utility functions (run first - other scripts depend on these):**

```
src/sql/functions/update_timestamp.psql
src/sql/functions/normalize_friendship_order.psql
```

**2. Tables:**

```
src/sql/tables/users.psql
src/sql/tables/profiles.psql
src/sql/tables/friends.psql
src/sql/tables/friend_requests.psql
```

**3. Trigger functions and RPC:**

```
src/sql/functions/handle_new_user.psql
src/sql/functions/delete_user_account.psql
src/sql/functions/get_dashboard_data.psql
```

All scripts are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, policy existence checks), so re-running them is safe.

### Enable Realtime

For live updates to work, enable Supabase Realtime replication on three tables. Either use the dashboard (**Database → Replication**) or run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

Real-time is optional - the app functions normally without it, users just need to refresh to see changes.

### Auth Configuration

In your Supabase dashboard under **Authentication → URL Configuration**:

- **Site URL**: your production domain (e.g. `https://yourapp.com`)
- **Redirect URLs**: add `https://yourapp.com/auth/confirm` (and `http://localhost:5173/auth/confirm` for local dev)

Email confirmation is supported. When a new user signs up, they receive a confirmation email that redirects to `/auth/confirm`, which validates the OTP token and then redirects to `/dashboard`.

---

## Architecture

### Project Structure

```
src/
├── app.css                        # Global styles
├── app.d.ts                       # TypeScript ambient declarations (locals types)
├── app.html                       # HTML shell
├── database.types.ts              # Supabase-generated DB types
├── hooks.server.ts                # Server hooks: Supabase client, auth guard, theme injection
│
├── lib/
│   ├── dashboard/
│   │   └── loader.ts              # DashboardDataLoader class - all DB queries
│   ├── friends/
│   │   ├── api.ts                 # verifyFriendshipExists, checkExistingFriendRequest, checkIncomingFriendRequest
│   │   ├── order.ts               # localStorage-backed friend ordering singleton
│   │   └── components/
│   │       ├── DeleteModal.svelte
│   │       ├── List.svelte        # Drag-and-drop friend list with statuses
│   │       ├── ListSkeleton.svelte
│   │       ├── Requests.svelte    # Send/accept/reject/cancel requests
│   │       └── RequestsSkeleton.svelte
│   ├── profile/
│   │   ├── api.ts                 # findUserByUsername, checkUsernameAvailability
│   │   └── validation.ts          # Username/display-name constants, validators, ERROR_MESSAGES
│   ├── realtime/
│   │   └── subscriptions.ts       # RealtimeSubscriptionManager class
│   ├── status/
│   │   ├── formatting.ts          # formatStatusUpdatedAt, formatStatusUpdatedAtTooltip
│   │   ├── quick.ts               # localStorage-backed quick status management
│   │   ├── validation.ts          # MAX_STATUS_LENGTH, validateStatus
│   │   └── components/
│   │       ├── Section.svelte     # Status form + quick statuses
│   │       └── Skeleton.svelte
│   └── ui/
│       ├── notifications.ts       # NotificationManager, handleDatabaseError, getDisplayName
│       ├── themes.ts              # List of available DaisyUI theme names
│       ├── toast.ts               # Global toast notification store
│       ├── DebugPanel.svelte      # Floating debug log panel (dev/iOS/error)
│       ├── Footer.svelte
│       ├── Navigation.svelte      # Sticky nav with logout + settings link
│       ├── ThemeSelect.svelte     # Theme picker component
│       ├── Toast.svelte
│       └── ToastContainer.svelte
│
├── routes/
│   ├── +layout.server.ts          # Passes session + cookies to client layout
│   ├── +layout.svelte             # Root layout: theme init, auth listener, toast container
│   ├── +layout.ts                 # Creates Supabase client (browser or server)
│   ├── +page.svelte               # Landing / hero page
│   ├── auth/
│   │   ├── +layout.svelte
│   │   ├── +page.server.ts        # login/signup form actions
│   │   ├── +page.svelte           # Login/signup tab UI
│   │   ├── confirm/+server.ts     # Email confirmation OTP handler
│   │   ├── error/+page.svelte     # Auth error page
│   │   └── logout/+server.ts      # POST endpoint: server-side sign out + cookie clear
│   └── dashboard/
│       ├── +layout.server.ts      # Auth guard - redirects unauthenticated users to /
│       ├── +layout.svelte         # Dashboard layout with Navigation
│       ├── +page.server.ts        # Minimal load (session only)
│       ├── +page.svelte           # Main dashboard page
│       └── settings/
│           ├── +page.server.ts
│           └── +page.svelte       # Settings page
│
└── sql/
    ├── functions/
    │   ├── delete_user_account.psql
    │   ├── get_dashboard_data.psql
    │   ├── handle_new_user.psql
    │   ├── normalize_friendship_order.psql
    │   └── update_timestamp.psql
    └── tables/
        ├── friend_requests.psql
        ├── friends.psql
        ├── profiles.psql
        └── users.psql
```

### Data Flow

1. **Server request** hits `hooks.server.ts`, which creates a Supabase server client using cookies, calls `safeGetSession()` (validates JWT via `getUser()`), and enforces the auth guard.
2. **`+layout.server.ts`** passes `session` and raw cookies to the client.
3. **`+layout.ts`** creates a Supabase browser client (or server client during SSR) and exposes `supabase`, `session`, and `user` to all child layouts/pages.
4. **Dashboard page** receives only `session` from the server - all dashboard data (friends, statuses, requests) is loaded client-side via `DashboardDataLoader`. This keeps server load minimal and avoids serializing large data structures through the load chain.
5. **Real-time** updates are handled by `RealtimeSubscriptionManager`, which subscribes to `friend_requests`, `friends`, and `profiles` table changes. On any relevant event, a debounced refresh (300ms) reloads dashboard data.

### Database Schema

```
auth.users (Supabase built-in)
    └── public.users        id, username (unique), display_name, email, created_at, updated_at
    └── public.profiles     id, status (max 42 chars), created_at, updated_at

public.users
    └── public.friends          user_id, friend_id  (canonical: user_id < friend_id)
    └── public.friend_requests  requester_id, target_id
```

**`public.friends`** stores one record per friendship pair. The `normalize_friendship_order` trigger ensures `user_id` is always the lexicographically smaller UUID, enforced by a `CHECK (user_id < friend_id)` constraint. This prevents duplicate records and simplifies existence checks.

**`public.profiles`** stores the user's current status. Updated via `upsert` from the client.

**Automatic provisioning**: When a new `auth.users` row is inserted, the `on_auth_user_created` trigger fires `handle_new_user()`, which auto-generates a unique username from the email prefix and creates the corresponding `users` and `profiles` rows.

### Key Design Decisions

**Client-side data loading for the dashboard**
The server only validates the session; dashboard data is fetched client-side. This simplifies the SvelteKit load chain and makes the initial page interactive faster (skeleton loaders are shown while data loads). The trade-off is that data is not available on first SSR render.

**localStorage for quick statuses and friend ordering**
Quick statuses and friend order are stored in the browser's `localStorage` rather than the database. This avoids additional schema complexity and database writes for purely presentational preferences. The trade-off is that these settings are device-specific and do not sync across browsers/devices.

**Svelte 5 runes throughout**
All components use Svelte 5's rune-based reactivity (`$state`, `$derived`, `$effect`, `$props`, `$bindable`). This is the modern Svelte 5 API and provides cleaner component logic with explicit reactivity.

**Debounced real-time refresh**
Rather than updating specific state slices on each Realtime event, the app does a full data reload with a 300ms debounce. This is simpler to reason about and handles batched events correctly, at the cost of slightly more database reads.

**`adapter-auto`**
Using `@sveltejs/adapter-auto` means the project deploys to any supported platform without configuration changes. Swap in a specific adapter if you need fine-grained control.

---

## Security

### Authentication & Session Management

- Auth uses Supabase's email/password flow via `@supabase/ssr`.
- Session validation in `hooks.server.ts` calls both `getSession()` and `getUser()`. The `getUser()` call makes a network request to Supabase to cryptographically verify the JWT - this prevents accepting a locally-forged or replayed token. This pattern follows [Supabase's security recommendations](https://supabase.com/docs/guides/auth/server-side/nextjs#understanding-what-session-means).
- `safeGetSession()` returns `{ session: null, user: null }` on any validation error rather than propagating the error upward.
- The auth guard in `hooks.server.ts` redirects unauthenticated users away from `/dashboard/**` and redirects authenticated users away from `/auth`.
- Logout hits both the client-side `supabase.auth.signOut()` and a server-side `POST /auth/logout` endpoint that manually clears all Supabase auth cookies.

### Row Level Security

All four public tables have RLS enabled. The policies enforce:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | All authenticated users can read | - | Own row only | Own row only |
| `profiles` | All authenticated users can read | Own row only | Own row only | - |
| `friends` | Only if `user_id` or `friend_id` matches | Only if `user_id` or `friend_id` matches | - | Only if `user_id` or `friend_id` matches |
| `friend_requests` | Own rows (as requester or target) | Own as requester | Own as target | Own as requester or target |

The read-all policy on `users` and `profiles` is intentional - users need to search for others by username and view friends' statuses.

### Cookie Security

Auth session cookies are set with:
- **`path: '/'`** - applies app-wide
- **`secure: true`** in production (HTTPS only) - prevents cookie theft over plain HTTP
- **`sameSite: 'lax'`** - blocks cross-site POST requests from sending the cookie (CSRF mitigation)
- **`domain`** set to the request hostname in production - prevents session sharing across subdomains
- Localhost/127.0.0.1: `domain` is omitted to avoid browser quirks

iOS Safari receives `sameSite: 'lax'` (same as all other clients), which avoids the more restrictive `none` behavior that can cause issues with in-app browsers.

### Database Functions

- `delete_user_account()` runs as `SECURITY DEFINER` so it can delete from `auth.users` (which the anon/authenticated role cannot do directly). It checks `auth.uid()` at runtime to confirm the caller is authenticated before proceeding.
- `handle_new_user()` also runs as `SECURITY DEFINER SET search_path = ''` to prevent search path injection attacks.
- Execute permission on `delete_user_account()` is granted only to the `authenticated` role.

### Development Mode Caveats

In development (`NODE_ENV === 'development'`), TLS certificate verification is disabled via `NODE_TLS_REJECT_UNAUTHORIZED=0`. This is logged with a visible warning. **Never run production builds with this flag set.**

---

## Real-time Updates

The `RealtimeSubscriptionManager` class (in `src/lib/realtime/subscriptions.ts`) opens channels per logged-in user:

| Channel | Table | Filter |
|---|---|---|
| `friend_requests_from_{userId}` | `friend_requests` | Server-side: `requester_id=eq.{userId}` |
| `friend_requests_to_{userId}` | `friend_requests` | Server-side: `target_id=eq.{userId}` |
| `friends_user_{userId}` | `friends` | Server-side: `user_id=eq.{userId}` |
| `friends_friend_{userId}` | `friends` | Server-side: `friend_id=eq.{userId}` |
| `profiles_friends_{userId}` | `profiles` | Server-side: `id=in.(friendId1,friendId2,...)` |

Each table uses two channels because Supabase Realtime only supports a single `eq` filter per channel, and the current user can appear in either column. The profiles channel is scoped to the user's current friend list via an `in` filter and is recreated whenever the friend list changes — only `UPDATE` events for friends' rows are delivered.

To enable Realtime, tables must be added to Supabase's publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
```

If Realtime is not configured, the subscriptions fail silently and the app works normally with manual refresh.

---

## Local Storage Usage

| Key | Content | Purpose |
|---|---|---|
| `friend-order` | `string[]` (friend UUID array) | Persists drag-and-drop friend order |
| `rez_quick_statuses` | `QuickStatus[]` (JSON) | Persists user-defined quick status presets |
| `debug-mode` | `"true"` / `"false"` | Controls debug panel visibility |

These are purely client-side and device-specific - they are not synced to the database. Clearing browser storage resets these to defaults.

---

## Potential Improvements

**API**
- Introduce an API. View only, so people can make their own dashboards (e.g. TRMNL).

**User Experience**
- No password reset or email change flow is exposed in the UI.

**Code Quality**
- No automated tests (unit or integration).
