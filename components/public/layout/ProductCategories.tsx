"use client";

import { useState } from "react";
import {
  Sparkles,
  ShoppingBag,
  Gem,
  Heart,
  Home,
  Smile,
  Monitor,
  Star,
  MoreHorizontal,
} from "lucide-react";

const categories = [
  { id: 2, label: "Health &\nWellness", icon: Heart },
  { id: 3, label: "Fashion &\nApparel", icon: Sparkles },
  { id: 4, label: "Jewelry &\nCollections", icon: Gem },
  { id: 5, label: "Bags", icon: ShoppingBag },
  { id: 6, label: "Furniture &\nHome", icon: Home },
  { id: 7, label: "Kids & Toys", icon: Smile },
  { id: 8, label: "Electronics &\nGadgets", icon: Monitor },
  { id: 9, label: "Lifestyle &\nSpecialty", icon: Star },
  { id: 10, label: "Miscellaneous", icon: MoreHorizontal },
];

export default function ProductCategory() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="w-full  p-4">
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = active === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActive(isActive ? null : cat.id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-13 h-13 rounded-full flex items-center justify-center transition-colors border
                  ${
                    isActive
                      ? "bg-amber-100 border-amber-300"
                      : "bg-gray-100 border-gray-200 group-hover:bg-gray-200"
                  }`}
                style={{ width: 52, height: 52 }}
              >
                <Icon
                  size={22}
                  className={isActive ? "text-amber-700" : "text-gray-500 group-hover:text-gray-700"}
                />
              </div>
              <span className="text-[11px] text-gray-500 text-center leading-tight whitespace-pre-line group-hover:text-gray-700">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}