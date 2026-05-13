# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SnapShoot (`appName: garb-football`) is a swipe-to-shoot arcade penalty game distributed inside the Toss "Apps in Toss" web framework. It runs as a Next.js static export with a Three.js + Cannon-es game core.

## Commands

```bash
pnpm install                  # install deps (pnpm is required, see packageManager pin)
cp .env.example .env          # copy env (NEXT_PUBLIC_INTERSTITIAL_AD_ID, NEXT_PUBLIC_ENVIRONMENT, optional NEXT_PUBLIC_WEB_SHARE_URL)
pnpm dev                      # granite dev (delegates to `next dev` on host localhost:5173)
pnpm build                    # granite build (delegates to `next build`; static export to `out/`)
pnpm start                    # next start (post-build only)
```

There is no test runner, linter, or formatter configured — `package.json` only exposes `dev`, `build`, `start`. TypeScript is the only static check (`tsc` is invoked indirectly by Next; `noEmit: true`, `strict: true`, `noUnusedLocals`, `noUnusedParameters`).

The dev/build commands MUST go through `granite` — `granite.config.ts` injects Toss SDK / game-center config that plain `next dev` won't pick up.

## Architecture

The codebase is intentionally split into two layers that talk to each other only through an event bus:

### `app/` — Next.js UI shell (React 18, Tailwind)
- `app/page.tsx` mounts `<canvas id="game-canvas">` and a sibling `<div id="ui">` with HUD/modal React components, then dynamically imports `src/core/GameLoader.ts` from a `useEffect` to boot the engine. The canvas and HUD coexist; HUD uses `pointer-events-none` so swipes pass through to the canvas.
- `app/layout.tsx` sets `lang="ko"` and pulls icon paths through `getAssetPath` so they survive the production `basePath` prefix.
- `app/admin/` is a separate route with its own hash router (`useHashRouter`) for previewing the obstacle compositions defined in `src/config/Difficulty.ts` — it is a tooling page, not part of gameplay.
- TS path alias: `@/*` → `./app/*`. Imports into `src/` from `app/` use `@/../src/...` (see `app/layout.tsx`). Imports from `src/` into `app/` use relative paths like `../../app/lib/gameEventBus`.

### `src/` — game engine (Three.js + Cannon-es, no React)
- `src/core/SnapShoot.ts` is the central orchestrator. It owns the renderer/scene/camera/physics world, instantiates `Ball`, `Goal`, `Field`, `CharacterActors`, `InputController`, `DifficultyManager`, `AssetLoader`, `DebugVisualizer`, and runs the `requestAnimationFrame` loop. **Almost all gameplay decisions and event subscriptions live here.**
- `src/core/GameStateManager.ts` is a small FSM (`INITIALIZING / IDLE / AIMING / SHOOTING / SCORING / FAILED / PAUSED / GAME_OVER`); SnapShoot reads/writes it via `isShotInProgress` / `hasScored` getters.
- `src/core/GameStateService.ts` is a localStorage-backed singleton for persisted state (best score, selected tier, audio prefs, ball theme).
- `src/shooting/` is a pure, testable pipeline: `SwipeNormalizer → ShotAnalyzer → ShotParameters → VelocityCalculator + SpinCalculator`, wrapped by `ExecuteShot.ts`. `CurveForceSystem` applies per-frame Magnus-style force during flight.
- `src/config/*.ts` holds **all** tunables (gameplay, physics, difficulty tiers, prize tiers, ad IDs). `GAME_CONFIG` (`src/config/Game.ts`) carries session-wide constants like `totalLives` and physics `timeStep`. `TierDifficulty.ts` defines Easy/Medium/Hard tier unlocks gated by best score. Treat these as the source of truth — do not hardcode equivalents elsewhere.
- `src/entities/` — `Ball`, `Goal/GoalNet`, `Obstacle`, `CharacterActors` (kicker + goalkeeper FBX rigs).
- `src/infra/` — `Graphics` (renderer factory), `Camera`, `Lighting`, `Audio` (AudioManager).
- `src/physics/World.ts` builds the Cannon-es world and shared materials (ball, ground).
- `src/utils/Logger.ts` exposes `CategoryLogger` — prefer `new CategoryLogger('Foo')` over `console.log` in engine code (auto-suppressed in production).

