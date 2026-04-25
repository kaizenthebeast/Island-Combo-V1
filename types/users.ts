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