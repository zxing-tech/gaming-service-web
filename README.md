# SnapShoot

Arcade penalty-style football game by **Grab Gaming**. Swipe to shoot, beat the keeper, dodge obstacles, and chase a high score.

## Gameplay

- One-touch rounds: swipe up (and aim) to strike the ball toward the goal.
- Difficulty ramps as you score—keeper reactions, obstacles, and shot feedback get tighter.
- Runs in the browser with 3D visuals on the pitch; optimized for mobile and for distribution inside the Toss ecosystem.

## Tech stack

| Layer | Choice |
|--------|--------|
| App & UI | Next.js, React, TypeScript, Tailwind CSS |
| 3D & physics | Three.js, Matter.js / Cannon-es |
| Platform | Apps in Toss web framework (`granite`) |

## Prerequisites

- [pnpm](https://pnpm.io/) (see `packageManager` in `package.json` for the expected version)

## Setup

```bash
pnpm install
cp .env.example .env
```

Edit `.env` as needed (e.g. Toss ad IDs and `NEXT_PUBLIC_ENVIRONMENT` for `development` vs `production`). Details are commented in `.env.example`.

## Scripts

```bash
pnpm dev      # local dev (Granite)
pnpm build    # production build
pnpm start    # run production server after build (next start)
```

## Repository layout (high level)

- `app/` — Next.js routes, UI shells, modals, loading screen
- `src/` — Game core: rendering, physics, shooting, difficulty, Toss hooks
- `public/assets/` — Models, textures, audio

---

© Grab Gaming — SnapShoot
