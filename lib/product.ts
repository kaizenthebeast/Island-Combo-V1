import { createClient } from './supabase/server'

//CRUD FUNCTIONALITY FOR PRODUCTS

// Input type for creating/updating a product
export type ProductProps = {
    name: string;
    price: number;
    description?: string;
    categoryId?: string;
    stock?: number;
    isActive?: boolean;
    slug?: string;
};


export async function getAllProducts() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('products').select('id, name, price, description, category:categories(name)')
        .eq('is_active', true);

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function getProductBySlug(slug: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('products').select('id, name, price, description,  category:categories(name)').eq('slug', slug).single();
    if (error) {
        throw new Error(error.message);
    }

    return data;
}
