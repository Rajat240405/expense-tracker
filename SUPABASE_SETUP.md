# Supabase Authentication & Cloud Backup Setup Guide

## Overview

Your expense tracker now supports **optional cloud backup** via Supabase authentication. Users can:
- ✅ Continue using the app **without signing in** (guest mode with localStorage)
- ✅ Sign up/sign in to **sync expenses to the cloud**
- ✅ **Migrate existing local data** to the cloud when first logging in
- ✅ **Seamlessly switch** between devices with the same account

## Architecture

### Dual-Mode Operation
- **Guest Mode**: All data stored in browser's localStorage (original behavior)
- **Authenticated Mode**: Data synced to Supabase PostgreSQL database

### Key Features
- Non-destructive migration (local data preserved)
- Automatic cloud sync on all CRUD operations
- Session persistence across page refreshes
- Secure authentication with email/password

---

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Enter project details:
   - **Name**: expense-tracker (or your choice)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait ~2 minutes for provisioning

### Step 2: Get API Credentials

1. In your Supabase dashboard, click "Settings" (gear icon) → "API"
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Step 3: Set Up Database Schema

1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" to execute

**What this does:**
- Creates `expenses` table with proper columns
- Sets up Row Level Security (users can only see their own data)
- Creates indexes for performance
- Enables automatic timestamp updates

### Step 4: Configure Environment Variables

1. In your project root (`d:\expenses`), create a new file: `.env`
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace** the values with your actual credentials from Step 2.

⚠️ **IMPORTANT**: Add `.env` to `.gitignore` if sharing code publicly!

```gitignore
# .gitignore
.env
.env.local
```

### Step 5: Install Dependencies (Already Done)

Dependencies have already been installed:
- ✅ `@supabase/supabase-js` - Supabase JavaScript client

If you need to reinstall: `npm install @supabase/supabase-js`

### Step 6: Restart Development Server

If your dev server is running, restart it to pick up the new environment variables:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## Testing the Integration

### Test Guest Mode
1. Open app in incognito/private window
2. Add some expenses
3. Verify they're saved (refresh page)
4. Data should persist in localStorage

### Test Authentication
1. Click "Sign In" button (top right on desktop, next to title on mobile)
2. Switch to "Sign Up" tab
3. Enter email and password (min 6 characters)
4. Click "Sign Up"
5. Check email for verification link from Supabase
6. Click verification link
7. Return to app and sign in

### Test Migration
1. While signed out, add 5-10 expenses
2. Click "Sign In" and log in
3. Migration modal should appear showing local expense count
4. Click "Backup Now"
5. Expenses should be migrated to cloud
6. Open browser DevTools → Application → Local Storage
7. Verify expenses are still there (not deleted)

### Test Cloud Sync
1. While signed in, add a new expense
2. Open Supabase dashboard → Table Editor → expenses
3. Verify expense appears in database
4. Edit an expense in the app
5. Verify changes reflected in Supabase
6. Delete an expense
7. Verify deletion in Supabase

### Test Cross-Device Sync
1. Sign in on Device/Browser A
2. Add expenses
3. Sign in with same account on Device/Browser B
4. Verify expenses appear

---

## File Structure

### New Files Created

```
expenses/
├── .env                           # Environment variables (create this!)
├── .env.example                   # Template for env vars
├── supabase-schema.sql            # Database schema
├── SUPABASE_SETUP.md             # This guide
├── lib/
│   └── supabase.ts               # Supabase client & helper functions
├── contexts/
│   └── AuthContext.tsx           # React context for auth state
├── services/
│   └── DataSyncService.ts        # Cloud CRUD operations
└── components/
    ├── AuthModal.tsx             # Sign in/up UI
    └── MigrationModal.tsx        # Local → Cloud migration prompt
```

### Modified Files

```
├── App.tsx                        # Wrapped with AuthProvider
└── components/
    └── Workspace.tsx             # Integrated cloud sync & auth UI
```

---

## How It Works

### Authentication Flow

1. **Initial Load**
   - AuthContext checks for existing Supabase session
   - If session exists: user auto-logged in
   - If no session: user remains in guest mode

2. **Sign Up**
   - Email/password sent to Supabase
   - Supabase sends verification email
   - User clicks link to verify (required)
   - User can now sign in

3. **Sign In**
   - Credentials validated by Supabase
   - Session token stored in browser
   - App checks for local expenses
   - If local data exists: migration modal shown
   - User can migrate or skip

### Data Sync Flow

```
┌─────────────────────────────────────────────────┐
│  User Action (Add/Edit/Delete)                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Is user signed │
         │      in?       │
         └────────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
    YES  │            NO   │
         ▼                 ▼
  ┌──────────────┐   ┌──────────────┐
  │ Sync to      │   │ Save to      │
  │ Supabase     │   │ localStorage │
  └──────┬───────┘   └──────────────┘
         │
         ▼
  ┌──────────────┐
  │ Update local │
  │ state        │
  └──────────────┘
```

### Data Loading

- **Guest**: Load from `localStorage.getItem('expenses')`
- **Authenticated**: Load from `DataSyncService.fetchExpenses(userId)`

