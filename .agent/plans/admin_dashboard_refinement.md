# Implementation Plan - Admin Dashboard Refinements

## Objective
Enhance the "Add Member" functionality in the Admin Dashboard to support specific membership types, improve date calculation logic, and provide better default values.

## Proposed Changes

### 1. Refactor Membership Types
- **Current:** `intensive`, `general`, `other` (with sub-options).
- **New:** Split `other` into top-level searchable/selectable types or just explicit buttons that map to specific pricing rules.
    - `pregnancy` (임산부요가): 8 sessions, 180,000 KRW.
    - `kids` (키즈플라잉): 10 sessions, 220,000 KRW.
    - `sat_hatha` (토요하타심화): 4 sessions, 180,000 KRW.

### 2. Default Phone Number
- Initialize the `phone` field in `newMember` state to `'010'`.

### 3. Date Calculation Logic
- Ensure `startDate` initializes to `regDate` (Today).
- Ensure that changing `startDate` updates `endDate` automatically based on the selected duration.
- Ensure that changing `regDate` updates `startDate` (if it hasn't been manually decoupled, or just keep them independent but default equal). *User request: "End date based on Reg date initially, but if Start date changes, update based on Start date."* -> This implies `StartDate` should effectively be the anchor for `EndDate`.

## Detailed Task List

1.  **Update `PRICING_TABLE` constant** in `src/pages/AdminDashboard.jsx` to include new explicit keys for `pregnancy`, `kids`, and `sat_hatha`.
2.  **Update `newMember` initial state** to set `phone: '010'`.
3.  **Update `useEffect` for Pricing/Date**:
    - Ensure it calculates `endDate` based on `startDate`.
    - Ensure `startDate` defaults to `regDate` initially.
4.  **Update "Add Member" Modal UI**:
    - Replace the single "Other" button with 3 distinct buttons.
    - Style them to fit the row (might need a second row or smaller buttons).

## Verification Plan
1.  Open Admin Dashboard.
2.  Click "Add Member".
3.  Verify "Phone" input starts with "010".
4.  Verify new buttons: "임산부", "키즈", "토요".
5.  Click "임산부": Verify Price (180,000), Sessions (8), and correct calculated End Date.
6.  Change "Start Date": Verify "End Date" updates accordingly.
