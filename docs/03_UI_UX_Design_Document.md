# BrowSync — UI/UX Design Document

> **Version**: 1.0 · **Last Updated**: 2026-06-01 · **Status**: Draft
> **Built by**: 🧠 Orchestrator Agent · **Primary Agent**: 🌐 Agent C (Viewer App), 💻 Agent D (Desktop Host UI)

---

## 1. Design Philosophy

- **Dark-first**: Deep navy background — like Discord meets GeForce NOW
- **Invisible UI**: Controls auto-hide during streaming; the content is the star
- **Glassmorphism**: Frosted glass overlays for modals, toasts, and panels
- **Micro-animations**: Every interaction has a subtle, satisfying animation
- **Premium feel**: No generic Bootstrap look — curated colors, custom typography, polished shadows

### Agent Assignment

| Screen / Component | Agent | Priority |
|-------------------|-------|----------|
| Viewer app (all pages) | 🌐 Agent C | Phase 1–2 |
| Host desktop UI | 💻 Agent D | Phase 1 |
| Landing page | 🌐 Agent C | Phase 2 |
| Design system (CSS tokens) | 🌐 Agent C | Phase 1 (Sprint 1) |

---

## 2. Design System

### 2.1 Color Tokens

```css
:root {
  /* ── Background ── */
  --bg-primary:    #0a0e27;    /* Deep navy — main background */
  --bg-secondary:  #111638;    /* Slightly lighter — cards, panels */
  --bg-tertiary:   #1a1f4a;    /* Hover states, active items */
  --bg-surface:    rgba(255, 255, 255, 0.05);  /* Glass surface */
  --bg-overlay:    rgba(10, 14, 39, 0.85);      /* Modal backdrop */
  
  /* ── Brand Colors ── */
  --color-primary:     #4f46e5;    /* Electric blue — buttons, links */
  --color-primary-hover: #4338ca;  /* Darker on hover */
  --color-primary-glow: rgba(79, 70, 229, 0.4); /* Glow effects */
  --color-accent:      #7c3aed;    /* Vibrant purple — highlights */
  --color-accent-hover: #6d28d9;
  
  /* ── Semantic Colors ── */
  --color-success:  #10b981;    /* Green — connected, allowed */
  --color-warning:  #f59e0b;    /* Amber — degraded, waiting */
  --color-error:    #ef4444;    /* Red — error, denied, end session */
  --color-info:     #3b82f6;    /* Blue — informational */
  
  /* ── Text Colors ── */
  --text-primary:   #f1f5f9;    /* White-ish — headings, primary text */
  --text-secondary: #94a3b8;    /* Gray — secondary text, labels */
  --text-muted:     #64748b;    /* Dim gray — timestamps, hints */
  --text-inverse:   #0a0e27;    /* Dark — text on light backgrounds */
  
  /* ── Border Colors ── */
  --border-default: rgba(255, 255, 255, 0.08);
  --border-hover:   rgba(255, 255, 255, 0.15);
  --border-focus:   var(--color-primary);
  --border-control: var(--color-primary-glow); /* Blue glow when viewer has control */
  
  /* ── Shadows ── */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg:  0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px var(--color-primary-glow);
  
  /* ── Glass Effect ── */
  --glass-bg:     rgba(255, 255, 255, 0.06);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur:   blur(16px);
}
```

### 2.2 Typography

```css
/* Fonts: Inter (UI) + JetBrains Mono (codes) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;
  
  /* Scale */
  --text-xs:   0.75rem;    /* 12px — timestamps, badges */
  --text-sm:   0.875rem;   /* 14px — secondary text */
  --text-base: 1rem;       /* 16px — body text */
  --text-lg:   1.125rem;   /* 18px — large body */
  --text-xl:   1.25rem;    /* 20px — section titles */
  --text-2xl:  1.5rem;     /* 24px — card headings */
  --text-3xl:  1.875rem;   /* 30px — page titles */
  --text-4xl:  2.25rem;    /* 36px — hero heading */
  --text-5xl:  3rem;       /* 48px — landing hero */
  
  /* Weights */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
  --font-extrabold:800;
  
  /* Line Heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed:1.625;
}
```

### 2.3 Spacing System (4px Grid)

```css
:root {
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  
  /* Border Radius */
  --radius-sm:   0.375rem; /* 6px */
  --radius-md:   0.5rem;   /* 8px */
  --radius-lg:   0.75rem;  /* 12px */
  --radius-xl:   1rem;     /* 16px */
  --radius-full: 9999px;   /* Pill shape */
}
```

### 2.4 Component Library

