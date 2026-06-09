/** Aggregator barrel — all schemas now live in their owning feature
 *  (features/<domain>/validations). Prefer importing from the feature barrel;
 *  this keeps any existing `@/lib/validations` imports working. */
export * from '@/features/products/validations/product'
export * from '@/features/categories/validations/category'
export * from '@/features/promotions/validations/promo-code'
export * from '@/features/cash-vouchers/validations/cash-voucher'
export * from '@/features/account/validations/address'
export * from '@/features/account/validations/user'
export * from '@/features/auth/validations/login'
export * from '@/features/auth/validations/signup'
export * from '@/features/auth/validations/forgot-password'
export * from '@/features/auth/validations/update-password'
