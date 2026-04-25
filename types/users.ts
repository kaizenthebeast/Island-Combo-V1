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
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    postalCode: string;
    locality: string;
    country: string;
    makeDefault: boolean;
};