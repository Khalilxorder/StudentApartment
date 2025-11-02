# Embeddings Build Guide

**Purpose**: Generate semantic search embeddings for apartment listings  
**Technology**: Google Generative AI (Gemini 2.5 Flash)  
**Index Target**: Meilisearch  
**Estimated Time**: 5-15 minutes (depends on apartment count)

---

## 📋 Overview

### What Are Embeddings?

Embeddings convert apartment listing text into vector representations that enable:
- **Semantic search**: "cozy studio near campus" matches listings without exact text
- **Relevance ranking**: Better than keyword-only search
- **Multi-language support**: Similar meanings across languages match

### Build Process:
1. Fetch all active apartments from database
2. Generate embedding text (title + description + location + amenities)
3. Call Google Generative AI to create 768-dimensional vector
4. Store embeddings in database
5. Sync embeddings to Meilisearch index
6. Create search facets and filters

---

## 🔑 Prerequisites

### 1. Environment Variables
Ensure these are set in `.env.local` or Vercel:

```bash
# Google AI
GOOGLE_AI_API_KEY=AIza...                    # Gemini API key
GOOGLE_AI_MODEL=gemini-2.5-flash            # Model name

# Supabase
SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJh...           # Admin access

# Meilisearch
MEILISEARCH_HOST=http://localhost:7700      # Or production URL
MEILISEARCH_API_KEY=masterKey               # Admin key
```

### 2. Services Running
- **Database**: Supabase with `apartments` table populated
- **Meilisearch**: Instance accessible (local or production)
- **Google AI**: API quota available (100 requests/day free tier)

### 3. Verify Setup
```bash
# Check Google AI connection
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
model.generateContent('Test').then(() => console.log('✅ Google AI connected'));
"

# Check Meilisearch connection
curl http://localhost:7700/health
# Should return: {"status":"available"}
```

---

## ⚡ Quick Start: Build Embeddings

### Method 1: Local Execution (If Network Fixed)

```bash
# Navigate to project root
cd "c:\Users\Administrator\Desktop\All Student apartment files\SA-GitHub-Upload"

# Build embeddings for all apartments
pnpm build:embeddings

# Expected output:
# 🔍 Fetching apartments from database...
# 📊 Found 150 apartments to process
# 🤖 Generating embeddings via Google AI...
# ⏳ Processing batch 1/3 (50 apartments)...
# ✅ Batch 1 complete (2.3s)
# ⏳ Processing batch 2/3 (50 apartments)...
# ✅ Batch 2 complete (2.1s)
# ⏳ Processing batch 3/3 (50 apartments)...
# ✅ Batch 3 complete (2.4s)
# 💾 Storing embeddings in database...
# ✅ 150 embeddings stored successfully
# 🔄 Syncing to Meilisearch...
# ✅ Meilisearch index updated
# ✨ Build complete! (6.8s total)
```

### Method 2: Via Vercel CLI

```bash
# Pull production environment
vercel env pull .env.production

# Load environment and run
$env:NODE_ENV="production"
$env:GOOGLE_AI_API_KEY=(Get-Content .env.production | Select-String "GOOGLE_AI_API_KEY" | ForEach-Object { $_ -replace "GOOGLE_AI_API_KEY=","" })
$env:SUPABASE_URL=(Get-Content .env.production | Select-String "SUPABASE_URL" | ForEach-Object { $_ -replace "SUPABASE_URL=","" })
$env:SUPABASE_SERVICE_ROLE_KEY=(Get-Content .env.production | Select-String "SUPABASE_SERVICE_ROLE_KEY" | ForEach-Object { $_ -replace "SUPABASE_SERVICE_ROLE_KEY=","" })
$env:MEILISEARCH_HOST=(Get-Content .env.production | Select-String "MEILISEARCH_HOST" | ForEach-Object { $_ -replace "MEILISEARCH_HOST=","" })
$env:MEILISEARCH_API_KEY=(Get-Content .env.production | Select-String "MEILISEARCH_API_KEY" | ForEach-Object { $_ -replace "MEILISEARCH_API_KEY=","" })

pnpm build:embeddings
```

### Method 3: Via GitHub Actions

Create `.github/workflows/build-embeddings.yml`:

```yaml
name: Build Embeddings

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build embeddings
        env:
          GOOGLE_AI_API_KEY: ${{ secrets.GOOGLE_AI_API_KEY }}
          SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          MEILISEARCH_HOST: ${{ secrets.MEILISEARCH_HOST }}
          MEILISEARCH_API_KEY: ${{ secrets.MEILISEARCH_API_KEY }}
        run: |
          echo "Building embeddings..."
          pnpm build:embeddings
          echo "✅ Embeddings built successfully"
      
      - name: Report statistics
        run: |
          echo "Embedding build completed at $(date)"
          echo "Check Meilisearch dashboard for updated index"
```

