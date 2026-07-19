# TURN Deployment Guide

Option 2 for Hypersync is a self-hosted TURN relay using Coturn on a VPS.

## What this changes

- Viewers behind strict NAT, mobile networks, or carrier firewalls can still connect.
- The app keeps using direct P2P when possible.
- When P2P fails, WebRTC falls back to the TURN relay you host.

## What this does not change

- It does not fix DRM black screens caused by content protection on the source site.
- It does not make server-side video capture possible for protected streams.

## VPS requirements

- A public IPv4 address
- Ubuntu 22.04 or similar Linux
- Docker and Docker Compose
- Open ports:
  - UDP 3478
  - TCP 3478
  - UDP relay port range `49160-49200`

## Deploy steps

1. Point a DNS record at the VPS, for example `turn.hypersync.app`.
2. Copy `infra/coturn/.env.example` to `infra/coturn/.env`.
3. Fill in the real values:
   - `TURN_REALM`
   - `TURN_USERNAME`
   - `TURN_CREDENTIAL`
4. Start the relay:

```bash
cd infra/coturn
docker compose up -d
```

## Render API env vars

Set these on the Render `browsync-api` service:

- `TURN_URLS=turn:turn.hypersync.app:3478?transport=udp,turn:turn.hypersync.app:3478?transport=tcp`
- `TURN_USERNAME=turn-user`
- `TURN_CREDENTIAL=replace-with-the-same-password`
- `FORCE_TURN=false`

If you want to force relay mode for testing, set `FORCE_TURN=true` temporarily.

The viewer reads ICE configuration from `/api/rtc/ice-config`, so TURN credential changes only require redeploying or restarting the Render API service.

## Verification

- Restart the Render API service after changing TURN env vars.
- Open a room from one network and join from a different network.
- If the peer connection stays in `connected` or `completed`, TURN is working.
- If the viewer still drops on join, check the VPS firewall first.
