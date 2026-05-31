# 🔄 BrowSync

> **Watch Together. For Real.**

BrowSync captures the host's **real browser** and streams it directly to friends over WebRTC — exactly like how NVIDIA GeForce NOW works, except for browsing. No virtual browser. No geo-blocks. No "buy a plan" errors. Because it's literally YOUR browser, YOUR Netflix account, YOUR Airtel Xstream login — just mirrored to friends in real time.

---

## ✨ Why BrowSync?

| Problem | GroupTube / Hyperbeam | BrowSync |
|---|---|---|
| Geo-blocked content | ❌ Their server = wrong country | ✅ Host's own PC = your country |
| Premium subscriptions | ❌ New session = not logged in | ✅ Host's browser = already logged in |
| Latency | ⚠️ 200–500ms (server relay) | ✅ < 200ms (P2P direct) |
| Privacy | ❌ Video through their servers | ✅ P2P — video never leaves host↔viewer |
| Viewer setup | ⚠️ Extension or app required | ✅ Just open a link |

---

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    WebSocket     ┌─────────────────┐
│  Host Desktop   │◄──(signaling)──►│  Signaling      │◄──(signaling)──►│  Viewer Web     │
│  App (Electron) │                  │  Server (Node)  │                  │  App (React)    │
│                 │◄═══════════════════════════════════════════════════►│                 │
│  Screen Capture │    WebRTC P2P (video + data channel)                │  Video Player   │
│  Input Inject   │◄─────── Mouse/Keyboard events (data channel) ──────│  Input Capture  │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
```

| Component | Technology | Package |
|-----------|-----------|---------|
| **Host Desktop App** | Electron 28 + Node.js 20 | `packages/desktop/` |
| **Signaling Server** | Express + Socket.io + Prisma + Redis | `packages/server/` |
| **Viewer Web App** | React 18 + Vite 5 | `packages/viewer/` |
| **Shared Types** | TypeScript + Zod | `packages/shared/` |

---

## 🤖 Multi-Agent Development

This project is built using a **multi-agent AI development system** where each component is assigned to a specific agent:

| Agent | Component | Role |
|-------|-----------|------|
| 🧠 **Orchestrator** | Root config | Coordination, integration, monorepo |
| 🔧 **Agent A** | `packages/shared/` | Types, schemas, constants, enums |
| 🖥️ **Agent B** | `packages/server/` | REST API, Socket.io, Prisma, Redis |
| 🌐 **Agent C** | `packages/viewer/` | React UI, WebRTC hooks, streaming |
| 💻 **Agent D** | `packages/desktop/` | Electron, capture, input injection |

Each source file includes a header comment identifying which agent built it.

→ Full details: [`docs/07_Multi_Agent_Development_Workflow.md`](docs/07_Multi_Agent_Development_Workflow.md)

---

## 📚 Documentation

| # | Document | Description |
|---|----------|-------------|
| 01 | [PRD — Product Requirements](docs/01_PRD_Product_Requirements_Document.md) | What we're building and why |
| 02 | [TRD — Technical Requirements](docs/02_TRD_Technical_Requirements_Document.md) | How we're building it (tech stack, specs) |
| 03 | [UI/UX Design](docs/03_UI_UX_Design_Document.md) | Design system, screens, animations |
| 04 | [App Flow](docs/04_App_Flow_Document.md) | All user flows with mermaid diagrams |
| 05 | [Backend Schema](docs/05_Backend_Schema_Document.md) | Database, Redis, API, WebSocket schemas |
| 06 | [Implementation Plan](docs/06_Implementation_Plan.md) | Sprint breakdown with agent assignments |
| 07 | [Multi-Agent Workflow](docs/07_Multi_Agent_Development_Workflow.md) | How AI agents collaborate to build this |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS
- Docker (for PostgreSQL + Redis)

### Setup
```bash
git clone https://github.com/mohammedsuhail0/seamless.git
cd seamless/browsync
npm install
docker-compose up -d
cd packages/server && npx prisma migrate dev --name init
cd ../..
npm run dev
```

---

## 📋 Roadmap

- **Phase 1 (MVP)**: Screen streaming, chat, emoji reactions, remote control — 10 weeks
- **Phase 2 (Polish)**: Adaptive bitrate, mobile support, landing page — 6 weeks  
- **Phase 3 (Scale)**: TURN fallback, SFU for 20+ viewers, recording — 8 weeks

---

## 📄 License

MIT
