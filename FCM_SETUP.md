# Firebase Cloud Messaging (FCM) Setup Guide

Complete implementation of push notifications using Expo and FCM for Market Signal mobile app.

---

## 📦 Installation

### Step 1: Install Required Packages

```bash
cd /Users/abdulsaboor/Desktop/fLance/marketsignal-native

# Install Expo notifications
npx expo install expo-notifications expo-device

# expo-constants is already installed
```

### Step 2: Update app.config.js

Add notification configuration:

```javascript
// app.config.js
module.exports = {
  expo: {
    // ... existing config
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#3B82F6',
          sounds: ['./assets/sounds/notification.wav'], // optional
        },
      ],
    ],
    notification: {
      icon: './assets/images/notification-icon.png', // Android only
      color: '#3B82F6',
      androidMode: 'default',
      androidCollapsedTitle: 'Market Signal',
    },
    // iOS specific
    ios: {
      // ... existing ios config
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
    },
    // Android specific
    android: {
      // ... existing android config
      googleServicesFile: './google-services.json', // Add if using FCM directly
    },
  },
}
```

---

## 🔧 Supabase Database Setup

### Update profiles table:

```sql
-- Add columns for push notifications
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS device_tokens TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_push_token TEXT,
ADD COLUMN IF NOT EXISTS push_notification_enabled BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_device_tokens ON profiles USING GIN (device_tokens);
```

---

## 🚀 Implementation

### Step 1: Initialize Notifications on App Start

Update `app/_layout.tsx`:

```typescript
import { useEffect } from 'react'
import { setupNotificationListeners } from '@/lib/notifications'

export default function RootLayout() {
  // ... existing code

  useEffect(() => {
    // Set up notification listeners
    const cleanup = setupNotificationListeners()
    
    return () => {
      cleanup()
    }
  }, [])

  // ... rest of component
}
```

### Step 2: Request Permissions After Login

Update `lib/auth-context.tsx` to request permissions after successful sign in:

```typescript
import { registerForPushNotifications } from './notifications'

// In your signIn function:
const signIn = async (email: string, password: string) => {
  const { error, data } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  
  // Register for push notifications after successful sign in
  if (data.user) {
    setTimeout(() => {
      registerForPushNotifications(data.user.id)
    }, 2000) // Small delay to let app fully load
  }
}
```

### Step 3: Add Settings Toggle

Update `app/(tabs)/settings.tsx` to include push notification toggle:

```typescript
import { 
  registerForPushNotifications, 
  unregisterPushNotifications,
  scheduleTestNotification 
} from '@/lib/notifications'

// Add state
const [pushNotifications, setPushNotifications] = useState(false)

// Load setting
useEffect(() => {
  if (profile) {
    setPushNotifications(profile.push_notification_enabled ?? false)
  }
}, [profile])

// Toggle handler
const handlePushToggle = async (value: boolean) => {
  setPushNotifications(value)
  
  if (value) {
    const success = await registerForPushNotifications(user?.id!)
    if (success) {
      fetchProfile() // Refresh profile
    } else {
      setPushNotifications(false)
      Alert.alert('Error', 'Failed to enable push notifications')
    }
  } else {
    await unregisterPushNotifications(user?.id!)
    fetchProfile()
  }
}

// Add to your settings UI:
<View style={styles.settingRow}>
  <View style={styles.settingInfo}>
    <Text style={styles.settingTitle}>Push Notifications</Text>
    <Text style={styles.settingDescription}>
      Receive instant alerts on your device
    </Text>
  </View>
  <Switch
    value={pushNotifications}
    onValueChange={handlePushToggle}
    trackColor={{ false: colors.textTertiary, true: colors.blue }}
    thumbColor={colors.textPrimary}
  />
</View>

{/* Test button (development only) */}
<TouchableOpacity 
  style={styles.testButton}
  onPress={scheduleTestNotification}
>
  <Text>Send Test Notification</Text>
</TouchableOpacity>
```

---

## 📱 Platform-Specific Setup

### iOS Setup (for standalone builds)

1. **Apple Developer Account** required
2. **Push Notification Capability** - Enabled automatically by Expo
3. **APNs Key** - Expo handles this automatically

For EAS Build:

```bash
eas build:configure
eas credentials
```

### Android Setup

