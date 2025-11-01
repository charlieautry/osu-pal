Project: osu-pal — quick notes for AI coding agents

This repository uses the Next.js app directory (React + TypeScript) with Tailwind-based styling. The goal of these instructions is to give an AI agent the minimal, concrete context to be productive here.

1) Big picture
- Framework: Next.js (app router) with TypeScript/TSX files under `app/`.
- UI: Tailwind CSS plus a small `globals.css` which defines CSS variables (dark-mode via `prefers-color-scheme`) and imports Tailwind.
- Fonts: `next/font/google` is used in `app/layout.tsx` (see Geist/Geist_Mono usage and CSS variable injection).

2) Key files to inspect (examples)
- `app/layout.tsx` — root layout, metadata export, sets font CSS variables and wraps children. Default React server component.
- `app/page.tsx` — the main page (client-side UI elements via standard React/Next Image usage). Use `use client` at the top if converting a file to a client component.
- `app/globals.css` — Tailwind import and CSS vars (dark mode) — styles are applied site-wide.
- `public/` — static assets live here (images referenced like `/next.svg` and `/vercel.svg`).

3) Project-specific patterns and conventions
- App Router model: add new routes by creating `app/<route>/page.tsx` (server components by default). If you need client-side hooks, add `'use client'` at the top of that file.
- Fonts: `next/font/google` calls are stored in `app/layout.tsx` and exposed via CSS variables (e.g. `--font-geist-sans`). Keep that pattern when adding fonts.
- Styling: Tailwind is the primary system. `globals.css` defines CSS variables and imports Tailwind. Prefer Tailwind utility classes for layout and small local CSS vars for theming.
- Dark-mode: implemented using CSS variables and `@media (prefers-color-scheme: dark)` in `globals.css`. Follow the same var names (`--background`, `--foreground`) when adding theme-aware styles.

4) Runtime / dev workflows (what I could discover)
- I did not find a `package.json` in the repository root. Confirm the package manager (npm/yarn/pnpm) and scripts. Typical Next.js commands you'd expect to verify/add:
  - `npm run dev` — start dev server
  - `npm run build` — production build
  - `npm run start` — serve the production build
- If you want the agent to run or test the app, add `package.json` and common scripts or paste them in the repo root so the agent can run them.

5) Examples an agent can use when editing or creating files
- Converting a page to a client component:
  - Add `"use client"` on the first line of the TSX file.
  - Import React hooks (useState/useEffect) and move interactive logic there.
- Adding a new route: create `app/hello/page.tsx` with a default export function component that returns JSX.
- Exposing a font variable pattern (follow `app/layout.tsx`): call `Geist({ variable: "--font-geist-sans" })` and include the variable on `<body className={...}>`.

6) Integration points / external services
- The template includes links to Vercel (deploy) and Next.js docs in `app/page.tsx`. No other external integrations or APIs were discovered.

7) Unknowns / asks for maintainers (must verify)
- Please add or point to `package.json` and any CI config (GitHub Actions) so the agent can discover exact build/test commands.
- Confirm whether server components should be favored everywhere, or whether specific pages should be client components (and any local patterns for state management or data fetching).

If anything here is incorrect or there are repo-specific scripts/configs missing from the root, tell me and I will update this document. What would you like me to add next — e.g., infer routes, add a sample dev script, or create a minimal CI workflow? 
