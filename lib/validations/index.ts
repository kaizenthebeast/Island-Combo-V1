/** Aggregator barrel. Feature-owned schemas now live in
 *  features/<domain>/validations; auth/account schemas remain here until those
 *  features migrate. Prefer importing from the owning feature. */
export * from '@/features/products/validations/product'
export * from '@/features/categories/validations/category'
export * from '@/features/promotions/validations/promo-code'
export * from '@/features/cash-vouchers/validations/cash-voucher'
export * from './address'
export * from './login'
export * from './signup'
export * from './forgot-password'
export * from './update-password'
export * from './user'
