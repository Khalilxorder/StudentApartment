# Student Apartments Platform - Development Roadmap

This repository contains the complete development roadmap for a **Student Apartments platform** targeting Budapest students (ELTE, BME, Corvinus). The platform uses a modern stack: **Next.js 14 (App Router + TypeScript)**, **Supabase (Postgres + Auth + Storage + RLS)**, **PostGIS**, **pgvector**, **Meilisearch**, **Stripe Connect**, and more.

## Project Overview

**Business Goals:**
- Market: Budapest students (ELTE, BME, Corvinus)
- Student journey: onboarding → shortlist → **Best for You** → compare → schedule → **reserve**
- Owner journey: **photo-first** 5-minute listing → verification → payouts
- Ranking: hybrid (constraints + personal fit + accessibility + trust/quality + market value + engagement) with **explanations** and **bandit exploration**

**Technical Stack:**
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- Backend: Supabase (Postgres + Auth + Storage), PostGIS, pgvector
- Search: Meilisearch + pgvector embeddings
- Payments: Stripe Connect Express
- Queues: BullMQ/Upstash
- Analytics: PostHog
- Email: Resend
- Maps: Mapbox
- AI: Google Gemini for analysis/scoring

## Development Issues

All development work is organized into 25 GitHub issues in `.github/issues/`. Each issue includes:

- **Clear acceptance criteria** with checkboxes
- **Dependencies** on other issues
- **Estimated effort** (Small/Medium/Large)
- **Labels** for categorization

### Issue Categories

- 🔴 **Critical** (1-4, 8-9, 14-15, 21, 25): Core functionality
- 🟡 **Backend** (1, 3-4, 6-13, 19-20, 22-24): Server-side services
- 🟢 **Frontend** (5, 9, 14-18, 20): User interface
- 🔵 **Infrastructure** (1-2, 6, 15, 21-23): DevOps and setup
- 🟠 **Quality** (10-11, 15, 21, 25): Security, testing, accessibility

### Recommended Implementation Order

1. **Foundation** (Issues 1-2): Database and configuration
2. **Core Services** (Issues 3-4): Search and ranking
3. **Owner Experience** (Issues 5, 7-8): Media pipeline and payments
4. **Student Experience** (Issues 6, 9, 14): Commute, messaging, onboarding
5. **Trust & Safety** (Issues 10-11): Moderation and security
6. **Enhancements** (Issues 12-13, 16-20): Analytics, notifications, i18n, admin
7. **Quality & Launch** (Issues 21-25): Testing, performance, go-live

## How to Use These Issues

1. **Start with Claude**: Use the system prompt and run issues in order
2. **Create GitHub Issues**: Copy these `.md` files to create actual GitHub issues
3. **Track Progress**: Use the acceptance criteria checkboxes
4. **Dependencies**: Complete prerequisite issues first
5. **Testing**: Each issue includes test requirements

## Current Status

- ✅ **Database**: PostGIS + pgvector foundation needed
- ✅ **Configuration**: Environment and build setup needed
- ✅ **Search**: Multi-layer search (structured + keyword + semantic) needed
- ✅ **Ranking**: Hybrid scoring with explanations needed
- ⏳ **Media Pipeline**: Photo-first owner flow needed
- ⏳ **Verification**: Stripe Connect onboarding needed
- ⏳ **Messaging**: Contact masking and scheduling needed

## Key Features to Implement

### For Students
- Personalized "Best for You" recommendations
- Compare up to 3 apartments side-by-side
- Saved searches with daily digests
- Secure messaging with viewing scheduling
- Reservation system with Stripe holds

### For Owners
- 5-minute photo-first listing creation
- Automated pricing suggestions
- Stripe Connect payouts
- Verification badges
- Analytics dashboard

### Platform Features
- Hybrid search (PostGIS + Meilisearch + pgvector)
- Bandit-based ranking optimization
- GDPR-compliant privacy center
- WCAG 2.2 AA accessibility
- Hungarian/English localization
- Admin moderation console

## Getting Started

1. Set up the development environment (Issue #2)
2. Initialize the database (Issue #1)
3. Implement core search and ranking (Issues #3-4)
4. Build owner and student flows (Issues #5, 8-9, 14)
5. Add quality assurance (Issues #10-11, 15, 21)
6. Prepare for launch (Issues #22, 25)

Each issue contains detailed implementation requirements and acceptance criteria to ensure production-quality code.