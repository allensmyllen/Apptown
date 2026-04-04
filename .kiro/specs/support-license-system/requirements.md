# Requirements: Support License System

## Introduction

A set of enhancements to the digital marketplace covering four areas:

1. **Dashboard period filter** — Admin charts and stats become filterable by time period.
2. **Sidebar icon sizing** — Admin sidebar nav icons are enlarged for better usability.
3. **Duplicate purchase prevention** — Users cannot buy a product they already own.
4. **Support License feature** — Products gain a purchasable support license that grants 3 support requests, backed by a ticketing system with admin chat and status management.

---

## Glossary

- **Dashboard**: The admin page at `/admin` showing revenue, orders, and page-view charts.
- **Period_Filter**: A UI control on the Dashboard that selects the time window for chart data.
- **Sidebar**: The left-hand navigation panel in the admin layout (`AdminLayout`).
- **Product**: A digital item listed in the marketplace with a `price_cents` field.
- **Support_License**: A purchasable add-on for a product that grants the buyer 3 support requests.
- **Support_License_Key**: A unique string (format `SL-{XXXXXXXX}-{XXXXXXXX}-{XXXXXXXX}`) issued when a Support_License is purchased.
- **Support_Request**: A single help request submitted by a user against a verified Support_License.
- **Ticket**: A record created when a Support_Request is submitted; visible to admin with a status of `open` or `closed`.
- **Chat_Thread**: An ordered sequence of messages attached to a Ticket, visible to both the owning user and admin.
- **Help_Center**: The user-facing page at `/support` where users verify a Support_License_Key and submit Support_Requests.
- **Admin_Support_Page**: The admin page at `/admin/support` listing all Tickets.
- **System**: The full-stack marketplace application (Node/Express API + React client).
- **Admin**: An authenticated user with `role = 'admin'`.
- **User**: An authenticated user with `role = 'user'`.

---

## Requirements

### Requirement 1: Dashboard Period Filter

**User Story:** As an admin, I want to filter dashboard charts by a time period so that I can analyse revenue, orders, and page views for specific windows.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Period_Filter control with options: Last 7 days, Last 30 days, Last 90 days, and Custom range.
2. WHEN an admin selects a preset period option, THE Dashboard SHALL re-fetch chart data from the API using the selected start and end dates and re-render all three charts (Revenue, Website Views, Orders).
3. WHEN an admin selects the Custom range option, THE Dashboard SHALL display two date-picker inputs (start date, end date).
4. WHEN an admin submits a custom range where the start date is after the end date, THE Dashboard SHALL display an inline validation message "Start date must be before end date" and SHALL NOT fetch chart data.
5. WHEN an admin submits a custom range where the range exceeds 365 days, THE Dashboard SHALL display an inline validation message "Range cannot exceed 365 days" and SHALL NOT fetch chart data.
6. THE `/api/admin/charts` endpoint SHALL accept optional `start` and `end` query parameters (ISO 8601 date strings) and return daily series data for the specified range.
7. IF the `start` or `end` query parameter is not a valid ISO 8601 date, THEN THE System SHALL return `400 { error: "Invalid date parameter" }`.
8. WHILE no period is explicitly selected, THE Dashboard SHALL default to the Last 30 days period.
9. THE stat cards (Total Revenue, Completed Orders, Registered Users) SHALL update to reflect totals within the selected period.

#### Correctness Properties

- **P1.1** — For any valid `start`/`end` pair where `start <= end`, the API returns a series array where every entry's `date` falls within `[start, end]` inclusive.
- **P1.2** — For any `start`/`end` pair where `start > end`, the API always returns `400`.

---

### Requirement 2: Sidebar Icon Size

**User Story:** As an admin, I want the sidebar navigation icons to be larger so that they are easier to identify at a glance.

#### Acceptance Criteria

1. THE Sidebar SHALL render each navigation icon at `w-5 h-5` (20 × 20 px) instead of the current `w-4 h-4` (16 × 16 px).
2. THE Sidebar SHALL render the "View Store" and "Sign Out" icons in the bottom section at `w-5 h-5` as well.
3. WHILE the sidebar is in its collapsed (mobile) state, THE Sidebar SHALL maintain the same `w-5 h-5` icon size.

---

### Requirement 3: Prevent Duplicate Purchases

