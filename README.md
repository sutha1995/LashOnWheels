# Lash On Wheels

Mobile-first foundation for the Lash On Wheels on-demand beauty marketplace.

## Current scope

Phase 0 establishes the Expo SDK 57 + TypeScript app shell:

- Lash On Wheels branding and supplied logo.
- Customer, freelancer, and admin navigation entry points.
- Registration role selection with demo dashboard routing.
- Supabase client integration that stays in demo mode until public environment values are configured.
- ESLint, Prettier, and strict TypeScript checks.

## Run locally

```bash
npm install
cp .env.example .env
npm run start
```

Use `npm run web` for the quickest local preview, or `npm run android` with an Android device/emulator.

## Environment

Only publishable Supabase values belong in Expo:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Never commit `.env` or service-role keys. Database schema, authentication, RLS, booking, payment, and storage features will be added in later PRD phases.
