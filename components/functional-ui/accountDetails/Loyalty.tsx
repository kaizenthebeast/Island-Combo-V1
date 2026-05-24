import { Star } from 'lucide-react'

const Loyalty = () => {
  return (
    <div className='bg-white border rounded-xl p-5 shadow-sm'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-base font-bold text-gray-800 flex items-center gap-2'>
          <Star className='w-4 h-4' />
          Loyalty Points
        </h3>
      </div>

      <div className='flex flex-col items-center justify-center text-center py-8 gap-2'>
        <p className='text-3xl font-bold text-[#900036]'>0 pts</p>
        <p className='text-sm text-gray-500'>You haven't earned any loyalty points yet.</p>
      </div>
    </div>
  )
}

export default Loyalty
