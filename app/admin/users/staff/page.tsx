import React from 'react'
import StaffClient from './StaffClient'
import { getStaff } from '@/lib/users'
import type { AdminStaff } from '@/types/users'

const StaffPage = async () => {
  const result = await getStaff()

  if (!result.success || !('data' in result)) {
    return (
      <div className="p-8 text-red-500">
        Failed to load staff: {result.message}
      </div>
    )
  }

  return <StaffClient staff={result.data as AdminStaff[]} />
}

export default StaffPage