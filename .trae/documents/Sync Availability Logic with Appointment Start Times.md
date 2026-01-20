# Adjust Availability Logic to Match User Request

The user has identified that time slots are being blocked based on the duration of previous appointments (e.g., a 2-hour service at 9:00 blocking 10:00), which they consider incorrect ("indevidamente"). They explicitly requested that **only slots with an actual appointment start time** should be marked as unavailable.

To address this, I will modify the availability calculation in `App.tsx`.

## Plan Steps

1.  **Modify `App.tsx`**:
    - Locate the `isHourAvailable` function within the `TimeSlotPicker` component.
    - **Remove/Comment out the Backward Overlap Check**: Disable the logic that checks previous hours (`hour - 1`, `hour - 2`) for long-duration services.
    - **Preserve Direct Capacity Check**: Keep the check `load >= 1` (or `capacity`), which ensures slots that *actually have an appointment starting at that time* remain blocked.
    - **Preserve Forward Check**: Keep the logic that ensures the *new* appointment being scheduled has enough space (checking future slots), as this wasn't disputed and is essential for placing new long services.

2.  **Outcome**:
    - If there is an appointment at 9:00 (even if it's 2 hours), the 10:00 slot will now appear **Available** (unless there is another appointment starting exactly at 10:00).
    - This aligns perfectly with the user's instruction: "somente os que há agendamento devem ficar indisponiveis".

## Verification
- I will verify that the code changes are applied correctly to `App.tsx`.
- The user can then verify in the UI that 10:00 is now available for the date 20/01/2026.
