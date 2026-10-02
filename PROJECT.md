# Project: YFJ Matrimony Comprehensive Production Overhaul

## Architecture
YFJ Matrimony is a fullstack web application built with:
- **Frontend**: TanStack Start / TanStack Router, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Lucide icons, Sonner toasts.
- **Backend**: Node.js / Express 4, TypeScript, `pg` (PostgreSQL client connected to AWS RDS `13.235.234.17:5432/yfj_matrimony`), JWT auth, `ws` for real-time WebSocket transport.
- **Data Flow**:
  - Browser communicates with Express REST APIs (`/api/*`) and WebSocket server (`/ws`) on port 5000.
  - In Vite development, requests are proxied via `vite.config.ts`. In production, Nginx proxies HTTP and upgrades WebSockets.
  - TanStack Query manages client cache; WebSocket events trigger real-time cache mutations and invalidations.

## Feature Inventory
Every feature identified during the comprehensive survey is mapped to a concrete milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Mock/Seed Data Purge & Live-Only Filtering | Purge 4 hardcoded seed accounts from RDS; default `useMockApi` to false; ensure only real user registrations appear across browse, search, and dashboard. | M1 | Survey / R1 |
| 2 | Sequential Profile ID Scheme (`P1`..`P100`, `PA1`..) | Add sequence and display ID column; assign `P1` to demo, `P2` to ashok; auto-generate on signup; support dual-identifier routing (UUID & display ID) across all profile endpoints. | M1 | Survey / R1 |
| 3 | Complete 6-Section Profile Field Editing & Persistence | Restructure profile fields into 6 canonical sections (Basic, Community, Career, Location, Family, About); include all 22 fields (including whatsapp); sync avatar; persist across reload. | M1 | Survey / R2 |
| 4 | Real-Time WebSocket Messaging & Live Chat Delivery | Integrate `ws` on backend HTTP server; connect `messagesService.subscribe`; sub-second bidirectional chat message delivery; dynamic SQL unread message counting. | M2 | Survey / R3 |
| 5 | Real-Time Interest Request & Acceptance State Sync | Real-time WebSocket emission of `interest:received`, `interest:accepted`, and `conversation:new`; instant thread initialization and match status updates without page reload. | M2 | Survey / R3 |
| 6 | Persistent Real-Time Notification Dispatch System | PostgreSQL `notifications` table; REST endpoints; backend WebSocket emission; Web Audio API dual-tone chime synthesizer; visual Sonner toasts; `NotificationDropdown` with live unread badge. | M2 | Survey / R4 |
| 7 | UI Layout Shift Stabilization & Scroll Restoration | Mount `<ScrollRestoration />` in `__root.tsx`; add `scrollbar-gutter: stable; overflow-y: scroll;` in `styles.css`; add minimum height to `AppShell`; align browse skeleton count to 12. | M3 | Survey / R5 |
| 8 | Settings Privacy Toggle Backend Enforcement | Query `u.preferences` in `profiles.routes.ts`; mask photos if `photo=true` for non-premium viewers; hide contact number if `contact=true` without mutual interest; omit last active if `online=false`. | M3 | Survey / R6 |
| 9 | Programmatic Pricing Quota Gating & Usage Enforcement | PostgreSQL tracking tables (`daily_profile_views`, `contact_unlocks`); programmatic limits for daily views, monthly interests, messaging tier gating, contact reveals; UI quota meters. | M3 | Survey / R6 |
| 10 | Comprehensive E2E Test Suite (Tiers 1-4) | Independent opaque-box test suite covering feature coverage, boundaries, pairwise combinations, and real-world workflows with automated runner. | E2E Track | Survey / Quality |
| 11 | Final E2E Verification & Adversarial Coverage Hardening | Pass 100% of E2E tests (Tiers 1-4) followed by Tier 5 white-box adversarial testing with Challengers and forensic integrity audit. | M4 | Survey / Final |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Live Data, Profiles & Sequential ID Engine | F1, F2, F3: Purge seed accounts, sequential profile ID scheme (`P1`..`P100`, `PA1`..), dual-identifier query resolution, 6-section profile editing and reload persistence. | none | IN_PROGRESS |
| M2 | Real-Time WebSocket Messaging, Interest Sync & Notifications | F4, F5, F6: Backend `ws` server, frontend realtime client, sub-second chat, interest send/accept real-time transitions, persistent PostgreSQL notifications, audio chimes, toasts, unread badge dropdown. | M1 | PLANNED |
| M3 | UI Layout Shift Stabilization, Privacy Enforcement & Quota Gating | F7, F8, F9: Scroll restoration, stable scrollbar gutter, skeleton alignment; backend privacy toggle enforcement (photo, contact, online); programmatic plan quota enforcement and UI usage meters. | M1, M2 | PLANNED |
| E2E | E2E Testing Suite (Parallel Track) | F10: Design and build opaque-box 4-tier test suite (Tiers 1-4, ≥104 test cases) and automated test runner; publish `TEST_READY.md`. | none | IN_PROGRESS |
| M4 | Final E2E Pass & Adversarial Coverage Hardening | F11: Phase 1: Pass 100% of E2E test suite (Tiers 1-4). Phase 2: Tier 5 adversarial testing with Challengers, coverage hardening, and final forensic audit. | M1, M2, M3, E2E | PLANNED |

## Interface Contracts

