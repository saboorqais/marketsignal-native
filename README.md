# Market Signal Mobile App

A React Native mobile application for managing and monitoring market signal alerts, built with Expo and Supabase.

## 🚀 Features

- ✅ **Authentication** - Sign in/Sign up with email and password
- ✅ **Real-time Alerts** - View and manage your market alerts with live updates
- ✅ **Settings Management** - Configure email and Telegram notifications
- ✅ **Admin Dashboard** - Audit trail for administrators
- ✅ **Offline Support** - Local caching for better performance
- ✅ **Secure** - Uses Supabase ANON key (not Service Role) for mobile safety
- ✅ **Cross-platform** - Works on iOS, Android, and Web

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 (required for modern Expo)
- **npm** or **yarn**
- **Expo CLI** (will be installed via npx)
- **iOS Simulator** (Mac only) or **Android Studio** for testing

### Upgrade Node.js (if needed)

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

## 🛠️ Installation

1. **Clone the repository** (if applicable)

```bash
cd market-signal-mobile
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **IMPORTANT**: Use only the ANON key, NEVER the Service Role key in mobile apps!

## 🔐 Security Best Practices

### Why ANON Key is Safe

- ✅ Protected by Row Level Security (RLS) policies
- ✅ Can be safely included in mobile app bundles
- ✅ All data access is controlled server-side

### Why SERVICE_ROLE Key is Dangerous

- ❌ Bypasses all RLS policies
- ❌ Can be extracted from app bundles
- ❌ Compromises entire database if leaked

### For Admin Operations

Create Supabase Edge Functions that use the Service Role key server-side:

```typescript
// Supabase Edge Function (server-side)
const supabase = createClient(url, SERVICE_ROLE_KEY) // ✅ Safe here

// Mobile app calls this function via authenticated request
fetch('YOUR_API_URL/admin/audit-trail', {
  headers: {
    'Authorization': `Bearer ${userToken}` // ✅ User token only
  }
})
```

## 🏃 Running the App

### Development Mode

```bash
# Start Expo development server
npm start

# Or use specific platforms
npm run ios       # Run on iOS simulator
npm run android   # Run on Android emulator
npm run web       # Run in web browser
```

### Testing on Physical Device

1. Install **Expo Go** app on your phone
2. Scan the QR code shown in the terminal
3. App will load on your device

## 📱 Project Structure

```
market-signal-mobile/
├── app/                      # Expo Router pages
│   ├── (auth)/              # Authentication screens
│   │   ├── signin.tsx       # Sign in screen
│   │   ├── signup.tsx       # Sign up screen
│   │   └── _layout.tsx      # Auth layout
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Alerts list
│   │   ├── settings.tsx     # Settings screen
│   │   ├── admin.tsx        # Admin audit trail
│   │   └── _layout.tsx      # Tabs layout
│   └── _layout.tsx          # Root layout
├── components/              # Reusable components
│   ├── alerts/
│   ├── ui/
│   └── layouts/
├── lib/                     # Core utilities
│   ├── supabase.ts         # Supabase client (ANON key)
│   ├── auth-context.tsx    # Auth provider
│   ├── store.ts            # Zustand state management
│   └── cache.ts            # AsyncStorage caching
├── constants/
│   └── colors.ts           # App color palette
├── types/
│   └── index.ts            # TypeScript types
└── app.config.js           # Expo configuration
```

## 🎨 Color Palette

The app uses a dark theme matching the web application:

```typescript
{
  dark: '#0B0D11',           // Background
  darkSecondary: '#1E293B',  // Cards
  textPrimary: '#F5F7FA',    // Primary text
  textSecondary: '#94A3B8',  // Secondary text
  blue: '#3B82F6',           // Accent
  green: '#22C55E',          // Success
  red: '#EF4444',            // Error
  yellow: '#F59E0B',         // Warning
}
```

## 🔧 Configuration

### App Config (`app.config.js`)

The app configuration includes:

- App name and slug
- Platform-specific settings (iOS/Android)
- Environment variables from `.env`
- Expo plugins configuration

### Supabase Setup

Required Supabase tables:

- `profiles` - User profiles and settings
- `alerts` - User alerts
- `audit_trail` - Admin audit log

Ensure Row Level Security (RLS) policies are set up correctly!

## 📦 Building for Production

### Setup EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Build iOS

```bash
eas build --platform ios
```

### Build Android

```bash
eas build --platform android
```

### Submit to App Stores

```bash
eas submit --platform ios
eas submit --platform android
```

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 📚 Key Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - Development platform and build service
- **Expo Router** - File-based routing
- **Supabase** - Backend as a Service (Auth, Database, Realtime)
- **Zustand** - Lightweight state management
- **AsyncStorage** - Local data persistence
- **TypeScript** - Type safety
- **date-fns** - Date formatting

## 🐛 Troubleshooting

### Node Version Issues

If you see `ReadableStream is not defined` errors:

```bash
# Upgrade to Node 18 or higher
nvm install 20
nvm use 20
```

### Metro Bundler Issues

```bash
# Clear cache and restart
npm start -- --clear
```

### Supabase Connection Issues

1. Verify your `.env` file exists with correct values
2. Check `app.config.js` is reading environment variables
3. Ensure Supabase URL and ANON key are correct
4. Verify your Supabase project is active

### iOS Simulator Not Working

```bash
# Reset simulator
xcrun simctl erase all

# Reinstall pods (if needed)
cd ios && pod install && cd ..
```

## 📖 Documentation Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly on iOS and Android
4. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🙋 Support

For issues or questions, contact the development team.

---

**Built with ❤️ using React Native and Expo**

