# Shipgoe Frontend – Next Steps (Auth, Validation, Deployment)

This file is a checklist for future work. You can delete or change anything inside when you start coding.

## 1. Auth (future)

- Add an auth context / hook:
  - `src/auth/AuthContext.tsx` for user/session state.
  - `src/hooks/useAuth.ts` for login/logout helpers.
- Support token-based auth:
  - Store backend-issued JWT or session token in memory (and optionally in `localStorage`).
  - Attach `Authorization: Bearer <token>` header from a central fetch client.
- UI changes:
  - Turn the `Login` button in the nav into:
    - A real login modal/page.
    - A user avatar / dropdown when logged in.

## 2. Validation (future)

- Tracking page (`src/pages/TrackPage.tsx`):
  - Validate AWB / order ID format before calling the API:
    - Non-empty.
    - Optional pattern like `/^[A-Z0-9]{8,20}$/`.
  - Show inline error under the input and avoid calling the backend when invalid.
- Forms on home/quick pages:
  - Home instant quote: basic required checks + weight limits.
  - Quick-commerce slot selection: prevent starting a run with an empty basket.

## 3. Error handling UX (future)

- Central error/notification component:
  - `src/components/Toaster.tsx` or `Snackbar.tsx`.
  - Used by API hooks to display transient messages.
- Tracking-specific:
  - Different messages for:
    - `404`: “Shipment not found for this ID.”
    - Network errors: “We couldn’t reach Shipgoe servers, please retry.”
    - Validation errors: show field-level messages.

## 4. API client module (future)

- Replace raw `fetch` in `src/api/tracking.ts` with a reusable client:
  - Interceptors for:
    - `Authorization` header.
    - Global error mapping.
  - Optional request logging in development.

## 5. Deployment config (future)

- Env separation:
  - `.env.development.local` → local backend URL.
  - `.env.production` → deployed backend HTTPS URL.
- Build:
  - Use `npm run build` and host `dist/` on:
    - Vercel, Netlify, or S3 + CloudFront.

