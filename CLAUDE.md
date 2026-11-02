# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build (static SSG output)
- `pnpm preview` — Preview production build locally
- `pnpm sync:feishu` — Sync Feishu docs to local Markdown (requires lark-cli auth)
- `pnpm sync:github` — Sync GitHub repos to local Markdown
- `pnpm sync:all` — Run both sync scripts

No test framework is installed.

## Architecture

**Astro v5 static site** using the Content Layer API (not legacy content collections). Content collections are defined in `src/content.config.ts` (not `content/config.ts`) using `glob` loaders.

**Four content collections:**
- `notes` — local Markdown notes (`src/content/notes/`)
- `notesFeishu` — Feishu-synced notes (`src/content/notes-feishu/`, gitignored except `.gitkeep`)
- `projects` — local project showcase entries (`src/content/projects/`)
- `projectsGitHub` — GitHub-synced repos (`src/content/projects-gh/`, gitignored except `.gitkeep`)

Both note collections share the same schema (title, description, tags, date, lang, draft, source, feishuUrl). Notes from both collections are merged at render time in pages. Projects from local and GitHub collections are merged on the homepage.

**Configurable data:** Homepage content (hero, experience, education, skills, tech stack, note categories, contact) is defined in `src/data/profile.ts` — not hardcoded in templates. Edit that file to update any non-collection content.

**Sync configuration:** `sync.config.ts` at project root holds Feishu and GitHub sync settings (credentials, folder tokens, username). Scripts under `scripts/` read from this config.

**Single layout:** `Base.astro` provides the full HTML shell, loads Google Fonts (Inter, JetBrains Mono), includes `global.css`, and wraps content between `Header` and `Footer` components.

**Routing (4 pages):**
- `/` — Homepage with hero, recent projects (local + GitHub), recent notes (local + Feishu), work experience, education, tech stack, note categories, contact
- `/projects` — Projects listing with pinned section
- `/notes` — Notes listing with `?tag=` query param filtering
- `/notes/[...slug]` — Individual note rendering

## Design System

**V3 Ocean Mist (海雾蓝)** — frosted glass aesthetic. All design tokens live as CSS custom properties in `src/styles/global.css`. Tailwind references these via `var(--...)` in `tailwind.config.mjs`.

Key CSS classes (defined in `@layer components` in global.css):
- `.card` — frosted glass card (semi-transparent bg + backdrop-filter blur + border)
- `.tag` — monospace label pill (accent-bg + accent color + mono font)
- `.sec-title` — uppercase section header (mono font + muted color)
- `.btn-primary` / `.btn-secondary` / `.btn-tertiary` — three-tier button hierarchy

**Dark mode:** Toggle via `.dark`/`.light` class on `<html>` (managed by Header.astro client script using `localStorage`), with `@media (prefers-color-scheme: dark)` fallback on `:root:not(.light)`. Tailwind `darkMode: 'class'` is enabled.

**Homepage layout order** (content value descending): Hero → Recent Projects → Recent Notes → Work Experience → Education → Tech Stack → Note Categories → Contact.

## Environment Variables

`FEISHU_APP_ID` and `FEISHU_APP_SECRET` (optional; fallbacks exist in `sync.config.ts`). See `.env.example`.

## Deployment

Static output to `dist/`. Site URL in `astro.config.mjs` is currently a placeholder (`https://your-username.github.io`).
