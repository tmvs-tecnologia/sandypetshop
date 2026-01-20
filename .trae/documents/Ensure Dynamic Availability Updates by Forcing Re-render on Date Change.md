The user's observation is correct, but my previous implementation was already logically aligned with this (1-to-1 mapping). The confusion stems from the fact that `TimeSlotPicker` renders *multiple buttons for the same hour* (based on capacity), and the current logic (`isOccupied = slotIndex < currentCount`) already correctly disables the first N buttons if N appointments exist.

However, the user's persistence suggests that visually, they might be seeing something confusing, or the state isn't updating correctly when dates change.

My plan is to:
1.  **Verify Data Freshness**: The `counts` memoization depends on `appointments`. I will verify that `appointments` actually contains data for *all* dates, not just the initially loaded one. The `reloadAppointments` function fetches *all* appointments, so this should be fine, but I will double check.
2.  **Force Re-render Key**: To ensure the `TimeSlotPicker` or the grid completely re-renders when the date changes (avoiding any stale state issues with the buttons), I will add a `key` prop to the `TimeSlotPicker` (or its parent container) based on the `selectedDate`. This is a robust way to guarantee the UI reflects the new date's availability immediately.
3.  **Confirm 1-to-1 Logic**: I will re-verify the `isOccupied` logic. It is currently:
    ```typescript
    const currentCount = counts[hour] || 0;
    const isOccupied = slotIndex < currentCount;
    ```
    If `capacity` is 2:
    - 0 appointments: `currentCount` = 0. `slotIndex` 0 < 0 (false), `slotIndex` 1 < 0 (false). Both enabled.
    - 1 appointment: `currentCount` = 1. `slotIndex` 0 < 1 (true, disabled), `slotIndex` 1 < 1 (false, enabled). **Correct.**
    - 2 appointments: `currentCount` = 2. `slotIndex` 0 < 2 (true, disabled), `slotIndex` 1 < 2 (true, disabled). Both disabled. **Correct.**

    The logic holds. The issue is likely the React re-render cycle or data fetching for specific dates. Adding the `key` prop is the most reliable fix for "updating dynamically as date changes".

    I will also review if `counts` calculation properly handles timezone differences, as `new Date(app.appointmentTime).getHours()` runs in the browser's local time, but appointments are stored/compared against a potentially different timezone expectation. I will ensure consistent timezone handling.