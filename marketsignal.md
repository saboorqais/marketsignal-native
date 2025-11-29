# React Native Mobile App - Complete Implementation Plan

## Project Setup & Architecture

### Tech Stack

- **Framework**: React Native with Expo (SDK 50+)
- **UI Library**: Tamagui (modern, performant, theme-based)
- **State Management**: Zustand (lightweight, similar to Redux)
- **Backend**: Supabase (Auth, Database, Realtime)
- **Navigation**: Expo Router (file-based routing)
- **Security**: Environment variables with expo-secure-store

### Security Best Practices

**IMPORTANT: Supabase Service Role Key Safety**

❌ **NEVER use Service Role key in mobile apps**

- Service Role bypasses all RLS policies
- Can be extracted from the app bundle
- Compromises entire database security

✅ **Use Anon/Public key instead**

- Relies on Row Level Security (RLS)
- Safe to include in mobile app
- All your existing RLS policies protect data

**Key Strategy:**

```javascript
// Mobile App (React Native)
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY  // ✅ Safe for mobile
)

// Backend API (if needed for admin operations)
// Create serverless functions that use SERVICE_ROLE
// Mobile app calls these functions via authenticated requests
```

## Phase 1: Project Initialization

### Step 1.1: Create Expo Project

```bash
npx create-expo-app@latest market-signal-mobile --template tabs
cd market-signal-mobile
```

### Step 1.2: Install Core Dependencies

```bash
npx expo install expo-router expo-secure-store expo-constants
npm install @supabase/supabase-js
npm install zustand
npm install @tamagui/core @tamagui/config
npm install lucide-react-native
npm install react-native-safe-area-context
npm install date-fns
```

### Step 1.3: Project Structure

```
market-signal-mobile/
├── app/                      # Expo Router pages
│   ├── (auth)/              # Auth stack
│   │   ├── signin.tsx
│   │   └── signup.tsx
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Alerts list
│   │   ├── settings.tsx
│   │   └── admin.tsx
│   └── _layout.tsx
├── components/
│   ├── alerts/
│   ├── ui/
│   └── layouts/
├── lib/
│   ├── supabase.ts          # Supabase client (ANON key)
│   ├── theme.ts             # Tamagui theme config
│   └── store.ts             # Zustand store
├── constants/
│   └── colors.ts            # Theme colors
└── types/
    └── index.ts
```

## Phase 2: Theme & Design System

### Step 2.1: Color Palette (Match Web App)

```typescript
// constants/colors.ts
export const colors = {
  // Background
  dark: '#0B0D11',
  darkSecondary: '#1E293B',
  
  // Text
  textPrimary: '#F5F7FA',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  
  // Accent
  blue: '#3B82F6',
  blueLight: '#60A5FA',
  
  // Status
  green: '#22C55E',
  red: '#EF4444',
  yellow: '#F59E0B',
  
  // Gradients
  gradientStart: '#667EEA',
  gradientEnd: '#764BA2',
}
```

### Step 2.2: Tamagui Configuration

```typescript
// tamagui.config.ts
import { createTamagui, createTokens } from '@tamagui/core'
import { shorthands } from '@tamagui/shorthands'
import { themes, tokens } from '@tamagui/themes'
import { colors } from './constants/colors'

const customTokens = createTokens({
  color: {
    ...colors,
  },
  // ... other tokens
})

export default createTamagui({
  themes: {
    dark: {
      background: colors.dark,
      color: colors.textPrimary,
      // ... match web theme
    }
  },
  tokens: customTokens,
  shorthands,
})
```

## Phase 3: Supabase Integration

### Step 3.1: Supabase Client Setup

```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Environment Setup:**

```javascript
// app.config.js
export default {
  expo: {
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY, // ✅ SAFE
      // NEVER add SERVICE_ROLE key here ❌
    }
  }
}
```

### Step 3.2: Auth Context

```typescript
// lib/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>(undefined!)

