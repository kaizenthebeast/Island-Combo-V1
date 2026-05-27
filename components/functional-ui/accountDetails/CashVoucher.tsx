import { Ticket } from 'lucide-react'

const CashVoucher = () => {
  return (
    <div className='bg-white border rounded-xl p-5 shadow-xs'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-foreground flex items-center gap-2'>
          <Ticket className='w-4 h-4' />
          Buy Cash Voucher
        </h3>
      </div>

      <div className='flex flex-col items-center justify-center text-center py-8 gap-2'>
        <p className='text-sm text-muted-foreground'>No vouchers available yet.</p>
      </div>
    </div>
  )
}

export default CashVoucher
