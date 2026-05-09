# BlackBook

Africa's Premium Professional Network for Black decision-makers.

## Overview

BlackBook transitions an exclusive, high-value professional network into a controlled, owned platform. It provides secure messaging, a professional feed, event management, mentorship booking, and payment processing.

## Quick Start

```bash
npm install
cp .env.example apps/web/.env.local
# Edit .env.local with your Supabase credentials
npm run dev:web
```

## Architecture

- **Web**: Next.js 15 (Vercel) → apps/web
- **Mobile**: Expo SDK 52 (iOS + Android) → apps/mobile
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Paystack API
- **Shared**: Common types, validation → packages/shared

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.
