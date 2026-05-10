export type Category = {
    id: number
    name: string
    parent_id: number | null   // ← null for top-level categories
}