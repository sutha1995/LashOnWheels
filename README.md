# Lash On Wheels

Mobile-first foundation for the Lash On Wheels on-demand beauty marketplace.

## Current scope

Phase 1 adds the first Supabase-backed account flow:
Phase 0 establishes the Expo SDK 57 + TypeScript app shell:

- Lash On Wheels branding and supplied logo.
- Customer, freelancer, and admin navigation entry points.
- Registration role selection with demo dashboard routing.
- Supabase client integration that stays in demo mode until public environment values are configured.
- Email/password registration and sign-in with customer/freelancer profile roles.
- Session restoration, authenticated routing, and a versioned `profiles` migration with RLS.
- Freelancer sign-up requests are recorded separately from the access role until onboarding approval.
- Freelancer applicants can save a professional profile, service area, and travel settings as the first Phase 2 onboarding step.
- Freelancers can select catalog services and save their own prices, durations, and descriptions.
- Freelancers can set weekly availability with per-day working hours.
- Customers can browse active freelancer services and request bookings inside published availability.
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

Never commit `.env` or service-role keys. Apply all SQL files in `supabase/migrations` through the Supabase CLI or SQL editor before using real accounts.

## Google sign-in setup

The auth screen includes a Supabase Google OAuth action when the public Supabase values are configured.

1. In Supabase, open **Authentication → Providers → Google**, enable it, and copy the provider callback URL.
2. In Google Cloud Console, create or select an OAuth client and add the copied Supabase URL (`https://<project-ref>.supabase.co/auth/v1/callback`) as an authorized redirect URI.
3. Add the Google client ID and secret to the Supabase Google provider.
4. In Supabase **Authentication → URL Configuration**, add the app redirect URL. For local web development, use the URL Expo prints when the app starts.

The app uses the `lashonwheels://auth/callback` scheme for native OAuth sessions.
Never commit `.env` or service-role keys. Apply the freelancer profile, service catalog, availability, and booking migrations before using these flows with real accounts. Payment, portfolio storage, and location features will be added in later PRD phases.
