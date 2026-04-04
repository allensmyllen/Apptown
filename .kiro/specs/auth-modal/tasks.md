# Implementation Plan: auth-modal

## Overview

Replace standalone Login/Register pages with a unified AuthModal, add Forgot/Reset Password flow (DB migration, backend endpoints, email service), wire up context-driven modal in Navbar, and add the `/reset-password` page.

## Tasks

- [x] 1. DB migration — add password_reset_tokens table
  - Create `server/migrations/004_create_password_reset_tokens.sql` with the schema defined in the design
  - Table columns: `id` (UUID PK), `user_id` (FK → users), `token_hash` (TEXT), `expires_at` (TIMESTAMPTZ), `used_at` (TIMESTAMPTZ)
  - Add index `idx_prt_user_id` on `user_id`
  - _Requirements: 7.3_

- [ ] 2. Email service — add sendPasswordReset()
  - [x] 2.1 Implement `sendPasswordReset(to, rawToken)` in `server/src/services/email.js`
    - Build reset URL as `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`
    - Email body must mention the 1-hour expiry and use `SMTP_FROM`
    - Export the new function alongside `sendPurchaseConfirmation`
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 2.2 Write property test for reset email URL format
    - **Property 8: Reset email contains correctly formatted URL**
    - **Validates: Requirements 9.1, 9.2**
    - Add to `server/tests/property/auth.property.js`
    - Use `fc.hexaString({ minLength: 64 })` for token, `fc.webUrl()` for CLIENT_URL

- [x] 3. Backend — POST /api/auth/forgot-password
  - [x] 3.1 Add `forgotPasswordSchema` (Zod) and the route handler in `server/src/routes/auth.js`
    - Look up user by email; always return `200 { message: "..." }` regardless of whether email exists
    - On match: delete existing unexpired tokens for that user, generate `crypto.randomBytes(32).toString('hex')`, bcrypt-hash it, insert into `password_reset_tokens` with `expires_at = NOW() + INTERVAL '1 hour'`, call `sendPasswordReset`
    - _Requirements: 6.2, 6.3, 6.4, 7.1, 7.2_

  - [ ]* 3.2 Write property test — forgot-password always returns 200
    - **Property 3: Forgot-password always returns 200**
    - **Validates: Requirements 6.4**
    - Add to `server/tests/property/auth.property.js`
    - Use `fc.emailAddress()` for arbitrary email inputs

  - [ ]* 3.3 Write property test — tokens stored as bcrypt hashes
    - **Property 4: Reset tokens are stored as bcrypt hashes**
    - **Validates: Requirements 7.1**
    - Add to `server/tests/property/auth.property.js`
    - Use `fc.hexaString({ minLength: 64, maxLength: 64 })` for raw token

  - [ ]* 3.4 Write property test — second reset invalidates first
    - **Property 5: Second reset request invalidates the first**
    - **Validates: Requirements 7.2**
    - Add to `server/tests/property/auth.property.js`

- [x] 4. Backend — POST /api/auth/reset-password
  - [x] 4.1 Add `resetPasswordSchema` (Zod) and the route handler in `server/src/routes/auth.js`
    - Validate `password.length >= 8`; return 400 otherwise
    - Fetch all unexpired, unused token rows; `bcrypt.compare` raw token against each hash
    - On match: `UPDATE users SET password_hash` with new bcrypt hash, set `used_at = now()` on token row, return `200 { message: "Password updated." }`
    - On no match / expired / used: return `400 { error: "..." }`
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.9_

  - [ ]* 4.2 Write property test — reset enforces min password length
    - **Property 6: Reset-password enforces minimum password length**
    - **Validates: Requirements 8.9**
    - Add to `server/tests/property/auth.property.js`
    - Use `fc.string({ maxLength: 7 })` for short passwords

  - [ ]* 4.3 Write property test — valid token reset updates password and marks token used
    - **Property 7: Valid token reset updates password and marks token used**
    - **Validates: Requirements 8.4**
    - Add to `server/tests/property/auth.property.js`
    - Use `fc.string({ minLength: 8 })` for new password

  - [ ]* 4.4 Write unit tests for forgot-password and reset-password routes
    - Add to `server/tests/unit/auth.test.js`
    - Test: forgot-password returns 200 for unknown email; reset-password rejects short passwords; rejects expired/used tokens
    - _Requirements: 6.4, 8.5, 8.6, 8.9_

- [ ] 5. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend — useAuthModal context
  - [x] 6.1 Create `client/src/hooks/useAuthModal.jsx`
    - `AuthModalProvider` exposes `{ isOpen, view, openModal(view?), closeModal, triggerElement }`
    - `openModal` stores `document.activeElement` as `triggerElement` for focus restoration
    - `closeModal` restores focus to `triggerElement`
    - Export `useAuthModal` hook
    - _Requirements: 1.1, 1.2, 2.4_

