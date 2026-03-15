# Rez - Claude Guidelines

## Project Overview

**Rez (Rezonate)** is a lightweight, real-time social status app. Users post brief status messages (max 42 characters) so a small circle of close friends knows what they're up to right now. It's privacy-first (friend-only, no public feed), installable as a PWA, and supports 35 DaisyUI themes.

## Tech Stack

- **Framework:** SvelteKit 2 + Svelte 5 (rune-based: `$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **Styling:** Tailwind CSS v4 + DaisyUI v5 (all 35 themes enabled)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Language:** TypeScript
- **Build:** Vite 7

## Code Conventions

- **Indentation:** 2 spaces (no tabs) - `.prettierrc` enforces this
- **Components:** Svelte 5 runes only (no legacy Options API / stores except `toastStore`)
- **Animations:** Centralized in `src/app.css` - easing tokens (`--ease-out-quart`, `--ease-out-expo`), keyframes, and utility classes. Do not define duplicate keyframes in component `<style>` blocks.
- **Accessibility:** All icon-only buttons must have `aria-label`. Dialogs must have `aria-labelledby`. Use `role` and landmark semantics correctly.
- **Reduced motion:** Global catch-all in `app.css` handles `prefers-reduced-motion`. Component-level `@media` blocks may supplement for specific cases.
- **Debug tooling:** Always gate with `{#if dev}` from `$app/environment` - never ship debug UI to production.

## Design Context

### Users

Close friend groups - small circles of real-life friends keeping casual tabs on each other. The context is personal and low-stakes: checking in, not broadcasting. Users want quick awareness without the noise of a full social feed.

### Brand Personality

Warm, friendly, and approachable. Rez should feel like a cozy corner of the internet - the digital equivalent of a group chat, not a social network. Three words: **intimate, genuine, light**.

### Emotional Goals

- Using Rez should feel **easy and natural**, not effortful
- Seeing a friend's status should spark a small moment of connection
- The app should stay out of the way - ambient awareness, not engagement-maximizing

### Aesthetic Direction

Rez has its own distinct identity - no direct reference apps. The visual language should:

- Feel **warm and human**, not cold or corporate
- Support **both light and dark themes equally well** (user preference respected; neither is secondary)
- Use the **purple brand color** (`#6419e6` primary) as a confident but not overbearing accent
- Favor **soft depth** over heavy shadows or aggressive contrast
- Prefer **subtle motion** - animations should feel gentle and reassuring, not flashy

### Design Principles

1. **Intimacy over scale** - Design for small groups, not audiences. Avoid patterns that feel broadcast-y or feed-like.
2. **Warmth through restraint** - Friendliness comes from good spacing, legible type, and approachable colors - not decoration for its own sake.
3. **Balanced theming** - Every UI decision must look equally good in dark and light modes. Use DaisyUI semantic tokens (`bg-base-100`, `text-base-content`, etc.) rather than hard-coded colors.
4. **Motion with purpose** - Animations should smooth transitions and confirm actions. Nothing should animate just to animate. Always respect `prefers-reduced-motion`.
5. **Friction-free core** - Status updates and friend interactions must be effortless. Minimize steps, skip unnecessary confirmations, surface the most common actions immediately.