---

## 📂 Script Breakdown: `scripts/build_embeddings.ts`

### Step 1: Fetch Apartments
```typescript
// Get all active, published apartments
const { data: apartments, error } = await supabase
  .from('apartments')
  .select('*')
  .eq('status', 'active')
  .eq('is_published', true);

console.log(`📊 Found ${apartments.length} apartments to process`);
```

### Step 2: Generate Embedding Text
```typescript
// Combine apartment data into searchable text
function buildEmbeddingText(apartment: Apartment): string {
  return [
    apartment.title,
    apartment.description,
    apartment.address,
    apartment.district,
    apartment.city,
    `${apartment.bedrooms} bedroom${apartment.bedrooms > 1 ? 's' : ''}`,
    `€${apartment.price}/month`,
    apartment.amenities.join(', '),
    apartment.nearby_universities?.map(u => u.name).join(', ')
  ].filter(Boolean).join(' | ');
}
```

### Step 3: Call Google AI (Batched)
```typescript
// Process in batches to avoid rate limits
const BATCH_SIZE = 50;
const batches = chunk(apartments, BATCH_SIZE);

for (const [index, batch] of batches.entries()) {
  console.log(`⏳ Processing batch ${index + 1}/${batches.length}...`);
  
  const embeddings = await Promise.all(
    batch.map(async (apt) => {
      const text = buildEmbeddingText(apt);
      const result = await model.embedContent(text);
      return {
        apartment_id: apt.id,
        embedding: result.embedding.values, // 768-dim vector
        text_content: text,
        model: 'gemini-2.5-flash'
      };
    })
  );
  
  // Store in database
  await supabase.from('apartment_embeddings').upsert(embeddings);
  
  console.log(`✅ Batch ${index + 1} complete`);
  
  // Rate limit: 100 requests/min
  await sleep(600); // 0.6s between batches
}
```

### Step 4: Sync to Meilisearch
```typescript
// Update Meilisearch index with embeddings
const meilisearch = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY!
});

const index = meilisearch.index('apartments');

// Add documents with embeddings
const documents = apartments.map((apt, i) => ({
  id: apt.id,
  title: apt.title,
  description: apt.description,
  price: apt.price,
  bedrooms: apt.bedrooms,
  district: apt.district,
  _vectors: embeddings[i].embedding, // Vector for semantic search
  // ... other fields
}));

await index.addDocuments(documents);

console.log('✅ Meilisearch index updated');
```

---

## 🔍 Verification

### 1. Check Database Embeddings
```sql
-- Count embeddings stored
SELECT COUNT(*) as embedding_count 
FROM apartment_embeddings;

-- Check recent embeddings
SELECT 
  apartment_id,
  created_at,
  model,
  LENGTH(embedding::text) as embedding_size
FROM apartment_embeddings
ORDER BY created_at DESC
LIMIT 10;

-- Should show: 768-dimensional vectors stored
```

### 2. Test Meilisearch Index
```bash
# Check index stats
curl http://localhost:7700/indexes/apartments/stats

# Should return:
# {
#   "numberOfDocuments": 150,
#   "isIndexing": false,
#   "fieldDistribution": { ... }
# }

# Test semantic search
curl -X POST 'http://localhost:7700/indexes/apartments/search' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "q": "cozy studio near university",
    "hybrid": { "semanticRatio": 0.7 },
    "limit": 5
  }'

# Should return relevant apartments with similarity scores
```

### 3. Test Search API
```bash
# Test via application API
curl -X POST 'http://localhost:3000/api/search' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "query": "quiet apartment for studying",
    "filters": {
      "max_price": 800,
      "bedrooms": 1
    }
  }'

# Should return apartments with semantic relevance
```

---

## 🔄 Incremental Updates

### Build Embeddings for New Apartments Only
```bash
# Run with --incremental flag
pnpm build:embeddings --incremental

# Only processes apartments without embeddings
# Much faster for ongoing maintenance
```

### Rebuild Stale Embeddings
```bash
# Rebuild embeddings older than 30 days
pnpm build:embeddings --stale-days=30

# Useful after model upgrades or data changes
```

### Full Rebuild (Caution)
```bash
# Delete all embeddings and rebuild
pnpm build:embeddings --force

# Warning: Takes 5-15 minutes for large datasets
# Use only when necessary (model change, data corruption)
```