export function AuthProvider({ children }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (email, password, fullName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) throw error
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
```

## Phase 4: Core Screens

### Step 4.1: Sign In Screen

```typescript
// app/(auth)/signin.tsx
import { useState } from 'react'
import { YStack, Input, Button, Text, Card } from 'tamagui'
import { useAuth } from '@/lib/auth-context'
import { router } from 'expo-router'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn(email, password)
      router.replace('/(tabs)')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <YStack f={1} bg="$dark" ai="center" jc="center" p="$4">
      <Card elevate p="$6" w="100%" maxWidth={400}>
        <Text fontSize={32} fontWeight="bold" mb="$4">Sign In</Text>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mb="$3"
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          mb="$4"
        />
        <Button
          onPress={handleSignIn}
          disabled={loading}
          bg="$blue"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </Card>
    </YStack>
  )
}
```

### Step 4.2: Alerts List Screen

```typescript
// app/(tabs)/index.tsx
import { useEffect, useState } from 'react'
import { FlatList } from 'react-native'
import { YStack, Card, Text, Badge, Button } from 'tamagui'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Bell, Plus } from 'lucide-react-native'

export default function AlertsScreen() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    
    // Subscribe to realtime changes
    const subscription = supabase
      .channel('alerts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchAlerts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
    
    if (!error) setAlerts(data)
    setLoading(false)
  }

  const renderAlert = ({ item }) => (
    <Card elevate m="$2" p="$4">
      <Text fontSize={18} fontWeight="bold">{item.symbol}</Text>
      <Badge>{item.condition_type}</Badge>
      <Text>Threshold: {item.condition_value}</Text>
      <Text color="$textSecondary">
        {item.is_active ? 'Active' : 'Inactive'}
      </Text>
    </Card>
  )

  return (
    <YStack f={1} bg="$dark">
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={fetchAlerts}
      />
    </YStack>
  )
}
```

### Step 4.3: Settings Screen

```typescript
// app/(tabs)/settings.tsx
import { YStack, Switch, Text, Card, Button } from 'tamagui'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramNotifications, setTelegramNotifications] = useState(false)

  // Load settings and save logic similar to web app
  
  return (
    <YStack f={1} bg="$dark" p="$4">
      <Text fontSize={24} fontWeight="bold" mb="$4">Settings</Text>
      
      <Card p="$4" mb="$3">
        <Text mb="$2">Email Notifications</Text>
        <Switch
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
        />
      </Card>

      <Card p="$4" mb="$3">
        <Text mb="$2">Telegram Notifications</Text>
        <Switch
          checked={telegramNotifications}
          onCheckedChange={setTelegramNotifications}
        />
      </Card>

      <Button onPress={signOut} bg="$red" mt="$4">
        Sign Out
      </Button>
    </YStack>
  )
}
```

### Step 4.4: Admin Audit Trail (If Admin)

```typescript
// app/(tabs)/admin.tsx
import { useEffect, useState } from 'react'
import { FlatList } from 'react-native'
import { YStack, Card, Text, Input } from 'tamagui'
import { supabase } from '@/lib/supabase'

