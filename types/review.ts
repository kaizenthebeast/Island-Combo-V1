export type ProductReview = {
  id: number;
  user_id: string;
  product_id: number;
  order_id: number;
  rating: number; // 1-5
  title: string | null;
  body: string | null;
  helpful_count: number;
  not_helpful_count: number;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  review_images?: ReviewImage[];
  profile?: {
    first_name: string | null;
    last_name: string | null;
    profile_url: string[] | null;
  };
};

export type ReviewImage = {
  id: number;
  review_id: number;
  image_path: string;
  sort_order: number;
  created_at: string;
};

export type AddReviewPayload = {
  product_id: number;
  order_id: number;
  rating: number;
  title?: string;
  body?: string;
};

export type UpdateReviewPayload = {
  rating?: number;
  title?: string;
  body?: string;
};