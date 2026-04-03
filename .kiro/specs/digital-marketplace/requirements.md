# Requirements Document

## Introduction

A digital marketplace web application built with React JS (frontend) and Node.js (backend) where creators can sell digital products such as website source code, plugins, themes, and full scripts. Buyers can browse, purchase, and download products. An admin dashboard provides full control over product management, sales tracking, and file uploads.

## Glossary

- **System**: The digital marketplace web application
- **User**: A registered individual who can browse, purchase, and download digital products
- **Admin**: A privileged user with access to the admin dashboard for managing products and sales
- **Product**: A digital item listed for sale (e.g., source code, plugin, theme, script)
- **Order**: A completed purchase transaction linking a User to one or more Products
- **Download**: The act of retrieving a purchased Product file
- **Preview_Link**: A URL associated with a Product that allows potential buyers to view a live demo
- **Auth_Service**: The backend service responsible for user registration, login, and session management
- **Product_Service**: The backend service responsible for product CRUD operations and file management
- **Order_Service**: The backend service responsible for processing payments and managing orders
- **Download_Service**: The backend service responsible for generating and validating secure download access
- **Payment_Gateway**: The third-party payment processor integrated into the System (e.g., Stripe)
- **Admin_Dashboard**: The frontend interface accessible only to Admin users for managing the marketplace

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a visitor, I want to create an account, so that I can purchase and download digital products.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept registration requests containing a unique email address, a display name, and a password of at least 8 characters.
2. WHEN a registration request is received with a valid email and password, THE Auth_Service SHALL create a new User account and return a signed JWT token.
3. IF a registration request contains an email address already associated with an existing account, THEN THE Auth_Service SHALL return a 409 Conflict error with a descriptive message.
4. IF a registration request contains a password shorter than 8 characters, THEN THE Auth_Service SHALL return a 400 Bad Request error with a descriptive message.
5. THE Auth_Service SHALL store passwords as bcrypt hashes with a minimum cost factor of 10.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in to my account, so that I can access my purchases and downloads.

#### Acceptance Criteria

1. WHEN a login request is received with a valid email and correct password, THE Auth_Service SHALL return a signed JWT access token with a 24-hour expiry.
2. IF a login request contains an unrecognised email or incorrect password, THEN THE Auth_Service SHALL return a 401 Unauthorized error.
3. THE System SHALL include the JWT token in an HTTP-only cookie or Authorization header for all authenticated requests.
4. WHEN a User's JWT token expires, THE System SHALL require the User to log in again to obtain a new token.

---

### Requirement 3: Product Browsing

**User Story:** As a visitor or user, I want to browse available products, so that I can find items I want to purchase.

#### Acceptance Criteria

1. THE System SHALL display a paginated list of published Products, with a default page size of 20 items.
2. WHEN a search query is submitted, THE Product_Service SHALL return Products whose title or description contains the query string.
3. THE System SHALL allow filtering Products by category (e.g., theme, plugin, script, source code).
4. WHEN a Product detail page is requested, THE System SHALL display the product title, description, price, category, preview screenshots, and Preview_Link if available.
5. THE System SHALL display the Preview_Link as a clickable external link that opens in a new browser tab.

---

### Requirement 4: Payment and Purchase

**User Story:** As a user, I want to pay for a product, so that I can gain access to download it.

#### Acceptance Criteria

1. WHEN a User initiates a purchase, THE Order_Service SHALL create a pending Order and initiate a payment session with the Payment_Gateway.
2. WHEN the Payment_Gateway confirms a successful payment, THE Order_Service SHALL mark the Order as completed and associate the purchased Product with the User's account.
3. IF the Payment_Gateway returns a payment failure, THEN THE Order_Service SHALL mark the Order as failed and return a 402 Payment Required error to the User.
4. THE Order_Service SHALL support payment in a single currency (USD) at launch.
5. WHEN an Order is completed, THE System SHALL send a purchase confirmation email to the User's registered email address.

---

### Requirement 5: Download Access

**User Story:** As a user who has purchased a product, I want to download it, so that I can use it in my projects.

#### Acceptance Criteria

1. WHEN a User requests a download for a Product associated with a completed Order, THE Download_Service SHALL generate a time-limited signed download URL valid for 15 minutes.
2. IF a User requests a download for a Product not associated with a completed Order on their account, THEN THE Download_Service SHALL return a 403 Forbidden error.
3. WHILE a signed download URL is valid, THE Download_Service SHALL serve the requested Product file.
4. WHEN a signed download URL expires, THE Download_Service SHALL return a 410 Gone error and require the User to request a new URL.
5. THE System SHALL display all purchased Products in a dedicated "My Downloads" section of the User's account page.

---

### Requirement 6: Admin — Product Management

**User Story:** As an admin, I want to add and manage products, so that I can keep the marketplace catalogue up to date.

#### Acceptance Criteria

1. WHEN an Admin submits a new product form with a title, description, price, category, and product file, THE Product_Service SHALL create a new Product record and store the uploaded file in secure storage.
2. THE Admin_Dashboard SHALL allow an Admin to attach a Preview_Link URL to any Product.
3. WHEN an Admin updates a Product's details, THE Product_Service SHALL persist the changes and return the updated Product record.
4. WHEN an Admin deletes a Product, THE Product_Service SHALL mark the Product as unpublished and remove it from the public product listing.
5. IF an Admin attempts to upload a file exceeding 500 MB, THEN THE Product_Service SHALL return a 413 Payload Too Large error.
6. THE Product_Service SHALL accept product file uploads in ZIP, RAR, and TAR.GZ formats.

---

### Requirement 7: Admin — Sales Management

**User Story:** As an admin, I want to view and manage sales, so that I can monitor marketplace performance.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL display a list of all Orders, including order ID, buyer email, product title, amount paid, and order status.
2. THE Admin_Dashboard SHALL display aggregate sales metrics including total revenue, total number of completed orders, and total number of registered users.
3. WHEN an Admin filters orders by date range, THE Order_Service SHALL return only Orders with a completion timestamp within the specified range.
4. THE Admin_Dashboard SHALL allow an Admin to export the Orders list as a CSV file.

---

### Requirement 8: Access Control

**User Story:** As a system operator, I want role-based access control enforced, so that regular users cannot access admin functionality.

#### Acceptance Criteria

1. WHILE a request targets an Admin_Dashboard endpoint, THE Auth_Service SHALL verify that the requesting User holds the Admin role.
2. IF a non-Admin User attempts to access an Admin_Dashboard endpoint, THEN THE Auth_Service SHALL return a 403 Forbidden error.
3. WHILE a request targets a protected User endpoint (e.g., download, order history), THE Auth_Service SHALL verify that a valid JWT token is present.
4. IF a request to a protected endpoint contains no JWT token or an invalid JWT token, THEN THE Auth_Service SHALL return a 401 Unauthorized error.
