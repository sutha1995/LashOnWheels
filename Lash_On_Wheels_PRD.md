# Lash On Wheels — Product Requirements Document (PRD)

**Product:** Lash On Wheels  
**Product Type:** On-demand beauty-service marketplace  
**Primary Market:** Malaysia  
**Initial Service:** Eyelash lifting / lash services  
**Future Expansion:** Other beauty services and independent beauty professionals

---

## 1. Product Vision

Lash On Wheels is a mobile marketplace connecting customers with independent beauty professionals who provide mobile, at-home beauty services.

Instead of customers travelling to a salon, they can:

> Choose a service → select a location → choose a freelancer → book → track the freelancer → receive the service → review the freelancer.

Freelancers can:

> Create a profile → list services → define availability → receive bookings → accept jobs → navigate to customers → complete jobs → receive earnings.

Version 1 should focus on lash services. The architecture should allow additional beauty categories to be added later.

---

## 2. User Types

### Customer

Customers can:

- Register/login
- Browse services
- Browse freelancers
- View freelancer profiles
- Select a location
- Check availability
- Book services
- Pay
- Track booking status
- Communicate with freelancers
- Cancel/reschedule according to policy
- Leave reviews

### Freelancer

Freelancers can:

- Register as a freelancer
- Create a professional profile
- Upload a portfolio
- Add services
- Set pricing
- Set service areas
- Set availability
- Receive booking requests
- Accept/reject bookings
- Navigate to customers
- Update booking status
- Track earnings
- View completed jobs
- Receive reviews

### Admin

Admins can:

- Manage users
- Manage freelancers
- Verify freelancers
- Manage services/categories
- Manage bookings
- Manage disputes
- Manage payments
- Manage reviews
- View platform analytics
- Suspend accounts

---

## 3. Recommended Technology

### Mobile

- React Native
- Expo
- TypeScript

Expo should be used for mobile development, location, notifications, camera/image uploads, and device permissions.

### Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions where appropriate

### Maps / Location

Use a suitable mapping SDK/API compatible with React Native and Expo.

### Payments

Use a payment abstraction layer. Mock payments initially. Do not implement a real payment gateway until the booking architecture is working.

### Development

- GitHub
- TypeScript
- ESLint
- Prettier
- Environment variables
- `.env.example`

---

## 4. Core User Journey

### Customer Journey

```text
Open App
   ↓
Login / Register
   ↓
Home
   ↓
Select Lash Service
   ↓
Browse Freelancers
   ↓
View Freelancer
   ↓
Select Date & Time
   ↓
Enter Service Location
   ↓
Review Booking
   ↓
Payment
   ↓
Booking Confirmed
   ↓
Freelancer Accepts
   ↓
Freelancer Travels
   ↓
Customer Tracks Status
   ↓
Service Completed
   ↓
Review
```

### Freelancer Journey

```text
Register
   ↓
Create Profile
   ↓
Verification
   ↓
Add Services
   ↓
Set Availability
   ↓
Receive Booking
   ↓
Accept
   ↓
Start Journey
   ↓
Arrive
   ↓
Start Service
   ↓
Complete Service
   ↓
Earnings Updated
```

---

# 5. PHASE 0 — Project Foundation

## Objective

Create a clean, scalable codebase before building features.

## Requirements

Devin should:

- Create React Native + Expo project.
- Use TypeScript.
- Configure Git.
- Configure ESLint and Prettier.
- Create development/staging environment structure.
- Create reusable component structure.
- Create navigation.
- Create environment-variable handling.
- Create Supabase project integration.
- Create a basic README.
- Create `.env.example`.

## Suggested structure

```text
lash-on-wheels/
│
├── app/
│   ├── (auth)/
│   ├── (customer)/
│   ├── (freelancer)/
│   └── (admin)/
│
├── components/
├── services/
├── hooks/
├── utils/
├── types/
├── constants/
├── lib/
├── assets/
└── tests/
```

