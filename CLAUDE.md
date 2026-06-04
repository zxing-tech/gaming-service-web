# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SnapShoot (`appName: grab-football`) is a swipe-to-shoot arcade penalty game distributed inside the Toss "Apps in Toss" web framework. It runs as a Next.js static export with a Three.js + Cannon-es game core.

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
- `src/entities/` — `Ball`, `Goal/GoalNet`, `Obstacle`, `CharacterActors` (kicker + goalkeeper Mixamo GLB rigs).
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

## Character asset pipeline (Mixamo FBX → GLB + WebP)

Character rigs (kicker + goalkeeper) ship as **GLB**, not the source FBX. The conversion is a one-time offline pipeline that cuts boot-blocking download from ~206 MB to ~25 MB (~88%) while keeping 4K texture detail intact. Source FBX files are kept on disk (`public/assets/models/*.fbx`, ~354 MB total) as backup but are **not referenced by code**.

### Files (rendered vs animation-only)

The keeper bundle loads multiple GLB files. Only one of them has its mesh rendered; the rest are loaded purely to harvest `AnimationClip`s and their meshes are immediately `disposeSceneMeshes()`'d. This shapes the conversion:

| File | Mode | Size | Why |
|---|---|---|---|
| `Strike Foward Jog.glb` | rendered (kicker kick) | ~8 MB | Has WebP-encoded 4K diffuse + normal textures |
| `Happy Idle (2).glb` | rendered (kicker idle) | ~8 MB | Separate actor — switches in when kick clip ends |
| `Goalkeeper Body Block (3).glb` | rendered (keeper primary) | ~7 MB | Primary keeper mesh + idle animation |
| `Goalkeeper Idle.glb` | anim-only | ~2 MB | Textures stripped — mesh disposed at runtime |
| `Goalkeeper Body Block (2).glb` | anim-only | ~2 MB | Same — animation clip only |
| `Goalkeeper Diving Save (3).glb` | anim-only (deferred) | ~2 MB | Background-loaded after game starts |
| `Goalkeeper Diving Save (4).glb` | anim-only (deferred) | ~2 MB | Same |

The split between **eager extras** (`MIXAMO_KEEPER_FBX_EXTRA`, loaded at boot) and **deferred extras** (`MIXAMO_KEEPER_FBX_DEFERRED`, loaded after boot) is defined in `src/config/Obstacles.ts`. The legacy `MIXAMO_KEEPER_FBX_*` symbol names point at GLB URLs now despite the names — keep the name to avoid touching every import.

### What the conversion does (and why)

