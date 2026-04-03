# Implementation Plan: Digital Marketplace

## Overview

Implement a full-stack digital marketplace with a React JS SPA frontend and Node.js REST API backend. The implementation follows the service boundaries defined in the design: Auth, Product, Order, Download, and Admin. Tasks are ordered to build foundational layers first (project setup → database → auth → services → frontend → notifications → tests).

## Tasks

- [x] 1. Project setup and configuration
  - Initialize monorepo with `client/` (React) and `server/` (Node.js) directories
  - Set up `server/`: Express app, `package.json` with dependencies (express, pg, bcrypt, jsonwebtoken, stripe, multer, nodemailer, zod, fast-check, jest)
  - Set up `client/`: Create React App or Vite project with dependencies (axios, react-router-dom, stripe-js)
  - Configure ESLint, `.env.example` with all required environment variables (`DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `S3_*`, `SMTP_*`)
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Database setup and migrations
  - [x] 2.1 Create database migration files for all tables
    - Write SQL migration files for `users`, `products`, and `orders` tables exactly as specified in the design data models
    - Add indexes on `products.published`, `products.category`, `orders.user_id`, `orders.stripe_session_id`
    - Create a `db.js` module wrapping the `pg` Pool with a `query` helper
    - _Requirements: 1.1, 3.1, 4.1, 5.5_

- [x] 3. Auth service — backend
  - [x] 3.1 Implement registration endpoint (`POST /api/auth/register`)
    - Validate email format and password length >= 8 using Zod; return 400 on invalid password, 409 on duplicate email
    - Hash password with bcrypt cost factor 10; insert user row; sign and return JWT in HTTP-only cookie
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Write property test P1 — Registration input validation
    - **Property 1: Registration input validation**
    - Use fast-check to generate random (email, password) pairs; assert accept/reject matches validity rules
    - **Validates: Requirements 1.1, 1.4**

  - [x] 3.3 Write property test P2 — Registration returns valid JWT
    - **Property 2: Registration returns a valid JWT**
    - Generate valid credentials; verify returned JWT is structurally valid and signed
    - **Validates: Requirements 1.2**

  - [x] 3.4 Implement login endpoint (`POST /api/auth/login`) and logout (`POST /api/auth/logout`)
    - Compare password with bcrypt; return 401 on mismatch; sign JWT with 24h expiry; set HTTP-only cookie; clear cookie on logout
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.5 Write property test P3 — Login JWT 24-hour expiry
    - **Property 3: Login JWT has 24-hour expiry**
    - Register + login with random valid credentials; assert `exp - iat === 86400`
    - **Validates: Requirements 2.1**

  - [x] 3.6 Write property test P4 — Invalid login returns 401
    - **Property 4: Invalid login credentials return 401**
    - Generate unregistered or wrong-password credentials; assert 401 response
    - **Validates: Requirements 2.2**

  - [x] 3.7 Write unit tests for auth service
    - Test bcrypt cost factor >= 10 (Req 1.5)
    - Test HTTP-only cookie is set on login (Req 2.3)
    - Test expired JWT returns 401 (Req 2.4)
    - _Requirements: 1.5, 2.3, 2.4_

  - [x] 3.8 Implement `authenticate` and `requireAdmin` middleware
    - `authenticate`: extract JWT from cookie or Authorization header, verify, attach `req.user`; return 401 if missing/invalid
    - `requireAdmin`: check `req.user.role === 'admin'`; return 403 otherwise
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 3.9 Write property test P18 — RBAC enforcement
    - **Property 18: Role-based access control**
    - Generate non-admin users hitting admin endpoints; assert 403. Generate unauthenticated requests to protected endpoints; assert 401
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [~] 4. Checkpoint — Auth layer complete
  - Ensure all auth tests pass, ask the user if questions arise.

- [x] 5. Product service — backend
  - [x] 5.1 Implement public product endpoints (`GET /api/products`, `GET /api/products/:id`)
    - Paginate with default page size 20; support `search` query param (title/description ILIKE) and `category` filter; return only `published = true` products
    - Return 404 if product not found
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Write property test P5 — Search and filter correctness
    - **Property 5: Product search and filter correctness**
    - Generate random product sets and queries; assert all returned products satisfy the filter and no matching product is omitted
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.3 Write property test P6 — Product detail contains all required fields
    - **Property 6: Product detail response contains all required fields**
    - Generate random products (with and without preview_link); assert response contains title, description, price, category, preview_link
    - **Validates: Requirements 3.4**

  - [x] 5.4 Implement admin product write endpoints (`POST`, `PUT /api/products/:id`, `DELETE /api/products/:id`)
    - `POST`: validate payload with Zod; enforce file format (zip/rar/tar.gz) and size <= 500 MB via multer; upload to S3; insert product row
    - `PUT`: validate and persist changes; return updated record
    - `DELETE`: set `published = false`; do not hard-delete
    - Return 413 for oversized files, 415 for unsupported formats
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.5 Write property test P11 — Product creation round-trip
    - **Property 11: Product creation persists all fields**
    - Generate random valid product payloads; POST then GET; assert all fields match
    - **Validates: Requirements 6.1**

  - [x] 5.6 Write property test P12 — Product update round-trip
    - **Property 12: Product update round-trip**
    - Generate random updates; PUT then GET; assert updated values are returned
    - **Validates: Requirements 6.3**

  - [x] 5.7 Write property test P13 — Soft-delete removes from public listing
    - **Property 13: Soft-delete removes product from public listing**
    - Generate published products; DELETE; assert absent from `GET /api/products`
    - **Validates: Requirements 6.4**

  - [x] 5.8 Write property test P14 — File format validation
    - **Property 14: File format validation**
    - Generate filenames with valid (zip, rar, tar.gz) and invalid extensions; assert accept/reject behavior
    - **Validates: Requirements 6.6**

  - [x] 5.9 Write unit tests for product service
    - Test file > 500 MB returns 413 (Req 6.5)
    - Test preview_link is stored and returned (Req 6.2)
    - _Requirements: 6.2, 6.5_

- [~] 6. Checkpoint — Product service complete
  - Ensure all product tests pass, ask the user if questions arise.

- [x] 7. Order service — backend
  - [x] 7.1 Implement order initiation (`POST /api/orders`)
    - Require `authenticate` middleware; create pending order row; create Stripe Checkout Session with product price; return session URL
    - _Requirements: 4.1, 4.4_

  - [x] 7.2 Implement Stripe webhook handler (`POST /api/orders/webhook`)
    - Verify `Stripe-Signature` header; on `payment_intent.succeeded` find order by `stripe_session_id` and set `status = 'completed'`, `completed_at = now()`; on failure set `status = 'failed'`
    - Trigger confirmation email after successful completion
    - _Requirements: 4.2, 4.3, 4.5_

  - [x] 7.3 Write property test P7 — Webhook order completion
    - **Property 7: Webhook order completion**
    - Generate pending orders and synthetic webhook events; assert status transitions to `completed`
    - **Validates: Requirements 4.2**

  - [x] 7.4 Implement user order history (`GET /api/orders`)
    - Return all orders for `req.user.id` with product details joined
    - _Requirements: 5.5_

  - [x] 7.5 Write unit tests for order service
    - Test Stripe checkout session is created on order initiation (Req 4.1)
    - Test confirmation email is sent on order completion (Req 4.5)
    - Test payment failure sets order status to `failed` and returns 402 (Req 4.3)
    - _Requirements: 4.1, 4.3, 4.5_

- [x] 8. Download service — backend
  - [x] 8.1 Implement download endpoint (`GET /api/downloads/:productId`)
    - Require `authenticate`; query orders for a `completed` order matching `user_id` + `product_id`; return 403 if none found
    - Generate S3 signed URL with 15-minute TTL; redirect 302 to signed URL
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Write property test P8 — Download URL TTL is 15 minutes
    - **Property 8: Download URL has 15-minute TTL**
    - Generate completed orders; call download endpoint; assert signed URL expiry equals `now + 900 seconds`
    - **Validates: Requirements 5.1**

  - [x] 8.3 Write property test P9 — Unauthorized download returns 403
    - **Property 9: Unauthorized download returns 403**
    - Generate users without completed orders for a product; assert 403 response
    - **Validates: Requirements 5.2**

  - [x] 8.4 Write property test P10 — My Downloads completeness
    - **Property 10: My Downloads lists all purchased products**
    - Generate users with N completed orders; assert order listing contains exactly those N products
    - **Validates: Requirements 5.5**

- [x] 9. Admin dashboard API — backend
  - [x] 9.1 Implement metrics endpoint (`GET /api/admin/metrics`)
    - Require `requireAdmin`; query sum of `amount_cents` for completed orders, count of completed orders, count of users; return JSON
    - _Requirements: 7.2_

  - [x] 9.2 Write property test P15 — Metrics arithmetic correctness
    - **Property 15: Admin metrics are arithmetically correct**
    - Generate random sets of completed orders and users; assert `total_revenue`, `completed_orders`, `registered_users` match computed values
    - **Validates: Requirements 7.2**

  - [x] 9.3 Implement admin orders list (`GET /api/admin/orders`) with date range filter
    - Require `requireAdmin`; support `from` and `to` query params filtering on `completed_at`; join buyer email and product title
    - _Requirements: 7.1, 7.3_

  - [x] 9.4 Write property test P16 — Date range filter correctness
    - **Property 16: Date range filter returns only in-range orders**
    - Generate orders with varying `completed_at` timestamps; apply random date ranges; assert all returned orders are in range and no in-range order is excluded
    - **Validates: Requirements 7.3**

  - [x] 9.5 Implement CSV export (`GET /api/admin/orders/export`)
    - Require `requireAdmin`; stream all orders as CSV with columns: order ID, buyer email, product title, amount paid, order status; set `Content-Disposition: attachment` header
    - _Requirements: 7.4_

  - [x] 9.6 Write property test P17 — CSV export completeness
    - **Property 17: CSV export contains all orders with correct fields**
    - Generate random order sets; call export endpoint; parse CSV; assert row count and field values match
    - **Validates: Requirements 7.1, 7.4**

- [~] 10. Checkpoint — Backend services complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 11. Email notification service
  - [x] 11.1 Implement email helper module (`server/services/email.js`)
    - Configure nodemailer transport from `SMTP_*` env vars
    - Export `sendPurchaseConfirmation(to, orderDetails)` that sends an HTML email with order ID, product title, and download instructions
    - Call this function from the webhook handler after order completion (wires into Task 7.2)
    - _Requirements: 4.5_

- [x] 12. React frontend — foundation
  - [x] 12.1 Set up React app structure, routing, and API client
    - Create directory structure matching design (`pages/`, `components/`, `hooks/`, `services/`)
    - Configure `react-router-dom` routes for all pages
    - Create `services/api.js` Axios instance with base URL and interceptors (attach JWT cookie / Authorization header; redirect to `/login` on 401)
    - _Requirements: 2.3, 8.3_

  - [x] 12.2 Implement `useAuth` hook and auth context
    - Store JWT state (decoded payload) in React context; expose `login`, `logout`, `register` functions that call the API
    - Protect routes: redirect unauthenticated users to `/login`, non-admin users away from `/admin/*`
    - _Requirements: 2.3, 8.1, 8.2_

- [x] 13. React frontend — auth pages
  - [x] 13.1 Implement `Register.jsx` and `Login.jsx` pages
    - Forms with email, display name (register only), and password fields; client-side validation matching server rules (password >= 8 chars)
    - Display server error messages (409, 400, 401) inline
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2_

- [x] 14. React frontend — product browsing
  - [x] 14.1 Implement `SearchBar.jsx`, `FilterPanel.jsx`, `Pagination.jsx`, and `ProductCard.jsx` components
    - `SearchBar`: controlled input that updates URL query param `search`
    - `FilterPanel`: category checkboxes updating URL query param `category`
    - `Pagination`: prev/next controls driven by `page` query param
    - `ProductCard`: displays title, price, category thumbnail
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 14.2 Implement `Home.jsx` page
    - Fetch `GET /api/products` with `search`, `category`, `page` params from URL; render `ProductCard` grid with `SearchBar`, `FilterPanel`, `Pagination`
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 14.3 Implement `ProductDetail.jsx` page
    - Fetch `GET /api/products/:id`; display title, description, price, category, preview screenshots, and `Preview_Link` as `<a target="_blank" rel="noopener noreferrer">`; show Buy button for authenticated users
    - _Requirements: 3.4, 3.5_

  - [x] 14.4 Write unit test — Preview_Link renders with `target="_blank"`
    - Assert `<a>` element has `target="_blank"` and `rel="noopener noreferrer"` when preview_link is present
    - _Requirements: 3.5_

- [x] 15. React frontend — purchase and checkout
  - [x] 15.1 Implement purchase flow and `Checkout.jsx` page
    - Buy button calls `POST /api/orders`; redirect browser to Stripe Checkout URL
    - `Checkout.jsx` handles Stripe success/cancel redirect; on success show confirmation message
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 16. React frontend — downloads
  - [x] 16.1 Implement `DownloadButton.jsx` component and `MyDownloads.jsx` page
    - `MyDownloads.jsx`: fetch `GET /api/orders`; list purchased products with title, purchase date
    - `DownloadButton`: calls `GET /api/downloads/:productId`; follows 302 redirect to trigger file download; shows error on 403
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 17. React frontend — admin dashboard
  - [x] 17.1 Implement `admin/Dashboard.jsx` — metrics display
    - Fetch `GET /api/admin/metrics`; display total revenue (formatted as USD), completed orders count, registered users count
    - _Requirements: 7.2_

  - [x] 17.2 Implement `admin/Products.jsx` — product CRUD UI
    - List all products (including unpublished); forms for create and edit with all fields (title, description, price, category, preview_link, file upload); delete button with confirmation
    - File input restricted to `.zip,.rar,.tar.gz`; display 413/415 errors inline
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 17.3 Implement `admin/Orders.jsx` — orders list and CSV export
    - Fetch `GET /api/admin/orders` with optional date range inputs; display table with order ID, buyer email, product title, amount, status
    - CSV export button calls `GET /api/admin/orders/export` and triggers browser download
    - _Requirements: 7.1, 7.3, 7.4_

- [x] 18. Integration tests
  - [x] 18.1 Write integration test — full purchase flow
    - Register → login → browse products → initiate order → simulate Stripe webhook → verify order completed → request download URL
    - _Requirements: 1.2, 2.1, 4.1, 4.2, 5.1_

  - [x] 18.2 Write integration test — admin product CRUD with file upload
    - Login as admin → create product with file → verify GET returns product → update → verify → delete → verify absent from public listing
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 18.3 Write integration test — admin CSV export with real DB data
    - Seed orders → call export endpoint → parse CSV → assert row count and field values
    - _Requirements: 7.1, 7.4_

- [~] 19. Final checkpoint — Ensure all tests pass
  - Ensure all unit, property, and integration tests pass. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use fast-check with a minimum of 100 iterations each and must include the comment `// Feature: digital-marketplace, Property N: <property_text>`
- All 18 correctness properties from the design document are covered by tasks 3.2, 3.3, 3.5, 3.6, 5.2, 5.3, 5.5, 5.6, 5.7, 5.8, 7.3, 8.2, 8.3, 8.4, 9.2, 9.4, 9.6, and 3.9
- Checkpoints at tasks 4, 6, 10, and 19 provide incremental validation gates
