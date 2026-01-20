# Sync Pet Móvel Availability Logic

The user reports that Pet Móvel availability is inconsistent, blocking slots (10, 11, 12, 17) when only 14:00 is booked.

Based on my analysis:
1.  **Shared Appointments List**: The `Scheduler` component merges "Regular" (Store) and "Pet Móvel" appointments into a single `appointments` list. This means a Store appointment at 10:00 will block a Pet Móvel slot at 10:00, and vice versa. This is likely incorrect if they operate independently.
2.  **Strict Blocking Logic**: The user explicitly requested "somente os que há agendamento devem ficar indisponiveis" (only slots with appointments should be unavailable).
3.  **Forward Duration Check**: The current logic checks if the *next* hour is free when booking a service > 1h. This blocks 12:00 (due to 13:00 lunch) and 17:00 (due to 18:00 close). While technically correct for preventing partial bookings, the user views this as an error ("indisponível... sendo que só há 14:00 agendado").

To fully address the user's request and "fix the inconsistency":

## Plan Steps

1.  **Modify `TimeSlotPicker` in `App.tsx`**:
    -   **Implement Filtering**: Inside `TimeSlotPicker`, filter the `appointments` list based on `isPetMovel`.
        -   If `isPetMovel` is true, filter `appointments` to only include Pet Móvel services (ServiceType includes `PET_MOBILE`).
        -   If `isPetMovel` is false (Store), filter to exclude Pet Móvel services (or only include Store services).
        -   This ensures that Store appointments do not block Pet Móvel slots, resolving the "ghost blocking" issue.
    -   **Relax Forward Duration Check (Conditional)**: The user's request "only slots with appointments should be unavailable" suggests they might want to bypass the duration check that blocks 12:00 and 17:00.
        -   However, allowing booking at 12:00 for a 2h service means working through lunch. Allowing 17:00 means working past close.
        -   I will strictly follow the "only appointment" rule for *blocking*, but I must ensure valid bookings.
        -   **Action:** I will keeping the forward check but I will ensure it *only* checks against *actual appointments* in the next slot, not just "working hours".
        -   **Wait**, if I ignore working hours in the forward check, appointments will go into lunch/night.
        -   **Better Approach:** I will first implement the **Filtering** (Step 1). This is the most likely cause of 10:00 and 11:00 being blocked (cross-contamination).
        -   For 12:00 and 17:00, I will verify if the user accepts them being blocked due to closing/lunch. The user complained about them, but 12 and 17 are edge cases.
        -   Actually, the user said "10:00, 11:00, 12:00 e 17:00" are blocked. 12 and 17 are likely duration-blocked. 10 and 11 are likely cross-blocked.
        -   I will **Disable Forward Appointment Overlap Check** as well (similar to how I disabled backward check). The code checks `nextLoad`. I will comment out the part that increments `nextLoad` based on `prev1Appts` duration.
        -   I will **Keep** the check that `nextHour` must be in `workingHours`. It is physically impossible to book 2h at 17:00 if you close at 18:00. I assume the user will understand this, or I can adjust `workingHours` if needed. But for now, fixing the filtering is the priority.

2.  **Refined Logic for `TimeSlotPicker`**:
    -   Add logic to filter `appointments` prop at the start of the component.
    -   `const relevantAppointments = appointments.filter(a => isPetMovel ? isMobileService(a.service) : !isMobileService(a.service));`

3.  **Verification**:
    -   This should free up 10:00 and 11:00 (if they were blocked by store appointments).
    -   12:00 and 17:00 might still be blocked if the service is > 1h. I will explain this is due to lunch/closing times.

## Summary of Changes
-   **App.tsx**: Filter appointments in `TimeSlotPicker` to separate Store vs. Pet Móvel availability.

This directly answers "Usando a mesma logica anterior corrija isso" by ensuring strict separation and only blocking based on *relevant* appointments.
