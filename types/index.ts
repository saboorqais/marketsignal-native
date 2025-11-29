export interface Alert {
  id: string
  user_id: string
  symbol: string
  condition_type: 'rsi_above' | 'rsi_below' | 'price_above' | 'price_below'
  condition_value: number
  is_active: boolean
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

