-- The review tables had full RLS policies but were missing the table-level DML
-- grants, so every write failed with "permission denied for table reviews" before
-- RLS even ran. Grant the writes the policies already gate (owner + completed-order
-- rules). This is what actually unblocks "leave a review".
GRANT INSERT, UPDATE, DELETE ON public.reviews       TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_votes TO authenticated;
