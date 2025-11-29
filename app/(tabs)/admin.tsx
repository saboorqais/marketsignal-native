import { useState, useEffect } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { AuditTrailEntry } from '@/types'
import { colors } from '@/constants/colors'
import { format } from 'date-fns'

export default function AdminScreen() {
  const { profile } = useStore()
  const [auditData, setAuditData] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (profile?.is_admin) {
      fetchAuditTrail()
    } else {
      setLoading(false)
    }
  }, [profile])

  const fetchAuditTrail = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)

      const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(100)

      if (error) throw error

      if (data) {
        setAuditData(data)
      }
    } catch (error: any) {
      console.error('Error fetching audit trail:', error)
      Alert.alert('Error', 'Failed to load audit trail')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    fetchAuditTrail(true)
  }

  const renderAuditEntry = ({ item }: { item: AuditTrailEntry }) => (
    <View style={styles.auditCard}>
      <View style={styles.auditHeader}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <View style={[
          styles.badge,
          item.notification_sent ? styles.sentBadge : styles.pendingBadge
        ]}>
          <Text style={styles.badgeText}>
            {item.notification_sent ? 'Sent' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text style={styles.date}>
        {format(new Date(item.triggered_at), 'MMM dd, yyyy HH:mm:ss')}
      </Text>
      
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Condition</Text>
          <Text style={styles.detailValue}>{item.condition_type}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Threshold</Text>
          <Text style={styles.detailValue}>{item.condition_value}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Current Value</Text>
          <Text style={styles.detailValue}>{item.current_value?.toFixed(2)}</Text>
        </View>
        {item.current_rsi && (
          <>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Previous RSI</Text>
              <Text style={styles.detailValue}>{item.previous_rsi?.toFixed(2)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Current RSI</Text>
              <Text style={styles.detailValue}>{item.current_rsi?.toFixed(2)}</Text>
            </View>
          </>
        )}
      </View>

      {item.notification_method && (
        <View style={styles.methodRow}>
          <Text style={styles.methodLabel}>Method:</Text>
          <Text style={styles.methodValue}>{item.notification_method}</Text>
        </View>
      )}
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Audit Entries</Text>
      <Text style={styles.emptyText}>
        Triggered alerts will appear here
      </Text>
    </View>
  )

  if (!profile?.is_admin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            This section is only available to administrators
          </Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Audit Trail</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading audit trail...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Audit Trail</Text>
        <Text style={styles.headerSubtitle}>{auditData.length} entries</Text>
      </View>
      
      <FlatList
        data={auditData}
        renderItem={renderAuditEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={auditData.length === 0 ? styles.emptyContainer : styles.listContent}
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
  auditCard: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sentBadge: {
    backgroundColor: colors.green + '20',
  },
  pendingBadge: {
    backgroundColor: colors.yellow + '20',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '20',
    paddingTop: 12,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.textTertiary + '20',
  },
  methodLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  methodValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.red,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})

