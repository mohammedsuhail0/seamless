# BrowSync — Product Requirements Document (PRD)

> **Version**: 1.0 · **Last Updated**: 2026-06-01 · **Status**: Draft
> **Built by**: 🧠 Orchestrator Agent · **Assigned Agent**: 🔧 Agent A (Shared Package foundations)

---

## 1. Executive Summary

### Product Vision
BrowSync captures the host's **real browser** and streams it directly to friends over WebRTC — exactly like how NVIDIA GeForce NOW works, except for browsing. No virtual browser on a foreign server. No geo-blocks. No "buy a plan" errors. Because it's literally YOUR browser, YOUR Netflix account, YOUR Airtel Xstream login — just mirrored to friends in real time.

### Problem Statement
Existing co-browsing solutions (GroupTube, Hyperbeam, Teleparty) rely on **server-side virtual browsers** that cause:
- **Geo-blocking**: Their servers sit in the wrong country, so region-locked content fails
- **Subscription loss**: New browser sessions can't access the user's premium logins
- **Privacy concerns**: Video passes through third-party servers
- **High latency**: Server relay adds 200–500ms delay

### Target Audience
Friend groups, couples, and families who want to watch streaming content together remotely — especially in India where Airtel Xstream, JioCinema, and Hotstar have strict geo and account restrictions.

### Value Proposition
| Dimension | BrowSync | Competitors |
|-----------|----------|-------------|
| Geo-blocking | ✅ None — it's YOUR browser | ❌ Server in wrong country |
| Subscriptions | ✅ Already logged in | ❌ New session = not logged in |
| Latency | ✅ < 200ms (P2P) | ⚠️ 200–500ms (server relay) |
| Privacy | ✅ Video never leaves host↔viewer | ❌ Passes through their servers |
| Viewer install | ✅ None — just open a link | ⚠️ Extension or app required |

---

## 2. Product Overview

- **Product Name**: BrowSync
- **Tagline**: *Watch Together. For Real.*
- **Core Concept**: Mirror the host's actual browser to viewers over peer-to-peer WebRTC

### Three Components

| Component | Technology | Role |
|-----------|-----------|------|
| **Host Desktop App** | Electron + Node.js | Captures screen, encodes video, injects viewer input |
| **Signaling Server** | Node.js + Express + Socket.io | Matchmaking (helps peers find each other), auth, rooms |
| **Viewer Web App** | React + Vite | Friends open a link, see the stream, chat, request control |

### Multi-Agent Build Assignment

> [!NOTE]
> This product is built using a **multi-agent development system**. See [07_Multi_Agent_Development_Workflow.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/07_Multi_Agent_Development_Workflow.md) for full agent assignments.

| Agent | Builds | PRD Sections Relevant |
|-------|--------|----------------------|
| 🔧 Agent A | Shared types, schemas, constants | §5 (data types), §8 (NFRs) |
| 🖥️ Agent B | Signaling server, auth, rooms | §5 (backend features), §7 (acceptance) |
| 🌐 Agent C | Viewer web app UI | §5 (viewer features), §6 (user stories) |
| 💻 Agent D | Desktop host app | §5 (host features), §6 (user stories) |

---

## 3. Goals & Objectives

### Primary Goals
1. Enable seamless co-browsing with **zero setup for viewers** (just open a link)
2. Stream the host's **actual browser** — no virtual browser, no geo-blocks
3. Allow viewers to **remotely control** the host's browser with explicit permission

### Secondary Goals
4. Ultra-low latency (< 200ms) via peer-to-peer WebRTC
5. Privacy-first architecture — video never touches a middleman server
6. Works with **any** subscription service (Netflix, Airtel Xstream, Disney+, JioCinema)

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Connection time | < 3 seconds | Time from "Join Room" click to first video frame |
| Stream latency | < 200ms | WebRTC stats API round-trip |
| Chat delivery | < 100ms | Socket.io acknowledgment timing |
| Input control latency | < 50ms | Timestamp comparison (viewer action → host injection) |
| P2P success rate | 95%+ | Percentage of connections that don't need TURN fallback |
| Session failure rate | < 5% | Sessions that disconnect without user intent |
| Avg session length | > 30 minutes | Analytics tracking |