- [-] 7. Frontend — AuthModal component
  - [x] 7.1 Create `client/src/components/AuthModal.jsx`
    - Render via `ReactDOM.createPortal` into `document.body`
    - Container: `<div role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">`
    - Backdrop click → `closeModal()`; Escape keydown listener → `closeModal()`
    - On open: `useEffect` focuses first focusable element inside modal
    - Implement `focusTrap` utility (Tab / Shift+Tab cycle within modal focusable elements)
    - Render `LoginView`, `RegisterView`, or `ForgotPasswordView` based on `view` from context
    - Manage shared `error` state (cleared on view switch) and `loading` state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 10.1, 10.2, 10.3, 10.4_

  - [ ] 7.2 Implement LoginView sub-component inside `AuthModal.jsx`
    - Email + password fields; submit calls `POST /api/auth/login` via `useAuth().login`
    - On success: `onSuccess()` (closes modal, auth state updated)
    - On error: `onError(message)` displays API error verbatim
    - "Forgot password?" link → `onSwitchView('forgot-password')`
    - "Create an account" link → `onSwitchView('register')`
    - Heading `id="auth-modal-title"`; submit button disabled while `loading`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1_

  - [x] 7.3 Implement RegisterView sub-component inside `AuthModal.jsx`
    - Email, display name, password fields; submit calls `POST /api/auth/register` via `useAuth().register`
    - On success: `onSuccess()`; on error: `onError(message)`
    - "Sign in" link → `onSwitchView('login')`
    - Heading `id="auth-modal-title"`; submit button disabled while `loading`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.4 Implement ForgotPasswordView sub-component inside `AuthModal.jsx`
    - Email field; submit calls `POST /api/auth/forgot-password`
    - On any 200 response: show confirmation message ("check your email")
    - On 5xx / network error: `onError("Something went wrong. Please try again.")`
    - Submit button disabled while `loading`
    - Heading `id="auth-modal-title"`
    - _Requirements: 6.2, 6.5, 6.6, 6.7_

  - [ ]* 7.5 Write property test — error cleared on view switch
    - **Property 1: Error messages are cleared on view switch**
    - **Validates: Requirements 3.3**
    - Add to `client/src/tests/auth-modal.property.jsx`
    - Use `fc.string()` for error message, `fc.constantFrom('login','register','forgot-password')` for views

  - [ ]* 7.6 Write property test — API error displayed verbatim
    - **Property 2: API error messages are displayed verbatim**
    - **Validates: Requirements 4.3, 5.3**
    - Add to `client/src/tests/auth-modal.property.jsx`
    - Use `fc.string({ minLength: 1 })` for error message

  - [ ]* 7.7 Write property test — focus trap keeps focus within modal
    - **Property 9: Focus trap keeps focus within open modal**
    - **Validates: Requirements 10.2**
    - Add to `client/src/tests/auth-modal.property.jsx`
    - Use `fc.integer({ min: 1, max: 50 })` for tab press count

  - [ ]* 7.8 Write property test — aria-labelledby references active view heading
    - **Property 10: aria-labelledby references active view heading**
    - **Validates: Requirements 10.4**
    - Add to `client/src/tests/auth-modal.property.jsx`
    - Use `fc.constantFrom('login','register','forgot-password')` for view state

  - [ ]* 7.9 Write unit tests for AuthModal
    - Add `client/src/tests/AuthModal.test.jsx`
    - Test: backdrop click closes modal; Escape closes modal; close button closes modal; focus restored on close; ARIA attributes present; view switching clears errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.3, 10.3_

- [x] 8. Frontend — Update Navbar to use modal
  - Modify `client/src/components/Navbar.jsx`
  - Import `useAuthModal`; replace `<Link to="/login">` with `<button onClick={() => openModal('login')}>`
  - Replace `<Link to="/register">` with `<button onClick={() => openModal('register')}>`
  - Remove `useNavigate` and the `/login` redirect in `handleLogout` (navigate to `/` instead)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 8.1 Write unit tests for Navbar
    - Add `client/src/tests/Navbar.test.jsx`
    - Test: "Sign In" click opens login view; "Get Started" click opens register view; buttons hidden when authenticated
    - _Requirements: 1.1, 1.2, 1.4_

- [x] 9. Frontend — ResetPassword page
  - Create `client/src/pages/ResetPassword.jsx`
  - Read `?token` from `useSearchParams`
  - No token → render "This reset link is invalid or has expired."
  - Token present → render new-password form; submit calls `POST /api/auth/reset-password`
  - On success: show confirmation + button that calls `openModal('login')`
  - On error: display API error message
  - _Requirements: 8.1, 8.2, 8.3, 8.7, 8.8_

  - [ ]* 9.1 Write unit tests for ResetPassword page
    - Add `client/src/tests/ResetPassword.test.jsx`
    - Test: renders form with token param; renders error without token param; success message after reset; error message on bad token
    - _Requirements: 8.2, 8.7, 8.8_

- [x] 10. Frontend — Update main.jsx routes
  - In `client/src/main.jsx`:
    - Wrap `<AuthProvider>` with `<AuthModalProvider>` (import from `useAuthModal`)
    - Add `<Route path="/reset-password" element={<ResetPassword />} />`
    - Change `/login` and `/register` routes to `<Navigate to="/" replace />`
    - Remove imports for `Login` and `Register` pages
  - _Requirements: 8.1_

- [x] 11. Remove Login.jsx and Register.jsx pages
  - Delete `client/src/pages/Login.jsx` and `client/src/pages/Register.jsx`
  - Verify no remaining imports reference these files after step 10
  - _Requirements: 1.3_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check and should run a minimum of 100 iterations
- Unit tests use Vitest + React Testing Library (frontend) and Jest (backend)
