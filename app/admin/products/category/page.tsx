import React from 'react'
import CategoryClient from './CategoryClient'
import { getCategories } from '@/lib/category'

const AdminCategoryPage = async () => {
    const categories = await getCategories()

    return <CategoryClient categories={categories} />
}

export default AdminCategoryPage