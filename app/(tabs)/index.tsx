import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useStore } from '@/lib/store'
import { cache } from '@/lib/cache'
import { Alert as AlertType } from '@/types'
import { colors } from '@/constants/colors'
import { format } from 'date-fns'

export default function AlertsScreen() {
  const { user } = useAuth()
  const { alerts, setAlerts } = useStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
      Alert.alert('Error', 'Failed to load alerts')
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
      const { error } = await supabase
        .from('alerts')
        .update({ is_active: !alert.is_active })
        .eq('id', alert.id)

      if (error) throw error
      
      // Update will be reflected via realtime subscription
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update alert status')
    }
  }

  const getConditionDisplay = (alert: AlertType) => {
    const typeMap: Record<string, string> = {
      'rsi_above': 'RSI Above',
      'rsi_below': 'RSI Below',
      'price_above': 'Price Above',
      'price_below': 'Price Below',
    }
    return typeMap[alert.condition_type] || alert.condition_type
  }

  const renderAlert = ({ item }: { item: AlertType }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.date}>
            {format(new Date(item.created_at), 'MMM dd, yyyy')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}
          onPress={() => toggleAlertStatus(item)}
        >
          <Text style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.alertDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Condition:</Text>
          <Text style={styles.detailValue}>{getConditionDisplay(item)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Threshold:</Text>
          <Text style={styles.detailValue}>{item.condition_value}</Text>
        </View>
      </View>
    </View>
  )

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
  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: colors.green + '20',
  },
  inactiveBadge: {
    backgroundColor: colors.textTertiary + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '20',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
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
})
