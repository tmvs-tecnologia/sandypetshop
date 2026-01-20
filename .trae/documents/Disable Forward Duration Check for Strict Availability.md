# Correct Pet Móvel Calendar Availability Logic

The user is reporting that the Pet Móvel calendar is blocking slots incorrectly. Specifically:
-   **User's Observation:** On 21/01/2026, slots 10:00, 11:00, 12:00, and 17:00 are blocked.
-   **Known Appointments:** 11:00, 12:00, 14:00 (according to user).
-   **Issue:** 10:00 and 17:00 should NOT be blocked because they are empty. 14:00 is booked but strangely not listed as blocked in the user's complaint (likely just an omission or it's showing as booked correctly).

The blocking of 10:00 (adjacent to 11:00) and 17:00 (adjacent to 18:00 close) indicates that the **Forward Duration Check** is still active. This logic checks if the *selected service* (e.g., 2h duration) can fit into the slot without overlapping the *next* busy slot or closing time.

To resolve this and comply with the user's strict instruction ("somente os que há agendamento devem ficar indisponiveis"), I must disable the forward duration check. This effectively changes the availability logic to: **"Is the start time of this slot free?"**.

## Plan Steps

1.  **Modify `App.tsx`**:
    -   Locate `isHourAvailable` in `TimeSlotPicker`.
    -   **Disable Forward Check**: Comment out or modify the block labeled `// 3. Forward Check for Current Selection (Duration)`.
    -   Instead of checking `nextLoad` and `workingHours.includes(nextHour)`, I will simply skip this validation.
    -   This ensures that if I select a 2h service at 10:00, it will be allowed even if 11:00 is booked. (Note: This technically allows overbooking/overlap, but it is exactly what the user is demanding: "only existing appointments block slots").

2.  **Verify Filter Logic**:
    -   I will keep the `isPetMovel` filter I added in the previous step, as it correctly separates the calendars.
    -   The combination of "Separate Calendars" + "Ignore Duration Checks" will result in a view where only the exact start times of existing appointments are blocked.

3.  **Final Outcome**:
    -   10:00: Available (Start time free).
    -   11:00: Blocked (Booked).
    -   12:00: Blocked (Booked).
    -   17:00: Available (Start time free).
    -   This matches the user's expectation perfectly.

## Verification
-   I will apply the change to `App.tsx`.
-   This logic change is safe and reversible if the user later decides they *do* want duration validation (but currently they are explicitly rejecting it).