#### Buttons
| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `var(--color-primary)` | White | None | `var(--color-primary-hover)` + shadow-glow |
| Secondary | Transparent | `var(--color-primary)` | `var(--color-primary)` | `var(--bg-tertiary)` |
| Ghost | Transparent | `var(--text-secondary)` | None | `var(--bg-tertiary)` |
| Danger | `var(--color-error)` | White | None | `#dc2626` |

```css
.btn {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  transition: all 200ms ease;
  cursor: pointer;
}
.btn:hover { transform: scale(1.02); }
.btn:active { transform: scale(0.98); }
```

#### Status Indicators
| Status | Color | Shape | Animation |
|--------|-------|-------|-----------|
| Online | `var(--color-success)` | 8px circle | None |
| Streaming | `var(--color-primary)` | 8px circle | Pulse (2s infinite) |
| Offline | `var(--text-muted)` | 8px circle | None |
| In Control | `var(--color-primary)` | Ring around avatar | Glow pulse |

---

## 3. Screen Designs

### 3.1 Landing Page — 🌐 Agent C (Phase 2)

**Layout**: Full-width, single-page scroll

| Section | Content | Design |
|---------|---------|--------|
| **Hero** | "Watch Together. For Real." + subtitle + CTA | Animated gradient background (navy→purple), large Inter 800 heading, "Start Hosting" primary button |
| **Features** | 3 columns: No Geo-blocks · Your Subscriptions · Ultra-Low Latency | Icon + heading + description per card; glass-effect cards |
| **How It Works** | 3 steps: Create Room → Share Link → Watch Together | Numbered circles with connecting lines; step descriptions |
| **CTA** | "Ready to watch together?" + Sign Up button | Gradient background section |
| **Footer** | Links, copyright, GitHub | Minimal, `var(--bg-secondary)` background |

### 3.2 Auth Modal — 🌐 Agent C

- Glassmorphism overlay (`var(--glass-bg)` + `var(--glass-blur)`)
- Tab switch: Login / Register
- Fields: Email, Display Name (register only), Password
- Google OAuth button (secondary style)
- "Forgot password?" link
- Dimensions: max-width 420px, padding var(--space-8)

### 3.3 Dashboard — 🌐 Agent C (Phase 2)

- **Header**: Logo + user avatar + settings gear
- **Main CTA**: Large "Create New Room" button (primary, centered)
- **Room History**: Card list of past rooms with date, viewer count, duration
- **Quick Stats**: Cards showing total sessions, friends hosted, hours shared

### 3.4 Room Creation Modal — 🌐 Agent C

- Room name input (placeholder: "Movie Night 🍿")
- Privacy toggle (Public link / Invite only)
- Quality preset: radio group (Auto / 720p / 1080p)
- "Create Room" primary button
- Result: displays room code (JetBrains Mono, large) + "Copy Link" button

### 3.5 Host View (Active Session) — 💻 Agent D

```
┌─────────────────────────────────────────────────────────────┐
│                    Stream Preview                            │
│              (what viewers see, full area)                    │
│                                                              │
│                                                              │
│                                                              │
│  ┌─────────────────────────────────┐                         │
│  │ 🟢 Rahul wants control          │  ← Toast (top-right)    │
│  │    [Allow]  [Deny]              │                         │
│  └─────────────────────────────────┘                         │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ 🖥 Screen ▾ │ 1080p · 2.4 Mbps │ 👥 3 │ 💬 Chat │ 🔴 End  │
└──────────────────────────────────────────────────────────────┘
```

**Side Panel** (collapsible, right side, 300px width):
- Viewer list with online indicators
- Access request queue (Allow/Deny buttons per viewer)
- "Currently controlling: [Name]" indicator

