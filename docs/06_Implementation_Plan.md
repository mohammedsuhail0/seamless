# BrowSync — Implementation Plan

> **Version**: 1.0 · **Last Updated**: 2026-06-01 · **Status**: Draft
> **Built by**: 🧠 Orchestrator Agent · **Executed by**: All agents (🔧 A, 🖥️ B, 🌐 C, 💻 D)

---

## 1. Project Overview

- **Product**: BrowSync — P2P browser streaming with remote control
- **Architecture**: Monorepo with 4 packages (shared, server, viewer, desktop)
- **Timeline**: ~20–24 weeks across 3 phases
- **Multi-Agent Build**: See [07_Multi_Agent_Development_Workflow.md](file:///c:/Users/Lenovo/Downloads/SEAMLESS/browsync/docs/07_Multi_Agent_Development_Workflow.md)

---

## 2. Development Environment Setup

### Prerequisites
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Runtime for all packages |
| npm | 10+ | Package manager + workspaces |
| PostgreSQL | 16 | Persistent database |
| Redis | 7 | Real-time ephemeral data |
| Git | 2.40+ | Version control |
| VS Code | Latest | Recommended IDE |

### VS Code Extensions
- ESLint, Prettier, Prisma, Thunder Client, GitLens

### Initial Setup
```bash
# Clone the repo
git clone https://github.com/mohammedsuhail0/seamless.git
cd seamless/browsync

# Install all workspace dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL + Redis connection strings

# Start local databases
docker-compose up -d

# Run Prisma migrations
cd packages/server
npx prisma migrate dev --name init
npx prisma db seed

# Start development servers
npm run dev  # All packages in parallel
```

### docker-compose.yml (Local Dev)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: browsync
      POSTGRES_PASSWORD: browsync_dev
      POSTGRES_DB: browsync
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

volumes:
  pgdata:
```

---

## 3. Phase 1: MVP (Weeks 1–10)

### Sprint 1 — Foundation (Weeks 1–2)

> **Goal**: All packages compile, server starts with DB, viewer loads a page.

| Task | Agent | Priority | Depends On |
|------|-------|----------|------------|
| Initialize monorepo structure (root package.json, tsconfig) | 🧠 Orchestrator | P0 | — |
| Create all TypeScript types (`User`, `Room`, `ChatMessage`, `ControlRequest`, `InputEvent`, `RTCOffer`, etc.) | 🔧 Agent A | P0 | — |
| Create all enums (`QualityPreset`, `RoomStatus`, `MemberRole`) | 🔧 Agent A | P0 | — |
| Create socket event name constants (`SOCKET_EVENTS`) | 🔧 Agent A | P0 | — |
| Create Zod validation schemas (`registerSchema`, `loginSchema`, `roomCreateSchema`, etc.) | 🔧 Agent A | P0 | Types |
| Create error code constants | 🔧 Agent A | P1 | — |
| Create config constants (max viewers, bitrate tiers) | 🔧 Agent A | P1 | — |
| Barrel export `index.ts` for shared package | 🔧 Agent A | P0 | All above |
| Create Prisma schema with all models | 🖥️ Agent B | P0 | Agent A enums |
| Run initial Prisma migration | 🖥️ Agent B | P0 | Prisma schema |
| Set up Redis client singleton | 🖥️ Agent B | P0 | — |
| Create Express server skeleton + health check | 🖥️ Agent B | P0 | — |
| Set up environment config (env.ts) | 🖥️ Agent B | P0 | — |
| Initialize Vite + React project | 🌐 Agent C | P0 | — |
| Create design system CSS (tokens, variables, base styles) | 🌐 Agent C | P0 | — |
| Initialize Electron project | 💻 Agent D | P0 | — |
| Create docker-compose.yml for local dev | 🧠 Orchestrator | P1 | — |
| Create .eslintrc.js + .prettierrc | 🧠 Orchestrator | P1 | — |

**✅ Checkpoint 1**: `tsc --noEmit` passes for all packages; server starts; viewer loads; Electron opens.

---

### Sprint 2 — Auth & Rooms (Weeks 3–4)

> **Goal**: Users can register, login, create rooms, and get shareable links.

| Task | Agent | Priority | Depends On |
|------|-------|----------|------------|
| Auth service: register (bcrypt hash, create user) | 🖥️ Agent B | P0 | Agent A schemas |
| Auth service: login (verify password, generate JWT) | 🖥️ Agent B | P0 | Agent A schemas |
| JWT utility: sign/verify with RS256 | 🖥️ Agent B | P0 | — |
| Auth middleware: extract + validate JWT | 🖥️ Agent B | P0 | JWT utility |
| Auth routes: POST /api/auth/register | 🖥️ Agent B | P0 | Auth service |
| Auth routes: POST /api/auth/login | 🖥️ Agent B | P0 | Auth service |
| Auth routes: POST /api/auth/refresh | 🖥️ Agent B | P1 | Auth service |
| Auth routes: GET /api/auth/me | 🖥️ Agent B | P1 | Auth middleware |
| Room service: create room + generate 6-char code | 🖥️ Agent B | P0 | Agent A schemas |
| Room service: get room by code | 🖥️ Agent B | P0 | — |
| Room routes: POST /api/rooms | 🖥️ Agent B | P0 | Room service |
| Room routes: GET /api/rooms/:code | 🖥️ Agent B | P0 | Room service |
| Room routes: GET /api/rooms/my/history | 🖥️ Agent B | P1 | Auth middleware |
| Rate limiting middleware | 🖥️ Agent B | P1 | Redis |
| Global error handler middleware | 🖥️ Agent B | P1 | — |
| AuthModal component (login/register UI) | 🌐 Agent C | P0 | — |
| useAuth hook (state + localStorage) | 🌐 Agent C | P0 | Agent A types |
| API client utility (fetch wrapper) | 🌐 Agent C | P0 | — |
| Dashboard page (placeholder) | 🌐 Agent C | P1 | useAuth |
| RoomCreate modal component | 🌐 Agent C | P0 | Agent A types |
| Unit tests: auth service | 🖥️ Agent B | P1 | Auth service |
| Unit tests: room service | 🖥️ Agent B | P1 | Room service |

**✅ Checkpoint 2**: Register → Login → Dashboard → Create Room → Get shareable link — all works E2E.

---

### Sprint 3 — WebRTC Signaling (Weeks 5–6)

> **Goal**: Two browsers can establish a P2P WebRTC connection via the signaling server.

| Task | Agent | Priority | Depends On |
|------|-------|----------|------------|
| Socket.io server setup with JWT auth | 🖥️ Agent B | P0 | Auth middleware |
| Room socket handler: join/leave/close | 🖥️ Agent B | P0 | Agent A events |
| RTC socket handler: offer/answer/ICE relay | 🖥️ Agent B | P0 | Agent A types |
| Presence handler: heartbeat, sync | 🖥️ Agent B | P1 | Redis |
| Redis keys utility (key builders) | 🖥️ Agent B | P0 | — |
| Socket client singleton | 🌐 Agent C | P0 | — |
| useSocket hook (connect, events, cleanup) | 🌐 Agent C | P0 | Socket client |
| useWebRTC hook (peer connection, tracks) | 🌐 Agent C | P0 | Agent A types |
| WebRTC config (ICE servers, codec prefs) | 🌐 Agent C | P0 | — |
| Stream component (video element + srcObject) | 🌐 Agent C | P0 | useWebRTC |
| Room page (join + view stream) | 🌐 Agent C | P0 | useSocket, Stream |
| QualityBadge component | 🌐 Agent C | P1 | — |
| ViewerList component | 🌐 Agent C | P1 | useSocket |
| Test: loopback P2P connection | 🌐 Agent C | P0 | All above |

**✅ Checkpoint 3**: Open two browser tabs → one creates a room → the other joins → WebRTC connection establishes.

---

### Sprint 4 — Host App & Streaming (Weeks 7–8)

> **Goal**: Electron host app captures screen and streams to viewers via WebRTC.

| Task | Agent | Priority | Depends On |
|------|-------|----------|------------|
| Electron main process entry + window setup | 💻 Agent D | P0 | — |
| Preload script (contextBridge) | 💻 Agent D | P0 | — |
| Screen capture module (getDisplayMedia) | 💻 Agent D | P0 | — |
| Capture source selection UI (screen vs tab) | 💻 Agent D | P0 | Capture module |
| WebRTC encoder: RTCPeerConnection + addTrack | 💻 Agent D | P0 | Agent A types |
| Multi-peer management (one PC per viewer) | 💻 Agent D | P0 | Encoder |
| H.264 codec preference configuration | 💻 Agent D | P1 | — |
| Socket.io client integration (host side) | 💻 Agent D | P0 | Agent A events |
| Host UI: room code display, viewer count | 💻 Agent D | P0 | — |
| Host UI: Start/Stop stream button | 💻 Agent D | P0 | — |
| Host UI: End Session button | 💻 Agent D | P0 | — |
| System tray icon + menu | 💻 Agent D | P1 | — |
| IPC bridge (main ↔ renderer) | 💻 Agent D | P0 | Preload script |
| CapturePreview component (live preview) | 💻 Agent D | P1 | — |
| StatusBar component (bitrate, viewers) | 💻 Agent D | P1 | — |
| Test: stream from Electron to browser | 💻 Agent D | P0 | Sprint 3 viewer |

**✅ Checkpoint 4**: Host opens Electron → creates room → selects screen → viewer opens browser → sees live stream.

---

### Sprint 5 — Control System & Chat (Weeks 9–10)

> **Goal**: Full MVP — stream + remote control + chat + reactions.

| Task | Agent | Priority | Depends On |
|------|-------|----------|------------|
| Control request socket handlers | 🖥️ Agent B | P0 | Agent A types |
| Control grant/deny/revoke socket handlers | 🖥️ Agent B | P0 | Redis queue |
| Redis access queue operations | 🖥️ Agent B | P0 | Redis keys |
| Chat message socket handler (broadcast + store) | 🖥️ Agent B | P0 | Agent A types |
| Chat history on join (LRANGE from Redis) | 🖥️ Agent B | P0 | Redis |
| Reaction socket handler (broadcast, no store) | 🖥️ Agent B | P0 | — |
| Presence heartbeat handler (ZADD) | 🖥️ Agent B | P1 | Redis |
| Controls component (Request/Release Control button) | 🌐 Agent C | P0 | — |
| useControl hook | 🌐 Agent C | P0 | Agent A types |
| Chat component (message list + input) | 🌐 Agent C | P0 | — |
| useChat hook | 🌐 Agent C | P0 | Agent A types |
| Reactions component (floating emojis animation) | 🌐 Agent C | P0 | — |
| Emoji picker (5 reactions: 👍 😂 🔥 ❤️ 😮) | 🌐 Agent C | P0 | — |
| Data channel setup for input events (viewer side) | 🌐 Agent C | P0 | useWebRTC |
| Input capture on video element (mouse/keyboard) | 🌐 Agent C | P0 | — |
| Coordinate normalization (viewer→host) | 🌐 Agent C | P0 | Agent A types |
| Input injection module (uiohook-napi) | 💻 Agent D | P0 | — |
| Data channel receiver (host side) | 💻 Agent D | P0 | Agent A types |
| Coordinate denormalization (host side) | 💻 Agent D | P0 | — |
| AccessToast component (host — Allow/Deny) | 💻 Agent D | P0 | — |
| ViewerPanel component (host — viewer list) | 💻 Agent D | P1 | — |
| Auto-revoke control on viewer disconnect | 🖥️ Agent B | P0 | Socket disconnect |
| Test: full E2E — stream + control + chat | All | P0 | All above |

**✅ Checkpoint 5 (MVP COMPLETE)**: Host streams → viewer watches → chats → requests control → drives host's browser → releases control. All working.

---

## 4. Phase 2: Polish (Weeks 11–16)

### Sprint 6 — Adaptive Quality & UX (Weeks 11–12)

| Task | Agent | Depends On |
|------|-------|------------|
| RTCStatsReport monitoring (every 2s) | 💻 Agent D | — |
| Adaptive bitrate algorithm (step ±500kbps) | 💻 Agent D | Stats |
| Resolution tier switching (1080p→720p→480p→360p) | 💻 Agent D | Bitrate algo |
| Quality indicator UI (host side) | 💻 Agent D | Stats |
| Connection quality badge (viewer side) | 🌐 Agent C | — |
| Ghost cursor overlay (viewer cursor on host) | 💻 Agent D, 🌐 Agent C | Data channel |
| Auto-hide controls after 3s inactivity | 🌐 Agent C | — |
| Loading skeletons for pages | 🌐 Agent C | — |
| Improved error messages and recovery | 🌐 Agent C, 🖥️ Agent B | — |

### Sprint 7 — Mobile & Polish (Weeks 13–14)

| Task | Agent | Depends On |
|------|-------|------------|
| Responsive viewer app (mobile breakpoints) | 🌐 Agent C | — |
| Touch event handling for mobile control | 🌐 Agent C | — |
| Mobile-optimized chat (bottom sheet) | 🌐 Agent C | — |
| Landing page (hero, features, how it works) | 🌐 Agent C | — |
| Dashboard page (room history, stats) | 🌐 Agent C | — |
| Settings page | 🌐 Agent C | — |
| Polish all micro-animations | 🌐 Agent C | — |
| Cross-browser testing (Chrome, Firefox, Edge, Safari) | 🌐 Agent C | — |

### Sprint 8 — Testing & Security (Weeks 15–16)

| Task | Agent | Depends On |
|------|-------|------------|
| Unit tests for all services (80%+ coverage) | 🖥️ Agent B | — |
| Integration tests for REST API | 🖥️ Agent B | — |
| E2E tests with Playwright | 🌐 Agent C | — |
| CORS policy configuration | 🖥️ Agent B | — |
| CSP headers | 🖥️ Agent B | — |
| Input validation audit (all endpoints) | 🖥️ Agent B | — |
| JWT security review | 🖥️ Agent B | — |
| Rate limiting verification | 🖥️ Agent B | — |
| Performance profiling | All | — |
| Load testing signaling server (Artillery) | 🖥️ Agent B | — |

---

## 5. Phase 3: Scale (Weeks 17–24)

### Sprint 9 — TURN Server (Weeks 17–18)
- Set up Coturn on VPS
- Configure time-limited TURN credentials
- Implement TURN fallback logic in WebRTC config
- Test with restricted networks

### Sprint 10 — SFU Architecture (Weeks 19–20)
- Evaluate SFU options (mediasoup, Janus, Pion)
- Implement SFU relay for 7+ viewers
- Dynamic P2P↔SFU switching
- Bandwidth optimization with simulcast

### Sprint 11 — Recording & Features (Weeks 21–22)
- Session recording via MediaRecorder API
- Recording storage (local + optional cloud)
- Hand-raise queue UI
- Enhanced emoji set

### Sprint 12 — Deployment & Launch (Weeks 23–24)
- CI/CD with GitHub Actions
- Deploy server to Railway/Render
- Deploy viewer to Vercel
- Set up Sentry monitoring
- Build and distribute Electron app (.exe, .dmg)
- Beta testing
- Launch

---

## 6. Testing Strategy

| Type | Framework | Coverage Target | Agent |
|------|-----------|----------------|-------|
| Unit tests | Jest + ts-jest | 80%+ | 🖥️ B, 🔧 A |
| Integration tests | Supertest | All API routes | 🖥️ B |
| E2E tests | Playwright | Critical user flows | 🌐 C |
| WebRTC tests | Loopback | Connection establishment | 💻 D |
| Load tests | Artillery | 100 rooms × 10 viewers | 🖥️ B |

---

## 7. Deployment Plan

| Environment | Server | Viewer | Database | Cache |
|-------------|--------|--------|----------|-------|
| **Local** | `npm run dev` | Vite dev server | docker-compose PostgreSQL | docker-compose Redis |
| **Staging** | Railway free | Vercel preview | Neon free | Upstash free |
| **Production** | Railway/Render pro | Vercel CDN | Neon pro | Upstash pro |

### Monthly Cost Estimates
| Phase | Total Cost |
|-------|-----------|
| MVP (free tiers) | $0/month |
| Growth (paid tiers) | $60–95/month |
| Scale (+ TURN server) | $80–120/month |

---

## 8. Definition of Done

For each sprint, ALL items must be checked:
- [ ] All tasks in the sprint completed
- [ ] `tsc --noEmit` passes (zero type errors)
- [ ] `eslint` passes (zero lint errors)
- [ ] Unit tests passing
- [ ] Integration checkpoint verified
- [ ] No critical bugs
- [ ] Code has JSDoc comments on key functions
- [ ] Each file header identifies the responsible agent

---

## 9. Success Metrics (MVP Launch)

| Metric | Target |
|--------|--------|
| Stream latency | < 200ms |
| Connection time | < 3 seconds |
| Chat delivery | < 100ms |
| Input control latency | < 50ms |
| P2P success rate | 95%+ |
| Session failure rate | < 5% |
| Avg session length | > 30 minutes |
