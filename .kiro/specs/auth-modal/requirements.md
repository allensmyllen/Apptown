# Requirements Document

## Introduction

The auth-modal feature replaces the standalone Login and Register pages with a unified modal overlay, and adds a Forgot Password / Reset Password flow. Clicking "Sign In" or "Get Started" in the Navbar opens the modal in-place. Users can switch between login and register views inside the modal and dismiss it at any time. A "Forgot password?" link inside the login view lets users request a password-reset email; a dedicated Reset Password page (reached via a tokenised link in that email) lets them set a new password.

## Glossary

- **Auth_Modal**: The overlay component that hosts the Login_View and Register_View.
- **Login_View**: The sign-in form rendered inside the Auth_Modal.
- **Register_View**: The sign-up form rendered inside the Auth_Modal.
- **Forgot_Password_View**: The form rendered inside the Auth_Modal where a user submits their email to request a reset link.
- **Reset_Password_Page**: The dedicated page (`/reset-password?token=…`) where a user sets a new password using a valid reset token.
- **Password_Reset_Token**: A cryptographically random, single-use token stored in the database with an expiry timestamp, used to authorise a password reset.
- **Email_Service**: The existing nodemailer-based service at `server/src/services/email.js`.
- **Auth_API**: The Express router at `server/src/routes/auth.js`.
- **useAuth**: The React context hook at `client/src/hooks/useAuth.jsx`.
- **Navbar**: The top navigation component at `client/src/components/Navbar.jsx`.

---

## Requirements

### Requirement 1: Open Auth Modal from Navbar

**User Story:** As a visitor, I want clicking "Sign In" or "Get Started" in the Navbar to open an auth modal, so that I can authenticate without leaving the current page.

#### Acceptance Criteria

1. WHEN a visitor clicks the "Sign In" link in the Navbar, THE Auth_Modal SHALL open displaying the Login_View.
2. WHEN a visitor clicks the "Get Started" button in the Navbar, THE Auth_Modal SHALL open displaying the Register_View.
3. WHILE the Auth_Modal is open, THE Navbar SHALL NOT navigate the browser to `/login` or `/register`.
4. WHILE a user is authenticated, THE Navbar SHALL NOT display the "Sign In" link or the "Get Started" button.

---

### Requirement 2: Dismiss the Auth Modal

**User Story:** As a visitor, I want to close the auth modal without completing authentication, so that I can return to the page I was viewing.

#### Acceptance Criteria

1. WHEN a visitor clicks the backdrop outside the Auth_Modal, THE Auth_Modal SHALL close.
2. WHEN a visitor presses the Escape key while the Auth_Modal is open, THE Auth_Modal SHALL close.
3. WHEN a visitor clicks the close button inside the Auth_Modal, THE Auth_Modal SHALL close.
4. WHEN the Auth_Modal closes, THE Auth_Modal SHALL restore focus to the element that triggered it.

---

### Requirement 3: Switch Between Login and Register Views

**User Story:** As a visitor, I want to switch between the login and register forms inside the modal, so that I do not need to navigate to a separate page.

#### Acceptance Criteria

1. WHEN a visitor clicks the "Create an account" link in the Login_View, THE Auth_Modal SHALL display the Register_View.
2. WHEN a visitor clicks the "Sign in" link in the Register_View, THE Auth_Modal SHALL display the Login_View.
3. WHEN the Auth_Modal switches views, THE Auth_Modal SHALL clear any validation error messages from the previous view.

---

### Requirement 4: Login via Modal

**User Story:** As a registered user, I want to log in through the modal, so that I can authenticate quickly without a page navigation.

#### Acceptance Criteria

1. WHEN a user submits valid credentials in the Login_View, THE Auth_Modal SHALL call the existing `POST /api/auth/login` endpoint.
2. WHEN the Auth_API returns a successful login response, THE Auth_Modal SHALL close and THE useAuth SHALL update the authenticated user state.
3. IF the Auth_API returns an error response for login, THEN THE Login_View SHALL display the error message returned by the API.
4. WHILE a login request is in-flight, THE Login_View SHALL disable the submit button to prevent duplicate submissions.

---

### Requirement 5: Register via Modal

**User Story:** As a new visitor, I want to register through the modal, so that I can create an account without leaving the current page.

#### Acceptance Criteria

1. WHEN a user submits a valid registration form in the Register_View, THE Auth_Modal SHALL call the existing `POST /api/auth/register` endpoint.
2. WHEN the Auth_API returns a successful registration response, THE Auth_Modal SHALL close and THE useAuth SHALL update the authenticated user state.
3. IF the Auth_API returns an error response for registration, THEN THE Register_View SHALL display the error message returned by the API.
4. WHILE a registration request is in-flight, THE Register_View SHALL disable the submit button to prevent duplicate submissions.

