# Load Testing with K6

## Quick Start

### Install K6
```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Linux
wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
tar -xzf k6-v0.48.0-linux-amd64.tar.gz
sudo cp k6-v0.48.0-linux-amd64/k6 /usr/local/bin/
```

### Run Tests

#### Local Testing
```bash
# Basic load test
k6 run tests/load/k6-scenarios.js

# With custom target
k6 run -e BASE_URL=http://localhost:3000 tests/load/k6-scenarios.js

# Smoke test (quick validation)
k6 run --duration 30s --vus 1 tests/load/k6-scenarios.js

# Stress test (find breaking point)
k6 run tests/load/k6-scenarios.js --tag testType=stress
```

#### Production Testing
```bash
# Test staging environment
k6 run -e BASE_URL=https://staging.studentapartments.com tests/load/k6-scenarios.js

# Cloud run (K6 Cloud)
k6 cloud tests/load/k6-scenarios.js
```

## Performance Baselines

### Target Metrics
| Metric | Target | Critical |
|--------|--------|----------|
| P95 Response Time | < 500ms | < 1000ms |
| P99 Response Time | < 1000ms | < 2000ms |
| Error Rate | < 1% | < 5% |
| Throughput | > 100 req/s | > 50 req/s |

### Endpoint Benchmarks
- **Homepage** (`/`): < 500ms
- **Search API** (`/api/search`): < 1000ms  
- **Apartment Details** (`/api/apartments/:id`): < 800ms
- **Health Check** (`/api/health`): < 100ms

## Test Scenarios

### 1. Load Test (Default)
Simulates normal traffic patterns:
- 10 → 50 → 100 users over 5 minutes
- Tests sustained load capacity

### 2. Stress Test
Finds system breaking point:
- Ramps to 300+ concurrent users
- Identifies resource bottlenecks

### 3. Spike Test
Tests sudden traffic surges:
- Instant jump from 100 → 1000 users
- Validates auto-scaling

### 4. Soak Test
Long-duration stability:
- 50 users for 3+ hours
- Detects memory leaks

## CI/CD Integration

### GitHub Actions
```yaml
name: Load Testing
on:
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run K6
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/k6-scenarios.js
          flags: -e BASE_URL=${{ secrets.STAGING_URL }}
```

## Interpreting Results

### Good Results ✅
```
scenarios: (100.00%) 1 scenario, 100 max VUs
http_req_duration......: avg=245ms p(95)=450ms p(99)=890ms
http_req_failed........: 0.12% ✓ 12    ✗ 9988  
http_reqs..............: 10000 (166.67/s)
```

### Bad Results ❌
```
http_req_duration......: avg=3.2s p(95)=8.5s  p(99)=15s
http_req_failed........: 8.45% ✓ 845 ✗ 9155
http_reqs..............: 10000 (45.2/s)
```

## Troubleshooting

### High Response Times
1. Check database query performance
2. Enable Redis caching
3. Optimize N+1 queries
4. Scale horizontally

### High Error Rates
1. Check rate limiting settings
2. Review application logs
3. Monitor database connections
4. Check memory usage

### Low Throughput
1. Increase Vercel concurrency
2. Enable Edge caching
3. Optimize API routes
4. Use CDN for static assets

## Monitoring During Tests

```bash
# Watch server metrics
pm2 monit

# Monitor database
psql -c "SELECT * FROM pg_stat_activity;"

# Check Redis
redis-cli INFO stats

# Vercel logs
vercel logs --follow
```

## Best Practices

1. **Always test staging first** - Never load test production without warning
2. **Ramp gradually** - Sudden spikes can crash systems
3. **Set reasonable thresholds** - Based on actual capacity, not wishful thinking
4. **Run regularly** - Weekly or after major changes
5. **Compare results** - Track performance over time
6. **Test real scenarios** - Use actual user journeys

## Advanced Usage

### Custom Metrics
```javascript
import { Trend } from 'k6/metrics';
const searchLatency = new Trend('search_latency');

// Later in test
searchLatency.add(res.timings.duration);
```

### Data-Driven Tests
```javascript
import { SharedArray } from 'k6/data';
const apartments = new SharedArray('apartments', function() {
  return JSON.parse(open('./test-data.json')).apartments;
});
```

### Authentication
```javascript
const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
  email: 'test@example.com',
  password: 'TestPass123!',
});
const authToken = loginRes.json('token');
```
