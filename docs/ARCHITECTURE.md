# BlackBook Enterprise Architecture

## Monorepo Structure

```
BlackBook/
├── apps/
│   ├── web/           # Next.js 15 Web App (Desktop)
│   └── mobile/        # Expo SDK 52 Mobile App (iOS + Android)
├── packages/
│   └── shared/        # Shared types, validation schemas, constants
├── supabase/
│   └── migrations/    # SQL migrations for Supabase
└── docs/              # Documentation
```

## Tech Stack

| Layer | Web | Mobile |
|-------|-----|--------|
| Framework | Next.js 15 (App Router) | Expo SDK 52 |
| Language | TypeScript | TypeScript |
| Styling | Tailwind CSS v4 | React Native Paper |
| Auth | Supabase Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime | Supabase Realtime |
| Payments | Paystack API | Paystack API |
| File Storage | Supabase Storage | Supabase Storage |

## Features

1. **Auth & Profiles** - Email/password auth via Supabase, profile management
2. **Secure Messaging** - Real-time 1:1 and group chats via Supabase Realtime
3. **Feed / Posts** - Social feed with likes, comments
4. **Events + Ticketing** - Event management with registration and Paystack payments
5. **Mentorship System** - Mentor discovery, session booking
6. **Payments** - Paystack integration for events and mentorship

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase project
- Paystack account (optional)

### Setup

1. Clone and install:
```bash
cd BlackBook
npm install
```

2. Copy environment variables:
```bash
cp .env.example apps/web/.env.local
cp .env.example apps/mobile/.env
```

3. Set up Supabase:
   - Create a project at supabase.com
   - Run the migration in `supabase/migrations/00001_schema.sql`
   - Copy your URL and anon key to the `.env` files

4. Run the apps:
```bash
# Web app (http://localhost:3000)
npm run dev:web

# Mobile app
npm run dev:mobile
```

## Database Schema

The full schema is at `supabase/migrations/00001_schema.sql` and includes:

- `profiles` - User profiles (auto-created via trigger on auth.users)
- `posts` / `post_likes` / `comments` - Social feed
- `chats` / `chat_members` / `messages` - Real-time messaging
- `events` / `event_registrations` - Event management
- `mentor_profiles` / `mentorship_sessions` - Mentorship system
- `payments` - Payment records
- `notifications` - Push notifications

All tables have Row Level Security (RLS) enabled.