### 1. Sequential Profile ID Contract
- **Format**: For number $N \ge 1$:
  - $1 \le N \le 100 \implies \text{P}N$ (e.g. `P1`, `P2`, ..., `P100`)
  - For $N > 100$: Let $Q = \lfloor (N - 101) / 100 \rfloor$ and $R = (N - 101) \pmod{100} + 1$. The prefix letter is $\text{String.fromCharCode}(65 + Q)$ (`A`, `B`, ...). Display ID is $\text{"P"} + \text{Prefix} + R$ (e.g. $N=101 \to \text{PA1}$, $N=200 \to \text{PA100}$, $N=201 \to \text{PB1}$).
- **Database Schema**:
  - `users.profile_number INT UNIQUE`
  - `users.display_id VARCHAR(20) UNIQUE`
  - Sequence `profile_id_seq` starting after backfilled live users.
- **API Resolution**:
  - Any endpoint receiving `:id` (e.g. `GET /api/profiles/:id`, `POST /:id/shortlist`, `POST /:id/interest`) checks:
    - If `id` matches UUID regex (`^[0-9a-fA-F-]{36}$`) -> query `pr.id = $1`.
    - Else -> query `u.display_id ILIKE $1` to resolve target user UUID.
- **Frontend Contract**:
  - `Profile` interface includes `displayId: string` (e.g. `"P1"`).
  - UI displays `profile.displayId` in place of `profile.id`.
  - Links support both `/app/profiles/${profile.displayId}` and `/app/profiles/${profile.id}`.

### 2. Real-Time WebSocket Contract
- **Endpoint**: `ws://<host>:5000/ws?token=<jwt>`
- **Client -> Server Events**:
  - `ping` -> server replies with `pong`.
  - `chat:subscribe`: `{ conversationId: string }`
  - `chat:unsubscribe`: `{ conversationId: string }`
  - `chat:message`: `{ conversationId: string, content: string }`
- **Server -> Client Events**:
  - `connection:ack`: `{ userId: string, unreadCount: number }`
  - `chat:message`: `{ conversationId: string, message: Message }`
  - `interest:received`: `{ interestId: string, sender: { id, displayId, name, avatar } }`
  - `interest:accepted`: `{ interestId: string, conversationId: string, partner: { id, displayId, name } }`
  - `notification:new`: `{ notification: NotificationRecord }`

### 3. Notification Contract
- **PostgreSQL Table**:
  ```sql
  CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'chat_message', 'interest_received', 'interest_accepted', 'system'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Endpoints**:
  - `GET /api/notifications` -> `{ notifications: NotificationRecord[], unreadCount: number }`
  - `PATCH /api/notifications/:id/read` -> `{ ok: true }`
  - `PATCH /api/notifications/read-all` -> `{ ok: true }`

### 4. Privacy & Quota Gating Contract
- **Privacy Rules**:
  - If target user has `preferences.photo = true` and viewer is not premium (`plan === 'free'` or unauthenticated) -> `photos = []`, `photosLocked = true`.
  - If target user has `preferences.contact = true` and no accepted mutual interest exists between viewer and target -> `mobile = null`, `contactLocked = true`.
  - If target user has `preferences.online = false` -> `last_active = null`.
- **Quota Tracking Tables**:
  - `daily_profile_views`: `(id, user_id, profile_id, view_date, created_at)` with `UNIQUE(user_id, profile_id, view_date)`
  - `contact_unlocks`: `(id, user_id, contact_user_id, created_at)` with `UNIQUE(user_id, contact_user_id)`
- **Quota Limits**:
  - Profile Views: Free = 50/day, Silver = 200/day, Gold = unlimited. Exceeding returns HTTP 403 `code: "DAILY_VIEW_QUOTA_EXCEEDED"`.
  - Interests: Free = 5/month, Silver = 30/month, Gold = unlimited. Exceeding returns HTTP 403 `code: "MONTHLY_INTERESTS_EXCEEDED"`.
  - Messaging: Free = disabled, Silver = mutual matches only, Gold = direct chat. Free attempt returns HTTP 403 `code: "MESSAGING_DISABLED_ON_FREE_PLAN"`.
  - Contact Views: Free = 0, Silver = 15/month, Gold = 50/month. Exceeding returns HTTP 403 `code: "CONTACT_QUOTA_EXCEEDED"`.

## Code Layout
- `backend/src/`:
  - `index.ts`: Express application entry point, HTTP server, and WebSocket server attachment.
  - `config/db.ts`: PostgreSQL connection pool.
  - `routes/`: Express routers (`auth.routes.ts`, `profiles.routes.ts`, `messages.routes.ts`, `interests.routes.ts`, `notifications.routes.ts`, `subscriptions.routes.ts`).
  - `services/`: Backend services (`realtime.service.ts`, `quota.service.ts`).
  - `utils/`: Profile ID utilities (`profileId.ts`).
- `src/`:
  - `routes/`: TanStack Router file-based routes (`__root.tsx`, `app.tsx`, `app.browse.tsx`, `app.shortlist.tsx`, `app.my-profile.index.tsx`, `app.my-profile.edit.tsx`, `app.messages.$conversationId.tsx`, `app.settings.tsx`, etc.).
  - `components/`: UI components (`layout/AppShell.tsx`, `profile/`, `notifications/NotificationDropdown.tsx`, `ui/`).
  - `config/`: Configuration dictionaries (`profile-fields.ts`).
  - `services/`: Frontend API services (`profiles.service.ts`, `messages.service.ts`, `interests.service.ts`, `notifications.service.ts`).
  - `lib/`: Utilities (`realtime.ts`, `audio.ts`, `env.ts`).
  - `styles.css`: Global styles, Tailwind v4 imports, scrollbar gutters.
- `tests/e2e/`:
  - E2E testing framework, test runner, test suites (Tiers 1-4).
