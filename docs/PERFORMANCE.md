# Performance Optimization Guide

## Database Indexes Applied

The following indexes have been created in `supabase/migrations/20241207_performance_indexes.sql`:

### Core Apartment Indexes
- `idx_apartments_district`: Fast lookup by district
- `idx_apartments_price`: Price range queries
- `idx_apartments_owner_id`: Owner's listings
- `idx_apartments_available`: Filter available apartments
- `idx_apartments_search`: Composite index for common search patterns
- `idx_apartments_title_search`: Full-text search on titles (GIN index)
- `idx_apartments_description_search`: Full-text search on descriptions (GIN index)

### To Apply
Run the migration:
```bash
npm run db:migrate
```

Or manually in Supabase SQL Editor:
```sql
-- Copy contents of supabase/migrations/20241207_performance_indexes.sql
```

---

## Query Optimization Best Practices

### 1. Use Selective Fields
❌ **Bad**:
```typescript
const { data } = await supabase.from('apartments').select('*');
```

✅ **Good**:
```typescript
const { data } = await supabase
  .from('apartments')
  .select('id, title, price_huf, district');
```

### 2. Paginate Results
Always limit results:
```typescript
const PAGE_SIZE = 20;
const { data } = await supabase
  .from('apartments')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### 3. Use Indexes in WHERE Clauses
The following queries are optimized:
```typescript
// Uses idx_apartments_district
.eq('district', 'District V')

// Uses idx_apartments_price
.gte('price_huf', 100000).lte('price_huf', 200000)

// Uses idx_apartments_search (composite)
.eq('is_available', true)
.eq('district', 'District VII')
.gte('price_huf', 120000)
```

### 4. Full-Text Search
Use `textSearch` for title/description:
```typescript
const { data } = await supabase
  .from('apartments')
  .select('*')
  .textSearch('title', 'modern apartment');
```

---

## Caching Strategy

### In-Memory Cache (Server-Side)
Use `CacheHelper` from `lib/database-optimizations.ts`:

```typescript
import { CacheHelper } from '@/lib/database-optimizations';

// Try cache first
let districts = CacheHelper.get('districts');
if (!districts) {
  districts = await fetchDistricts();
  CacheHelper.set('districts', districts, 3600); // 1 hour TTL
}
```

### API Route Caching
Add cache headers:
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },
});
```

### Client-Side Caching
Use React Query (already configured):
```typescript
const { data } = useQuery({
  queryKey: ['apartments', filters],
  queryFn: () => fetchApartments(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## Performance Monitoring

### 1. Slow Query Detection
Monitor Supabase dashboard:
- Database → Performance → Slow Queries

### 2. API Response Times
Check `/api/health` for latency:
```bash
curl https://your-domain.com/api/health
```

### 3. Frontend Performance
Run Lighthouse audit:
```bash
npm run performance:audit
```

---

## Connection Pooling

Supabase handles this automatically, but we optimize client usage:

### Server-Side (API Routes)
Use singleton pattern from `lib/database-optimizations.ts`:
```typescript
import { getSupabaseServer } from '@/lib/database-optimizations';

const supabase = getSupabaseServer(); // Reuses connection
```

### Client-Side
Use `@supabase/ssr` for automatic session management (already configured).

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 500ms | Check `/api/health` |
| Database Query Time | < 100ms | Check Supabase dashboard |
| Page Load Time (LCP) | < 2.5s | Run Lighthouse |
| First Input Delay (FID) | < 100ms | Run Lighthouse |

---

## Next Steps

1. **Apply indexes**: Run `npm run db:migrate`
2. **Monitor**: Check Supabase slow query log weekly
3. **Optimize**: Identify and refactor N+1 queries
4. **Scale**: Consider read replicas when traffic > 10k DAU
