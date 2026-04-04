st# Implementation Plan: Support License System

## Overview

Incremental implementation of four enhancements: dashboard period filter, sidebar icon resize, duplicate purchase prevention, and the full support license/ticketing feature. Each task builds on the previous, ending with all components wired together.

## Tasks

- [x] 1. Database migrations
  - [x] 1.1 Create migration `015_add_support_price_to_products.sql`
    - Add `support_price_cents INTEGER` column to products table
    - _Requirements: 4.1_
  - [x] 1.2 Create migration `016_create_support_licenses.sql`
    - Create `support_licenses` table with all columns, indexes on `user_id` and `product_id`
    - _Requirements: 4.4_
  - [x] 1.3 Create migration `017_create_support_tickets.sql`
    - Create `tickets` and `ticket_messages` tables with all columns and indexes
    - _Requirements: 6.9, 6.10_

- [x] 2. Backend — Dashboard period filter
  - [x] 2.1 Add date validation utility and update `/api/admin/charts` and `/api/admin/metrics`
    - Add `isValidISODate(str)` helper in `server/src/routes/admin.js`
    - Accept optional `start` and `end` query params; default to last 30 days when omitted
    - Return `400 { error: "Invalid date parameter" }` for non-ISO strings
    - Pass date range to SQL queries for both charts and metrics endpoints
    - _Requirements: 1.6, 1.7, 1.9_
  - [x] 2.2 Write property test for date validation (P2)
    - **Property 2: Invalid date parameters always produce an error**
    - **Validates: Requirements 1.7**
    - Add to `server/tests/property/support-license.property.js`
  - [x] 2.3 Write property test for chart series date range (P1)
    - **Property 1: Chart series dates are within the requested range**
    - **Validates: Requirements 1.6**
  - [x] 2.4 Write unit tests for date validation
    - Test known-bad strings: `""`, `"not-a-date"`, `"2024-13-01"`
    - Add to `server/tests/unit/support-license.test.js`

- [x] 3. Backend — Duplicate purchase prevention
  - [x] 3.1 Add ownership guard to `POST /api/orders` (single product)
    - Query completed orders for the authenticated user; return `409` if product already owned
    - _Requirements: 3.2_
  - [x] 3.2 Add ownership guard to `POST /api/orders/cart`
    - Check all product IDs in cart payload; return `409` if any already owned, no orders created
    - _Requirements: 3.3_
  - [x] 3.3 Write property test for single-product duplicate guard (P5)
    - **Property 5: Duplicate single-product purchase always returns 409**
    - **Validates: Requirements 3.2**
    - Add to `server/tests/property/support-license.property.js`
  - [x] 3.4 Write property test for cart duplicate guard (P6)
    - **Property 6: Duplicate cart purchase always returns 409**
    - **Validates: Requirements 3.3**

- [x] 4. Backend — Support license routes
  - [x] 4.1 Create `server/src/routes/support-licenses.js`
    - Implement `generateSupportLicenseKey()` using `crypto.randomBytes`
    - `POST /api/support-licenses/purchase`: verify product ownership (403 if not owned, 404 if no support price), initialise Paystack payment with `SLREF-` prefix
    - `POST /api/support-licenses/webhook`: on `charge.success` with `SLREF-` ref, create `support_licenses` row and send confirmation email
    - `GET /api/support-licenses/verify`: look up key for authenticated user, return license + product title or 404
    - `GET /api/support-licenses`: return all licenses for authenticated user
    - _Requirements: 4.3, 4.5, 4.6, 4.7, 5.11_
  - [x] 4.2 Add `sendSupportLicenseConfirmation` to `server/src/services/email.js`
    - Send email with license key to user on successful purchase
    - _Requirements: 4.6_
  - [x] 4.3 Write property test for license key format (P7)
    - **Property 7: generateSupportLicenseKey() always matches regex**
    - **Validates: Requirements 4.5**
    - Add to `server/tests/property/support-license.property.js`
  - [x] 4.4 Write property test for ownership check (P8)
    - **Property 8: Support license purchase requires product ownership**
    - **Validates: Requirements 4.7**
  - [x] 4.5 Write unit tests for key generation
    - Verify uniqueness across N calls and regex match
    - Add to `server/tests/unit/support-license.test.js`
  - [x] 4.6 Register support-licenses router in `server/src/app.js`
    - Mount routes at `/api/support-licenses`
    - _Requirements: 4.3_

