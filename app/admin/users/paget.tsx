import React from 'react'
import UsersClient from './UsersClient'
import { getUsers } from '@/lib/users'

const AdminUsersPage = async () => {
  const users = await getUsers()

  return <UsersClient users={users} />
}

export default AdminUsersPage