---

## 📊 Performance Tuning

### Batch Size Optimization
```typescript
// config/embeddings.ts
export const EMBEDDING_CONFIG = {
  batchSize: 50,          // Apartments per batch
  rateLimitDelay: 600,    // ms between batches
  maxRetries: 3,          // Retry failed requests
  timeout: 30000          // Request timeout (ms)
};

// Adjust based on:
// - API quota (free tier: 100 req/day)
// - Network speed
// - Apartment count
```

### Caching Strategy
```typescript
// Enable LRU cache for repeated queries
import { LRUCache } from 'lru-cache';

const embeddingCache = new LRUCache<string, number[]>({
  max: 500,              // Cache 500 embeddings
  ttl: 1000 * 60 * 60    // 1 hour TTL
});

// Check cache before calling Google AI
const cached = embeddingCache.get(apartmentId);
if (cached) return cached;
```

### Parallel Processing
```typescript
// Process multiple batches in parallel (if quota allows)
const CONCURRENT_BATCHES = 3;

const results = await Promise.allSettled(
  batches.slice(0, CONCURRENT_BATCHES).map(processBatch)
);

// Increases throughput but uses quota faster
```

---

## 🚨 Troubleshooting

### Error: "Google AI quota exceeded"
**Cause**: Free tier limit (100 requests/day)  
**Solution**:
```bash
# Check quota usage
# https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

# Options:
# 1. Wait 24 hours for quota reset
# 2. Upgrade to paid tier
# 3. Use --incremental flag to reduce requests
```

### Error: "Meilisearch index not found"
**Cause**: Index not created yet  
**Solution**:
```bash
# Create index manually
curl -X POST 'http://localhost:7700/indexes' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "uid": "apartments",
    "primaryKey": "id"
  }'

# Then re-run build
pnpm build:embeddings
```

### Error: "Embedding dimension mismatch"
**Cause**: Model changed (different vector size)  
**Solution**:
```bash
# Full rebuild with new model
pnpm build:embeddings --force --model=gemini-2.5-flash

# Update Meilisearch settings to accept new dimension
```

### Error: "Database connection timeout"
**Cause**: Network issue or local Supabase blockage  
**Solution**: Use Vercel CLI or GitHub Actions (Methods 2 & 3)

---

## 📈 Monitoring & Maintenance

### Daily Health Check
```bash
# Check embedding freshness
psql $DATABASE_URL -c "
  SELECT 
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as fresh_count,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as stale_count,
    COUNT(*) as total_count
  FROM apartment_embeddings;
"
```

### Automated Sync (Production)
Set up GitHub Actions cron job to run daily:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
```

### Search Quality Metrics
```sql
-- Track search query performance
SELECT 
  query,
  AVG(result_count) as avg_results,
  AVG(click_through_rate) as avg_ctr
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query
ORDER BY avg_ctr DESC
LIMIT 20;
```

---

## ✅ Success Criteria

Mark embeddings build as complete when:

- [ ] Script runs without errors
- [ ] Database shows embeddings for all active apartments
- [ ] Meilisearch index contains all documents with `_vectors` field
- [ ] Test search returns semantically relevant results
- [ ] Search API endpoint responds with ranked results
- [ ] Embedding freshness < 24 hours
- [ ] No stale embeddings (>30 days old)

---

## 🔗 Related Resources

- Google AI Embeddings: https://ai.google.dev/docs/embeddings
- Meilisearch Hybrid Search: https://www.meilisearch.com/docs/learn/ai_powered_search/hybrid_search
- Semantic Search Guide: https://www.meilisearch.com/docs/learn/ai_powered_search/getting_started_with_ai_search

---

## 📋 Next Steps After Embeddings

1. **Test Search Quality**
   - Run sample queries via UI
   - Verify relevance ranking
   - Check facet filtering works

2. **Enable Ranking Feedback**
   - Start collecting user interactions
   - Run `pnpm ranking:recompute` weekly
   - Monitor Thompson Sampling convergence

3. **Set Up Monitoring**
   - Track embedding freshness
   - Alert on API quota nearing limit
   - Monitor search latency

4. **Schedule Maintenance**
   - Daily incremental builds (GitHub Actions)
   - Weekly full rebuilds (if needed)
   - Monthly stale cleanup

---

**Last Updated**: November 2, 2025  
**Status**: Ready for execution  
**Estimated Time**: 5-15 minutes  
**Recommended Method**: Vercel CLI (Method 2) or GitHub Actions (Method 3)  
**Next Step**: Run build, verify search works, enable user feedback