---

## 4. User Personas

### Persona 1: Arjun — College Student Group

| Attribute | Detail |
|-----------|--------|
| **Age** | 20 |
| **Location** | Pune, India |
| **Tech comfort** | High — uses Discord, games on PC |
| **Pain point** | Friends have different streaming subscriptions; can't watch together |
| **Goal** | Watch Netflix/Hotstar with hostel friends who don't have accounts |
| **Quote** | *"I just want to share my screen without everyone needing to buy Netflix"* |

### Persona 2: Priya & Rahul — Remote Couple

| Attribute | Detail |
|-----------|--------|
| **Ages** | 24, 26 |
| **Location** | Priya in Bangalore, Rahul in Delhi |
| **Tech comfort** | Medium — comfortable with apps, not technical setup |
| **Pain point** | Teleparty breaks on Indian streaming platforms; Discord screen share has lag |
| **Goal** | Movie night together every weekend despite distance |
| **Quote** | *"We just want to press play at the same time and it actually works"* |

### Persona 3: Sharma Family — Across Cities

| Attribute | Detail |
|-----------|--------|
| **Ages** | Parents (55, 52), Kids (28, 25) |
| **Location** | Parents in Jaipur, kids in Mumbai and Hyderabad |
| **Tech comfort** | Low (parents) to High (kids) |
| **Pain point** | Parents can't figure out screen sharing; existing apps require installs |
| **Goal** | Watch family shows together on Sunday evenings |
| **Quote** | *"Papa just needs to click a link, nothing more"* |

### Persona 4: Gaming Squad — Weekend Warriors

| Attribute | Detail |
|-----------|--------|
| **Ages** | 18–22 |
| **Location** | Mixed Indian cities |
| **Tech comfort** | Very high — builds PCs, uses mods |
| **Pain point** | Want to browse gaming wikis together while strategizing; need one person to control |
| **Goal** | Collaborative browsing with shared control for game planning |
| **Quote** | *"Let me drive the browser while everyone watches and tells me what to click"* |

---

## 5. Feature Requirements (MoSCoW)

### 🔴 Must Have — MVP (Phase 1)

| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| M1 | Screen/tab capture | Host captures their screen or a specific Chrome tab | 💻 D |
| M2 | WebRTC P2P streaming | Video streamed directly to each viewer, no relay server | 💻 D, 🌐 C |
| M3 | Room creation | Host creates a room with unique 6-char code | 🖥️ B |
| M4 | Shareable join link | `browsync.app/room/ABC123` — viewers click to join | 🖥️ B, 🌐 C |
| M5 | Guest viewing | Viewers enter a display name only — no registration required | 🖥️ B, 🌐 C |
| M6 | Real-time chat | Text chat alongside the stream | 🖥️ B, 🌐 C |
| M7 | Emoji reactions | 👍 😂 🔥 ❤️ 😮 — float up as animated bubbles | 🌐 C |
| M8 | Request control system | Viewer requests → Host approves/denies → Viewer controls mouse/keyboard | All |
| M9 | Control revocation | Host can revoke control instantly with one click | 💻 D, 🖥️ B |
| M10 | JWT authentication | Registered users get persistent sessions | 🖥️ B, 🔧 A |
| M11 | WebRTC signaling server | Relay offers/answers/ICE candidates (NOT video) | 🖥️ B |

### 🟡 Should Have — Phase 2

| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| S1 | Adaptive bitrate | Auto-adjusts quality based on viewer's bandwidth | 💻 D |
| S2 | Ghost cursor | Viewer's cursor visible on host screen as transparent overlay | 💻 D, 🌐 C |
| S3 | Party sync indicator | Visual confirmation everyone is watching the same moment | 🌐 C |
| S4 | Mobile viewer support | Responsive viewer app works on phones (view-only) | 🌐 C |
| S5 | Screen vs tab toggle | Host switches between full screen and specific tab capture | 💻 D |
| S6 | Connection quality badge | Green/yellow/red indicator showing stream health | 🌐 C |

