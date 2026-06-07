/** Pure variant attribute-matching helpers. */
// A product variant carries a list of {name, value} attribute pairs (e.g.
// color / size). Both the product page and the wishlist card match a user's
// current selection against these.
type VariantWithAttributes = {
  attributes?: { name: string; value: string }[] | null
}

// True when the variant's attributes satisfy every selected key/value pair.
// An empty `keys` array matches any variant.
export const variantMatchesSelection = (
  variant: VariantWithAttributes,
  keys: string[],
  selection: Record<string, string | null>,
): boolean =>
  keys.every(
    (key) => variant.attributes?.some((attr) => attr.name === key && attr.value === selection[key]) ?? false,
  )
