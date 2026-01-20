I will implement the visual blocking of unavailable time slots in the client-side Scheduler (`TimeSlotPicker` component) in `App.tsx`.

1.  **Modify `App.tsx`**:
    *   **Import `LockClosedIcon`**: Add `LockClosedIcon` to the imports from `@heroicons/react/24/outline` to use as the visual indicator for blocked slots.
    *   **Update `TimeSlotPicker` Component**:
        *   **Calculate Availability**: Implement logic to calculate the number of existing appointments per hour for the `selectedDate`. This will account for the duration of services (e.g., "Banho & Tosa" occupying 2 slots), using `Math.ceil` for fractional durations (like 1.5h blocking 2 slots).
        *   **Check Current Service Duration**: Determine the duration of the service currently being scheduled by the user.
        *   **Render Blocked Slots**:
            *   Inside the slot rendering loop, determine if a specific slot is `unavailable`.
            *   A slot is unavailable if:
                *   It is physically occupied by an existing appointment (`slotIndex < currentCount`).
                *   **OR** The user's selected service requires multiple hours, and the *subsequent* hours are fully booked (preventing the service from being completed).
        *   **Apply Styling**:
            *   If unavailable: Apply a gray background (`bg-gray-100` or `bg-gray-200`), change text color to gray (`text-gray-400`), set cursor to `not-allowed`, and disable the button interaction.
            *   Render the `LockClosedIcon` inside the button.
            *   Add a `title` tooltip explaining why it's unavailable ("Horário Indisponível" or "Horário Cheio").
            *   If available: Maintain the current white/pink styling.

This approach ensures that users can clearly see which slots are taken and are prevented from booking times that would result in conflicts, satisfying all requirements.