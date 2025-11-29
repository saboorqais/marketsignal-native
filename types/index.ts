export type ConditionType = 
  | 'price_above'
  | 'price_below'
  | 'price_cross_above'
  | 'price_cross_below'
  | 'rsi_above'
  | 'rsi_below'
  | 'rsi_cross_above'
  | 'rsi_cross_below'

export interface Alert {
  id: string
  user_id: string
  title: string
  asset_type: 'crypto' | 'stock' | 'forex'
  symbol: string
  condition_type: ConditionType
  condition_value: number
  notification_email: boolean
  notification_telegram: boolean
  is_active: boolean
  triggered_at: string | null
  metadata: {
    timeframe: '1m' | '15m' | '1h' | '1d'
  }
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  email_notifications: boolean
  telegram_notifications: boolean
  telegram_chat_id: string | null
  push_token: string | null
  created_at: string
}

export interface AuditTrailEntry {
  id: string
  alert_id: string
  symbol: string
  triggered_at: string
  condition_type: string
  condition_value: number
  current_value: number
  previous_rsi: number | null
  current_rsi: number | null
  notification_sent: boolean
  notification_method: string | null
}

