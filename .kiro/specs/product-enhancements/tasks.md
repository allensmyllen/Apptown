# Tasks: Product Enhancements

## Implementation Plan

---

## 1. Database Migrations

- [x] 1.1 Create migration `005_create_categories.sql` — `categories` table with `id`, `name`, `slug` (UNIQUE), `deleted_at`, `created_at`; unique index on `lower(name)` where `deleted_at IS NULL`
- [x] 1.2 Create migration `006_add_image_url_to_products.sql` — `ALTER TABLE products ADD COLUMN image_url TEXT`
- [x] 1.3 Create migration `007_create_licenses.sql` — `licenses` table with `id`, `order_id` (FK), `user_id` (FK), `product_id` (FK), `license_key` (TEXT UNIQUE), `created_at`; indexes on `user_id` and `order_id`

---

## 2. Category Management — Backend

- [x] 2.1 Create `server/src/routes/categories.js` with:
  - `GET /api/categories` — public, returns non-deleted categories
  - `POST /api/categories` — admin; derives slug, rejects duplicates with 409
  - `PUT /api/categories/:id` — admin; updates name + slug
  - `DELETE /api/categories/:id` — admin; checks product usage, soft-deletes or returns 409
- [x] 2.2 Add `deriveSlug(name)` utility function (lowercase, spaces→`_`, strip non-alphanumeric)
- [x] 2.3 Register `/api/categories` router in `server/src/app.js`
- [x] 2.4 Update `productSchema` in `server/src/routes/products.js` — replace `z.enum([...])` with `z.string().min(1)` for `category` field

---

## 3. Product Image Upload — Backend

- [x] 3.1 Extend `handleUpload` in `server/src/routes/products.js` to use `multer().fields([{ name: 'file' }, { name: 'image' }])` instead of `.single('file')`
- [x] 3.2 Add `validateImage(file)` function — checks MIME type (jpeg/png/webp) and size ≤ 5MB; returns error string or null
- [x] 3.3 Update POST `/api/products` handler — if `req.files.image` present, validate and upload to `images/{uuid}.{ext}`, set `image_url` in INSERT
- [x] 3.4 Update PUT `/api/products/:id` handler — if `req.files.image` present, validate and upload, include `image_url` in UPDATE

---

## 4. License Key Generation — Backend

- [x] 4.1 Add `generateLicenseKey()` function in `server/src/routes/orders.js` (or a shared util) — uses `crypto.randomBytes(4)` × 3, formats as `DM-{HEX}-{HEX}-{HEX}`
- [x] 4.2 Extend `checkout.session.completed` webhook handler in `server/src/routes/orders.js`:
  - After updating order status, call `generateLicenseKey()`
  - INSERT into `licenses` table
  - Pass `licenseKey` to `sendPurchaseConfirmation`
- [x] 4.3 Update `sendPurchaseConfirmation` in `server/src/services/email.js` to accept and render `licenseKey` in the email HTML
- [x] 4.4 Create `GET /api/licenses` route in a new `server/src/routes/licenses.js` — requires `authenticate`, returns user's licenses joined with `products.title`
- [x] 4.5 Register `/api/licenses` router in `server/src/app.js`
- [x] 4.6 Update `GET /api/admin/orders` query in `server/src/routes/orders.js` to LEFT JOIN `licenses` and include `license_key` in the response

---

## 5. Category Management — Frontend

- [x] 5.1 Create `client/src/pages/admin/Categories.jsx` — table of categories, inline create form, edit-in-place, delete with confirmation
- [x] 5.2 Add "Categories" nav item to `NAV` array in `client/src/components/AdminLayout.jsx` with a tag icon and route `/admin/categories`
- [x] 5.3 Add `/admin/categories` route in `client/src/main.jsx` (or wherever routes are defined)
- [x] 5.4 Update `client/src/pages/admin/Products.jsx` — replace hardcoded `CATEGORIES` array with a `useEffect` fetch from `GET /api/categories`; populate the category `<select>` dynamically

---

## 6. Product Image Upload — Frontend

- [x] 6.1 Add image file input to the product form in `client/src/pages/admin/Products.jsx` (accept `image/jpeg,image/png,image/webp`, show preview thumbnail)
- [x] 6.2 Include `image` file in the `FormData` when creating/editing a product
- [x] 6.3 Update `client/src/components/ProductCard.jsx` — conditionally render `<img>` when `product.image_url` is set, otherwise keep gradient fallback
- [x] 6.4 Update `client/src/pages/ProductDetail.jsx` — conditionally render `<img>` in the preview banner when `product.image_url` is set, otherwise keep gradient fallback

---

## 7. License Key — Frontend

- [x] 7.1 Update `client/src/pages/MyDownloads.jsx` — fetch `GET /api/licenses` alongside orders; display `license_key` for each product with a copy-to-clipboard button
- [x] 7.2 Update `client/src/pages/admin/Orders.jsx` — display `license_key` column in the orders table (shown for completed orders)

---

## 8. Tests

- [x] 8.1 Add unit tests in `server/tests/unit/` for `generateLicenseKey` (format regex) and `deriveSlug` (known pairs, idempotency)
- [x] 8.2 Add property tests in `server/tests/property/` using fast-check:
  - `generateLicenseKey()` always matches format regex
  - `deriveSlug(name)` result matches `/^[a-z0-9_]+$/` for any non-empty string
  - `deriveSlug` is idempotent
  - `validateImage` rejects any MIME not in allowed set
- [x] 8.3 Add integration tests for category CRUD (create, duplicate rejection, delete-in-use 409, soft-delete)
- [x] 8.4 Add integration test for webhook → license creation flow
- [x] 8.5 Add integration test for `GET /api/licenses` scoping (user only sees own licenses)