**User Story:** As a user, I want to be prevented from buying a product I already own so that I do not pay twice for the same item.

#### Acceptance Criteria

1. WHEN a logged-in user views a ProductDetail page for a product they already own, THE ProductDetail page SHALL replace the "Buy Now" and "Add to Cart" buttons with a disabled "Already Purchased" indicator and a link to `/my-downloads`.
2. WHEN a logged-in user attempts POST `/api/orders` for a product they already own (completed order exists), THE System SHALL return `409 { error: "You already own this product. Visit My Downloads." }`.
3. WHEN a logged-in user attempts POST `/api/orders/cart` and one or more products in the cart are already owned, THE System SHALL return `409 { error: "You already own one or more products in this cart." }` and SHALL NOT create any orders.
4. WHEN a guest user views a ProductDetail page, THE ProductDetail page SHALL display the normal "Sign in to Purchase" button regardless of ownership state.
5. THE ProductDetail page SHALL check ownership by calling GET `/api/orders` and comparing `product_id` values against the current product id.

#### Correctness Properties

- **P3.1** — For any authenticated user who has a completed order for product P, POST `/api/orders` with `productId = P` always returns `409`.
- **P3.2** — For any authenticated user who has a completed order for at least one product in a cart payload, POST `/api/orders/cart` always returns `409`.

---

### Requirement 4: Support License Purchase

**User Story:** As a user, I want to purchase a support license for a product I own so that I can get dedicated support for that product.

#### Acceptance Criteria

1. THE Product record SHALL include a `support_price_cents` field (nullable integer); when non-null, the product offers a purchasable Support_License.
2. WHEN a logged-in user views a ProductDetail page for a product they own and the product has a non-null `support_price_cents`, THE ProductDetail page SHALL display a "Buy Support License" button showing the support price.
3. WHEN a user clicks "Buy Support License", THE System SHALL initiate a Paystack payment for `support_price_cents` and, on success, create a Support_License record and issue a Support_License_Key.
4. THE `support_licenses` table SHALL have columns: `id` (UUID PK), `user_id` (FK → users), `product_id` (FK → products), `license_key` (TEXT UNIQUE), `requests_used` (INTEGER DEFAULT 0), `requests_total` (INTEGER DEFAULT 3), `created_at`.
5. THE Support_License_Key format SHALL be `SL-{XXXXXXXX}-{XXXXXXXX}-{XXXXXXXX}` where each segment is 8 uppercase hexadecimal characters.
6. WHEN a Support_License purchase is completed, THE System SHALL send a confirmation email to the user containing the Support_License_Key.
7. WHEN a user attempts to purchase a Support_License for a product they do not own, THE System SHALL return `403 { error: "You must own this product to purchase a support license." }`.
8. THE admin product creation and edit form SHALL include a "Support License Price" field (optional numeric input in Naira, stored as kobo).

#### Correctness Properties

- **P4.1** — `generateSupportLicenseKey()` always returns a string matching `/^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/`.
- **P4.2** — For any completed support license purchase, GET `/api/support-licenses` for the purchasing user returns exactly one record with a matching `product_id`.

---

### Requirement 5: Help Center — License Verification and Support Request Submission

**User Story:** As a user, I want a Help Center page where I can verify my support license and submit support requests so that I can get help for products I own.

#### Acceptance Criteria

1. THE System SHALL provide a Help_Center page at `/support` accessible to authenticated users.
2. WHEN a guest user navigates to `/support`, THE System SHALL redirect the user to the login page.
3. THE Help_Center page SHALL display a text input for the user to enter a Support_License_Key and a "Verify" button.
4. WHEN a user submits a valid Support_License_Key that belongs to them, THE Help_Center page SHALL display the associated product name, the number of support requests used, and the total allowed (e.g. "2 / 3 used").
5. WHEN a user submits a Support_License_Key that does not exist or belongs to another user, THE Help_Center page SHALL display "Invalid or unrecognised license key."
6. WHEN a verified Support_License has `requests_used < requests_total`, THE Help_Center page SHALL display a "Request Support" button.
7. WHEN a verified Support_License has `requests_used >= requests_total`, THE Help_Center page SHALL display a disabled "No requests remaining" indicator and a prompt to purchase another Support_License.
8. WHEN a user clicks "Request Support", THE Help_Center page SHALL display a textarea for the user to describe their issue and a "Submit" button.
9. WHEN a user submits a support request with a non-empty message, THE System SHALL create a Ticket record with status `open`, increment `requests_used` on the Support_License, and display a confirmation message with the ticket ID.
10. IF a user submits a support request with an empty message, THEN THE System SHALL display "Message is required" and SHALL NOT create a Ticket.
11. THE GET `/api/support-licenses/verify` endpoint SHALL accept a `key` query parameter and return the Support_License record with product title if the key belongs to the authenticated user.

