# CSV Import / Export (Products & Categories)

Bulk-migrate an existing catalog into this app, or back it up, using CSV. The
admin pages for **Products** (`/admin/products`) and **Categories**
(`/admin/products/category`) each expose **Export** and **Import** actions.

Parsing and serialization run on [PapaParse](https://www.papaparse.com/). All
validation is server-side (Zod) — the browser only reads the file and uploads
its text; the server decides what is accepted.

Every import and export is recorded in the **audit log** (`/admin/audit`):

| Operation            | Audit action        |
| -------------------- | ------------------- |
| Products exported    | `product.exported`  |
| Products imported    | `product.imported`  |
| Categories exported  | `category.exported` |
| Categories imported  | `category.imported` |

In addition, each individual product/variant/category row the import creates or
updates is captured by the existing database audit triggers
(`product.created`, `product.updated`, `category.created`, …), so the trail shows
both the bulk operation and every record it touched.

---

## Migration order

Products reference categories by name, so **import categories first**, then
products. Recommended end-to-end flow:

1. Import **categories** (`categories-import-template.csv`).
2. Import **products** (`products-import-template.csv`).
3. Open `/admin/products` and spot-check; re-import to correct mistakes
   (imports are idempotent — see below).

Templates are downloadable from the Import dialog, or directly at:

- `/templates/categories-import-template.csv`
- `/templates/products-import-template.csv`

---

## Categories CSV

One row per category. The hierarchy is two levels (parent → child).

| Column      | Required | Notes                                                            |
| ----------- | -------- | ---------------------------------------------------------------- |
| `name`      | yes      | Display name.                                                    |
| `slug`      | no       | Lowercase, hyphenated. Auto-generated from `name` if left blank. |
| `parent`    | no       | Parent's `slug` or `name`. Blank = top-level category.           |
| `is_active` | no       | `true`/`false` (also accepts `1`/`0`, `active`/`archived`). Defaults to `true`. |

**Rules**

- List top-level categories **before** their children — a child whose `parent`
  hasn't been seen yet (and doesn't already exist) is reported as an error.
- A row is matched to an existing category by `slug` (if provided), else by
  `name`. A match updates in place; no match inserts a new category.

```csv
name,slug,parent,is_active
Apparel,apparel,,true
T-Shirts,t-shirts,apparel,true
```

---

## Products CSV

One row per **variant**. Rows that share a `slug` are assembled into a single
product; the product-level columns are read from that product's **first** row
(repeating them on later rows is harmless).

| Column                  | Scope    | Required | Notes                                                                 |
| ----------------------- | -------- | -------- | --------------------------------------------------------------------- |
| `slug`                  | product  | yes      | Identity key. Lowercase, hyphenated. Groups variant rows.             |
| `name`                  | product  | yes      | Display name.                                                         |
| `description`           | product  | no       | Read from the first row of the product.                              |
| `category`              | product  | no       | Category `name` or `slug`. Must already exist. Blank = uncategorized. |
| `type`                  | product  | no       | `Physical` or `Digital`. Defaults to `Physical`.                      |
| `status`                | product  | no       | `ACTIVE`, `DRAFT`, `HIDDEN`, or `ARCHIVED`. Defaults to `ACTIVE`.     |
| `discount`              | product  | no       | Product-level percent, `0`–`100`. Defaults to `0`.                    |
| `variant_sku`           | variant  | no       | See **SKUs** below.                                                   |
| `variant_price`         | variant  | yes      | Number ≥ 0.                                                           |
| `variant_stock`         | variant  | no       | Whole number ≥ 0. Defaults to `0`.                                    |
| `variant_is_active`     | variant  | no       | `true`/`false`. Defaults to `true`.                                   |
| `variant_attributes`    | variant  | no       | `Name:Value` pairs joined by `\|` — e.g. `Size:M\|Color:Red`.         |
| `variant_pricing_tiers` | variant  | no       | `label:min_qty:discount%` joined by `\|` — e.g. `wholesale:12:10`.    |
| `variant_images`        | variant  | no       | Storage paths joined by `\|` — e.g. `variants/a.png\|variants/b.png`. |
| `product_details`       | product  | no       | `Name:Value` pairs joined by `\|`. Read from the first row.           |

### Cell encoding

Nested data is packed into a single cell:

- **List delimiter** `|` separates repeated items.
- **Pair delimiter** `:` separates a key from its value (and a tier's fields).

```
variant_attributes      Size:M|Color:Red
variant_pricing_tiers   wholesale:12:10        (≥12 units → 10% off)
variant_images          variants/tee-front.png|variants/tee-back.png
product_details         Material:100% Cotton|Care:Machine wash cold
```

The retail tier (min qty 1, 0% off) is created automatically — don't list it in
`variant_pricing_tiers`.

### SKUs

SKUs are **system-generated** (`P{product_id}-V{n}`); the app does not accept a
custom SKU. On import:

- For **new** variants, `variant_sku` is ignored and a SKU is generated.
- For **updates**, `variant_sku` is used to match a CSV row to an existing
  variant so it updates in place. Export fills it in, so an export →
  edit → re-import round-trip updates rather than duplicating variants.

### Images

`variant_images` holds Storage **paths** (relative to the `product-images`
bucket), not uploads. CSV import does not upload image files — migrate the binary
assets to Storage separately (or via the product editor) and reference their
paths here. Leaving the column blank is fine.

```csv
slug,name,description,category,type,status,discount,variant_sku,variant_price,variant_stock,variant_is_active,variant_attributes,variant_pricing_tiers,variant_images,product_details
classic-cotton-tee,Classic Cotton Tee,Soft 100% cotton crew-neck tee.,Apparel,Physical,ACTIVE,0,,299,50,true,Size:S,wholesale:12:10,variants/tee-front.png,Material:100% Cotton|Care:Machine wash cold
classic-cotton-tee,Classic Cotton Tee,,Apparel,Physical,ACTIVE,0,,299,40,true,Size:M,wholesale:12:10,variants/tee-front.png,
```

---

## Idempotency & updates

Both importers **upsert**:

- **Products** are matched by `slug`. An existing slug updates the product and
  its variants (variants matched by `variant_sku`); a new slug creates it.
- **Categories** are matched by `slug` (then `name`).

Re-importing the same file is therefore safe — it updates rather than
duplicates. Imports never delete: removing a row from the CSV does not archive
or delete the corresponding record. Use the admin UI to archive/delete.

## Result summary

After an import the dialog shows **Created / Updated / Failed** counts and a
table of row-level errors (spreadsheet line + reason), so a partially valid file
imports its good rows and tells you exactly which lines to fix. Stock changes
made through import are written to the stock-movement ledger, identical to edits
made in the product editor.
