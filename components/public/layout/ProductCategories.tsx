import { getAllParentCategories } from "@/lib/product"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import {
  Watch,
  Sparkles,
  ShoppingBag,
  Shirt,
  CalendarDays,
  Sofa,
  ToyBrick ,
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
  "Kids & Toys": ToyBrick ,
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
    <div className="w-full p-4">
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0 justify-around">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] ?? LayoutGrid;

            return (
              <CarouselItem key={cat.category_id} className="basis-auto px-3">
                <button className="flex flex-col items-center gap-2 group">
                  <div
                    className="rounded-full flex items-center justify-center transition-colors border bg-amber-100 border-amber-300 group-hover:bg-amber-200"
                    style={{ width: 52, height: 52 }}
                  >
                    <Icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-[11px] text-gray-500 text-center leading-tight break-words w-14 group-hover:text-gray-700">
                    {cat.name}
                  </span>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export default ProductCategory;