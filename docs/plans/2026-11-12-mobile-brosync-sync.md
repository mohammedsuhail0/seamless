# Mobile BroSync & Cross-Device History Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Code Quality:** Enforce `ponytail` rules (smallest robust change, zero bloat, reuse existing components).
> **Verification:** Follow `verification-before-completion` before sign-off.

**Goal:** Enable BroSync as an Android APK (with native mobile screen hosting) and responsive Mobile Web (iOS Safari/Chrome), with synchronized room history and authentication across Desktop, Mobile Browser, and Android APK.

**Architecture:** Capacitor Android native shell wrapping the existing `@browsync/viewer` React application. Shared PostgreSQL backend provides persistent room history via `GET /api/rooms/my/history`, instantly synchronizing session records when a user signs in on any device.

**Tech Stack:** React 19, Vite, Capacitor 6 (`@capacitor/core`, `@capacitor/android`), WebRTC MediaProjection/getDisplayMedia, Tailwind CSS, Express/Prisma.

---

## Skill Assignment Matrix
- **Planning & Orchestration**: `writing-plans` + `executing-plans` (Structured bite-sized milestones)
- **Code Quality & Architecture**: `ponytail` (Minimal diffs, YAGNI, standard browser/Capacitor APIs, no redundant dependencies)
- **Android APK Scaffolding**: `android-cli` (Android permissions, Gradle setup, MediaProjection manifest declarations)
- **Frontend & Sync UI**: `frontend-developer` + `clean-code` (Mobile responsive layout, 1-tap mobile host screen share, synchronized room history card)
- **Quality & Verification**: `verification-before-completion` (Command line build & type-check execution before sign-off)

---

### Task 1: Add Cross-Device Room History UI to Viewer
**Files:**
- Modify: `packages/viewer/src/pages/Dashboard.tsx`
- Modify: `packages/viewer/src/lib/api.ts`

**Step 1: Check existing history endpoint and API method**
- `GET /api/rooms/my/history` is already implemented and hardened in `packages/server/src/routes/rooms.ts`.
- Ensure `api.getRoomHistory()` exists in `packages/viewer/src/lib/api.ts`.

**Step 2: Add responsive History section in Dashboard**
- Display past rooms with room code, creation date, role (HOST/VIEWER), and 1-tap "Rejoin / Launch" button.
- Ensure layout adapts to mobile screen sizes (phones/tablets).

---

### Task 2: Enable Mobile Host Screen Sharing in Web Viewer & APK
**Files:**
- Modify: `packages/viewer/src/pages/Room.tsx`
- Modify: `packages/viewer/src/hooks/useWebRTC.ts`

**Step 1: Mobile Host Controls**
- In `Room.tsx`, add a visible "📱 Broadcast Mobile Screen" action for hosts on mobile devices.
- Handle mobile screen aspect ratios (vertical 9:16 or horizontal 16:9).

**Step 2: Fallback & Permissions**
- Gracefully handle mobile permission prompts for `getDisplayMedia` / Android screen recording.

---

### Task 3: Scaffold Capacitor Native Android Project
**Files:**
- Create: `packages/viewer/capacitor.config.ts`
- Modify: `packages/viewer/package.json`
- Create/Configure: `packages/viewer/android/` project structure
- Modify: `packages/viewer/android/app/src/main/AndroidManifest.xml`

**Step 1: Install `@capacitor/core` and `@capacitor/cli` and `@capacitor/android`**
- Install dependencies in `packages/viewer`.

**Step 2: Generate Capacitor configuration**
- Set `appId: 'com.brosync.app'`, `appName: 'BroSync'`, `webDir: 'dist'`.

**Step 3: Add Android Platform**
- Run `npx cap add android` in `packages/viewer`.

**Step 4: Configure Android Permissions in AndroidManifest.xml**
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.RECORD_AUDIO`
- `android.permission.MODIFY_AUDIO_SETTINGS`
- `android.permission.WAKE_LOCK`
- `android.permission.FOREGROUND_SERVICE`
- `android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION`

---

### Task 4: End-to-End Build & Verification
**Files:**
- Command: Full monorepo build `npm run build`
- Command: Capacitor sync `npx cap sync android`
- Verify clean compilation across all workspaces.