## Definition of Done

The application:

- Builds successfully.
- Opens on Android.
- Navigation works.
- Supabase connection works.
- No secrets are committed to GitHub.

---

# 6. PHASE 1 — Authentication

## Customer Registration

Fields:

- Name
- Email
- Phone
- Password

## Freelancer Registration

Fields:

- Name
- Email
- Phone
- Password
- Profile photo

After registration:

```text
Customer → Customer Dashboard
Freelancer → Freelancer Onboarding
```

## Requirements

- Login
- Logout
- Password reset
- Session persistence
- Role-based routing

## Security

A customer must never be able to access freelancer-only data simply by manipulating the client application.

Use Supabase Row Level Security (RLS).

---

# 7. PHASE 2 — Freelancer Profiles

Freelancer profiles should include:

- Profile photo
- Name
- Bio
- Experience
- Services
- Pricing
- Rating
- Number of completed bookings
- Service area
- Portfolio
- Availability

Example:

```text
Sarah
⭐ 4.9 (27 reviews)

Lash Lift
RM80

Classic Lash Extension
RM120

Serves:
Rawang
Kuala Selangor

[View Portfolio]
[Book]
```

## Portfolio

Freelancers can upload:

- Before/after photos
- Service examples
- Work portfolio

Images should be stored in Supabase Storage.

---

# 8. PHASE 3 — Services

Create a service database rather than hardcoding services.

## Service Schema

```text
service_id
name
description
category
duration
base_price
active
```

Initial category:

**Lash Services**

Potential initial services:

- Lash Lift
- Lash Tint
- Classic Lash Extension
- Other lash services

Future categories may include:

```text
Lash
Brows
Nails
Hair
Makeup
Facial
```

The system should make adding new categories and services straightforward.

---

# 9. PHASE 4 — Freelancer Availability

Freelancers need control over their schedules.

Freelancers can define:

- Working days
- Start time
- End time
- Breaks
- Unavailable dates

Example:

```text
Monday
10:00 AM – 7:00 PM

Tuesday
10:00 AM – 7:00 PM

Wednesday
OFF
```

The booking system must prevent double bookings.

---

# 10. PHASE 5 — Location

The location system is a core part of the mobile-service concept.

## Customer

Customers can:

- Enter an address manually.
- Use current location.
- Select a location on a map.
- Add address notes.

Store:

```text
latitude
longitude
address
postcode
city
state
notes
```

## Freelancer

Freelancers can define:

- Service areas
- Maximum travel distance
- Travel fee

Example:

```text
Base service: RM80

Travel:
0–5 km = Free
5–10 km = RM5
10–20 km = RM10
>20 km = Not available
```

Do not automatically calculate complex travel fees until the basic booking flow works.

---

# 11. PHASE 6 — Search & Discovery

Customers should be able to search by:

- Service
- Location
- Date
- Time

Example:

> Lash Lift near Rawang, Saturday, 2 PM

Search results should show:

- Freelancer
- Rating
- Service
- Price
- Distance
- Availability

Sorting options:

- Recommended
- Distance
- Rating
- Price
- Availability

---

# 12. PHASE 7 — Booking System

This is the core booking engine.

## Booking States

```text
PENDING
   ↓
ACCEPTED
   ↓
EN_ROUTE
   ↓
ARRIVED
   ↓
IN_SERVICE
   ↓
COMPLETED
```

Alternative transitions:

```text
PENDING → REJECTED
PENDING → CANCELLED
ACCEPTED → CANCELLED
```

## Booking Schema

```text
booking_id
customer_id
freelancer_id
service_id
date
start_time
end_time
status
service_address
latitude
longitude
service_price
travel_fee
total_amount
payment_status
created_at
updated_at
```

## Critical Requirement

Never allow two confirmed bookings for the same freelancer at overlapping times.

This must be enforced server-side, not only through the UI.

---

# 13. PHASE 8 — Booking Confirmation