- [x] 5. Backend — Support ticket routes
  - [x] 5.1 Create `server/src/routes/support-tickets.js`
    - `POST /api/support-tickets`: validate non-empty message (400), check `requests_used < requests_total` (403), create ticket, increment `requests_used`
    - `GET /api/support-tickets`: return tickets for authenticated user only
    - `GET /api/support-tickets/:id/messages`: return messages if owner or admin, else 403
    - `POST /api/support-tickets/:id/messages`: append message if ticket open and requester is owner or admin; 409 if closed, 403 if unauthorized
    - _Requirements: 5.1, 5.2, 5.9, 5.10, 7.5, 7.6, 7.7, 7.8_
  - [x] 5.2 Add admin support ticket endpoints to `server/src/routes/admin.js`
    - `GET /api/admin/support-tickets`: list all tickets, filterable by `status` query param
    - `POST /api/admin/support-tickets/:id/messages`: append admin message
    - `PATCH /api/admin/support-tickets/:id/close`: set ticket status to `closed`
    - _Requirements: 6.1, 6.3, 6.5, 6.6_
  - [x] 5.3 Write property test for exhausted license (P9)
    - **Property 9: Exhausted support license always returns 403 on ticket creation**
    - **Validates: Requirements 5.1**
    - Add to `server/tests/property/support-license.property.js`
  - [x] 5.4 Write property test for requests_used increment (P10)
    - **Property 10: Ticket submission increments requests_used by exactly 1**
    - **Validates: Requirements 5.2**
  - [x] 5.5 Write property test for empty message rejection (P11)
    - **Property 11: Empty message is always rejected**
    - **Validates: Requirements 5.10**
  - [x] 5.6 Write property test for closed ticket message rejection (P12)
    - **Property 12: Closed ticket always rejects new messages with 409**
    - **Validates: Requirements 6.7, 6.6**
  - [x] 5.7 Write property test for status filter (P13)
    - **Property 13: Ticket status filter returns only matching tickets**
    - **Validates: Requirements 6.3**
  - [x] 5.8 Write property test for user ticket isolation (P14)
    - **Property 14: User ticket list never leaks other users' tickets**
    - **Validates: Requirements 7.1, 7.6**
  - [x] 5.9 Write property test for non-owner access (P17)
    - **Property 17: Non-owner non-admin always gets 403 on ticket messages**
    - **Validates: Requirements 7.7, 7.8**
  - [x] 5.10 Write property test for user reply sender_role (P16)
    - **Property 16: User reply always has sender_role = 'user'**
    - **Validates: Requirements 7.5**
  - [x] 5.11 Register support-tickets router in `server/src/app.js`
    - Mount routes at `/api/support-tickets`
    - _Requirements: 5.1_

- [x] 6. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend — AdminLayout sidebar updates
  - [x] 7.1 Update icon sizes in `client/src/components/AdminLayout.jsx`
    - Change all nav icon classes from `w-4 h-4` to `w-5 h-5`, including bottom-section icons
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 7.2 Add "Support" nav item to sidebar
    - Add link to `/admin/support` with appropriate icon at `w-5 h-5`
    - _Requirements: 6.8_

- [x] 8. Frontend — Dashboard period filter
  - [x] 8.1 Create `PeriodFilter` component in `client/src/components/PeriodFilter.jsx`
    - Render preset buttons: Last 7 days, Last 30 days, Last 90 days, Custom range
    - When Custom range selected, show two date inputs (start, end)
    - Validate: start > end → "Start date must be before end date"; range > 365 days → "Range cannot exceed 365 days"; suppress API call on error
    - Emit selected date range to parent via callback
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 8.2 Wire `PeriodFilter` into `client/src/pages/admin/Dashboard.jsx`
    - Default to Last 30 days on mount
    - On period change, re-fetch charts and metrics with `start`/`end` params
    - Re-render all three charts and stat cards with new data
    - _Requirements: 1.2, 1.8, 1.9_
  - [x] 8.3 Write property test for client-side range validation (P3, P4)
    - **Property 3: start > end always produces client validation error**
    - **Property 4: Range > 365 days always produces client validation error**
    - **Validates: Requirements 1.4, 1.5**
    - Add to `server/tests/property/support-license.property.js`

