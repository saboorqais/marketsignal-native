import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { colors } from '@/constants/colors'

interface CreateAlertModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

type AlertType = 'threshold' | 'cross'
type SignalType = 'price' | 'rsi'
type AssetType = 'crypto' | 'stock' | 'forex'

export default function CreateAlertModal({ visible, onClose, onSuccess }: CreateAlertModalProps) {
  const { user } = useAuth()
  
  // Form state
  const [assetType, setAssetType] = useState<AssetType>('crypto')
  const [symbol, setSymbol] = useState('')
  const [alertType, setAlertType] = useState<AlertType>('threshold')
  const [signalType, setSignalType] = useState<SignalType>('price')
  const [operator, setOperator] = useState('above')
  const [conditionValue, setConditionValue] = useState('')
  const [timeframe, setTimeframe] = useState('15m')
  const [notificationEmail, setNotificationEmail] = useState(true)
  const [notificationTelegram, setNotificationTelegram] = useState(false)
  const [loading, setLoading] = useState(false)

  // Get operators based on alert type
  const getOperators = () => {
    if (alertType === 'cross') {
      return [
        { value: 'cross_above', label: 'Crosses Above', icon: '↗' },
        { value: 'cross_below', label: 'Crosses Below', icon: '↘' },
      ]
    } else {
      return [
        { value: 'above', label: 'Is Above', icon: '≥' },
        { value: 'below', label: 'Is Below', icon: '≤' },
      ]
    }
  }

  // Map frontend to backend condition_type
  const getConditionType = () => {
    if (alertType === 'cross') {
      const op = operator.replace('cross_', '')
      return `${signalType}_cross_${op}`
    } else {
      return `${signalType}_${operator}`
    }
  }

  // Validate form
  const validateForm = () => {
    if (!symbol.trim()) {
      Alert.alert('Error', 'Please enter a symbol')
      return false
    }
    if (!conditionValue.trim()) {
      Alert.alert('Error', 'Please enter a threshold value')
      return false
    }
    
    const value = parseFloat(conditionValue)
    if (isNaN(value)) {
      Alert.alert('Error', 'Please enter a valid number')
      return false
    }
    
    if (signalType === 'rsi') {
      if (value < 0 || value > 100) {
        Alert.alert('Error', 'RSI must be between 0 and 100')
        return false
      }
    } else {
      if (value <= 0) {
        Alert.alert('Error', 'Price must be greater than 0')
        return false
      }
    }
    
    return true
  }

  const generateTitle = () => {
    const symbolName = symbol.toUpperCase().trim()
    const conditionType = getConditionType()
    const value = conditionValue
    
    // Generate a readable title
    const typeMap: Record<string, string> = {
      'price_above': `${symbolName} price above $${value}`,
      'price_below': `${symbolName} price below $${value}`,
      'price_cross_above': `${symbolName} price crosses above $${value}`,
      'price_cross_below': `${symbolName} price crosses below $${value}`,
      'rsi_above': `${symbolName} RSI above ${value}`,
      'rsi_below': `${symbolName} RSI below ${value}`,
      'rsi_cross_above': `${symbolName} RSI crosses above ${value}`,
      'rsi_cross_below': `${symbolName} RSI crosses below ${value}`,
    }
    
    return typeMap[conditionType] || `${symbolName} Alert`
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert({
          user_id: user?.id,
          title: generateTitle(),
          asset_type: assetType,
          symbol: symbol.toUpperCase().trim(),
          condition_type: getConditionType(),
          condition_value: parseFloat(conditionValue),
          notification_email: notificationEmail,
          notification_telegram: notificationTelegram,
          is_active: true,
          metadata: { timeframe }
        })
        .select()
        .single()
      
      if (error) throw error
      
      Alert.alert('Success', 'Alert created successfully!')
      resetForm()
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating alert:', error)
      Alert.alert('Error', error.message || 'Failed to create alert')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSymbol('')
    setConditionValue('')
    setAlertType('threshold')
    setSignalType('price')
    setOperator('above')
    setTimeframe('15m')
    setNotificationEmail(true)
    setNotificationTelegram(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Alert</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.doneButton, loading && styles.disabledButton]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Asset Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Asset Type</Text>
            <View style={styles.segmentedControl}>
              {[
                { value: 'crypto', label: 'Crypto' },
                { value: 'stock', label: 'Stock' },
                { value: 'forex', label: 'Forex' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.segment,
                    assetType === item.value && styles.segmentActive,
                  ]}
                  onPress={() => setAssetType(item.value as AssetType)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      assetType === item.value && styles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Symbol */}
          <View style={styles.section}>
            <Text style={styles.label}>Symbol</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={(text) => setSymbol(text.toUpperCase())}
              placeholder="e.g., BTC, ETH, AAPL"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              maxLength={10}
            />
          </View>

          {/* Alert Behavior */}
          <View style={styles.section}>
            <Text style={styles.label}>Alert Behavior</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  alertType === 'threshold' && styles.optionCardActive,
                ]}
                onPress={() => {
                  setAlertType('threshold')
                  setOperator('above')
                }}
              >
                <MaterialCommunityIcons 
                  name="target" 
                  size={32} 
                  color={alertType === 'threshold' ? colors.blue : colors.textSecondary} 
                  style={styles.optionIconStyle}
                />
                <Text style={styles.optionLabel}>Threshold</Text>
                <Text style={styles.optionDesc}>Continuous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  alertType === 'cross' && styles.optionCardActive,
                ]}
                onPress={() => {
                  setAlertType('cross')
                  setOperator('cross_above')
                }}
              >
                <Ionicons 
                  name="flash" 
                  size={32} 
                  color={alertType === 'cross' ? colors.blue : colors.textSecondary}
                  style={styles.optionIconStyle}
                />
                <Text style={styles.optionLabel}>Cross</Text>
                <Text style={styles.optionDesc}>One-time</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Signal Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Signal Type</Text>
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  signalType === 'price' && styles.optionCardActive,
                ]}
                onPress={() => setSignalType('price')}
              >
                <MaterialCommunityIcons 
                  name="currency-usd" 
                  size={32} 
                  color={signalType === 'price' ? colors.blue : colors.textSecondary}
                  style={styles.optionIconStyle}
                />
                <Text style={styles.optionLabel}>Price</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  signalType === 'rsi' && styles.optionCardActive,
                ]}
                onPress={() => setSignalType('rsi')}
              >
                <MaterialCommunityIcons 
                  name="chart-line" 
                  size={32} 
                  color={signalType === 'rsi' ? colors.blue : colors.textSecondary}
                  style={styles.optionIconStyle}
                />
                <Text style={styles.optionLabel}>RSI</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Operator */}
          <View style={styles.section}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionsGrid}>
              {getOperators().map((op) => {
                const getIcon = () => {
                  if (op.value === 'above') return 'chevron-up'
                  if (op.value === 'below') return 'chevron-down'
                  if (op.value === 'cross_above') return 'trending-up'
                  if (op.value === 'cross_below') return 'trending-down'
                  return 'help'
                }
                
                return (
                  <TouchableOpacity
                    key={op.value}
                    style={[
                      styles.optionCard,
                      operator === op.value && styles.optionCardActive,
                    ]}
                    onPress={() => setOperator(op.value)}
                  >
                    <Ionicons 
                      name={getIcon()} 
                      size={32} 
                      color={operator === op.value ? colors.blue : colors.textSecondary}
                      style={styles.optionIconStyle}
                    />
                    <Text style={styles.optionLabel}>{op.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Condition Value */}
          <View style={styles.section}>
            <Text style={styles.label}>
              {signalType === 'rsi' ? 'RSI Value (0-100)' : 'Price Value'}
            </Text>
            <TextInput
              style={styles.input}
              value={conditionValue}
              onChangeText={setConditionValue}
              placeholder={signalType === 'rsi' ? 'e.g., 70' : 'e.g., 50000'}
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Timeframe */}
          <View style={styles.section}>
            <Text style={styles.label}>Timeframe</Text>
            <View style={styles.segmentedControl}>
              {[
                { value: '1m', label: '1M' },
                { value: '15m', label: '15M' },
                { value: '1h', label: '1H' },
                { value: '1d', label: '1D' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.segment,
                    timeframe === item.value && styles.segmentActive,
                  ]}
                  onPress={() => setTimeframe(item.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      timeframe === item.value && styles.segmentTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.label}>Notifications</Text>
            
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setNotificationEmail(!notificationEmail)}
            >
              <View>
                <Text style={styles.toggleLabel}>Email</Text>
                <Text style={styles.toggleDesc}>Send notification via email</Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  notificationEmail && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    notificationEmail && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setNotificationTelegram(!notificationTelegram)}
            >
              <View>
                <Text style={styles.toggleLabel}>Telegram</Text>
                <Text style={styles.toggleDesc}>Send notification via Telegram</Text>
              </View>
              <View
                style={[
                  styles.toggle,
                  notificationTelegram && styles.toggleActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    notificationTelegram && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          {symbol && conditionValue && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <Text style={styles.previewText}>
                {symbol.toUpperCase()} {signalType === 'price' ? 'price' : 'RSI'}{' '}
                {operator.replace('_', ' ')} {conditionValue}
                {signalType === 'price' ? ' USD' : ''}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.darkSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.textTertiary + '20',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
  },
  disabledButton: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.textTertiary + '30',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: colors.blue,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: colors.darkSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: colors.blue,
    backgroundColor: colors.blue + '20',
  },
  optionIconStyle: {
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.textTertiary,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.blue,
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  preview: {
    backgroundColor: colors.darkSecondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
  },
})