### App ↔ engine boundary
- **Communication is event-based, not import-based.** `app/lib/gameEventBus.ts` is a singleton typed pub/sub; the typed event union is in `app/types/gameEvents.ts`. Engine emits (`SCORE_CHANGED`, `LIVES_CHANGED`, `SHOW_GAME_OVER_MODAL`, `PRIZE_AWARDED`, `SHOT_INFO_UPDATED`, `LOADING_PROGRESS`, …) and listens for UI commands (`RESTART_GAME`, `GAME_PAUSED`, `GAME_RESUMED`, `THEME_CHANGED`, `UNLOCK_AUDIO`). React HUD uses `useGameEvent(type, handler)` from `app/hooks/useGameEvent.ts`.
- When adding new cross-boundary signals, **extend the `GameEvent` union first** (it is a discriminated union by `type`), then emit/subscribe — the bus is untyped at runtime and relies on this union for safety.
- `src/core/GameStateService.ts` and `app/lib/gameStateService.ts` are duplicate implementations of the same singleton. Engine code imports the `src/` copy; React code imports the `app/` copy. Keep them in sync when changing storage keys or schema.

### Shot pipeline (lifecycle)
1. `InputController` records pointer/touch swipe → fires `onShoot(swipeData)`.
2. `SnapShoot.handleShoot` runs `executeShot()` (the pipeline above) and stores the result in `pendingShotLaunch`.
3. `CharacterActors` plays kick animation; `flushPendingShotLaunch()` waits until the rig hits the kick contact frame, then unfreezes the ball body, copies velocity/angularVelocity onto it, and starts `CurveForceSystem`.
4. `Goal.bodies.sensor` collision → `handleGoalCollision` → score++, ad board switches, top-prize threshold from `PrizeTiers` may trigger `gameOver()`.
5. After `activeTierConfig.shotResetMs`, `resetAfterShot()` decrements lives, clears state, resets ball/obstacles/keeper.

## Build & deployment notes

- `next.config.mjs` uses `output: 'export'` and applies `basePath: '/snapshoot'` + `assetPrefix: '/snapshoot'` only when `NODE_ENV === 'production'`. **Always reference public assets through `getAssetPath('/...')` or `getPublicPath('/...')` from `src/utils/assetPath.ts`** — raw `/assets/...` strings will 404 in production.
- `images.unoptimized: true` because static export disables the Image Optimizer.
- The Granite config (`granite.config.ts`) sets `webViewProps: { type: 'game' }` and `outdir: 'out'`. The web-framework SDK is `@apps-in-toss/web-framework` (currently `^1.4.3`).
- **`granite.config.ts` validation gotchas (SDK 1.4.3, runtime-validated by `typia` in `@apps-in-toss/plugins`):** the public Toss docs are out of sync with the installed schema. Specifically:
  - `brand.bridgeColorMode` (`'basic' | 'inverted'`) is **required**. Omitting it triggers the generic `[Apps In Toss Plugin] 플러그인 옵션이 올바르지 않습니다` error with no field hint.
  - There is **no** top-level `gameCenter` field on `AppsInTossWebConfig` in this SDK version — adding it fails the same validator. Don't re-introduce it without checking `node_modules/@apps-in-toss/plugins/dist/index.d.ts`.
  - `webViewProps.type: 'game'` is marked `@deprecated` in the SDK type defs (in favor of `'partner'`) but is still accepted and is what this project uses for the game navigation frame — keep it.
  - When the validator fails it does not tell you which field is wrong; check `AppsInTossPluginOptions` in `@apps-in-toss/plugins` and `AppsInTossWebConfig` in `@apps-in-toss/web-framework/dist/config/index.d.ts` for the actual required shape.
- Toss-specific behavior is feature-detected at runtime via `src/utils/TossEnvironment.ts` (`isTossApp`, `isTossGameCenterAvailable`). Outside the Toss UA the game still runs but skips Toss-only paths (game-center login in `GameLoader.ts`, interstitial ads).
- `GameLoader.ts` currently force-mutes both music and SFX on boot (`setMusicEnabled(false)` / `setSfxEnabled(false)`) — intentional, not a bug. Remove only if explicitly asked.
- Pause behavior: when the document becomes hidden the game emits `SHOW_PAUSE_MODAL` on return — required by the Apps-in-Toss guideline that audio must not play in the background.

## Conventions specific to this repo

- Engine files don't use React; UI files don't import Three/Cannon directly. Cross only via the event bus or `GameStateService`.
- Difficulty levels and obstacle compositions are data, defined in `src/config/Difficulty.ts` with thresholds keyed to score; `DifficultyManager` reads them. Edit data, not the manager, for new layouts.
- `src/types.d.ts` and `src/types/global.d.ts` declare ambient module/window types (e.g. `window.toggleDebug`); add new globals there rather than scattering `declare global` blocks.
