import React from 'react'
import VoucherClient from './VoucherClient'
import { getVouchers } from '@/lib/voucher'

const VoucherPage = async () => {
  const vouchers = await getVouchers()

  return <VoucherClient voucher={vouchers} />
}

export default VoucherPage