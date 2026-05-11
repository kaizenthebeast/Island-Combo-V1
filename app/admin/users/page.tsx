import React from 'react'
import UsersClient from './UsersClient'
import { getUsers } from '@/lib/users'
import type { AdminUser } from '@/types/users'

const AdminUsersPage = async () => {
  const result = await getUsers()

  if (!result.success || !('data' in result)) {
    return (
      <div className="p-8 text-red-500">
        Failed to load users: {result.message}
      </div>
    )
  }

  return <UsersClient users={result.data as AdminUser[]} />
}

export default AdminUsersPage