### 🟢 Could Have — Phase 3

| # | Feature | Description | Agent |
|---|---------|-------------|-------|
| C1 | TURN server fallback | Relay for users behind strict firewalls when P2P fails | 🖥️ B |
| C2 | SFU architecture | Selective Forwarding Unit for 20+ viewers (one stream in, many out) | 🖥️ B |
| C3 | Session recording | Host can save the session as a video file | 💻 D |
| C4 | Viewer hand-raise queue | Ordered queue for control requests | 🖥️ B, 🌐 C |

### ⚪ Won't Have (Deferred)

| Feature | Reason |
|---------|--------|
| Audio-only mode | Focus is on visual co-browsing |
| File sharing | Out of scope — not a collaboration tool |
| Multi-host switching | Adds complexity; one host per room for MVP |
| End-to-end encryption for chat | WebRTC already encrypts media; chat is non-sensitive |

---

## 6. User Stories

### Hosting

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As Arjun, I want to **share my Netflix tab** with friends so we can watch a movie together | Must |
| US-02 | As Arjun, I want to **create a room with a code** so I can share it on our WhatsApp group | Must |
| US-03 | As Arjun, I want to **see how many friends are watching** so I know everyone joined | Must |
| US-04 | As Arjun, I want to **end the session** when the movie's done so the room closes cleanly | Must |
| US-05 | As Arjun, I want to **choose between sharing my full screen or just one tab** so I don't expose my other work | Should |

### Viewing

| ID | Story | Priority |
|----|-------|----------|
| US-06 | As Priya, I want to **click a link and instantly see Rahul's screen** without installing anything | Must |
| US-07 | As Priya, I want to **join as a guest with just my name** so I don't need to create an account | Must |
| US-08 | As Priya, I want to **see the stream in full-screen** so it feels like watching on my own screen | Must |
| US-09 | As Priya, I want to **see a quality indicator** so I know if my connection is causing lag | Should |

### Chatting & Reacting

| ID | Story | Priority |
|----|-------|----------|
| US-10 | As Sharma kids, we want to **chat alongside the stream** without leaving the page | Must |
| US-11 | As family members, we want to **react with emojis** to funny moments | Must |
| US-12 | As a viewer joining late, I want to **see recent chat history** so I know what I missed | Must |

### Remote Control

| ID | Story | Priority |
|----|-------|----------|
| US-13 | As a gaming squad member, I want to **request control of the host's browser** so I can navigate a wiki page | Must |
| US-14 | As the host, I want to **see who's requesting control and approve or deny** each request | Must |
| US-15 | As the host, I want to **revoke control instantly** if someone does something I don't want | Must |
| US-16 | As a viewer in control, I want to **release control voluntarily** when I'm done | Must |
| US-17 | As the host, I want **control to auto-revoke** if a viewer disconnects | Must |

### Account Management

| ID | Story | Priority |
|----|-------|----------|
| US-18 | As a returning user, I want to **see my room history** so I can create rooms with the same settings | Should |
| US-19 | As a registered user, I want to **stay logged in** between sessions | Must |

---

## 7. Acceptance Criteria

### AC: Screen/Tab Capture (M1)
- [ ] Host can select a specific browser tab OR entire screen
- [ ] Capture starts within 2 seconds of selection
- [ ] Captured stream includes both video and audio (if tab capture)
- [ ] Permission dialog is shown by the OS/browser (not custom)
- [ ] If permission denied, user sees a clear error message

### AC: WebRTC Streaming (M2)
- [ ] Viewer receives video within 3 seconds of joining
- [ ] Video plays smoothly at ≥ 24fps on decent connections
- [ ] Stream latency < 200ms under normal conditions
- [ ] If P2P fails, gracefully shows "connecting" state (TURN fallback in Phase 3)

