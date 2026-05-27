import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, LucideIcon } from "lucide-react";
import { getCategoryBySlug } from "@/lib/category";
import { getAllProducts } from "@/lib/product";
import ProductCard from "@/components/card/ProductCard";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sub } = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const parsedSub = sub ? Number(sub) : NaN;
  const activeSubId =
    Number.isFinite(parsedSub) && category.children.some((c) => c.id === parsedSub)
      ? parsedSub
      : null;

  const products = await getAllProducts({
    categoryId: activeSubId ?? category.id,
    sort: "latest",
  });

  return (
    <section className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <h1 className="title-header text-xl sm:text-2xl md:text-3xl">
        {category.name}
      </h1>

      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-4 sm:gap-6">
          <CategoryPill
            href={`/category/${category.slug}`}
            label="All"
            isActive={activeSubId === null}
            icon={LayoutGrid}
          />
          {category.children.map((child) => (
            <CategoryPill
              key={child.id}
              href={`/category/${category.slug}?sub=${child.id}`}
              label={child.name}
              isActive={child.id === activeSubId}
            />
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          No products found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 w-full place-items-center">
          {products.map((product) => (
            <ProductCard key={product.product_id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

type PillProps = {
  href: string;
  label: string;
  isActive: boolean;
  icon?: LucideIcon;
};

function CategoryPill({ href, label, isActive, icon: Icon }: PillProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      scroll={false}
      className="flex flex-col items-center gap-2 group cursor-pointer"
    >
      <div
        className={`rounded-full flex items-center justify-center transition-colors border ${
          isActive
            ? "bg-brand border-brand group-hover:bg-brand-hover"
            : "bg-gray-100 border-gray-200 group-hover:bg-gray-200"
        }`}
        style={{ width: 56, height: 56 }}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 ${
              isActive ? "text-brand-foreground" : "text-gray-600"
            }`}
          />
        )}
      </div>
      <span
        className={`text-xs text-center leading-tight w-20 ${
          isActive
            ? "text-brand font-medium"
            : "text-gray-600 group-hover:text-gray-800"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
