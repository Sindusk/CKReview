# Reserved Ports

Keep this updated whenever a port gets claimed by something long-running, so tooling
(and anyone helping with any of these repos) doesn't default to a taken port by accident.

This file is **machine-wide, not project-specific** — the same copy is meant to live at the
root of every consistencykings.com project. If you change it here, re-copy it to the others.

The same port numbers apply in **both places**: the local Windows dev box, and the shared
production server (where each app listens on 127.0.0.1:PORT behind an nginx reverse proxy
for its own subdomain). Keeping them identical means a port collision shows up in local dev
instead of in production.

## Application ports

| Port | Application | Subdomain | Stack | Where the port is set |
|------|-------------|-----------|-------|-----------------------|
| 3000 | **CKReview** — WoW/FFXIV raid VOD review & mechanic analysis | `review.consistencykings.com` | Next.js (App Router) + Prisma + Postgres (`ckreview` db) | Next.js default; `next dev` / `next start` |
| 3001 | **Stonks** — options screening, portfolio & ML pipeline | `stonks.consistencykings.com` | Express + Prisma + Postgres (`stonks` db), node-cron jobs | `PORT` in `.env` |
| 3002 | **Shapes** — multiplayer grid game (boss patterns, abilities) | `shapes.consistencykings.com` | Express + Socket.IO server; React + Phaser 3 client (Vite) | `PORT` in `.env` at repo root |
| 3003 | **Polarity Fracture** — idle/base-building game with tactical combat | *not yet deployed* | Fastify (+ Socket.IO from Phase 3) + Prisma + Postgres (`polarity_fracture` db); React client (Vite) | `PORT` in `.env` at repo root |

**3000–3002 are occupied on the production server.** Any new service must start at 3003 or above.

## Frontend dev servers

These only exist in local development — production serves a static build through nginx.

Convention: a client's dev port is **`5170 + its backend's last digit`**, so a client and its
server are obviously paired and no two clients collide.

| Port | Used by | Notes |
|------|---------|-------|
| 5172 | **Shapes** client | Moved off the 5173 default to resolve the collision below. |
| 5173 | **Polarity Fracture** client | Vite's default, and what this project keeps. Set in `vite.config.ts`; `CORS_ORIGIN` in `.env` must match. |

> **Collision resolved.** Both clients previously defaulted to 5173, so only one could run at a
> time — the second either failed with `EADDRINUSE` or was silently bumped to 5174, which then
> broke any hardcoded proxy/CORS origin. Polarity Fracture keeps 5173; **Shapes moves to 5172**
> (`server.port` in its `vite.config.ts`, plus any matching CORS origin). Anything new follows
> the `5170 + last digit` rule above.

## Infrastructure

| Port | Service | Notes |
|------|---------|-------|
| 5432 | PostgreSQL | One local server, separate database per project (`stonks`, `ckreview`, `shapes`, `polarity_fracture`). Production runs its own Postgres locally on the app server, not exposed remotely. |

## Scratch and smoke-test ports

For throwaway local testing (socket smoke tests, a second server instance, etc.), use the
**31xx** range — e.g. Shapes has used `3102`. Nothing long-running should live there, so
these don't need rows in this table.

## Production server

All deployed apps share one Ubuntu box under a single non-root service account, with processes
managed by PM2 and nginx terminating TLS and reverse-proxying each subdomain to its
`127.0.0.1:PORT`. Socket.IO apps (Shapes, and Polarity Fracture from Phase 3) additionally need
nginx to forward the `Upgrade` / `Connection` headers or WebSockets silently fall back to polling.

(Host and login details are deliberately kept out of this file — it lives in public repos.)

Deploy models differ per project and are documented in each repo — they are not all the same.

## Claiming a new port

1. Check this table first.
2. Add a row **before** hardcoding the port anywhere in config.
3. Set it via `PORT` in `.env` rather than a literal in source, so it can be changed per environment.
4. Re-copy this file to the other project roots so they all agree.