### 3.6 Viewer View (Watching) — 🌐 Agent C

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    Full-Screen Video Stream                   │
│                                                              │
│                                                              │
│                                             ┌──────────────┐ │
│                                             │ Chat Panel   │ │
│                                             │ ──────────── │ │
│                                             │ Arjun: lol   │ │
│                                             │ Priya: 😂    │ │
│                                             │              │ │
│                                             │ [Type...]  📎│ │
│                                             │ 👍 😂 🔥 ❤️ 😮│ │
│                                             └──────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  🎮 Request Control  │  ⛶ Fullscreen  │  🟢  │  💬  │  🚪  │
└──────────────────────────────────────────────────────────────┘
```

- Bottom toolbar auto-hides after **3 seconds** of no mouse movement
- Chat panel slides in from right (width: 320px)
- Floating reactions bubble up from bottom-center

### 3.7 Control Mode (Viewer) — 🌐 Agent C

- **Blue border glow** around entire video: `box-shadow: 0 0 0 3px var(--color-primary), var(--shadow-glow);`
- **Top badge**: "🎮 You are in control" (glass background, centered)
- Button changes: "Request Control" → "Release Control" (secondary style)
- Cursor: `cursor: crosshair;` on video element

### 3.8 Host Control Toast — 💻 Agent D

```css
.access-toast {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  min-width: 320px;
  animation: slideInRight 250ms ease-out;
}
```

- Avatar initial + display name
- "Allow" button (success green) + "Deny" button (ghost)
- Auto-dismiss: 15 seconds (progress bar at bottom)
- Queue badge: "2 more waiting" (small text below)

### 3.9 Settings Page — 🌐 Agent C (Phase 2)

Sections: Video Quality Defaults | Capture Preferences | Notifications | Account | About

---

## 4. Interaction Patterns

### Micro-Animations

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| Button | Hover | `scale(1.02)` + shadow increase | 200ms | ease |
| Button | Click | `scale(0.98)` | 100ms | ease |
| Modal | Open | `opacity: 0→1` + `translateY(20px→0)` | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Modal | Close | `opacity: 1→0` + `translateY(0→10px)` | 200ms | ease-in |
| Toast | Enter | `translateX(100%→0)` | 250ms | ease-out |
| Toast | Exit | `translateX(0→100%)` | 200ms | ease-in |
| Emoji reaction | Trigger | `translateY(0→-200px)` + `opacity: 1→0` + `scale(1→1.5)` | 2000ms | ease-out |
| Chat message | New | `translateY(10px→0)` + `opacity: 0→1` | 150ms | ease-out |
| Viewer count | Change | Badge pulse `scale(1→1.2→1)` | 400ms | ease |
| Quality badge | Color change | `background-color` transition | 500ms | ease |
| Control glow | Active | `box-shadow` pulse animation | 2000ms | ease-in-out, infinite |
| Toolbar | Auto-hide | `opacity: 1→0` + `translateY(0→100%)` | 300ms | ease-in |
| Chat panel | Slide in | `translateX(100%→0)` | 250ms | ease-out |

### State Visual Treatments

| State | Visual Treatment |
|-------|-----------------|
| Connecting | Pulsing dots animation + "Connecting..." text |
| Connected | Green dot + "Connected" badge |
| Streaming | Full video + floating controls |
| Disconnected | Gray overlay + "Reconnecting..." spinner |
| Requesting Control | Pulsing "Request Control" button |
| In Control | Blue border glow + "You are in control" badge |
| Control Released | Brief green flash + "Control released" toast |

---

## 5. Responsive Design

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile | < 640px | Stream full-width; bottom sheet for chat; minimal toolbar icons |
| Tablet | 640–1024px | Collapsed side panel; floating chat toggle; compact toolbar |
| Desktop | 1024–1280px | Full layout; side panel visible; all controls shown |
| Wide | > 1280px | Centered content with max-width 1440px |

### Mobile-Specific (Phase 2)
- Touch events replace mouse events for control
- Swipe up for chat (bottom sheet)
- Pinch-to-zoom on video stream
- Landscape orientation preferred (prompt to rotate)

---

## 6. Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | All buttons, inputs, toggles focusable via Tab |
| Focus indicators | 2px solid `var(--border-focus)` outline with 2px offset |
| Screen reader | ARIA labels on all icons, role attributes on panels |
| Color contrast | Minimum 4.5:1 for all text (verified against dark bg) |
| Reduced motion | `@media (prefers-reduced-motion)` disables all animations |
| Focus trap | Modals trap focus within themselves |
| Skip links | "Skip to main content" link on landing page |

---

## 7. Error & Empty States

| State | Visual | Message |
|-------|--------|---------|
| Room not found | 🔍 icon | "This room doesn't exist or has ended" + "Go Home" button |
| Connection failed | ⚡ icon | "Unable to connect" + countdown retry (5, 4, 3...) + "Retry Now" |
| Host disconnected | 📡 icon | "Host disconnected — waiting..." + spinner + 30s countdown |
| Room full | 👥 icon | "This room is full (7/7 viewers)" + "Try Again Later" |
| No viewers | 📋 icon | "Share this link to invite friends" + room code + "Copy Link" |
| Chat empty | 👋 emoji | "Say hi! Start the conversation" |
| Permission denied | 🔒 icon | "Screen capture permission required" + "Grant Permission" button |

---

## 8. Iconography

- **Library**: [Lucide Icons](https://lucide.dev/) (open-source, consistent 24x24 stroke style)
- **Size**: 20px for toolbar, 24px for navigation, 16px for inline

| Action | Lucide Icon |
|--------|------------|
| Screen share | `Monitor` |
| Chat | `MessageSquare` |
| Request control | `Gamepad2` |
| Fullscreen | `Maximize2` |
| Leave room | `LogOut` |
| Settings | `Settings` |
| Copy link | `Copy` |
| End session | `X` (in circle) |
| Viewer count | `Users` |
| Quality | `Signal` |
| Emoji | `Smile` |