- [x] 9. Frontend — ProductDetail duplicate purchase prevention
  - [x] 9.1 Update `client/src/pages/ProductDetail.jsx` to check ownership
    - Call `GET /api/orders` on mount; compare `product_id` values against current product
    - If owned: replace "Buy Now" / "Add to Cart" with disabled "Already Purchased" indicator and link to `/my-downloads`
    - If product has `support_price_cents` and user owns it: show "Buy Support License" button with price
    - Guest users see normal "Sign in to Purchase" button regardless
    - _Requirements: 3.1, 3.4, 3.5, 4.2_

- [x] 10. Frontend — Support License purchase flow on ProductDetail
  - [x] 10.1 Implement "Buy Support License" button handler in `ProductDetail.jsx`
    - Call `POST /api/support-licenses/purchase` with `productId`
    - Redirect to Paystack URL on success
    - _Requirements: 4.3_

- [x] 11. Frontend — Help Center page
  - [x] 11.1 Create `client/src/pages/Support.jsx`
    - Redirect unauthenticated users to login
    - Render license key text input and "Verify" button
    - On verify: call `GET /api/support-licenses/verify?key=...`; display product name and usage (e.g. "2 / 3 used") on success, or error message on failure
    - If `requests_used < requests_total`: show "Request Support" button
    - If exhausted: show disabled "No requests remaining" and prompt to buy another license
    - On "Request Support": show textarea and "Submit" button
    - On submit with non-empty message: call `POST /api/support-tickets`, show confirmation with ticket ID
    - On submit with empty message: show "Message is required", do not call API
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_
  - [x] 11.2 Add ticket list and chat thread to `Support.jsx`
    - Call `GET /api/support-tickets` to list user's tickets with status
    - On ticket click: call `GET /api/support-tickets/:id/messages` and render chat thread
    - If ticket is `open`: show message input and "Send" button; on send call `POST /api/support-tickets/:id/messages`
    - If ticket is `closed`: show "This ticket is closed" notice, hide message input
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 11.3 Write property test for closed ticket rendering (P15)
    - **Property 15: Closed ticket never renders a message input**
    - **Validates: Requirements 7.4**
    - Add to frontend test suite
  - [x] 11.4 Register `/support` route in `client/src/main.jsx`
    - Wrap with `ProtectedRoute` to redirect guests
    - _Requirements: 5.1, 5.2_

- [x] 12. Frontend — Admin Support page
  - [x] 12.1 Create `client/src/pages/admin/AdminSupport.jsx`
    - Call `GET /api/admin/support-tickets` on mount; render table with ticket ID, license key, product name, user email, date, status
    - Add status filter tabs/dropdown (open / closed / all)
    - On ticket row click: fetch and display chat thread via `GET /api/support-tickets/:id/messages`
    - Admin message input: call `POST /api/admin/support-tickets/:id/messages`
    - "Close Ticket" button: call `PATCH /api/admin/support-tickets/:id/close`; update UI to reflect closed state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 12.2 Register `/admin/support` route in `client/src/main.jsx`
    - Wrap with admin `ProtectedRoute`
    - _Requirements: 6.1_

- [x] 13. Admin product form — support price field
  - [x] 13.1 Add "Support License Price" field to admin product create/edit form in `client/src/pages/admin/Products.jsx`
    - Optional numeric input in Naira; store/send as kobo (`value * 100`)
    - Include `support_price_cents` in product create/update API payloads
    - _Requirements: 4.8_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with `{ numRuns: 100 }` (see `server/tests/property/`)
- Unit and integration tests use Jest (see `server/tests/unit/` and `server/tests/integration/`)
