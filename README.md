# Student Apartments Budapest

An AI-powered platform connecting students with verified landlords in Budapest. Features intelligent search, roommate finding, and secure lease management.

## 🚀 Features

- **AI Search Agent**: Natural language search for apartments (e.g., "cheap flat near BME with a balcony").
- **Verified Landlords**: Strict verification process for apartment owners.
- **Enterprise Security**: MFA, Rate Limiting, and Secure Headers.
- **Internationalization**: Full English and Hungarian support.
- **Performance**: Redis caching and database optimization.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Caching**: Redis (Upstash or local)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet / Google Maps API
- **Monitoring**: Sentry

## 📦 Prerequisites

- Node.js 20+
- npm or yarn
- Supabase Project
- Redis Instance (optional for dev)

## 🏃‍♂️ Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Khalilxorder/StudentApartment.git
    cd StudentApartment
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env.local` file:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    REDIS_URL=redis://localhost:6379
    NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## 🧪 Testing

- **Unit Tests**: `npm run test`
- **Linting**: `npm run lint`
- **Type Check**: `tsc --noEmit`

## 🚀 Deployment

### Vercel (Recommended)
1.  Push to GitHub.
2.  Import project in Vercel.
3.  Add Environment Variables.
4.  Deploy.

### Docker
```bash
docker build -t student-apartments .
docker run -p 3000:3000 student-apartments
```

## 🔐 Security
- **MFA**: Enabled for user settings.
- **Compliance**: GDPR specific data export/deletion available in profile.
