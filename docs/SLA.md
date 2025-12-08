# Service Level Agreement (SLA)

Last Updated: December 7, 2024

---

## 1. Uptime Commitment

### 1.1 Availability Guarantees

| Plan | Monthly Uptime SLA | Maximum Downtime | Credits |
|------|-------------------|------------------|---------|
| **Free** | Best Effort | N/A | None |
| **Pro** | 99.5% | 3.6 hours | 10% monthly fee |
| **Enterprise** | 99.9% | 43 minutes | Tiered credits |

### 1.2 Uptime Calculation

Uptime = (Total Minutes - Downtime) / Total Minutes × 100

**Excluded from Downtime**:
- Scheduled maintenance (with 7 days notice)
- Emergency security patches
- Issues caused by third-party services (AWS, Supabase, Stripe)
- User misconfigurations or abuse
- Force majeure events

---

## 2. Support Response Times

### 2.1 Support Tiers

| Plan | Channels | Business Hours | Response Time | Resolution Target |
|------|----------|----------------|---------------|-------------------|
| **Free** | Community | N/A | Best effort | N/A |
| **Pro** | Email, Chat | 9am-6pm CET, Mon-Fri | 4 hours | 24 hours |
| **Enterprise** | Phone, Email, Chat, Dedicated Slack | 24/7 | 1 hour | 4 hours |

### 2.2 Severity Levels

**Critical (P0)**:
- Service completely unavailable
- Data loss or corruption
- Security breach
- Response: Enterprise 1hr, Pro 2hr

**High (P1)**:
- Major feature unavailable
- Significant performance degradation
- Response: Enterprise 2hr, Pro 4hr

**Medium (P2)**:
- Minor feature degradation
- Non-critical bugs
- Response: Enterprise 4hr, Pro 8hr

**Low (P3)**:
- Feature requests
- Documentation questions
- Response: Enterprise 1 business day, Pro 2 business days

---

## 3. Performance Commitments

### 3.1 API Response Times (p95)

| Endpoint Type | Target | Enterprise SLA |
|--------------|--------|----------------|
| Search API | < 500ms | < 300ms |
| Read Operations | < 200ms | < 100ms |
| Write Operations | < 300ms | < 200ms |
| AI Features | < 2s | < 1s |

### 3.2 Database Performance

- Query response time (p95): < 100ms
- Connection pool availability: > 99.9%
- Backup frequency: Every 6 hours
- Point-in-time recovery: Up to 30 days

---

## 4. Credits for SLA Violations

### 4.1 Uptime Credits (Enterprise)

| Uptime Achieved | Credit |
|----------------|--------|
| < 99.9% but ≥ 99.0% | 10% monthly fee |
| < 99.0% but ≥ 95.0% | 25% monthly fee |
| < 95.0% | 50% monthly fee |

### 4.2 Uptime Credits (Pro)

| Uptime Achieved | Credit |
|----------------|--------|
| < 99.5% but ≥ 99.0% | 10% monthly fee |
| < 99.0% | 25% monthly fee |

### 4.3 How to Request Credits

1. Submit claim within 30 days of incident
2. Include dates, times, and impact description
3. Credits applied to next billing cycle
4. Maximum credit: 50% monthly fee

---

## 5. Enterprise Features

### 5.1 Included Services

**99.9% Uptime SLA**:
- Multi-region deployment
- Automatic failover
- Load balancing

**24/7 Support**:
- Direct phone support
- Priority ticket queue
- Dedicated Slack channel

**Account Management**:
- Dedicated customer success manager
- Quarterly business reviews
- Custom onboarding

**Advanced Security**:
- SOC 2 Type II compliance
- Custom data retention policies
- Audit log exports
- SSO integration (SAML/OIDC)

### 5.2 Optional Add-Ons

- **Premium Support**: $500/month - 30-minute response time
- **Dedicated Infrastructure**: Custom pricing - Isolated tenant
- **Custom Integration**: Professional services available

---

## 6. Maintenance Windows

### 6.1 Scheduled Maintenance

- **Frequency**: Monthly
- **Duration**: Maximum 2 hours
- **Notice**: 7 days advance email
- **Window**: Sundays 2am-4am CET
- **Excluded from downtime**: Yes

### 6.2 Emergency Maintenance

- **Notice**: Best effort (minimum 1 hour)
- **Excluded from downtime**: Security patches only
- **Communication**: Status page + email

---

## 7. Data Protection

### 7.1 Backup SLA

- **RPO (Recovery Point Objective)**: 6 hours
- **RTO (Recovery Time Objective)**: 4 hours (Enterprise), 24 hours (Pro)
- **Backup Retention**: 30 days
- **Backup Location**: Multiple regions

### 7.2 Disaster Recovery

**Enterprise Plan**:
- Hot standby in secondary region
- Automatic failover
- < 15 minute recovery time

**Pro Plan**:
- Daily snapshots
- Manual failover available
- < 4 hour recovery time

---

## 8 Service Monitoring

### 8.1 Status Page

Public status page: `status.studentapartments.com`

Real-time monitoring of:
- API availability
- Database performance
- Search functionality
- Payment processing

### 8.2 Incident Communication

- **Status Updates**: Every 30 minutes during outages
- **Postmortem**: Within 5 business days
- **Channels**: Email, status page, Slack (Enterprise)

---

## 9. Limitations and Exclusions

### 9.1 Not Covered by SLA

- Beta features (marked as "beta")
- Third-party service outages
- Scheduled maintenance
- User-caused issues
- DDoS attacks (beyond our mitigation)
- Natural disasters

### 9.2 Rate Limits

| Plan | API Requests/minute | Burst Limit |
|------|-------------------|-------------|
| Free | 100 | 200 |
| Pro | 1,000 | 2,000 |
| Enterprise | 10,000 | 20,000 |

Exceeding limits may result in 429 responses (not counted as downtime).

---

## 10. Contact Information

**Support Email**: support@studentapartments.com
**Enterprise Support**: enterprise@studentapartments.com
**Phone** (Enterprise): +36-XX-XXX-XXXX
**Status Page**: status.studentapartments.com

**Business Hours**: Monday-Friday, 9am-6pm CET
**Emergency Hotline** (Enterprise 24/7): Available in customer portal

---

## 11. Legal

This SLA is part of your subscription agreement. In case of conflict between this SLA and the subscription agreement, the subscription agreement prevails.

**Effective Date**: Upon subscription activation
**Modifications**: 30 days notice for material changes
**Governing Law**: Hungary

---

*This SLA applies to subscriptions starting December 7, 2024 and may be updated with reasonable notice.*
