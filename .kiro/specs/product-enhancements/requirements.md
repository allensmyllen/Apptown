
# Requirements: Product Enhancements

## Overview

Three additive enhancements to the digital-marketplace: dynamic category management, product image upload, and license key generation on purchase.

---

## Requirement 1: Category Management

### User Stories

- As an admin, I want to create custom product categories so that I can organise products beyond the hardcoded defaults.
- As an admin, I want to edit a category name so that I can correct mistakes or rebrand a category.
- As an admin, I want to delete a category so that I can remove unused ones, with a safety check preventing deletion if products are assigned to it.
- As a user browsing the marketplace, I want to filter by any admin-defined category so that I can find relevant products.

### Acceptance Criteria

**1.1** — When an admin submits a valid category name via POST `/api/categories`, the system creates a row in the `categories` table with a `slug` auto-derived from the name (lowercase, spaces→`_`, non-alphanumeric stripped), and returns `201` with the created category.

**1.2** — When an admin submits a duplicate category name (case-insensitive) via POST `/api/categories`, the system returns `409 { error: "Category already exists" }` and does not create a duplicate row.

**1.3** — When an admin updates a category name via PUT `/api/categories/:id`, the system updates both `name` and `slug` and returns the updated category.

**1.4** — When an admin deletes a category that has no published products assigned to it, the system soft-deletes it (sets `deleted_at`) and returns `204`.

**1.5** — When an admin attempts to delete a category that has one or more published products assigned to it, the system returns `409 { error: "Category is in use by N products" }` and does not delete the category.

**1.6** — GET `/api/categories` returns all non-deleted categories and is accessible without authentication (used by the product form and filter panel).

**1.7** — The admin product creation and edit form fetches categories dynamically from GET `/api/categories` instead of using the hardcoded `CATEGORIES` array.

**1.8** — The admin sidebar includes a "Categories" navigation item linking to `/admin/categories`.

**1.9** — The `/admin/categories` page lists all active categories, allows creating a new category, editing a category name, and deleting a category with a confirmation prompt.

### Correctness Properties

- **P1.1** — For any non-empty string `name`, `deriveSlug(name)` returns a string matching `/^[a-z0-9_]+$/`.
- **P1.2** — `deriveSlug` is idempotent: `deriveSlug(deriveSlug(name)) === deriveSlug(name)` for all valid inputs.
- **P1.3** — For any category with at least one published product using its slug, DELETE `/api/categories/:id` always returns `409`.

---

## Requirement 2: Product Image Upload

### User Stories

- As an admin, I want to upload a thumbnail image when creating or editing a product so that the product listing looks professional.
- As a buyer, I want to see a product thumbnail on the product card and detail page so that I can visually identify products.

### Acceptance Criteria

**2.1** — When creating a product, the admin may optionally include an `image` file field (multipart). If provided, the image must be `image/jpeg`, `image/png`, or `image/webp` and ≤ 5 MB; otherwise the server returns `415` or `413` respectively.

**2.2** — When a valid image is uploaded, the server stores it in S3 under the key `images/{uuid}.{ext}` using the existing `uploadFile` function, and saves the resulting public URL in `products.image_url`.

**2.3** — When editing a product via PUT `/api/products/:id`, the admin may optionally upload a new image; if provided, `image_url` is updated to the new S3 URL.

**2.4** — The `products` table has an `image_url TEXT` column (nullable) added via migration.

**2.5** — `ProductCard` renders `<img src={image_url} />` in the preview area when `image_url` is set, and falls back to the existing gradient + icon when it is not.

**2.6** — `ProductDetail` renders `<img src={image_url} />` in the preview banner when `image_url` is set, and falls back to the existing gradient when it is not.

### Correctness Properties

- **P2.1** — For any uploaded file with MIME type not in `['image/jpeg', 'image/png', 'image/webp']`, the server always returns `415`.
- **P2.2** — For any uploaded file with `size > 5 * 1024 * 1024` bytes, the server always returns `413`.
- **P2.3** — When a valid image is uploaded, the S3 key passed to `uploadFile` always starts with `"images/"`.

---

## Requirement 3: License Key Generation

### User Stories

- As a buyer, I want to receive a unique license key when I complete a purchase so that I have proof of ownership.
- As a buyer, I want to see my license key on the My Downloads page so that I can copy it when needed.
- As a buyer, I want my license key included in the purchase confirmation email so that I have a record.
- As an admin, I want to see the license key associated with each order so that I can assist with support requests.

### Acceptance Criteria

**3.1** — When the Stripe webhook receives a `checkout.session.completed` event and the corresponding order is updated to `completed`, the system generates a license key and inserts a row into the `licenses` table with `order_id`, `user_id`, `product_id`, and `license_key`.

**3.2** — The license key format is `DM-{XXXXXXXX}-{XXXXXXXX}-{XXXXXXXX}` where each segment is 8 uppercase hexadecimal characters.

**3.3** — The `licenses` table has columns: `id` (UUID PK), `order_id` (FK → orders), `user_id` (FK → users), `product_id` (FK → products), `license_key` (TEXT UNIQUE), `created_at`.

**3.4** — GET `/api/licenses` returns all licenses for the authenticated user, joined with `products.title`. The endpoint requires authentication and returns only the requesting user's licenses.

**3.5** — The `MyDownloads` page displays the license key for each purchased product alongside a copy-to-clipboard button.

**3.6** — The purchase confirmation email includes the license key in its body.

**3.7** — The admin Orders page displays the license key associated with each completed order.

**3.8** — If a `checkout.session.completed` webhook fires for an order that already has a license (idempotent re-delivery), the system does not create a duplicate license (the UNIQUE constraint on `license_key` and the order status check prevent duplication).

### Correctness Properties

- **P3.1** — `generateLicenseKey()` always returns a string matching `/^DM-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/`.
- **P3.2** — For any completed order, GET `/api/licenses` for the purchasing user returns exactly one license with a matching `order_id`.
- **P3.3** — For any authenticated user, GET `/api/licenses` never returns licenses belonging to a different `user_id`.