---

### Requirement 6: Forgot Password — Request Reset Email

**User Story:** As a user who has forgotten their password, I want to request a password reset email from within the login modal, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a visitor clicks the "Forgot password?" link in the Login_View, THE Auth_Modal SHALL display the Forgot_Password_View.
2. WHEN a user submits a valid email address in the Forgot_Password_View, THE Auth_Modal SHALL call `POST /api/auth/forgot-password`.
3. WHEN the Auth_API receives a forgot-password request for a registered email, THE Auth_API SHALL generate a Password_Reset_Token, persist it with an expiry of 1 hour, and send a reset email via the Email_Service.
4. WHEN the Auth_API receives a forgot-password request for an unregistered email, THE Auth_API SHALL return a 200 response without revealing whether the email exists.
5. WHEN the Auth_API returns a response to a forgot-password request, THE Forgot_Password_View SHALL display a confirmation message instructing the user to check their email.
6. IF the Auth_API returns an error response for the forgot-password request, THEN THE Forgot_Password_View SHALL display a generic error message.
7. WHILE a forgot-password request is in-flight, THE Forgot_Password_View SHALL disable the submit button to prevent duplicate submissions.

---

### Requirement 7: Password Reset Token Storage

**User Story:** As a system operator, I want reset tokens stored securely in the database with expiry enforcement, so that tokens cannot be reused or exploited after expiry.

#### Acceptance Criteria

1. THE Auth_API SHALL store each Password_Reset_Token as a bcrypt hash alongside the associated user ID and an expiry timestamp.
2. WHEN a user requests a second password reset before the first token expires, THE Auth_API SHALL invalidate the previous token and issue a new one.
3. THE database migration SHALL add a `password_reset_tokens` table with columns: `id`, `user_id`, `token_hash`, `expires_at`, and `used_at`.

---

### Requirement 8: Reset Password Page

**User Story:** As a user who clicked a password reset link in their email, I want to set a new password on a dedicated page, so that I can regain access to my account.

#### Acceptance Criteria

1. THE Reset_Password_Page SHALL be accessible at the route `/reset-password`.
2. WHEN the Reset_Password_Page loads with a `token` query parameter, THE Reset_Password_Page SHALL display a form for entering and confirming a new password.
3. WHEN a user submits a new password on the Reset_Password_Page, THE Reset_Password_Page SHALL call `POST /api/auth/reset-password` with the token and new password.
4. WHEN the Auth_API receives a reset-password request with a valid, unexpired, unused token, THE Auth_API SHALL update the user's `password_hash`, mark the token as used, and return a 200 response.
5. IF the Auth_API receives a reset-password request with an expired or already-used token, THEN THE Auth_API SHALL return a 400 response with a descriptive error message.
6. IF the Auth_API receives a reset-password request with a token that does not match any stored hash, THEN THE Auth_API SHALL return a 400 response with a descriptive error message.
7. WHEN the Auth_API returns a successful reset-password response, THE Reset_Password_Page SHALL display a success message and provide a link to open the Auth_Modal in Login_View.
8. WHEN the Reset_Password_Page loads without a `token` query parameter, THE Reset_Password_Page SHALL display an error message indicating the link is invalid.
9. THE Auth_API SHALL enforce that the new password submitted to `POST /api/auth/reset-password` is at least 8 characters.

---

### Requirement 9: Password Reset Email Content

**User Story:** As a user, I want the password reset email to contain a clear, actionable link, so that I can complete the reset without confusion.

#### Acceptance Criteria

1. WHEN the Email_Service sends a password reset email, THE Email_Service SHALL include a reset URL in the format `{CLIENT_URL}/reset-password?token={raw_token}`.
2. WHEN the Email_Service sends a password reset email, THE Email_Service SHALL state that the link expires in 1 hour.
3. THE Email_Service SHALL send the password reset email from the address configured in the `SMTP_FROM` environment variable.

---

### Requirement 10: Accessibility of the Auth Modal

**User Story:** As a user relying on assistive technology, I want the auth modal to be keyboard-navigable and screen-reader-friendly, so that I can authenticate without a mouse.

#### Acceptance Criteria

1. WHEN the Auth_Modal opens, THE Auth_Modal SHALL move focus to the first interactive element inside the modal.
2. WHILE the Auth_Modal is open, THE Auth_Modal SHALL trap keyboard focus within the modal so that Tab and Shift+Tab do not reach elements behind the overlay.
3. THE Auth_Modal SHALL set `role="dialog"` and `aria-modal="true"` on the modal container element.
4. THE Auth_Modal SHALL set `aria-labelledby` on the modal container to reference the visible heading of the active view.
