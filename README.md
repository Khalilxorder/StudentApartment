# 🏢 Student Apartments - AI-Powered Housing Marketplace

A Next.js 14 student housing marketplace platform with AI-powered search, semantic ranking, integrated payments, and comprehensive trust & safety features.

## 🌟 Key Features

### For Students
- **AI-Powered Search**: Semantic search using Google Gemini with natural language queries
- **Smart Recommendations**: Thompson Sampling ranking algorithm learns from user behavior
- **Commute Analysis**: Integrated transit time calculations to universities
- **Verified Listings**: Owner verification and fraud detection
- **Secure Messaging**: Contact masking with rate limiting
- **Booking Management**: View bookings, schedule viewings, manage favorites

### For Property Owners
- **Easy Listing Creation**: Upload up to 20 photos with automatic optimization
- **Stripe Connect Integration**: Automated payouts with KYC verification
- **Analytics Dashboard**: View listing performance and booking stats
- **Messaging System**: Communicate with prospective tenants
- **Verification System**: Photo ID and address verification

### For Administrators
- **Moderation Dashboard**: Review flagged listings and users
- **Fraud Detection**: Duplicate address detection, unusual pricing alerts
- **Analytics**: Platform-wide metrics and user behavior insights
- **Trust & Safety**: Comprehensive audit logs and review system

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2.33 (App Router)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Shadcn UI components
- **Forms**: React Hook Form + Zod validation
- **State**: React Context + Zustand (where needed)

### Backend
- **Database**: Supabase PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (Email/Password, OAuth)
- **Storage**: Supabase Storage (images)
- **Edge Functions**: Supabase Edge Functions
- **API Routes**: Next.js API Routes

### Search & AI
- **Search Engine**: Meilisearch (hybrid search + facets)
- **Embeddings**: Google Generative AI (Gemini)
- **Semantic Search**: Vector similarity with structured filters
- **Ranking**: Thompson Sampling (multi-armed bandit)

### Payments
- **Payment Provider**: Stripe
- **Integration**: Stripe Connect Express (for owner payouts)
- **Webhooks**: Automated payment event handling

### DevOps & Monitoring
- **Deployment**: Vercel
- **Error Tracking**: Sentry
- **Analytics**: PostHog
- **CI/CD**: GitHub Actions
- **Testing**: Vitest + Playwright

## 📦 Installation

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL (via Supabase)
- Meilisearch instance
- Stripe account (for payments)
- Google AI API key (for Gemini)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/student-apartments.git
cd student-apartments
```

2. **Install dependencies**
```bash
npm install
# or
pnpm install
# or
bun install
```

3. **Set up environment variables**

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Then fill in your credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_postgres_connection_string

# Google AI (Gemini)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_master_key

# Optional: Analytics & Monitoring
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

4. **Set up the database**

Run the database migration in Supabase SQL Editor:
```bash
# The migration file is in: db/migrations/
# Copy contents of RUN_THIS_FORCE_CLEAN_MIGRATION.sql
# Paste into Supabase SQL Editor and execute
```

5. **Seed the database (optional)**
```bash
npm run seed
# or
npm run seed:realistic  # for production-like data
```

6. **Build embeddings for semantic search**
```bash
npm run build:embeddings
```

7. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment

### Deploy to Vercel

1. **Connect your GitHub repository** to Vercel

2. **Set environment variables** in Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Add all variables from `.env.local`

3. **Deploy**:
```bash
vercel --prod
```

### Post-Deployment

1. **Verify build**: Check Vercel deployment logs
2. **Test authentication**: Try signup/login
3. **Test search**: Perform apartment search
4. **Test uploads**: Upload apartment photos
5. **Monitor**: Check Sentry for errors

## 📁 Project Structure

```
student-apartments/
├── app/                    # Next.js App Router pages
│   ├── (app)/             # Student dashboard routes
│   ├── (owner)/           # Owner dashboard routes
│   ├── (admin)/           # Admin console routes
│   └── api/               # API routes (60+ endpoints)
├── components/            # React components (40+)
│   ├── ui/               # Shadcn UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                   # Shared utilities
│   ├── supabase/         # Supabase clients
│   ├── stripe/           # Stripe integration
│   ├── validation/       # Zod schemas
│   └── security/         # Security utilities
├── services/              # Business logic (18 services)
│   ├── search-svc/       # Search & ranking
│   ├── payments-svc/     # Payment processing
│   ├── media-svc/        # Image processing
│   ├── messaging-svc/    # Messaging system
│   └── moderation-svc/   # Content moderation
├── types/                 # TypeScript type definitions
├── utils/                 # Helper utilities
├── hooks/                 # Custom React hooks
├── scripts/               # Data pipelines & migrations
├── db/migrations/         # Database migrations
├── tests/                 # Unit tests (Vitest)
├── e2e/                   # E2E tests (Playwright)
└── public/               # Static assets
```

## 🧪 Testing

### Unit Tests
```bash
npm run test          # Run tests
npm run test:ui       # Vitest UI
npm run test:ci       # CI mode
```

### E2E Tests
```bash
npm run e2e           # Run Playwright tests
npm run e2e:ui        # Playwright UI mode
```

### Type Checking
```bash
npm run type-check    # TypeScript check
```

### Linting
```bash
npm run lint          # ESLint
```

## 📊 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run seed` | Seed database with test data |
| `npm run seed:realistic` | Seed with production-like data |
| `npm run build:embeddings` | Build semantic search embeddings |
| `npm run sync:meilisearch` | Sync Meilisearch index |
| `npm run ranking:recompute` | Recompute ranking weights |
| `npm run test` | Run unit tests |
| `npm run e2e` | Run E2E tests |

## 🔐 Security

### Authentication
- Email/password authentication via Supabase Auth
- Google OAuth support (optional)
- Session management with secure cookies
- PKCE flow for OAuth

### Authorization
- Row Level Security (RLS) policies on all tables
- Role-based access control (student, owner, admin)
- API route protection with middleware

### Data Protection
- Environment variables for sensitive data
- Rate limiting on API routes
- CSRF protection
- Input validation with Zod
- SQL injection prevention (Supabase)

### Monitoring
- Sentry error tracking
- PostHog analytics (privacy-focused)
- Audit logs for sensitive operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Stripe](https://stripe.com/) - Payment processing
- [Google AI](https://ai.google.dev/) - Gemini AI models
- [Meilisearch](https://www.meilisearch.com/) - Search engine
- [Vercel](https://vercel.com/) - Deployment platform
- [Shadcn UI](https://ui.shadcn.com/) - UI components

## 📞 Support

For support, email support@studentapartments.com or join our Slack channel.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Advanced filtering (price predictions)
- [ ] Virtual tours (360° photos)
- [ ] Roommate matching
- [ ] Credit check integration
- [ ] Lease signing (DocuSign)
- [ ] Maintenance request system

---

**Built with ❤️ for students seeking their perfect home**