For **rendered** files the offline pipeline:
1. **FBX → GLB** via `FBX2glTF -b` (Meta's tool, Linux binary). The format change alone saves ~20%.
2. **PNG → WebP q90** via `@gltf-transform/functions::textureCompress` with sharp encoder. Resolution **stays at 4K** — only the encoding changes. This is the single biggest win: ~95% of FBX size is embedded PNG textures (16 MB diffuse + 22 MB normal + 2 MB metallic-rough + 5 MB hair). WebP q90 is visually indistinguishable at game distance but ~6-7× smaller.
3. **Drop metallic-roughness / emissive / occlusion maps** — they don't read at small mobile render sizes.
4. **Normalize PBR factors** at conversion time: `metallicFactor=0`, `roughnessFactor=0.85`, `baseColorFactor=[1,1,1,1]`. FBX2glTF writes broken defaults (`metallicFactor=1`, `roughnessFactor=1`, `baseColorFactor=[0.8,0.8,0.8]`) which under MeshStandardMaterial + ACES tone mapping render skin/cloth as "gray metal". Fix at the source, not at runtime.

For **animation-only** files the pipeline strips *all* textures (`material.setBaseColorTexture(null)` and friends, then dispose). Geometry is preserved because `disposeSceneMeshes` runs at runtime AFTER `AnimationClip`s are extracted — clips reference bones, not geometry, so stripping textures has no effect on animation.

In both modes `prune()` is called with `propertyTypes: [TEXTURE, MATERIAL, TEXTURE_INFO]` only. **Never include ACCESSOR in the prune list** — UV vertex attributes get aggressively cleaned otherwise, breaking the runtime jersey bake which reads `mesh.geometry.attributes.uv`.

### Runtime-side gotchas the GLB switch introduced

- **Unit scale.** FBX2glTF auto-converts FBX cm → glTF meters. The character bbox goes from ~180 units tall to ~1.8 units. Every scale value tuned for the FBX-era now needs ×100:
  - Kicker: `setScalar(0.0085) → setScalar(0.85)` in `CharacterActors.ts`
  - Keeper: `scale: 0.011 → scale: 1.1` in `keeperWall` blueprint
  - Plane decal sizes in `characterAppearance.ts`: `LOGO_SIZE_LOCAL: 22 → 0.22`, `BACK_NUMBER_SIZE_LOCAL: 32 → 0.32`, all *_DEPTH_LOCAL / *_VERTICAL_LOCAL similarly. Get this wrong and the decal balloons into a multi-meter wall that occludes the keeper.
- **Material shading model.** GLTFLoader always returns `MeshStandardMaterial` (PBR). FBXLoader-era code rendered with `MeshPhongMaterial` (legacy) — which the textures were authored against. Under ACES tone mapping the PBR diffuse term reads brighter / flatter and looks "washed out". `normalizeCharacterBrightness()` in `characterAppearance.ts` converts each character material back to `MeshPhongMaterial` (white color, shininess 0, black specular) to match the FBX-era render. Bake/tint code accepts both material types so the swap is transparent.
- **iOS SkinnedMesh visibility.** iOS WebKit silently drops SkinnedMeshes whose bone matrices exceed a driver-side uniform array threshold. `forceBoneTextureForIOS()` calls `skeleton.computeBoneTexture()` on each SkinnedMesh post-load, forcing matrices to upload as a `DataTexture` instead. Called from both `CharacterActors` (×2 — kick + idle FBX roots) and `Obstacle.loadKeeperBundle`. Safe no-op on non-iOS platforms.
- **Keeper bundle detection.** The blueprint discriminator is no longer `render.sourceFormat === 'fbx'`. The keeper-style bundle path (primary mesh + extra animation files) is now triggered by `render.extraAnimationUrls?.length || render.deferredAnimationUrls?.length` in `Obstacle.loadModel()`.
- **`attachKeeperGloves()` is removed.** It created a `SphereGeometry(0.08)` per hand bone that was microscopic under the FBX cm-scaled rig (essentially invisible) but renders as a ~9 cm white ball at the GLB meter-scale. The GLB diffuse texture already includes textured hands; the placeholder is redundant.

### Re-running the conversion

The conversion script lives outside the repo (created in `tmp-glb/` during the migration and deleted after). If a re-run is needed (e.g., new Mixamo character, new animation):

1. Drop the source FBX in `public/assets/models/`.
2. Install tooling: `npm install @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions sharp` in a scratch directory.
3. Use Meta's `FBX2glTF -b -i input.fbx -o output` to produce raw GLB.
4. Run a glTF Transform script: drop unused texture slots → `textureCompress({encoder: sharp, targetFormat: 'webp', quality: 90})` for rendered files (or strip all textures for anim-only) → set `metallicFactor=0`, `roughnessFactor=0.85`, `baseColorFactor=[1,1,1,1]` on every material → `prune({propertyTypes: [TEXTURE, MATERIAL, TEXTURE_INFO]})`.
5. Verify with `gltf-transform inspect <file>` that mesh names (`Ch42_Shirt`, `Ch38_Body` etc.) and `TEXCOORD_0` attribute are preserved — both are runtime contracts.

## Conventions specific to this repo

- Engine files don't use React; UI files don't import Three/Cannon directly. Cross only via the event bus or `GameStateService`.
- Difficulty levels and obstacle compositions are data, defined in `src/config/Difficulty.ts` with thresholds keyed to score; `DifficultyManager` reads them. Edit data, not the manager, for new layouts.
- `src/types.d.ts` and `src/types/global.d.ts` declare ambient module/window types (e.g. `window.toggleDebug`); add new globals there rather than scattering `declare global` blocks.
