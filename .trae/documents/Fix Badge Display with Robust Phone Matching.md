I have identified the likely causes for the badge display issues and have a robust plan to fix them.

1.  **Phone Number Matching Robustness**:
    *   The user's data shows phone numbers with potential country codes (e.g., `5571...` vs `(71) 99908-8651`).
    *   My previous logic `clientPhone === regPhone` fails if one has the country code and the other doesn't, even after normalization.
    *   **Fix**: I will implement a `checkPhoneMatch` helper that checks if one normalized number *ends with* the other (checking at least 8 digits to be safe against false positives). This handles cases like `557199999999` matching `7199999999`.

2.  **Matching Logic Refinement**:
    *   The user requested: "Tutor (name and phone) ... correctly registered".
    *   I will relax the Pet Name matching slightly to be case-insensitive and trimmed (already done), but I will also ensure that *if* the phone matches, we are very confident.
    *   New Logic:
        *   **Match**: Pet Name (normalized) matches **AND** (
            *   Tutor Name (normalized) matches **OR**
            *   Phone Number matches (using the new "ends with" logic)
            *   )
    *   This ensures that if the tutor name has a typo but phone is correct, it matches. Or if phone is missing but name is exact, it matches.

3.  **Data Fetching Verification**:
    *   I will verify the `activeHotelRegistrations` fetch. It currently uses `.or('approval_status.eq.Aprovado,approval_status.eq.aprovado')`. This is correct based on the types.
    *   I will verify `activeDaycareEnrollments` fetch. It uses `.eq('status', 'Aprovado')`. This is also correct.

4.  **Implementation**:
    *   I will modify `PetMovelView` in `App.tsx`.
    *   Update `normalizePhone` to strip everything non-numeric.
    *   Add `checkPhoneMatch(p1, p2)` function.
    *   Update the `some` loop condition to use `checkPhoneMatch`.

This approach directly addresses the user's specific scenario where data is "correctly registered" (likely meaning valid numbers but different formats) but not linking.

**Plan**:
1.  Modify `PetMovelView` matching logic in `App.tsx`.
2.  Implement `checkPhoneMatch` to handle country codes and formatting differences.
3.  Ensure badges render correctly with the improved logic.