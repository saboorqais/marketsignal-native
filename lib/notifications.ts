import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from './supabase'

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export interface NotificationPermissionStatus {
  granted: boolean
  canAskAgain: boolean
  status: string
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  try {
    // Only request permissions on physical devices
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices')
      return {
        granted: false,
        canAskAgain: false,
        status: 'not_available_on_simulator',
      }
    }

    // Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // If not granted, request permission
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    // For iOS, we need to set up notification categories if needed
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('default', [])
    }

    return {
      granted: finalStatus === 'granted',
      canAskAgain: finalStatus !== 'denied',
      status: finalStatus,
    }
  } catch (error) {
    console.error('Error requesting notification permissions:', error)
    return {
      granted: false,
      canAskAgain: false,
      status: 'error',
    }
  }
}

/**
 * Get the Expo Push Token (works with FCM)
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Push tokens only available on physical devices')
      return null
    }

    // Get the Expo push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })

    return token.data
  } catch (error) {
    console.error('Error getting push token:', error)
    return null
  }
}

/**
 * Get native device push token (FCM for Android, APNs for iOS)
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null
    }

    const token = await Notifications.getDevicePushTokenAsync()
    return token.data
  } catch (error) {
    console.error('Error getting device push token:', error)
    return null
  }
}

/**
 * Register device for push notifications and store token in Supabase
 */
export async function registerForPushNotifications(userId: string): Promise<boolean> {
  try {
    // Request permissions first
    const { granted } = await requestNotificationPermissions()
    
    if (!granted) {
      console.log('Notification permissions not granted')
      return false
    }

    // Get both Expo and device tokens
    const [expoPushToken, devicePushToken] = await Promise.all([
      getExpoPushToken(),
      getDevicePushToken(),
    ])

    if (!expoPushToken) {
      console.error('Failed to get push token')
      return false
    }

    // Get existing tokens from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('device_tokens')
      .eq('id', userId)
      .single()

    const existingTokens = profile?.device_tokens || []

    // Add new token if it doesn't exist
    const updatedTokens = existingTokens.includes(expoPushToken)
      ? existingTokens
      : [...existingTokens, expoPushToken]

    // Store in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        device_tokens: updatedTokens,
        last_push_token: expoPushToken,
        push_notification_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error storing push token:', error)
      return false
    }

    console.log('✅ Push notification registered successfully')
    console.log('Expo Push Token:', expoPushToken)
    if (devicePushToken) {
      console.log('Device Push Token:', devicePushToken)
    }

    return true
  } catch (error) {
    console.error('Error registering for push notifications:', error)
    return false
  }
}

/**
 * Unregister device from push notifications
 */
export async function unregisterPushNotifications(userId: string): Promise<boolean> {
  try {
    const token = await getExpoPushToken()
    
    if (!token) {
      return false
    }

    // Get existing tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('device_tokens')
      .eq('id', userId)
      .single()

    const existingTokens = profile?.device_tokens || []

    // Remove current token
    const updatedTokens = existingTokens.filter((t: string) => t !== token)

    // Update database
    const { error } = await supabase
      .from('profiles')
      .update({
        device_tokens: updatedTokens,
        push_notification_enabled: updatedTokens.length > 0,
      })
      .eq('id', userId)

    if (error) {
      console.error('Error unregistering push token:', error)
      return false
    }

    console.log('✅ Push notification unregistered')
    return true
  } catch (error) {
    console.error('Error unregistering push notifications:', error)
    return false
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners() {
  // Notification received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📬 Notification received:', notification)
    // You can handle the notification here
  })

  // User tapped on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification tapped:', response)
    
    // Handle navigation based on notification data
    const data = response.notification.request.content.data
    
    // Example: Navigate to specific screen based on notification
    if (data?.screen) {
      // Navigate to screen
      console.log('Navigate to:', data.screen)
    }
  })

  // Return cleanup function
  return () => {
    notificationListener.remove()
    responseListener.remove()
  }
}

/**
 * Schedule a local test notification
 */
export async function scheduleTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Market Signal Alert! 📊',
        body: 'BTC price crossed above $50,000',
        data: { screen: 'alerts', alertId: 'test-123' },
      },
      trigger: null, // Show immediately
    })
    
    console.log('✅ Test notification scheduled')
  } catch (error) {
    console.error('Error scheduling test notification:', error)
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync()
  } catch (error) {
    console.error('Error getting badge count:', error)
    return 0
  }
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count)
  } catch (error) {
    console.error('Error setting badge count:', error)
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync()
    await setBadgeCount(0)
  } catch (error) {
    console.error('Error clearing notifications:', error)
  }
}

