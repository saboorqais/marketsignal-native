import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert as RNAlert } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useStore } from '@/lib/store'
import { cache } from '@/lib/cache'
import { Alert as AlertType } from '@/types'
import { colors } from '@/constants/colors'
import { format } from 'date-fns'
import CreateAlertModal from '@/components/alerts/CreateAlertModal'

export default function AlertsScreen() {
  const { user } = useAuth()
  const { alerts, setAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAlerts()
      setupRealtimeSubscription()
    }
  }, [user])

  const fetchAlerts = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        // Load from cache first
        const cached = await cache.get<AlertType[]>('alerts')
        if (cached && cached.length > 0) {
          setAlerts(cached)
        }
      }

      // Fetch fresh data
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (data) {
        setAlerts(data)
        await cache.set('alerts', data)
      }
    } catch (error: any) {
      console.error('Error fetching alerts:', error)
      RNAlert.alert('Error', 'Failed to load alerts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const setupRealtimeSubscription = () => {
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
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchAlerts(true)
  }

  const toggleAlertStatus = async (alert: AlertType) => {
    try {
      // Optimistic update - update UI immediately
      const updatedAlerts = alerts.map(a => 
        a.id === alert.id ? { ...a, is_active: !a.is_active } : a
      )
      setAlerts(updatedAlerts)
      await cache.set('alerts', updatedAlerts)
      
      // Update database
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: !alert.is_active })
        .eq('id', alert.id)

      if (error) {
        // Revert on error
        setAlerts(alerts)
        await cache.set('alerts', alerts)
        throw error
      }
    } catch (error: any) {
      console.error('Error toggling alert:', error)
      RNAlert.alert('Error', 'Failed to update alert status')
    }
  }

  const deleteAlert = async (alert: AlertType) => {
    RNAlert.alert(
      'Delete Alert',
      `Are you sure you want to delete the alert for ${alert.symbol}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic delete - remove from UI immediately
              const updatedAlerts = alerts.filter(a => a.id !== alert.id)
              setAlerts(updatedAlerts)
              await cache.set('alerts', updatedAlerts)
              
              // Delete from database
              const { error } = await supabase
                .from('alerts')
                .delete()
                .eq('id', alert.id)

              if (error) {
                // Revert on error
                setAlerts(alerts)
                await cache.set('alerts', alerts)
                throw error
              }
              
              // Refetch to ensure sync
              await fetchAlerts(true)
            } catch (error: any) {
              console.error('Error deleting alert:', error)
              RNAlert.alert('Error', 'Failed to delete alert')
            }
          }
        }
      ]
    )
  }

  const getConditionDisplay = (alert: AlertType) => {
    const value = alert.condition_type.startsWith('price')
      ? `$${alert.condition_value.toLocaleString()}`
      : alert.condition_value.toString()
    
    const textMap: Record<string, string> = {
      'price_above': `Price ≥ ${value}`,
      'price_below': `Price ≤ ${value}`,
      'price_cross_above': `Price crosses ↗ ${value}`,
      'price_cross_below': `Price crosses ↘ ${value}`,
      'rsi_above': `RSI ≥ ${value}`,
      'rsi_below': `RSI ≤ ${value}`,
      'rsi_cross_above': `RSI crosses ↗ ${value}`,
      'rsi_cross_below': `RSI crosses ↘ ${value}`,
    }
    
    return textMap[alert.condition_type] || alert.condition_type
  }

  const getAlertTypeBadge = (alert: AlertType) => {
    if (alert.condition_type.includes('cross')) {
      return { label: 'Cross', color: colors.yellow }
    }
    return { label: 'Threshold', color: colors.blue }
  }

  const renderAlert = ({ item }: { item: AlertType }) => {
    const badge = getAlertTypeBadge(item)
    
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.symbolContainer}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.assetBadge, { backgroundColor: colors.blue + '30' }]}>
                <Text style={styles.badgeText}>{item.asset_type?.toUpperCase() || 'CRYPTO'}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: badge.color + '30' }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, item.is_active ? styles.activeButton : styles.inactiveButton]}
              onPress={() => toggleAlertStatus(item)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={item.is_active ? 'pause-circle' : 'play-circle'} 
                size={24} 
                color={item.is_active ? colors.green : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, styles.deleteButton]}
              onPress={() => deleteAlert(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={22} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.conditionRow}>
          <MaterialCommunityIcons 
            name={item.condition_type.includes('price') ? 'currency-usd' : 'chart-line'} 
            size={16} 
            color={colors.blue}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.conditionText}>{getConditionDisplay(item)}</Text>
        </View>
        
        <View style={styles.alertDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailRowIcon}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Timeframe:</Text>
            </View>
            <Text style={styles.detailValue}>{item.metadata?.timeframe?.toUpperCase() || '15M'}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={styles.detailRowIcon}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Created:</Text>
            </View>
            <Text style={styles.detailValue}>
              {format(new Date(item.created_at), 'MMM dd, yyyy')}
            </Text>
          </View>
          {item.triggered_at && (
            <View style={styles.detailRow}>
              <View style={styles.detailRowIcon}>
                <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.detailLabel}>Last Triggered:</Text>
              </View>
              <Text style={styles.detailValue}>
                {format(new Date(item.triggered_at), 'MMM dd, HH:mm')}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <View style={styles.detailRowIcon}>
              <Ionicons 
                name={item.notification_email ? 'checkmark-circle' : 'close-circle-outline'} 
                size={14} 
                color={item.notification_email ? colors.green : colors.textTertiary} 
              />
              <Text style={styles.detailLabel}>Email</Text>
            </View>
            <View style={styles.detailRowIcon}>
              <Ionicons 
                name={item.notification_telegram ? 'checkmark-circle' : 'close-circle-outline'} 
                size={14} 
                color={item.notification_telegram ? colors.green : colors.textTertiary}
              />
              <Text style={styles.detailLabel}>Telegram</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Alerts Yet</Text>
      <Text style={styles.emptyText}>
        Create your first alert to start monitoring market signals
      </Text>
    </View>
  )

  if (loading && alerts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Alerts</Text>
        <Text style={styles.headerSubtitle}>{alerts.length} alert(s)</Text>
      </View>
      
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={item => item.id}
        contentContainerStyle={alerts.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.blue}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Create Alert Modal */}
      <CreateAlertModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          fetchAlerts(true)
        }}
      />
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  alertCard: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbolContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  assetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.blue,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeButton: {
    backgroundColor: colors.green + '15',
    borderColor: colors.green + '40',
  },
  inactiveButton: {
    backgroundColor: colors.textTertiary + '15',
    borderColor: colors.textTertiary + '40',
  },
  deleteButton: {
    backgroundColor: colors.red + '15',
    borderColor: colors.red + '40',
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
    flex: 1,
  },
  alertDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '20',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailRowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '300',
  },
})
