# 🔍 AI SEARCH ERROR DIAGNOSIS

## ❓ YOUR ERROR
```
⚠️ AI service error - using local parsing
```

## 🎯 ROOT CAUSE
The error message changed from "AI unavailable" to "AI service error" which means:
- The API is being called ✅
- But it's returning an error response ❌

## 🔧 POSSIBLE CAUSES (In order of likelihood)

### **1. API KEY INVALID or EXPIRED** (Most Common!)
**Check:**
- Is `GOOGLE_AI_API_KEY` correct in `.env.local`?
- Has the key been rotated/regenerated?
- Does the key have API quota remaining?

**Current value in .env.local:**
```
GOOGLE_AI_API_KEY=AIzaSyD2Tvy5Hsry8tAFpVdFEB2oZBLzfmvbKLQ
```

**To verify:**
1. Go to: https://aistudio.google.com/app/apikey
2. Check if your key is still active
3. Check if it's the same as in `.env.local`
4. Generate a new key if needed

---

### **2. MODEL NAME WRONG or DEPRECATED**
**Current models being tried:**
- gemini-2.5-flash ✅ (Available)
- gemini-2.0-flash-exp (Might be deprecated)
- gemini-2.0-flash ✅ (Available)
- gemini-1.5-flash ✅ (Available)

**To fix:** Use only stable models

---

### **3. API QUOTA EXCEEDED**
**Check:**
- Go to: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
- See if you've hit daily/monthly limits
- Request higher quota if needed

---

### **4. GOOGLE AI API NOT ENABLED**
**Check:**
1. Go to: https://console.cloud.google.com
2. Select your project
3. Go to APIs & Services → Enabled APIs
4. Search for "Generative Language API"
5. Make sure it's enabled (not disabled)

---

## 📋 DEBUG STEPS (Do these in order)

### **Step 1: Check Browser Console**
1. Open http://localhost:3000
2. Press F12 (DevTools)
3. Go to Console tab
4. Search for apartments
5. Look for messages like:
   - `🤖 Server: Analyzing story with gemini-2.5-flash...`
   - `❌ Server: Gemini API error: ...`
6. **Copy the full error message**

### **Step 2: Check Server Logs**
1. Look at your terminal where `pnpm dev` is running
2. Search for messages starting with `❌ Server:`
3. Copy the error details

### **Step 3: Make Direct API Call**
Run this in a terminal to test the API directly:

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"story":"Looking for 2BR apartment"}' \
  | jq .
```

This will show the exact error response.

---

## 🔧 QUICK FIX (Most Likely Solution)

1. **Verify your API key is correct:**
   ```bash
   # In terminal, check if the key is set
   echo $env:GOOGLE_AI_API_KEY
   ```

2. **Get a fresh API key:**
   - Go to: https://aistudio.google.com/app/apikey
   - Click "Get API key"
   - Click "Create API key in new project"
   - Copy the new key
   - Replace in `.env.local`

3. **Restart dev server:**
   ```bash
   pnpm dev
   ```

4. **Test again:**
   - Search for apartments
   - Check console for "✅ Gemini AI response:"

---

## 📝 COMMON ERROR MESSAGES & FIXES

### Error: `403 Forbidden`
**Cause:** API key doesn't have permission or service not enabled
**Fix:** 
1. Generate new key at https://aistudio.google.com/app/apikey
2. Enable Generative Language API at https://console.cloud.google.com

### Error: `401 Unauthorized`
**Cause:** Invalid/expired API key
**Fix:** Generate new key at https://aistudio.google.com/app/apikey

### Error: `429 Too Many Requests`
**Cause:** Hit API rate limits
**Fix:** Wait a few minutes, then try again

### Error: `400 Bad Request`
**Cause:** Malformed request or deprecated model
**Fix:** Check model names are correct (gemini-2.5-flash, etc.)

---

## 🎯 WHAT TO DO NOW

1. **Check your API key** (most likely issue)
2. **Run the curl command above** to get exact error
3. **Share the error message** if you need help

**The error is likely just an API key issue - should be fixable in 2 minutes!**
