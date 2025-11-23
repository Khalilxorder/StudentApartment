# System Architecture

High-level overview of the Student Apartment website architecture, data flows, and service interactions.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│                                                                     │
│  Browser / Mobile App (React + Next.js)                            │
│  ├─ Pages: Home, Search, Dashboard, Admin                          │
│  ├─ Components: ApartmentCard, SearchFilter, ChatPanel            │
│  └─ State Management: TanStack Query (React Query)                 │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTPS / WebSocket
┌────────────────────▼────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                              │
│                                                                     │
│  Next.js Edge Runtime + Middleware                                  │
│  ├─ Rate Limiting (Redis or in-memory)                             │
│  ├─ CSRF Protection                                                 │
│  ├─ Request Validation & Sanitization                              │
│  ├─ Security Headers                                                │
│  └─ Session Verification (NextAuth + Supabase)                     │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────┐
        │            │            │             │
    Next.js      Auth          Payment      Search
    API Routes   Service       Service      Service
        │            │            │             │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────┐ ┌──▼───────────┐
│ Route        │ │ Supabase │ │ Stripe  │ │ Meilisearch  │
│ Handlers     │ │ Auth     │ │         │ │              │
│              │ │          │ │         │ │ + Semantic   │
│ ├ /api/*     │ └──────────┘ └─────────┘ │   Search     │
│ ├ /apartments│                          │  (Optional)  │
│ ├ /search    │                          └──────────────┘
│ ├ /messages  │
│ ├ /payments  │
│ └ /admin     │
└──────┬───────┘
       │
       └────────────────────┬────────────────────────────┐
                            │                            │
         ┌──────────────────▼───────────┐   ┌───────────▼────────┐
         │     DATABASE LAYER            │   │   CACHE LAYER      │
         │                               │   │                    │
         │  Supabase PostgreSQL          │   │  Redis             │
         │  (Cloud Database)             │   │  (Optional)        │
         │                               │   │                    │
         │  Tables:                      │   │  Stores:           │
         │  ├─ profiles                 │   │  ├─ Rate limits    │
         │  ├─ apartments               │   │  ├─ CSRF tokens    │
         │  ├─ reviews                  │   │  ├─ Session data   │
         │  ├─ messages                 │   │  ├─ Search cache   │
         │  ├─ payments                 │   │  └─ AI responses   │
         │  ├─ saved_searches           │   │                    │
         │  └─ audit_logs               │   └────────────────────┘
         │                               │
         │  Features:                    │
         │  ├─ RLS Policies             │
         │  ├─ Real-time subscriptions  │
         │  └─ Automatic backups        │
         │                               │
         └───────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES LAYER                           │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Google       │  │ Stripe       │  │ Resend       │             │
│  │ Services     │  │ Payments     │  │ Email        │             │
│  │              │  │              │  │              │             │
│  │ ├─ OAuth     │  │ ├─ Payments  │  │ ├─ Signup    │             │
│  │ ├─ Gemini AI │  │ ├─ Webhooks  │  │ ├─ Digest    │             │
│  │ ├─ Maps      │  │ ├─ Connect   │  │ └─ Alerts    │             │
│  │ └─ Places    │  │ └─ Dashboard │  └──────────────┘             │
│  └──────────────┘  └──────────────┘                               │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Sentry       │  │ PostHog      │  │ Upstash      │             │
│  │ Monitoring   │  │ Analytics    │  │ Redis        │             │
│  │              │  │              │  │ (Optional)   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Examples

### User Signup Flow

```
1. User enters email/password on /signup
2. Frontend calls POST /api/auth/signup
3. Middleware validates CSRF token + rate limit
4. Route handler validates input (email format, password strength)
5. Supabase Auth creates user + sends confirmation email
6. Profile record auto-created via Supabase trigger
7. NextAuth session generated
8. User redirected to /onboarding
```

### Apartment Search Flow

```
1. User enters search criteria (location, price, bedrooms)
2. Frontend calls POST /api/search with query
3. Middleware validates rate limit
4. Backend queries Meilisearch with filters
5. If Meilisearch unavailable, fallback to database query
6. Results paginated (20 per page)
7. Cached in Redis for 1 hour
8. Response returned with metadata (total count, facets)
```

### Payment Processing Flow

```
1. User clicks "Book Listing" or "Buy Premium"
2. Frontend calls POST /api/payments/create-intent
3. Backend creates Stripe PaymentIntent
4. Client-side Stripe.js confirms payment
5. Stripe webhook calls POST /api/webhooks/stripe
6. Backend validates webhook signature
7. Payment record created in database
8. Associated resource (booking/subscription) created
9. Confirmation email sent via Resend
```

### Message Sending Flow

```
1. Student sends message to owner on /messages
2. Frontend calls POST /api/messages
3. Middleware validates rate limit (prevent spam)
4. Backend creates message record in database
5. Supabase real-time publishes to owner's channel
6. Owner receives notification in-app (WebSocket)
7. Backend queues email notification via Resend
8. Owner sees new message count in sidebar
```

---

## Service Dependencies

### Critical Path (Must Work)

- Supabase Database (apartments, users, bookings)
- Supabase Auth (user sessions, OAuth)
- NextAuth (session management)

### Important (Should Work)

- Stripe (payments, but can disable for non-premium features)
- Google OAuth (login, but fallback to email available)
- Meilisearch (search, but falls back to database)

### Optional (Nice to Have)

- Redis (caching + rate limiting; defaults to in-memory)
- Resend (email; can log to console in dev)
- Google Gemini (AI insights; returns mock data if unavailable)
- Sentry (monitoring; app works without it)

---

## Deployment Topology

### Local Development

```
Developer Machine
├─ Next.js Dev Server (http://localhost:3000)
├─ Supabase Local (Docker - optional)
├─ Redis (optional)
└─ Meilisearch (optional)
```

### Staging (Vercel Preview)

```
GitHub PR → Vercel Preview Deployment
├─ Auto-deployed for each PR
├─ Connects to staging database
├─ Test API keys in sandbox mode
└─ Auto-destroyed when PR closed
```

### Production (Vercel)

```
GitHub main branch → Vercel Production
├─ Auto-deployed on push to main
├─ Connects to production database (Supabase)
├─ Uses live API keys (Stripe, Google)
├─ Global CDN (Vercel Edge Network)
├─ Automatic scaling
└─ Automatic SSL/TLS
```

### Alternative: Self-Hosted (Docker)

```
Your Infrastructure (AWS, DigitalOcean, etc.)
├─ Docker Container (Next.js app)
├─ PostgreSQL (Supabase or standalone)
├─ Redis (caching)
├─ Meilisearch (search)
└─ Reverse Proxy (Nginx/Caddy for SSL)
```

---

## Database Schema Overview

### Key Tables

**`profiles`**
- Stores user metadata (role, preferences, avatar)
- Linked to Supabase auth.users via user_id
- RLS policy: Users see own + owner listings

**`apartments`**
- Main listing data (title, price, location, etc.)
- Linked to owner via user_id
- Indexed on: location, price, created_at

**`reviews`**
- User ratings + comments for apartments
- Linked to apartments + reviewers
- Indexed on: apartment_id, created_at

**`messages`**
- DM between users
- Real-time subscription for live chat
- Indexed on: sender_id, recipient_id

**`payments`**
- Stripe transaction records
- Linked to user + apartment/subscription
- Indexed on: user_id, status, created_at

**`saved_searches`**
- User-defined search filters (for alerts)
- Criteria stored as JSON
- Background job checks for new matches daily

---

## Scalability Considerations

### Current Limits

- **Database**: Supabase free tier = 500 MB, tested up to ~100k records
- **API Rate**: 100 requests/15 min per IP
- **Concurrent Users**: 50-100 (single Vercel instance)
- **Search**: Meilisearch local = 1M apartments

### Scaling Beyond Limits

| Bottleneck | Solution |
|-----------|----------|
| Database growth | Upgrade Supabase plan or shard data |
| High traffic | Upgrade Vercel plan + enable ISR |
| Search latency | Meilisearch Cloud or multi-shard |
| Rate limit abuse | Increase limits or use Redis Cluster |
| Memory usage | Implement pagination + lazy loading |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Next.js 14 | UI + SSR |
| Backend | Node.js + TypeScript | API routes |
| Database | PostgreSQL (Supabase) | Data storage |
| Auth | Supabase Auth + NextAuth | Session management |
| Payments | Stripe API | Payment processing |
| Search | Meilisearch | Full-text search |
| Cache | Redis | Session + rate limit store |
| AI | Google Gemini | Apartment insights |
| Email | Resend | Transactional emails |
| Monitoring | Sentry + Vercel Logs | Error tracking |
| CDN | Vercel Edge Network | Global distribution |

---

## Security Architecture

### Authentication Flow

```
User → OAuth/Email → Supabase Auth → JWT Token
            ↓
      NextAuth Session → Cookies → Middleware Verification
            ↓
      Route Handler → RLS Policy → Database Access
```

### Data Protection

- At rest: PostgreSQL encryption (Supabase)
- In transit: HTTPS/TLS
- Sensitive fields: Optional app-level encryption

### Abuse Prevention

- Rate limiting: Redis-backed (100 req/15 min)
- CSRF tokens: One-time use, 1-hour expiry
- Input validation: Regex patterns for all POST/PUT
- Suspicious activity logging: Via Sentry

---

## Performance Optimization

### Caching Strategy

- **Static Pages**: ISR (Incremental Static Regeneration) - revalidate every 1 hour
- **API Responses**: Cache-Control headers - 5 min for listings, 1 hour for search
- **Database Queries**: Supabase query optimization + indexes
- **Frontend**: React Query for client-side caching

### Content Delivery

- Images: Optimized via Next.js Image component + CDN
- Fonts: Google Fonts (CDN-hosted)
- Assets: Vercel Edge Network (global)

### Monitoring

- Lighthouse: Target 90+ score
- Core Web Vitals: <2.5s LCP, <100ms FID
- Database: Query performance monitoring via Supabase

---

**Questions?** See the operation guides or deployment documentation.