export default function AdminScreen() {
  const [auditData, setAuditData] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .single()
    
    setIsAdmin(profile?.is_admin || false)
    if (profile?.is_admin) {
      fetchAuditTrail()
    }
  }

  const fetchAuditTrail = async () => {
    // Call your API endpoint (needs to use SERVICE_ROLE server-side)
    const response = await fetch('YOUR_API_URL/admin/audit-trail', {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    })
    const data = await response.json()
    setAuditData(data.data)
  }

  if (!isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center">
        <Text>Access Denied</Text>
      </YStack>
    )
  }

  return (
    <YStack f={1} bg="$dark" p="$4">
      <Text fontSize={24} fontWeight="bold" mb="$4">Audit Trail</Text>
      <FlatList
        data={auditData}
        renderItem={({ item }) => (
          <Card p="$3" mb="$2">
            <Text fontWeight="bold">{item.symbol}</Text>
            <Text fontSize={12}>{new Date(item.triggered_at).toLocaleString()}</Text>
            <Text>Prev RSI: {item.previous_rsi?.toFixed(2)}</Text>
            <Text>Curr RSI: {item.current_rsi?.toFixed(2)}</Text>
          </Card>
        )}
        keyExtractor={item => item.id}
      />
    </YStack>
  )
}
```

## Phase 5: Navigation & Routing

### Step 5.1: Root Layout

```typescript
// app/_layout.tsx
import { Slot } from 'expo-router'
import { TamaguiProvider } from 'tamagui'
import { AuthProvider } from '@/lib/auth-context'
import config from '../tamagui.config'

export default function RootLayout() {
  return (
    <TamaguiProvider config={config} defaultTheme="dark">
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </TamaguiProvider>
  )
}
```

### Step 5.2: Protected Routes

```typescript
// app/(tabs)/_layout.tsx
import { Tabs, Redirect } from 'expo-router'
import { useAuth } from '@/lib/auth-context'
import { Bell, Settings, Shield } from 'lucide-react-native'

export default function TabsLayout() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Redirect href="/(auth)/signin" />

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1E293B' },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <Bell color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <Shield color={color} />,
          href: null, // Hidden by default, shown conditionally
        }}
      />
    </Tabs>
  )
}
```

## Phase 6: Offline Support & Caching

### Step 6.1: AsyncStorage Caching

```typescript
// lib/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export const cache = {
  async set(key: string, value: any) {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  },
  
  async get(key: string) {
    const value = await AsyncStorage.getItem(key)
    return value ? JSON.parse(value) : null
  },
  
  async remove(key: string) {
    await AsyncStorage.removeItem(key)
  }
}

// Usage in components
const fetchAlertsWithCache = async () => {
  // Try cache first
  const cached = await cache.get('alerts')
  if (cached) setAlerts(cached)
  
  // Fetch fresh data
  const { data } = await supabase.from('alerts').select('*')
  if (data) {
    setAlerts(data)
    await cache.set('alerts', data)
  }
}
```

## Phase 7: Future: Push Notifications Setup (Reserved)

```typescript
// lib/notifications.ts (for future implementation)
import * as Notifications from 'expo-notifications'
import { supabase } from './supabase'

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') return
  
  const token = (await Notifications.getExpoPushTokenAsync()).data
  
  // Store token in Supabase profiles
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
}
```

## Security Checklist

✅ **NEVER include these in mobile app:**

- Service Role key
- Database passwords
- API secrets
- Private keys

✅ **Safe to include:**

- Supabase URL
- Supabase Anon/Public key
- Public API endpoints

✅ **For admin operations:**

- Create serverless functions (Supabase Edge Functions or Vercel)
- Use SERVICE_ROLE in backend only
- Mobile app calls authenticated API endpoints
- Verify user permissions server-side

✅ **RLS Policies protect everything:**

- Users can only see their own alerts
- Admins checked server-side in API
- Mobile app respects all existing policies

## Testing Strategy

1. **iOS**: `npx expo run:ios`
2. **Android**: `npx expo run:android`
3. **Expo Go**: `npx expo start` (for quick testing)

## Deployment

1. **Build iOS**: `eas build --platform ios`
2. **Build Android**: `eas build --platform android`
3. **Submit to stores**: `eas submit`

## Summary

This mobile app will:

- ✅ Match web app UI/UX with mobile optimizations
- ✅ Use same theme and color palette
- ✅ Be secure (no Service Role key exposure)
- ✅ Work on iOS and Android via Expo
- ✅ Use Tamagui for modern, performant UI
- ✅ Support all web app features
- ✅ Handle authentication via Supabase
- ✅ Cache data for basic offline support
- ✅ Be ready for push notifications in future