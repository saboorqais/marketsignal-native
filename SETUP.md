# Setup Guide - Market Signal Mobile

Quick start guide to get the Market Signal mobile app running.

## Step 1: Environment Setup

### 1.1 Upgrade Node.js (Critical!)

The app requires **Node.js 18+**. If you're on Node 16, upgrade first:

```bash
# Check your current Node version
node --version

# If < 18, upgrade using nvm (recommended)
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

### 1.2 Install Dependencies

```bash
cd market-signal-mobile
npm install
```

## Step 2: Supabase Configuration

### 2.1 Get Your Supabase Keys

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL
   - **anon/public key** (NOT the service_role key!)

### 2.2 Create Environment File

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **SECURITY WARNING:**

```
✅ DO:     Use SUPABASE_ANON_KEY
❌ DON'T:  Use SUPABASE_SERVICE_ROLE_KEY (dangerous in mobile apps!)
```

### 2.3 Verify Database Setup

Ensure these tables exist in Supabase:

**profiles table:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  email_notifications BOOLEAN DEFAULT TRUE,
  telegram_notifications BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**alerts table:**
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  symbol TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**audit_trail table:**
```sql
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id),
  symbol TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  condition_type TEXT,
  condition_value NUMERIC,
  current_value NUMERIC,
  previous_rsi NUMERIC,
  current_rsi NUMERIC,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_method TEXT
);
```

### 2.4 Set Up RLS Policies

Enable Row Level Security on all tables and create policies:

**For alerts:**
```sql
-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own alerts
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON alerts FOR DELETE
  USING (auth.uid() = user_id);
```

**For profiles:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**For audit_trail (admin only):**
```sql
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit trail"
  ON audit_trail FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
```

## Step 3: Run the App

### 3.1 Start Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Show a QR code in the terminal
- Open a browser with development tools

### 3.2 Choose Your Platform

**Option A: iOS Simulator (Mac only)**
```bash
npm run ios
```

**Option B: Android Emulator**
```bash
npm run android
```

**Option C: Physical Device**
1. Install "Expo Go" from App Store/Play Store
2. Scan the QR code shown in terminal
3. App will load on your device

**Option D: Web Browser**
```bash
npm run web
```

## Step 4: Test Authentication

### 4.1 Create Test Account

1. Open the app
2. Click "Sign Up"
3. Enter:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
4. Click "Sign Up"
5. Check your email for verification (if email auth is enabled)

### 4.2 Create Admin User (Optional)

In Supabase SQL Editor:

```sql
-- Make a user admin
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'your-email@example.com';
```

## Step 5: Verify Features

### ✅ Checklist

- [ ] Sign up new account
- [ ] Sign in with existing account
- [ ] View alerts list (will be empty initially)
- [ ] Access settings screen
- [ ] Toggle notification settings
- [ ] Sign out
- [ ] Admin tab appears for admin users
- [ ] Real-time updates work (create alert via web app, should appear in mobile)

## Common Issues & Solutions

### Issue: "ReadableStream is not defined"

**Solution:** Upgrade Node.js to version 18 or higher

```bash
nvm install 20
nvm use 20
npm install  # Reinstall dependencies
```

### Issue: "Cannot connect to Supabase"

**Solutions:**
1. Check `.env` file exists and has correct values
2. Verify `app.config.js` is reading the env vars correctly
3. Restart the Expo server: `npm start -- --clear`
4. Check Supabase project is active (not paused)

### Issue: "No alerts showing"

**Solutions:**
1. Create test alerts via your web app first
2. Check RLS policies are set correctly
3. Verify user is signed in
4. Check console logs for errors

### Issue: "Admin tab not showing"

**Solutions:**
1. Verify user has `is_admin = TRUE` in profiles table
2. Sign out and sign back in
3. Check that profile data is loading correctly

### Issue: Metro bundler cache issues

**Solution:**
```bash
# Clear cache and restart
npm start -- --clear

# Or manually delete cache
rm -rf node_modules/.cache
rm -rf .expo
npm start
```

## Next Steps

1. **Customize the app** - Update colors, logos, app name
2. **Add more features** - Create alerts from mobile, charts, etc.
3. **Set up push notifications** - Configure Expo push notifications
4. **Build for production** - Use EAS Build
5. **Submit to stores** - App Store and Google Play

## Additional Resources

- [Expo Go App (iOS)](https://apps.apple.com/app/expo-go/id982107779)
- [Expo Go App (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [Supabase Dashboard](https://app.supabase.com)
- [Expo Documentation](https://docs.expo.dev)

## Need Help?

- Check the main README.md for detailed documentation
- Review Expo Router docs for navigation issues
- Check Supabase docs for database/auth issues
- Look at the console logs for error messages

---

**You're all set! 🎉**

Start by running `npm start` and testing the app on your preferred platform.

