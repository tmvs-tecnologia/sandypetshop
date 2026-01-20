I will modify `App.tsx` to refine the `TimeSlotPicker` logic, ensuring it strictly maps existing appointments to visual slots on a 1-to-1 basis for both clients and admins, removing the artificial "block whole hour" restriction I added previously.

1.  **Modify `TimeSlotPicker` in `App.tsx`**:
    *   Remove the `isClientBlocked` logic that disabled all slots if the count was greater than 0.
    *   Update the duration blocking logic (`isBlockedForService`) to use the physical capacity limit (`nextCount >= MAX_CAPACITY_PER_SLOT`) for *all* users (clients and admins). This allows clients to book a 2-hour service if there is at least one free slot in both the current and next hour.
    *   Ensure the `isOccupied` check (`slotIndex < currentCount`) remains the primary visual indicator for unavailable slots.

This will ensure that if 9:00 has 1 appointment (out of 2), only one button is disabled, allowing the second slot to be booked, satisfying the requirement to "disable each of them for each existing appointment".