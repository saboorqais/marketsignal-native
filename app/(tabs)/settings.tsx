import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { router } from 'expo-router'
import { colors } from '@/constants/colors'
import { 
  registerForPushNotifications, 
  unregisterPushNotifications,
  scheduleTestNotification 
} from '@/lib/notifications'

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const { profile, setProfile } = useStore()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramNotifications, setTelegramNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setProfile(data)
        setEmailNotifications(data.email_notifications ?? true)
        setTelegramNotifications(data.telegram_notifications ?? false)
        setPushNotifications(data.push_notification_enabled ?? false)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const updateNotificationSetting = async (field: string, value: boolean) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user?.id)
      
      if (error) throw error
      
      fetchProfile() // Refresh profile
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailToggle = (value: boolean) => {
    setEmailNotifications(value)
    updateNotificationSetting('email_notifications', value)
  }

  const handleTelegramToggle = (value: boolean) => {
    setTelegramNotifications(value)
    updateNotificationSetting('telegram_notifications', value)
  }

  const handlePushToggle = async (value: boolean) => {
    setLoading(true)
    setPushNotifications(value)
    
    try {
      if (value) {
        const success = await registerForPushNotifications(user?.id!)
        if (success) {
          await fetchProfile() // Refresh profile
          Alert.alert('Success', 'Push notifications enabled! You will now receive instant alerts.')
        } else {
          setPushNotifications(false)
          Alert.alert('Error', 'Failed to enable push notifications. Please check your device settings.')
        }
      } else {
        await unregisterPushNotifications(user?.id!)
        await fetchProfile()
        Alert.alert('Disabled', 'Push notifications have been disabled.')
      }
    } catch (error) {
      setPushNotifications(!value)
      Alert.alert('Error', 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut()
              router.replace('/(auth)/signin')
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out')
            }
          }
        }
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{profile?.full_name || 'Not set'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
            {profile?.is_admin && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminText}>Admin</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alert notifications via email
                </Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={handleEmailToggle}
                trackColor={{ false: colors.textTertiary, true: colors.blue }}
                thumbColor={colors.textPrimary}
                disabled={loading}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Telegram Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alert notifications via Telegram
                </Text>
              </View>
              <Switch
                value={telegramNotifications}
                onValueChange={handleTelegramToggle}
                trackColor={{ false: colors.textTertiary, true: colors.blue }}
                thumbColor={colors.textPrimary}
                disabled={loading}
              />
            </View>
            
            <View style={styles.divider} />
            
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
                disabled={loading}
              />
            </View>
          </View>
        </View>

        {/* Test Notification (Development Only) */}
        {__DEV__ && pushNotifications && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => {
                scheduleTestNotification()
                Alert.alert('Scheduled', 'Test notification will appear in 2 seconds')
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.blue} />
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Market Signal v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.darkSecondary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  adminBadge: {
    backgroundColor: colors.blue + '30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
  },
  divider: {
    height: 1,
    backgroundColor: colors.textTertiary + '20',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signOutButton: {
    backgroundColor: colors.red,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue + '20',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.blue + '40',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
  },
})

