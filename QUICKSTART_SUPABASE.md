# 🚀 Quick Start - Supabase Integration

## ⚡ 5-Minute Setup

### 1. Create Supabase Project (2 min)
```
1. Go to: https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Name it: expense-tracker
5. Choose region & create password
6. Wait for project to provision (~2 min)
```

### 2. Get Credentials (30 sec)
```
1. Go to: Settings → API
2. Copy "Project URL"
3. Copy "anon public" key
```

### 3. Run SQL Schema (1 min)
```
1. Go to: SQL Editor in Supabase dashboard
2. Click "New Query"
3. Paste contents from: supabase-schema.sql
4. Click "Run"
```

### 4. Configure App (1 min)
```
1. Create file: .env
2. Add:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
3. Save file
```

### 5. Restart Server (30 sec)
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 6. Test It! (1 min)
```
1. Open app in browser
2. Click "Sign In" button
3. Switch to "Sign Up" tab
4. Create account (any email + password 6+ chars)
5. Check email for verification link
6. Click link, then sign in
7. Add expense → Check Supabase dashboard → Table Editor → expenses
```

---

## 📚 Full Documentation

- **Setup Guide**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) (comprehensive guide)
- **Implementation Summary**: [SUPABASE_INTEGRATION_SUMMARY.md](./SUPABASE_INTEGRATION_SUMMARY.md)
- **SQL Schema**: [supabase-schema.sql](./supabase-schema.sql)

---

## 🎯 What You Get

✅ **Guest Mode**: No login needed, data in localStorage (works as before)
✅ **Cloud Backup**: Optional Supabase authentication
✅ **Data Migration**: Safely move local data to cloud
✅ **Cross-Device Sync**: Same account on multiple devices
✅ **Secure**: Row Level Security + Email verification

---

## 🔑 Key Features

| Guest Mode | Authenticated Mode |
|-----------|-------------------|
| ❌ No account | ✅ Email + Password |
| 💾 localStorage | ☁️ Supabase Cloud |
| 🖥️ Single device | 📱 Multi-device sync |

---

## 🛠️ Troubleshooting

**App says "Invalid credentials"**
→ Check `.env` file has correct URL and key (no quotes needed)
→ Restart dev server after creating `.env`

**Email verification link doesn't work**
→ Check spam folder
→ Or manually verify in Supabase dashboard: Authentication → Users → Click user → Verify

**Expenses not syncing**
→ Make sure you ran `supabase-schema.sql` in SQL Editor
→ Check browser console for errors
→ Verify you're signed in (see email in header)

**Migration modal doesn't appear**
→ Only shows if you have local data AND no cloud data
→ Only shows once per session

---

## 📞 Support

- Read: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed troubleshooting
- Check: Supabase dashboard logs (Database → Logs)
- Test: Browser console (F12) for JavaScript errors

---

## 🎉 You're All Set!

Your expense tracker now has optional cloud backup with Supabase. 

**Current state:**
- ✅ Code integrated and ready
- ✅ Dependencies installed (`@supabase/supabase-js`)
- ✅ Documentation complete
- ⏳ **Needs**: Supabase project + credentials

**Next step**: Follow the 5-minute setup above! 🚀