Customer sees:

```text
Lash Lift
Sarah

Saturday
2:00 PM

Service RM80
Travel RM5
----------------
Total RM85

Location:
[Address]

[Confirm Booking]
```

After confirmation:

> Booking request sent to Sarah.

Freelancer receives:

> New booking request.

---

# 14. PHASE 9 — Payment

For the first version:

Create a payment abstraction layer.

Do not hardcode a payment provider directly into every booking component.

Create:

```text
PaymentService
```

with methods such as:

```text
createPayment()
confirmPayment()
refundPayment()
getPaymentStatus()
```

Initially use:

```text
[Pay RM85]
       ↓
Payment Successful
```

Real payment integration can replace the mock service later.

---

# 15. PHASE 10 — Booking Tracking

## Customer

Customer sees:

```text
Booking Confirmed ✓

Sarah is on the way

[Map]

Status:
✓ Booking accepted
✓ On the way
○ Arrived
○ Service started
○ Completed
```

## Freelancer

Freelancer sees:

```text
[Start Journey]

       ↓

[I'm Here]

       ↓

[Start Service]

       ↓

[Complete Service]
```

## GPS

For V1, do not build Uber-level continuous tracking.

Use location only during an active journey. This is simpler and better from a privacy perspective.

---

# 16. PHASE 11 — Notifications

## Customer Notifications

- Booking request accepted
- Booking rejected
- Freelancer started journey
- Freelancer arrived
- Service completed
- Booking reminder
- Cancellation

## Freelancer Notifications

- New booking
- Booking cancelled
- Upcoming booking reminder
- Customer changed booking

---

# 17. PHASE 12 — Chat

Chat should become available only after a booking is confirmed.

Customer ↔ Freelancer

Initial features:

- Text messages
- Booking context
- Timestamp
- Read/unread status

Do not build image/video calling initially.

---

# 18. PHASE 13 — Reviews

After completion:

Customer can provide:

- Star rating
- Written review

Optional future functionality:

- Freelancer rates customer

Prevent:

- Reviews before completed bookings
- Multiple reviews for the same booking

---

# 19. PHASE 14 — Freelancer Earnings

Freelancer dashboard:

```text
Today's Earnings
RM120

This Week
RM580

This Month
RM1,850
```

Show:

- Completed jobs
- Gross earnings
- Platform fees
- Net earnings
- Pending payout

Initially, calculate earnings internally without actually transferring money.

---

# 20. PHASE 15 — Admin Dashboard

Build this after the customer and freelancer experiences work.

## Users

- Search users
- View accounts
- Suspend accounts

## Freelancers

- Verify
- Approve
- Reject
- Suspend

## Bookings

- Search bookings
- View status
- Resolve disputes

## Services

- Add
- Edit
- Disable

## Analytics

```text
Total Users
Total Freelancers
Total Bookings
Completed Bookings
Cancelled Bookings
GMV
Platform Revenue
```

---

# 21. PHASE 16 — Security

Security should be implemented throughout development, not left until the end.

## Authentication

- Secure authentication
- Session handling
- Password reset

## Database

Implement Supabase RLS policies.

Examples:

- Customer A cannot read Customer B's private bookings.
- Freelancer A cannot modify Freelancer B's profile.

## Storage

Portfolio images should not expose unnecessary private user information.

## Server-side Validation

Validate all sensitive operations on the server.

Never trust client-submitted prices.

The server should calculate:

```text
service price
+
travel fee
+
platform fee
=
total
```

---

# 22. PHASE 17 — Testing

Devin should create automated tests progressively.

## Unit Tests

Test:

- Price calculation
- Travel fee
- Availability
- Booking status
- Cancellation rules

## Integration Tests

Test:

```text
Customer books
      ↓
Freelancer receives
      ↓
Freelancer accepts
      ↓
Customer sees accepted
```

## Critical Test

Attempt to book the same freelancer at the same time.