### AC: Room System (M3, M4, M5)
- [ ] Room code is 6 characters, uppercase alphanumeric
- [ ] Room code is unique — no collisions
- [ ] Shareable link format: `browsync.app/room/{CODE}`
- [ ] Guests can join with just a display name (no email/password)
- [ ] Room supports up to 7 viewers (MVP)
- [ ] 8th viewer attempt shows "Room is full" error

### AC: Chat (M6)
- [ ] Messages appear for all users within 100ms
- [ ] Last 200 messages stored during active session
- [ ] New joiners see recent chat history
- [ ] Messages show display name, timestamp, and avatar initial

### AC: Emoji Reactions (M7)
- [ ] 5 reaction buttons: 👍 😂 🔥 ❤️ 😮
- [ ] Clicking a reaction shows a floating animated emoji for all viewers
- [ ] Animation: bubble float up + fade out over 2 seconds
- [ ] Reactions are ephemeral (not stored)

### AC: Control System (M8, M9)
- [ ] "Request Control" button visible to all viewers
- [ ] Host sees toast notification: "[Name] wants control — Allow / Deny"
- [ ] Toast auto-dismisses after 15 seconds (auto-deny)
- [ ] When granted: viewer's mouse movements control the host's cursor
- [ ] Coordinate mapping is accurate (viewer viewport → host screen resolution)
- [ ] Host can revoke with one click at any time
- [ ] Viewer can release voluntarily
- [ ] Only one viewer can have control at a time
- [ ] Visual indicator on viewer's screen when they have control (blue border glow)

---

## 8. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Stream latency | < 200ms |
| Connection establishment | < 3 seconds |
| Chat message delivery | < 100ms |
| Input event round-trip | < 50ms |
| Host CPU usage for capture + encoding | < 30% |
| Host memory usage | < 500MB |
| Viewer page load (first contentful paint) | < 2 seconds |

### Scalability
- **MVP**: 7 viewers per room
- **Phase 3**: 20+ viewers per room (via SFU)
- Server handles 100+ concurrent rooms

### Security
- WebRTC media encrypted via DTLS/SRTP (built-in)
- JWT with RS256 signing (access: 24h, refresh: 7d)
- Input control requires explicit per-session host approval
- Visual indicator on host screen when being controlled
- Instant one-click control revocation
- Rate limiting on all API endpoints
- Input validation with Zod schemas

### Compatibility

| Platform | Minimum Version |
|----------|----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Edge | 90+ |
| Safari | 15+ |
| Windows (host) | 10+ |
| macOS (host) | 12+ |

### Accessibility
- Keyboard navigation for all interactive elements
- Screen reader labels (ARIA)
- Color contrast minimum 4.5:1 (WCAG 2.1 AA)
- Reduced motion preference respected
- Focus indicators on all interactive elements

---

## 9. Constraints & Assumptions

### Constraints
- Host must have **decent upload bandwidth** (~2 Mbps per viewer, ~14 Mbps for 7 viewers)
- Some ISPs (especially Indian ones) block P2P connections → TURN fallback needed (Phase 3)
- Input injection **requires a desktop app** — browser extensions can't simulate OS-level mouse/keyboard
- Viewer is **browser-only** — no install needed

### Assumptions
- Host has a modern computer capable of screen capture + WebRTC encoding
- Most users are on broadband with 15+ Mbps upload (typical for urban India)
- Users trust the host enough to grant control (friend groups, not strangers)
- WebRTC is supported in all target browsers

---

