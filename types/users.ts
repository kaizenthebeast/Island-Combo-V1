export type UserInfo = {
    id: string
    firstName: string
    lastName: string
    email: string
    address: string
    phone: string
    postalCode: string
    locality: string;
    country: string;
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
};


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
  } | null;  
};

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
  email: string | null
  phone_text: string | null
  sex: string | null
  age: number | null
  role: 'customer' | 'staff' | 'admin'
  created_at: string
  profile_pts: {
    total_pts: number
  } | null
  addresses: Address[]
  profile_pts_transaction_records: PtsTransaction[]
}