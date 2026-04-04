'use client'
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";

type Product = {
  id: string;
  name: string;
  price: number;
};

type Props = {
  product: Product;
};

const ProductCard: React.FC<Props> = ({ product }) => {
  const {
    items,
    addItem,
    updateItem,
    removeItem,
    loading,
  } = useCartStore();

  const cartItem = items.find(
    (item) => item.product_id === product.id
  );

  const handleAdd = async () => {
    await addItem(product.id, 1);
  };

  const handleIncrement = async () => {
    if (!cartItem) return;
    await updateItem(product.id, cartItem.quantity + 1);
  };

  const handleDecrement = async () => {
    if (!cartItem) return;

    if (cartItem.quantity === 1) {
      await removeItem(product.id);
    } else {
      await updateItem(product.id, cartItem.quantity - 1);
    }
  };

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-md">
      <CardContent className="p-4 space-y-3">
       

        <div>
          <h2 className="text-lg font-semibold">{product.name}</h2>
          <p className="text-muted-foreground">
            ₱{product.price.toLocaleString()}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-4">
        {!cartItem ? (
          <Button
            className="w-full"
            onClick={handleAdd}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add to Cart"}
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleDecrement}
              disabled={loading}
            >
              -
            </Button>

            <span className="font-medium">
              {cartItem.quantity}
            </span>

            <Button
              variant="outline"
              onClick={handleIncrement}
              disabled={loading}
            >
              +
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