## 10. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| NAT traversal failures (P2P blocked) | Medium | High | TURN server fallback (Phase 3); Google STUN servers free |
| Bandwidth limitations (host upload) | Medium | Medium | Adaptive bitrate; auto-lowers quality for slow connections |
| Security concerns with remote control | Low | Critical | Explicit per-session approval; visual indicators; instant revoke; audit log |
| Platform restrictions (DRM content) | Medium | Medium | BrowSync captures the screen output, not the DRM stream itself; some platforms may show black |
| Browser API deprecation | Low | High | Feature detection; graceful degradation; fallback to alternative capture methods |
| Scaling beyond 7 viewers | High (for growth) | Medium | SFU architecture in Phase 3; dynamic P2P↔SFU switching |
| Legal concerns (streaming TOS) | Medium | Medium | User is sharing their own screen (not redistributing content); similar to Discord screen share |

---

## 11. Release Plan

### Phase 1 — MVP (8–10 weeks)
- Screen/tab capture on host
- WebRTC P2P streaming to viewers
- Room creation with shareable link
- Real-time chat + emoji reactions
- Request control system
- JWT authentication
- **Goal**: Works for you and 7 friends

### Phase 2 — Polish (4–6 weeks)
- Adaptive video quality
- Ghost cursor overlay
- Party sync indicator
- Mobile viewer support
- Connection quality badges
- Landing page + dashboard
- **Goal**: Feels like a real product

### Phase 3 — Scale (6–8 weeks)
- TURN server fallback
- SFU for 20+ viewers
- Session recording
- CI/CD + monitoring
- Desktop app distribution (.exe, .dmg)
- **Goal**: Ready for public beta

---

## 12. Competitive Analysis

| Feature | BrowSync | Hyperbeam | GroupTube | Teleparty | Discord Screen Share | Zoom Share |
|---------|----------|-----------|----------|-----------|---------------------|------------|
| **Latency** | < 200ms (P2P) | 200–400ms | 300–500ms | N/A (sync only) | 200–500ms | 200–400ms |
| **Geo-blocking** | ✅ None | ❌ Server-based | ❌ Server-based | ❌ Extension only | ✅ None | ✅ None |
| **Your subscriptions** | ✅ Your browser | ❌ New session | ❌ New session | ⚠️ Partial | ✅ Your screen | ✅ Your screen |
| **Privacy** | ✅ P2P direct | ❌ Server relay | ❌ Server relay | ✅ No video | ⚠️ Discord servers | ⚠️ Zoom servers |
| **Remote control** | ✅ Full mouse/KB | ❌ None | ❌ None | ❌ None | ❌ None | ⚠️ Basic |
| **Max viewers** | 7 (MVP), 20+ (v3) | 10 | Unlimited | Unlimited | 50 (Go Live) | 100+ |
| **Viewer install** | ✅ None (browser) | ✅ None | ⚠️ Extension | ⚠️ Extension | ⚠️ App | ⚠️ App |
| **Cost** | Free (self-host) | $15/mo | Free (limited) | Free (limited) | Free | Free (40min) |
| **Works on Indian OTT** | ✅ Yes | ❌ Geo-blocked | ❌ Geo-blocked | ❌ Unsupported | ✅ Yes | ✅ Yes |

### BrowSync's Unique Edge
The only solution that combines **zero geo-blocking** + **your subscriptions** + **remote control** + **no viewer install** + **privacy-first P2P**. Discord comes closest but lacks remote control and has higher latency through their servers.

---

## Appendix: Document Cross-References

| Document | Relevance to PRD |
|----------|-----------------|
| [02_TRD](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/02_TRD_Technical_Requirements_Document.md) | Technical implementation details for features listed here |
| [03_UI/UX](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/03_UI_UX_Design_Document.md) | Visual design for all screens referenced in user stories |
| [04_App Flow](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/04_App_Flow_Document.md) | Step-by-step flows for each feature |
| [05_Backend Schema](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/05_Backend_Schema_Document.md) | Data models for rooms, users, sessions |
| [06_Implementation Plan](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/06_Implementation_Plan.md) | Sprint-by-sprint build schedule |
| [07_Multi-Agent Workflow](file:///C:/Users/Lenovo/.gemini/antigravity/brain/08f71b7e-1872-4727-a2d2-ed85a47b2732/07_Multi_Agent_Development_Workflow.md) | Which agent builds which feature from this PRD |