Expected:

> Booking rejected because freelancer is unavailable.

---

# 23. PHASE 18 — Deployment

## Development

```text
Local
 ↓
GitHub
 ↓
Development environment
```

## Production

```text
GitHub
 ↓
Build
 ↓
Android
 ↓
Google Play
```

Eventually:

```text
iOS
 ↓
App Store
```

---

# 24. MVP — What Devin Should Build First

Do not attempt to build every feature at once.

## MVP V1

- Authentication
- Customer profile
- Freelancer profile
- Services
- Freelancer availability
- Customer location
- Search freelancers
- Booking
- Booking status
- Mock payment
- Basic notifications
- Basic GPS journey
- Reviews

This should demonstrate the complete customer-to-freelancer marketplace flow.

---

# 25. V2

After V1 works:

- Real payment gateway
- Real-time chat
- Push notifications
- Travel-fee calculation
- Better map experience
- Freelancer verification
- Earnings dashboard
- Cancellation/refund system
- Promo codes
- Customer favourites

---

# 26. V3

Future marketplace expansion:

- Multiple beauty categories
- AI freelancer recommendations
- AI customer recommendations
- Smart scheduling
- Dynamic pricing
- Loyalty system
- Subscription/membership
- Referral system
- Advanced analytics
- Automated marketing
- Freelancer performance analytics

---

# 27. AI Features — Future Phase

Do not build AI features before the core marketplace works.

Potential future AI features:

## Customer

Customer could describe what they want, for example:

> I want something natural for a wedding.

The system could recommend suitable services and freelancers.

## Freelancer

AI could help with:

- Profile descriptions
- Social-media content
- Pricing suggestions
- Customer-review analysis

## Platform

AI could eventually predict:

- Booking demand
- Freelancer availability
- Customer churn
- Recommended freelancers

These should be considered Phase 3+ features.

---

# 28. Important Development Instructions for Devin

> **IMPORTANT DEVELOPMENT INSTRUCTIONS**
>
> Do not attempt to build the entire application in one step.
>
> Build the application phase by phase.
>
> Before starting each phase:
>
> 1. Explain the implementation plan.
> 2. Identify files that will be created or modified.
> 3. Identify dependencies required.
> 4. Identify database changes.
> 5. Implement the phase.
> 6. Run tests/build checks.
> 7. Fix errors before moving to the next phase.
> 8. Do not break existing functionality.
>
> Never hardcode secrets, API keys, prices, user IDs, or production credentials.
>
> Use TypeScript throughout.
>
> Use reusable components rather than duplicating code.
>
> Use server-side validation for security-sensitive operations.
>
> Do not implement real payment processing until explicitly instructed.
>
> Do not implement background GPS tracking until explicitly instructed.
>
> Maintain a README documenting setup and architecture.
>
> When a requirement is ambiguous, explain the ambiguity and propose the safest implementation rather than silently making a major product decision.

---

# 29. Initial Devin Prompt

Use the following prompt to start the project:

> **I want you to act as the lead software engineer for my Lash On Wheels project.**
>
> I have provided the Product Requirements Document below.
>
> Do NOT start building the entire application immediately.
>
> First:
>
> 1. Analyse the PRD.
> 2. Identify technical dependencies.
> 3. Propose the architecture.
> 4. Propose the database schema.
> 5. Propose the folder structure.
> 6. Identify potential technical risks.
> 7. Break the implementation into development phases.
> 8. Identify which functionality should be mocked initially.
> 9. Identify which functionality should be implemented server-side.
> 10. Wait for approval before implementing Phase 0.
>
> The application must be designed for eventual production use, but we will build it incrementally.
>
> **Technology preference:**
> - React Native
> - Expo
> - TypeScript
> - Supabase
> - PostgreSQL
> - Map/location services compatible with Expo
>
> The first release should focus on lash services and the core customer-to-freelancer booking flow. The architecture must allow additional beauty categories to be added later.
