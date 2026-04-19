export type PromoType = {
    code: string;
    value: number;
    min_quantity: number | null;
    expires_at: string | null;
};

export type PromoInput = {
    promoCode: string;
}