#### Option 1: Expo's Push Notification Service (Easiest)
- ✅ No FCM setup needed
- ✅ Works out of the box
- ✅ Expo handles everything

#### Option 2: Google FCM (Advanced)

1. **Create Firebase Project**: https://console.firebase.google.com
2. **Download google-services.json**: Place in project root
3. **Get Server Key**: Project Settings → Cloud Messaging
4. **Store Server Key**: Keep secure for backend use

```bash
# Add google-services.json to .gitignore
echo "google-services.json" >> .gitignore
```

---

## 📤 Sending Notifications

### Option 1: Using Expo Push Notification Service

```typescript
// Backend code (Node.js/Supabase Edge Function)
async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: any) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    badge: 1,
  }

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })
}

// Example usage
sendPushNotification(
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  'Market Signal Alert! 📊',
  'BTC price crossed above $50,000',
  { screen: 'alerts', alertId: '123' }
)
```

### Option 2: Using FCM Directly

```typescript
// Backend code with FCM
import admin from 'firebase-admin'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

async function sendFCMNotification(deviceToken: string, title: string, body: string) {
  await admin.messaging().send({
    token: deviceToken,
    notification: {
      title: title,
      body: body,
    },
    data: {
      screen: 'alerts',
      alertId: '123'
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        color: '#3B82F6',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  })
}
```

---

## 🔔 Supabase Edge Function Example

Create a Supabase Edge Function to send notifications:

```typescript
// supabase/functions/send-alert-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json()
    
    // Get user's device tokens
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('device_tokens, push_notification_enabled')
      .eq('id', userId)
      .single()
    
    if (!profile?.push_notification_enabled || !profile.device_tokens?.length) {
      return new Response(JSON.stringify({ message: 'No active devices' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // Send to all user's devices
    const messages = profile.device_tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
    }))
    
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

---

## 🧪 Testing

### Test on Physical Device

1. **Install Expo Go** or build development client
2. **Run app**: `npm start`
3. **Sign in** to trigger permission request
4. **Accept permissions** when prompted
5. **Check database**: Verify token is stored in `profiles.device_tokens`
6. **Send test notification** using the test button in settings

### Test Notification

```bash
# Using Expo's push notification tool
npx expo push:send --token="ExponentPushToken[YOUR_TOKEN_HERE]" --title="Test" --body="Hello!"
```

Or use: https://expo.dev/notifications

---

## 🐛 Troubleshooting

### Permissions Not Requested
- Only works on physical devices (not simulators)
- Check `Device.isDevice` is true

### Token Not Saved
- Check Supabase connection
- Verify `device_tokens` column exists and is `text[]`
- Check console logs for errors

### Notifications Not Received
- Verify token is valid
- Check notification permissions are granted
- Ensure app is in background (foreground notifications configured separately)
- Check FCM/Expo dashboard for delivery status

### iOS Issues
- Ensure you have Apple Developer account
- Check provisioning profile includes push notifications
- Verify APNs is set up (automatic with EAS)

### Android Issues
- Check `google-services.json` if using FCM
- Verify notification channel is created
- Check Android notification settings

---

## 📊 Database Schema

```sql
-- profiles table structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT TRUE,
  telegram_notifications BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,
  push_notification_enabled BOOLEAN DEFAULT FALSE,
  
  -- Device tokens (multiple devices per user)
  device_tokens TEXT[] DEFAULT '{}',
  last_push_token TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Security Best Practices

1. **Never expose FCM Server Key** in client code
2. **Validate tokens** before sending notifications
3. **Rate limit** notification sends
4. **Remove expired tokens** periodically
5. **Use RLS policies** to protect device_tokens column

```sql
-- RLS policy for device_tokens
CREATE POLICY "Users can update own device tokens"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

## 📚 Resources

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Expo Push Notification Tool](https://expo.dev/notifications)

---

## ✅ Checklist

Before deploying:

- [ ] Install required packages
- [ ] Update app.config.js
- [ ] Add database columns
- [ ] Implement notification service
- [ ] Add permission request on login
- [ ] Add settings toggle
- [ ] Test on physical device
- [ ] Set up backend notification sending
- [ ] Configure FCM (if needed)
- [ ] Test notification delivery
- [ ] Handle notification taps
- [ ] Set up badge management
- [ ] Test on both iOS and Android

---

**Push notifications are now fully integrated! 🎉**


