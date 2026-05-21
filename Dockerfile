# syntax=docker/dockerfile:1.7

# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Activate pnpm via corepack (version pinned in package.json#packageManager)
RUN corepack enable

# Install deps first for better layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the source. .env (if present) is copied so that
# NEXT_PUBLIC_* vars are baked into the static bundle at build time.
COPY . .

# granite build -> next build -> static export into ./out
RUN pnpm build


# ---------- Runtime ----------
FROM nginx:1.27-alpine AS runtime

# Custom nginx config: gzip, asset caching, correct MIME for .glb/.fbx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static export output. Granite splits `pnpm build` into a few targets:
#   out/grab-football.{android,ios}.js  → Apps-in-Toss mobile bundles
#   out/web/                            → Next.js static export for the web
# Only the web/ subtree is what nginx should serve.
COPY --from=builder /app/out/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
