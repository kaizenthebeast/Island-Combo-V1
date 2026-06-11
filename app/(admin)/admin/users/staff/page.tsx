import React from 'react'
import StaffClient from './StaffClient'
import { getStaffPage, type StaffSortKey } from '@/features/users/api/users'
import { requireUser } from '@/features/auth/api'
import type { AdminStaff } from '@/shared/types/users'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const StaffPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const page     = Number(params.page)     || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

  const result = await getStaffPage({
    page,
    pageSize,
    search:  params.search || undefined,
    filter:  params.filter || undefined,
    sortKey: (params.sortKey as StaffSortKey) || 'member_since',
    sortDir: (params.sortDir as 'asc' | 'desc') || 'desc',
  })

  if (!result.success) {
    return (
      <div className="p-8 text-danger">
        Failed to load staff: {result.message}
      </div>
    )
  }

  // Provisioning new accounts is admin-only; staff get a read-oriented page
  // with no invite button. The API route re-checks with requireAdmin anyway.
  const user = await requireUser()

  return (
    <StaffClient
      staff={result.rows as AdminStaff[]}
      total={result.total}
      page={page}
      pageSize={pageSize}
      canInvite={user?.role === 'admin'}
    />
  )
}

export default StaffPage