#### Correctness Properties

- **P5.1** — For any Support_License where `requests_used >= requests_total`, POST `/api/support-tickets` always returns `403 { error: "No support requests remaining." }`.
- **P5.2** — For any successful ticket submission, `requests_used` on the associated Support_License is incremented by exactly 1.

---

### Requirement 6: Support Ticket Management (Admin)

**User Story:** As an admin, I want to see all support tickets and manage them through a chat interface so that I can respond to user issues and close resolved tickets.

#### Acceptance Criteria

1. THE System SHALL provide an Admin_Support_Page at `/admin/support` listing all Tickets.
2. THE Admin_Support_Page SHALL display for each Ticket: ticket ID, Support_License_Key, product name, user email, submission date, and status (`open` / `closed`).
3. THE Admin_Support_Page SHALL allow filtering tickets by status (`open`, `closed`, or all).
4. WHEN an admin clicks on a Ticket, THE Admin_Support_Page SHALL display the Chat_Thread for that Ticket, showing all messages with sender name and timestamp.
5. WHEN an admin submits a message in the Chat_Thread, THE System SHALL append the message to the thread and notify the user (via in-page polling or real-time update).
6. WHEN an admin clicks "Close Ticket", THE System SHALL update the Ticket status to `closed` and prevent new messages from being added to the thread.
7. IF a user or admin attempts to add a message to a `closed` Ticket, THEN THE System SHALL return `409 { error: "Ticket is closed." }`.
8. THE admin sidebar SHALL include a "Support" navigation item linking to `/admin/support`.
9. THE `tickets` table SHALL have columns: `id` (UUID PK), `support_license_id` (FK → support_licenses), `user_id` (FK → users), `product_id` (FK → products), `message` (TEXT), `status` (TEXT DEFAULT `'open'`), `created_at`.
10. THE `ticket_messages` table SHALL have columns: `id` (UUID PK), `ticket_id` (FK → tickets), `sender_id` (FK → users), `sender_role` (TEXT: `'user'` or `'admin'`), `body` (TEXT), `created_at`.

#### Correctness Properties

- **P6.1** — For any Ticket with status `closed`, POST `/api/support-tickets/:id/messages` always returns `409`.
- **P6.2** — For any authenticated non-admin user, GET `/api/admin/support-tickets` always returns `403`.

---

### Requirement 7: User Chat View for Support Tickets

**User Story:** As a user, I want to view and reply to my support ticket chat thread so that I can follow up on my request.

#### Acceptance Criteria

1. THE Help_Center page SHALL display a list of the user's submitted Tickets with their status.
2. WHEN a user clicks on a Ticket, THE Help_Center page SHALL display the Chat_Thread for that Ticket.
3. WHEN a Ticket status is `open`, THE Help_Center page SHALL display a message input and "Send" button for the user to reply.
4. WHEN a Ticket status is `closed`, THE Help_Center page SHALL display a "This ticket is closed" notice and hide the message input.
5. WHEN a user submits a reply message, THE System SHALL append the message to the Chat_Thread with `sender_role = 'user'`.
6. THE GET `/api/support-tickets` endpoint SHALL return all Tickets belonging to the authenticated user, including the latest message and status.
7. THE GET `/api/support-tickets/:id/messages` endpoint SHALL return all messages for a Ticket, only if the Ticket belongs to the authenticated user or the requester is an admin.
8. IF a non-owner, non-admin user requests messages for a Ticket they do not own, THEN THE System SHALL return `403 { error: "Access denied." }`.

#### Correctness Properties

- **P7.1** — For any authenticated user U, GET `/api/support-tickets` never returns Tickets where `user_id != U.id`.
- **P7.2** — For any Ticket with status `closed`, the Help_Center page renders no message input for that Ticket.
