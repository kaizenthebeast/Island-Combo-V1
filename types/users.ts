export type UserInfo = {
  id: string
  firstName: string
  lastName: string
  email: string
  address: string
  phone: string
  postalCode: string
  locality: string
  country: string
}

export type AddressFormValues = {
  addressId?: number
  firstName: string
  lastName: string
  phone: string
  address: string
  postalCode: string
  locality: string
  country: string
  makeDefault: boolean
}

export type Address = {
  id: number
  address: string
  postal_code: string
  locality: string
  country: string
  make_default: boolean
  profile: {
    first_name: string
    last_name: string
    phone_text: string
  } | null
}

export type PtsTransaction = {
  id: number
  order_id: number | null
  points: number
  reason: string | null
  created_at: string
}

export type AdminUser = {
  user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  phone_text: string | null
  sex: 'Male' | 'Female' | null
  age: number | null
  role: 'customer' | 'staff' | 'admin'
  profile_url: string[] | null
  member_since: string

  // Loyalty points
  total_points: number
  lifetime_points_earned: number
  lifetime_points_spent: number
  last_pts_activity: string | null

  // Order stats
  total_orders: number
  pending_orders: number
  preparing_orders: number
  completed_orders: number
  total_order_value: number
  total_discount_received: number
  first_order_at: string | null
  last_order_at: string | null

  // Default address
  default_address: string | null
  default_locality: string | null
  default_postal_code: string | null
  default_country: string | null
  total_addresses: number

  // Meta
  last_refreshed_at: string
}

export type AdminStaff = {
  user_id: string
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  phone_text: string | null
  sex: 'Male' | 'Female' | null
  age: number | null
  role: 'staff' | 'admin'
  profile_url: string[] | null
  member_since: string
  is_active: boolean 

  default_address: string | null
  default_locality: string | null
  default_postal_code: string | null
  default_country: string | null
  total_addresses: number

  last_refreshed_at: string
}
// Convenience type for the admin user list / table view (lighter subset)
export type AdminUserRow = Pick<
  AdminUser,
  | 'user_id'
  | 'full_name'
  | 'email'
  | 'phone_text'
  | 'role'
  | 'member_since'
  | 'total_orders'
  | 'total_order_value'
  | 'total_points'
  | 'last_order_at'
  | 'default_locality'
  | 'default_country'
>