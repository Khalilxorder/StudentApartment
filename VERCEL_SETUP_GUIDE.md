# 🎯 VERCEL ENVIRONMENT VARIABLES SETUP GUIDE

## 📍 WHERE TO GO
https://vercel.com/dashboard → StudentApartment → Settings → Environment Variables

---

## 📋 ALL 9 VARIABLES YOU NEED TO ADD (Production Only)

### **STEP 1: Basic Supabase Auth**

#### Variable 1: `SUPABASE_SERVICE_ROLE_KEY`
**What it is:** Service role key for server-side access
**Value:** Same as GitHub Secret `SUPABASE_SERVICE_ROLE_KEY`
**Environments:** ✅ Production only

**How to add:**
1. In Vercel, click "Add New Environment Variable"
2. Name: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: [Paste from Supabase]
4. Check box: "Production" ✅
5. Uncheck: "Preview" and "Development"
6. Click "Save"

---

### **STEP 2: NextAuth Configuration**

#### Variable 2: `NEXTAUTH_SECRET`
**What it is:** Secret for NextAuth.js encryption
**Value:** Generate a new one! Use this command:
```bash
openssl rand -base64 32
```
Or use online: https://1password.com/password-generator/

**Example value:**
```
dkL9mF2X+pQ8vW3Y4z5aB6cD7eF8gH9iJ0kL1mN2oP3qR4s=
```

**Environments:** ✅ Production only

**How to add:**
1. In Vercel, click "Add New Environment Variable"
2. Name: `NEXTAUTH_SECRET`
3. Value: [Paste the generated value]
4. Check box: "Production" ✅
5. Uncheck: "Preview" and "Development"
6. Click "Save"

#### Variable 3: `NEXTAUTH_URL`
**What it is:** Your production domain URL
**Value:** Your Vercel domain or custom domain
**Example values:**
- `https://student-apartment.vercel.app` (Vercel)
- `https://studentapartment.com` (Custom domain)

**Environments:** ✅ Production only

**How to add:**
1. In Vercel, click "Add New Environment Variable"
2. Name: `NEXTAUTH_URL`
3. Value: `https://your-domain-here.vercel.app`
4. Check box: "Production" ✅
5. Uncheck: "Preview" and "Development"
6. Click "Save"

---

### **STEP 3: Third-Party Services**

#### Variable 4: `RESEND_API_KEY`
**What it is:** Email service API key
**Value:** Same as GitHub Secret `RESEND_API_KEY`
**Environments:** ✅ Production only

#### Variable 5: `GOOGLE_AI_API_KEY`
**What it is:** Google Generative AI key for Gemini
**Value:** Same as GitHub Secret `GOOGLE_AI_API_KEY`
**Environments:** ✅ Production only

#### Variable 6: `STRIPE_SECRET_KEY`
**What it is:** Stripe payment API key
**Value:** Same as GitHub Secret `STRIPE_SECRET_KEY`
**Environments:** ✅ Production only

#### Variable 7: `MEILISEARCH_MASTER_KEY`
**What it is:** Search engine API key
**Value:** Same as GitHub Secret `MEILISEARCH_MASTER_KEY`
**Environments:** ✅ Production only

#### Variable 8: `GOOGLE_MAPS_API_KEY`
**What it is:** Google Maps API key
**Value:** Same as GitHub Secret `GOOGLE_MAPS_API_KEY`
**Environments:** ✅ Production only

#### Variable 9: `SENTRY_DSN`
**What it is:** Error tracking DSN
**Value:** Same as GitHub Secret `SENTRY_DSN`
**Environments:** ✅ Production only

---

## 🔄 HOW TO ADD THEM TO VERCEL

### **Quick Steps:**

1. Go to: https://vercel.com/dashboard
2. Click "StudentApartment" project
3. Go to "Settings" tab
4. Click "Environment Variables" in left menu
5. Click "Add New" button
6. Fill in the form:
   ```
   Name: [Copy from table above]
   Value: [Paste the value]
   ```
7. Check only "Production" checkbox ✅
8. Click "Save"
9. Repeat for all 9 variables

---

## ⚠️ IMPORTANT: CHECK ONLY "Production"

When adding each variable:
- ✅ Check: **Production**
- ⭕ Uncheck: Preview
- ⭕ Uncheck: Development

This ensures production uses the real keys while preview/dev use local values.

---

## ✅ QUICK CHECKLIST

After adding all 9 Vercel variables, check them off:

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXTAUTH_SECRET` (newly generated)
- [ ] `NEXTAUTH_URL` (your domain)
- [ ] `RESEND_API_KEY`
- [ ] `GOOGLE_AI_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `MEILISEARCH_MASTER_KEY`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `SENTRY_DSN`

---

## 📊 VARIABLES SUMMARY TABLE

| # | Variable Name | Value Source | Production | Preview | Development |
|---|---|---|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 2 | `NEXTAUTH_SECRET` | Generate new | ✅ | ⭕ | ⭕ |
| 3 | `NEXTAUTH_URL` | Your domain | ✅ | ⭕ | ⭕ |
| 4 | `RESEND_API_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 5 | `GOOGLE_AI_API_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 6 | `STRIPE_SECRET_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 7 | `MEILISEARCH_MASTER_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 8 | `GOOGLE_MAPS_API_KEY` | GitHub Secret | ✅ | ⭕ | ⭕ |
| 9 | `SENTRY_DSN` | GitHub Secret | ✅ | ⭕ | ⭕ |

---

## 🚀 WHAT HAPPENS AFTER YOU ADD THEM

1. Vercel redeploys your app (~2-3 minutes)
2. CI/CD pipeline runs (watch it in GitHub Actions)
3. All health checks run
4. Production deployment goes live
5. AI search should work! ✅

---

## 🔍 HOW TO VERIFY THEY WORK

1. Go to your Vercel domain
2. Open DevTools (F12)
3. Go to Console tab
4. Search for apartments
5. Look for: **`✅ Gemini AI response:`** = Success!

If you see: **`⚠️ AI service unavailable`** = Check your env vars

---

## 📝 IMPORTANT NOTES

- **NEXTAUTH_SECRET:** Must be a new value for production!
- **NEXTAUTH_URL:** Must match your actual production domain
- **All 9 variables:** Must be checked as "Production" only
- **No preview/development:** Those get values from `.env.local`

---

## ⏱️ ESTIMATED TIME

- Add 9 variables: **10 minutes**
- Vercel redeploy: **3 minutes**
- Tests passing: **5 minutes**
- **Total: ~18 minutes**

---

**Next steps after this:**

1. ✅ GitHub Secrets added (done?)
2. ✅ Vercel variables added (this page)
3. ⏳ Watch GitHub Actions for green checkmarks
4. ⏳ Test on live domain
5. ⏳ Verify AI search works

---

**You're almost there! Add these 9 variables and watch the magic happen! 🎉**
