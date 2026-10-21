# Phase 5 verification

## Passed in this delivery

- TypeScript project compilation and Vite production build.
- All four original demo accounts log in through the mock auth provider.
- Cross-hospital resource read denied; logged-out resource read denied.
- General/ICU/emergency bed update, derived availability, negative counts and
  occupied-over-total rejection.
- Doctor create, edit/status change, delete.
- Ambulance create, edit/status change, delete.
- Assigned ambulance cannot be deleted while its case is active.
- Existing accept → assignment → en route → pickup → arrival → completion flow;
  completion returns the ambulance to AVAILABLE.
- Mock registration is immediately approved, generates sequential `HSP-NNN` IDs,
  rejects duplicate licenses/emails and persists only salted password hashes.
- Newly registered credentials work immediately and after logout/reload; a wrong
  password fails. New tenants start with zero beds, no doctors, no ambulances and
  no emergencies, and cross-hospital reads remain denied.
- Persisted JSON round-trip and fresh mock-store module initialization restore
  registered hospitals and their own edited resources. Demo reset removes local
  registrations/accounts and restores the four original hospitals.
- API resource transport methods, encoded record IDs, token header and principal-
  scoped paths tested with a fetch stub; registration endpoint exercised.
- Existing protected route remains in place around dashboard and case routes.
- Reduced-motion CSS explicitly disables new attention animations.

## Environment limitation

The supervised application preview started successfully. The cloud test browser
could not reach it (`ERR_BLOCKED_BY_CLIENT`). Consequently browser interaction,
layout, keyboard focus, reduced-motion rendering and full UI navigation have NOT
been verified. No live FastAPI backend was supplied, so live API integration and
backend authorization have NOT been verified. Build output retains the existing
large-bundle warning (maps/charts); it does not prevent compilation.

## Local demonstration / browser checks

1. `npm ci`, then `npm run dev`. Use a demo account from README.
2. Resources: edit General total 120 / occupied 86; ICU 10 / 3; Emergency 20 / 4.
   Confirm 34 / 7 / 16 available. Cancel an edit and verify values stay unchanged.
3. Add Dr. Aditi Shah (Emergency Medicine) and Dr. Rohan Mehta (Cardiology).
   Edit availability, remove an unassigned test doctor, and cancel another removal.
4. Add MH-04-AB-4821 / Ramesh Patil; change status, then refresh and revisit Resources.
5. Overview: incoming queue first, critical/high indicators pulse, resources below;
   verify edited counts including emergency doctor count. Test reduced motion.
6. New Emergencies → details → accept → assign → status updates → completion;
   confirm Ongoing Cases and available resources reflect the transitions.
7. Logout, verify protected routes redirect, and log in as another demo hospital.
   Confirm it has its own unchanged resource data.
8. Logout → Join LifeLink. Try missing fields, invalid email, invalid PIN,
   short/mismatched passwords, invalid coordinates, and valid fictional details.
   Expect the success screen and an `HSP-NNN` ID. Go to Login and use the same
   administrator email/password. Confirm zero resources/emergencies, edit one
   resource, refresh, logout and log in again, then verify the edit remains.
9. Register another fictional hospital and confirm its ID increments and it cannot
   see the first new hospital's resources. The four original logins must still work.
10. Try small screens and keyboard-only use. Dialogs use native showModal() with
   focus containment and Escape cancellation; they restore the previous focus.
11. Reset demo data clears local hospital accounts, signs out and restores demo data.
