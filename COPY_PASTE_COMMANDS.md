# 🚀 COPY & PASTE COMMANDS

Use these exact commands. Just copy, paste into Supabase SQL Editor or Terminal.

---

## 🗄️ DATABASE COMMANDS

### Command 1: Clean Up (Copy Entire Block)
```sql
DROP TABLE IF EXISTS public.viewing_requests CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles_student CASCADE;
DROP TABLE IF EXISTS public.profiles_owner CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
SELECT 'Cleanup complete' as status;
```

**What to do:**
1. Copy all lines above
2. Go to Supabase SQL Editor
3. Paste
4. Click **RUN**
5. Expect: ✅ "Cleanup complete"

---

### Command 2: Verify Database (Copy Entire Block)
```sql
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Student Profiles', COUNT(*) FROM public.profiles_student
UNION ALL
SELECT 'Owner Profiles', COUNT(*) FROM public.profiles_owner
UNION ALL
SELECT 'Apartments', COUNT(*) FROM public.apartments
UNION ALL
SELECT 'Conversations', COUNT(*) FROM public.conversations
UNION ALL
SELECT 'Messages', COUNT(*) FROM public.messages;
```

**What to do:**
1. Copy all lines above
2. Paste in Supabase SQL Editor
3. Click **RUN**
4. Check results (should show: 4, 2, 2, 3, 1, 4)

---

### Command 3: Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'profiles_owner', 'profiles_student', 'conversations', 'messages', 'apartments')
ORDER BY table_name;
```

**Should return:** 6 tables

---

### Command 4: Check User Roles
```sql
SELECT email, role FROM public.users ORDER BY email;
```

**Should show:**
```
owner1@test.com | owner
owner2@test.com | owner
student1@test.com | student
student2@test.com | student
```

---

### Command 5: Fix Owner Role (if needed)
```sql
UPDATE public.users 
SET role = 'owner' 
WHERE email = 'owner1@test.com';

UPDATE public.users 
SET role = 'owner' 
WHERE email = 'owner2@test.com';

SELECT email, role FROM public.users ORDER BY email;
```

---

### Command 6: Check Apartments
```sql
SELECT id, title, owner_id, monthly_rent_huf 
FROM public.apartments 
ORDER BY created_at DESC;
```

**Should show:** 3 apartments

---

### Command 7: Check Conversations
```sql
SELECT id, apartment_id, student_id, owner_id, status
FROM public.conversations;
```

**Should show:** 1 conversation

---

### Command 8: Reset Everything (CAUTION!)
```sql
DELETE FROM public.messages;
DELETE FROM public.conversations;
DELETE FROM public.apartments WHERE owner_verified IS NOT NULL;
DELETE FROM public.profiles_student;
DELETE FROM public.profiles_owner;
DELETE FROM public.users;
```

---

## 💻 TERMINAL COMMANDS

### PowerShell - Start Dev Server
```powershell
cd "c:\Users\Administrator\Desktop\All Student apartment files\SA-GitHub-Upload"
npm run dev
```

**Expected:** Local: http://localhost:3000

---

### PowerShell - Clear Next Cache
```powershell
Remove-Item -Path ".\.next" -Recurse -Force
```

**Then restart:** `npm run dev`

---

### PowerShell - Check if Port 3000 is in Use
```powershell
netstat -ano | findstr :3000
```

---

### PowerShell - Kill Process on Port 3000
```powershell
taskkill /PID [PID_NUMBER] /F
```

Replace `[PID_NUMBER]` with number from previous command

---

### PowerShell - Build Project
```powershell
npm run build
```

---

### Git - Push Changes
```powershell
git add .
git commit -m "Fix: All 11 issues resolved - database and code fixes"
git push origin main
```

---

## 🌐 BROWSER TEST URLS

| Purpose | URL |
|---------|-----|
| Home/Search | `http://localhost:3000` |
| Student Dashboard | `http://localhost:3000/dashboard` |
| Owner Dashboard | `http://localhost:3000/owner/dashboard` |
| Messages | `http://localhost:3000/dashboard/messages` |
| Apartments | `http://localhost:3000/apartments` |
| Apartment Detail | `http://localhost:3000/apartments/[id]` |
| Sign In | `http://localhost:3000/auth/login` |
| Sign Up | `http://localhost:3000/auth/signup` |

---

## 📋 TEST CREDENTIALS

### Student Accounts
```
Email: student1@test.com
Password: Test123!
Name: Anna Kovács
University: Eötvös Loránd University

Email: student2@test.com
Password: Test123!
Name: János Nagy
University: Budapest University of Technology
```

### Owner Accounts
```
Email: owner1@test.com
Password: Test123!
Name: Péter Szabó
Business: Szabó Properties Kft.

Email: owner2@test.com
Password: Test123!
Name: Katalin Tóth
Business: City Living Rentals
```

---

## 🔍 DEBUGGING COMMANDS

### Browser Console (F12) - Clear Logs
```javascript
console.clear()
```

### Browser Console - Check Auth Status
```javascript
// In browser console
const { data } = await fetch('http://localhost:3000/api/auth/session').then(r => r.json())
console.log(data)
```

### Check Supabase Connection
In app browser console:
```javascript
// Try this in console
console.log('App should work if server is running')
```

---

## 🆘 EMERGENCY RESET

If everything is broken, do this:

### Step 1: Terminal
```powershell
Remove-Item -Path ".\.next" -Recurse -Force
taskkill /F /IM node.exe
npm run dev
```

### Step 2: Browser
Clear everything:
- Open DevTools (F12)
- Application → Cookies → Delete all
- Application → Local Storage → Delete all
- Hard refresh (Ctrl+Shift+R)

### Step 3: Database
In Supabase SQL Editor, run **Command 1: Clean Up** above

---

## 📞 IF STUCK

1. **Check console for errors** (F12)
2. **Run verification query** (Command 2 above)
3. **Clear cache and restart** (see emergency reset)
4. **Check error messages carefully** - they often tell you what's wrong
5. **Ask for help** with exact error message

---

## ✅ QUICK CHECKLIST

- [ ] Copy/pasted all database commands
- [ ] Ran cleanup command
- [ ] Ran all-in-one migration (from file)
- [ ] Ran seed data (from file)
- [ ] Ran verification query - got correct counts
- [ ] Dev server running (`npm run dev`)
- [ ] Can access http://localhost:3000
- [ ] Can sign in as student1@test.com
- [ ] Can sign in as owner1@test.com
- [ ] Both redirect to correct dashboards
- [ ] No console errors

🎉 **If all checked: YOU'RE DONE!**
