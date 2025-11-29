import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { useStore } from '@/lib/store'
import { colors } from '@/constants/colors'

export default function DashboardScreen() {
  const { user } = useAuth()
  const { alerts, profile } = useStore()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    byAssetType: {
      crypto: 0,
      stock: 0,
      forex: 0,
    },
    byCondition: {
      price: 0,
      rsi: 0,
    },
    byNotification: {
      email: 0,
      telegram: 0,
      both: 0,
    },
  })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    calculateStats()
  }, [alerts])

  const calculateStats = () => {
    const total = alerts.length
    const active = alerts.filter(a => a.is_active).length
    const paused = total - active
    
    const byAssetType = {
      crypto: alerts.filter(a => a.asset_type === 'crypto').length,
      stock: alerts.filter(a => a.asset_type === 'stock').length,
      forex: alerts.filter(a => a.asset_type === 'forex').length,
    }
    
    const byCondition = {
      price: alerts.filter(a => a.condition_type?.startsWith('price')).length,
      rsi: alerts.filter(a => a.condition_type?.startsWith('rsi')).length,
    }
    
    const byNotification = {
      email: alerts.filter(a => a.notification_email).length,
      telegram: alerts.filter(a => a.notification_telegram).length,
      both: alerts.filter(a => a.notification_email && a.notification_telegram).length,
    }

    setStats({
      total,
      active,
      paused,
      byAssetType,
      byCondition,
      byNotification,
    })
  }

  const onRefresh = async () => {
    setRefreshing(true)
    // Trigger refetch in alerts screen via store
    calculateStats()
    setRefreshing(false)
  }

  const DistributionRow = ({ icon, iconFamily = 'Ionicons', label, value, total, color }: any) => {
    const IconComponent = iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    
    return (
      <View style={styles.distributionRow}>
        <View style={styles.distributionLeft}>
          <IconComponent name={icon} size={20} color={color} />
          <Text style={styles.distributionLabel}>{label}</Text>
        </View>
        <View style={styles.distributionRight}>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${percentage}%`, backgroundColor: color }
              ]} 
            />
          </View>
          <Text style={styles.distributionValue}>{value}</Text>
          <Text style={styles.distributionPercentage}>({percentage}%)</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Overview of your alerts</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.blue}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.miniStatCard, { borderLeftColor: colors.blue }]}>
              <Text style={styles.miniStatValue}>{stats.total}</Text>
              <Text style={styles.miniStatLabel}>Total</Text>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: colors.green }]}>
              <Text style={styles.miniStatValue}>{stats.active}</Text>
              <Text style={styles.miniStatLabel}>Active</Text>
            </View>
            <View style={[styles.miniStatCard, { borderLeftColor: colors.textTertiary }]}>
              <Text style={styles.miniStatValue}>{stats.paused}</Text>
              <Text style={styles.miniStatLabel}>Paused</Text>
            </View>
          </View>
        </View>

        {/* Asset Type Distribution */}
        {stats.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Asset Type</Text>
            <View style={styles.distributionCard}>
              <DistributionRow
                icon="logo-bitcoin"
                iconFamily="Ionicons"
                label="Cryptocurrency"
                value={stats.byAssetType.crypto}
                total={stats.total}
                color={colors.yellow}
              />
              <View style={styles.divider} />
              <DistributionRow
                icon="trending-up"
                iconFamily="Ionicons"
                label="Stocks"
                value={stats.byAssetType.stock}
                total={stats.total}
                color={colors.blue}
              />
              <View style={styles.divider} />
              <DistributionRow
                icon="cash"
                iconFamily="Ionicons"
                label="Forex"
                value={stats.byAssetType.forex}
                total={stats.total}
                color={colors.green}
              />
            </View>
          </View>
        )}

        {/* Condition Type Distribution */}
        {stats.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Signal Type</Text>
            <View style={styles.distributionCard}>
              <DistributionRow
                icon="currency-usd"
                iconFamily="MaterialCommunityIcons"
                label="Price Alerts"
                value={stats.byCondition.price}
                total={stats.total}
                color={colors.blue}
              />
              <View style={styles.divider} />
              <DistributionRow
                icon="chart-line"
                iconFamily="MaterialCommunityIcons"
                label="RSI Alerts"
                value={stats.byCondition.rsi}
                total={stats.total}
                color={colors.blueLight}
              />
            </View>
          </View>
        )}

        {/* Notification Distribution */}
        {stats.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Notification Method</Text>
            <View style={styles.distributionCard}>
              <DistributionRow
                icon="mail"
                iconFamily="Ionicons"
                label="Email Only"
                value={stats.byNotification.email - stats.byNotification.both}
                total={stats.total}
                color={colors.blue}
              />
              <View style={styles.divider} />
              <DistributionRow
                icon="send"
                iconFamily="Ionicons"
                label="Telegram Only"
                value={stats.byNotification.telegram - stats.byNotification.both}
                total={stats.total}
                color={colors.blueLight}
              />
              <View style={styles.divider} />
              <DistributionRow
                icon="notifications"
                iconFamily="Ionicons"
                label="Both Methods"
                value={stats.byNotification.both}
                total={stats.total}
                color={colors.green}
              />
            </View>
          </View>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={80} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>
              Create your first alert to see analytics and statistics
            </Text>
          </View>
        )}
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  miniStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  distributionCard: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
  },
  distributionRow: {
    paddingVertical: 12,
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  distributionLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  distributionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.dark,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    minWidth: 30,
    textAlign: 'right',
  },
  distributionPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 45,
  },
  divider: {
    height: 1,
    backgroundColor: colors.textTertiary + '20',
    marginVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
})