When user logs in for first time:
1. Check Supabase for existing data
2. Check localStorage for local data
3. If both exist: merge (prefer cloud version)
4. If only local: show migration prompt
5. If only cloud: load cloud data

---

## API Reference

### AuthContext

```typescript
const {
  user,        // Current user object (null if guest)
  session,     // Supabase session
  signIn,      // (email, password) => Promise<{user, error}>
  signUp,      // (email, password) => Promise<{user, error}>
  signOut,     // () => Promise<void>
  isGuest,     // boolean - true if not signed in
} = useAuth();
```

### DataSyncService

```typescript
// Fetch all expenses for user
await DataSyncService.fetchExpenses(userId);

// Add new expense
await DataSyncService.addExpense(expense, userId);

// Update existing expense
await DataSyncService.updateExpense(expense, userId);

// Delete expense
await DataSyncService.deleteExpense(expenseId, userId);

// Migrate local expenses to cloud
await DataSyncService.migrateLocalExpenses(expenses, userId);

// Check if user has cloud data
await DataSyncService.hasCloudData(userId);
```

---

## Security Notes

### What's Protected

✅ **Row Level Security (RLS)** enabled
- Users can ONLY see their own expenses
- Direct database access blocked
- SQL injection prevented by Supabase client

✅ **Email verification required**
- Prevents fake accounts
- Confirms user owns email

✅ **Secure token storage**
- Session tokens in httpOnly cookies
- Auto-refresh on expiration

### What's NOT Protected

⚠️ Client-side code is visible (React app)
⚠️ API keys in `.env` are build-time only (not fully secret)
⚠️ Email validation is basic (no domain checks)

### Best Practices

- Use strong passwords (app enforces min 6 chars, recommend 12+)
- Enable 2FA in Supabase dashboard (Settings → Auth → 2FA)
- Set up email rate limiting (prevents spam signups)
- Monitor Supabase logs for suspicious activity

---

## Troubleshooting

### "Invalid API credentials" error

**Problem**: Supabase URL or key incorrect
**Solution**:
1. Check `.env` file has correct values
2. No quotes around values needed
3. Restart dev server after changing `.env`
4. Verify values in Supabase dashboard → Settings → API

### "Email not confirmed" error

**Problem**: User hasn't clicked verification link
**Solution**:
1. Check spam folder for Supabase email
2. In Supabase dashboard → Authentication → Users
3. Click on user → "Verify email" to manually confirm

### Migration modal doesn't appear

**Problem**: Already migrated or no local data
**Solution**:
- Modal only shows once per browser session
- Only appears if localStorage has expenses AND user has no cloud data
- Clear `hasCheckedMigration` flag in browser to test again

### Expenses not syncing

**Problem**: Network error or permission issue
**Solution**:
1. Check browser console for errors
2. Verify internet connection
3. Check Supabase status page
4. Verify RLS policies are set up (re-run `supabase-schema.sql`)

### "CORS error" when calling Supabase

**Problem**: Incorrect Supabase URL or network block
**Solution**:
1. Verify `VITE_SUPABASE_URL` format: `https://xxxxx.supabase.co`
2. Check if corporate firewall blocks Supabase
3. Try different network (mobile hotspot)

---

## Deployment Notes

### Environment Variables in Production

When deploying (Netlify, Vercel, etc.):

1. Add environment variables in hosting platform:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Netlify**: Site Settings → Environment Variables
3. **Vercel**: Project Settings → Environment Variables
4. **GitHub Pages**: Use GitHub Secrets + Actions

### Capacitor Mobile Apps

For Android/iOS builds:

1. Environment variables are **baked in at build time**
2. Update `.env` before building:
   ```bash
   npm run build
   npx cap sync
   ```
3. Rebuild app if Supabase credentials change

---

## Roadmap / Future Enhancements

Possible additions (not implemented):

- 📊 **Analytics dashboard** in Supabase
- 🔄 **Real-time sync** (Supabase Realtime subscriptions)
- 👥 **Shared expenses** (family/group accounts)
- 📧 **Password reset** flow
- 🔑 **OAuth login** (Google, GitHub)
- 💾 **Automatic backup reminders**
- 🌐 **Offline queue** (sync when back online)
- 📱 **Push notifications** for budget alerts

---

## Support

### Supabase Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client Docs](https://supabase.com/docs/reference/javascript)

### Project Issues

If you encounter problems:
1. Check browser console for errors
2. Verify `.env` configuration
3. Test Supabase dashboard connectivity
4. Review `supabase-schema.sql` execution logs

---

## Summary

You now have a **fully functional expense tracker** with:
- ✅ **Guest mode** (localStorage, no account needed)
- ✅ **Cloud backup** (optional Supabase authentication)
- ✅ **Data migration** (local → cloud)
- ✅ **Secure access** (RLS, email verification)
- ✅ **Cross-device sync** (same account, multiple devices)

**Next steps**:
1. Create Supabase project
2. Run SQL schema
3. Add credentials to `.env`
4. Test authentication flow
5. Deploy to production!
