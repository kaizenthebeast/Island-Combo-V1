import React from 'react'
import UsersClient from './UsersClient'
import { getUsersPage, type UsersSortKey } from '@/features/users/api/users'
import type { AdminUser } from '@/shared/types/users'

type SearchParams = Promise<Record<string, string | undefined>>

const DEFAULT_PAGE_SIZE = 10

const AdminUsersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams

  const page     = Number(params.page)     || 1
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE

  const result = await getUsersPage({
    page,
    pageSize,
    search:  params.search || undefined,
    filter:  params.filter || undefined,
    sortKey: (params.sortKey as UsersSortKey) || 'member_since',
    sortDir: (params.sortDir as 'asc' | 'desc') || 'desc',
  })

  if (!result.success) {
    return (
      <div className="p-8 text-danger">
        Failed to load users: {result.message}
      </div>
    )
  }

  return (
    <UsersClient
      users={result.rows as AdminUser[]}
      total={result.total}
      page={page}
      pageSize={pageSize}
    />
  )
}

export default AdminUsersPage
