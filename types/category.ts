export type Category = {
    id: number
    name: string
    slug: string
    parent_id: number | null
    is_active: boolean
}