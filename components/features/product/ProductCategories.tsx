import Link from "next/link"
import { getAllParentCategories } from "@/lib/categories/category"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/shared/components/ui/carousel"
import {
  Watch,
  Sparkles,
  ShoppingBag,
  Shirt,
  CalendarDays,
  Sofa,
  ToyBrick,
  Smartphone,
  Leaf,
  Tag,
  LayoutGrid,
  Apple,
  Coffee,
  LucideIcon,
} from "lucide-react"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Accessories": Watch,
  "Household & Cleaning": Sparkles,
  "Health & Wellness": Leaf,
  "Fashion & Apparel": Shirt,
  "Bags & Accessories": ShoppingBag,
  "Events & Seasonal": CalendarDays,
  "Furniture & Home": Sofa,
  "Kids & Toys": ToyBrick,
  "Electronics & Gadgets": Smartphone,
  "Lifestyle & Specialty": Leaf,
  "Promotions & Programs": Tag,
  "Miscellaneous": LayoutGrid,
  "Food": Apple,
  "Beverage": Coffee,
}

export const ProductCategory = async () => {
  const categories = await getAllParentCategories();

  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="ml-0 justify-between">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] ?? LayoutGrid;

            return (
              <CarouselItem key={cat.category_id} className="basis-auto px-3">
                <Link
                  href={`/categories/${cat.slug}`}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div
                    className="rounded-full flex items-center justify-center transition-colors border bg-warning-tint border-warning/30 group-hover:bg-warning-tint"
                    style={{ width: 52, height: 52 }}
                  >
                    <Icon className="w-5 h-5 text-warning" />
                  </div>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight wrap-break-word w-14 group-hover:text-foreground">
                    {cat.name}
                  </span>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export default ProductCategory;
