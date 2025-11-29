# Quick Start - Market Signal Mobile

Get up and running in 5 minutes!

## Prerequisites

✅ Node.js 18+ (REQUIRED - upgrade if you're on Node 16)
✅ npm or yarn
✅ Supabase account with project set up

## 1. Install Dependencies (2 min)

```bash
# If on Node 16, upgrade first!
node --version  # Check version

# If needed:
nvm install 20 && nvm use 20

# Install packages
npm install
```

## 2. Configure Supabase (2 min)

Create `.env` file in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...your-anon-key
```

Get these from: Supabase Dashboard → Settings → API

⚠️ Use ANON key, NOT service_role key!

## 3. Run the App (1 min)

```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator  
- Press `w` for web browser
- Scan QR code with Expo Go app on phone

## 4. Test It

1. Click "Sign Up"
2. Create an account
3. You're in! 🎉

## Troubleshooting

**"ReadableStream is not defined"**
→ Upgrade Node.js to 18+

**"Cannot connect to Supabase"**
→ Check your .env file

**Clear cache**
```bash
npm start -- --clear
```

## What's Next?

- Create alerts from your web app - they'll appear here in real-time!
- Toggle notification settings
- Make yourself admin: `UPDATE profiles SET is_admin=TRUE WHERE email='your@email.com'`

---

**Full docs:** See README.md and SETUP.md

**Need help?** Check the console logs for errors

