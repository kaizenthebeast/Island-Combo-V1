import { CreditCard } from 'lucide-react'

const MyCards = () => {
  return (
    <div className='bg-white border rounded-xl p-5 shadow-xs'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-foreground flex items-center gap-2'>
          <CreditCard className='w-4 h-4' />
          My Cards
        </h3>
        <button type='button' className='text-sm text-brand font-medium hover:underline'>
          Add
        </button>
      </div>

      <div className='flex flex-col items-center justify-center text-center py-8 gap-2'>
        <CreditCard className='w-8 h-8 text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>No saved cards yet.</p>
      </div>
    </div>
  )
}

export default MyCards
