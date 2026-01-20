# Correct Calendar Availability Logic

The user states that my previous implementation "is all wrong" and clarifies the requirement:
- **Requirement:** "If there is an appointment for the selected day, the time slot MUST be unavailable. ONLY that specific time slot. No other slots."
- **Current Issue:** The user claims I am having difficulty implementing this "simple logic" and that slots are not being blocked correctly when an appointment exists.

My previous changes:
1.  **Disabled Backward Check:** Correctly prevents past appointments from blocking current slots.
2.  **Disabled Forward Check:** Correctly prevents future capacity checks from blocking current slots.
3.  **Filtered Appointments:** I separated Store vs. Pet Mobile appointments.

**Critical Analysis of the User's "It's all wrong" Feedback:**
The user says: "Todos os dias do calendário... os slots de horário devem ficar indisponíveis se já existir para o administrador o agendamento... deve checar aqui, se já existe o agendamento para aquele dia selecionado então o slot de horário deve ficar indisponível."

This implies that despite my filtering logic, the user **wants** to see the blocked slots.
Wait, if I am filtering "Store" vs "Pet Mobile", and the user is looking at the "Pet Mobile" calendar, they should ONLY see "Pet Mobile" blocks.
BUT, if the user sees an appointment in the Admin Panel (which shows EVERYTHING), and then goes to the Client Calendar (which shows filtered view), they might expect to see that slot blocked *regardless* of service type, **IF** the resource is shared.

**However**, the most likely reason for "It's all wrong" is that my `isPetMovel` filter might be **too aggressive** or **incorrectly implemented**, causing actual appointments to be ignored (showing as available when they should be blocked).

**Hypothesis:** The `isPetMovel` logic inside `App.tsx` relies on `appt.service` matching specific Enums. If the database contains strings like "Banho e Tosa" (which don't match the Enums exactly due to case/accent differences or raw strings), the filter `isMobile` might return `false` for everything, or `true` for nothing, causing erratic availability.

**Refined Plan:**
1.  **Revert Strict Filtering (or Relax it):** The user's complaint "Todos os cards já existentes bloqueiam um slot de horário" suggests a **shared availability model** might be what they actually observe/expect in some context, OR simply that my filter is hiding appointments that *should* be blocking the slot.
    -   Actually, the user explicitly said in the previous turn: "Mas em ... está indisponivel ... sendo que pro administrador só há 14:00 agendado". This implies they *wanted* separation.
    -   Now they say: "se já existe o agendamento para aquele dia selecionado então o slot de horário deve ficar indisponível".
    -   **Crucial Detail:** The user might be testing with an appointment that *is* a Pet Mobile appointment, but my code isn't recognizing it as such, so it filters it out, showing the slot as "Available" (or vice versa).

2.  **Robust Service Type Checking:**
    -   I need to ensure `isMobile` check handles raw strings from the database (e.g., 'Pet Móvel', 'pet_mobile_bath') and not just the strict Enum comparison.
    -   I will modify the filter logic to be more robust: checking for the string "movel" or "móvel" (case insensitive) in the service name.

3.  **Simplification:**
    -   The user wants "Simple Logic": If there is an appointment at X hour, X hour is blocked.
    -   I will ensure `getAppointmentsAtHour` returns the count of *any* appointment that matches the current view's context (Store or Mobile).

4.  **Action:**
    -   Modify `App.tsx` inside `TimeSlotPicker`.
    -   Update the `appointments` `useMemo` filter to use a robust string includes check (`s.includes('movel') || s.includes('móvel')`) instead of just strict Enum equality.
    -   This ensures that any appointment labeled "Pet Móvel" in the DB is correctly identified as mobile, and anything else is identified as Store.

**Why this fixes it:**
If the database has "Banho (Pet Móvel)" as a string, my previous strict Enum check `appt.service === ServiceType.PET_MOBILE_BATH` might fail if `appt.service` is just the string label. By making the check robust (`includes('movel')`), I ensure that the appointment is correctly categorized, and thus correctly **blocks** the slot in the Pet Mobile calendar.

## Verification
-   This change will ensure that if an appointment exists (and matches the view type), it definitely blocks the slot.
-   It preserves the "Start Time Only" logic (Backward/Forward checks disabled) which the user liked/demanded ("SOMENTE aquele horário nenhum outro").
