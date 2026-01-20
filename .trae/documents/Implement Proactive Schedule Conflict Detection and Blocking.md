I will implement the schedule conflict detection system.

**Plan:**

1.  **Target Component**: `App.tsx` (Specifically `AdminAddAppointmentModal`, `EditAppointmentModal`, and potentially `Scheduler` for client-side).
2.  **Logic**:
    -   When selecting a time slot (in any modal/view), I need to check if that `appointment_time` (normalized to ISO/UTC) already exists in the `appointments` or `pet_movel_appointments` tables with a status that isn't 'CANCELADO'.
    -   If a conflict is found:
        -   Disable the "Salvar" button.
        -   Show a visual indicator (red text or disabled option).
        -   Alert the user if they try to force it.
3.  **Implementation Steps**:
    -   **Helper Function**: Create `checkAvailability(date, time, excludeId)` that returns `true` if available, `false` if blocked.
    -   **Update `AdminAddAppointmentModal`**:
        -   In `useEffect` for `selectedTime` or `selectedDate` change, call the check.
        -   Disable the specific time option in the `<select>` or show an error.
    -   **Update `EditAppointmentModal`**:
        -   Similar logic when changing date/time.
    -   **Update `Scheduler` (Client View)**:
        -   The client view likely already has some logic (I recall reading `MAX_CAPACITY_PER_SLOT` in previous turns). I will reinforce it to be strict about *any* overlap if capacity is 1, or respect capacity.
        -   *User Requirement*: "Quando dois ou mais agendamentos..." implies capacity might be > 1? OR it means "When *an* attempt is made...". The prompt says "Quando dois ou mais agendamentos forem registrados...". Wait.
        -   "1. Marcar automaticamente o slot... como indisponível".
        -   "2. Exibir visualmente...".
        -   "3. Impedir que novos agendamentos...".
        -   This sounds like a "Capacity Management" feature. If the slot is full, block it.
        -   I need to check `MAX_CAPACITY_PER_SLOT`. If it's 1, then 1 appointment blocks it. If it's 3, then 3 block it.
        -   I will implement a check against `MAX_CAPACITY_PER_SLOT` (which I saw in the code earlier, around line 3179).
    -   **Visual Feedback**:
        -   In the `<select>` for time, render options as `disabled` if full.
        -   Add a text "(Indisponível)" next to the time.
    -   **Logging**:
        -   Add `console.log` or a specific log entry when a user tries to click a blocked slot (or if they somehow bypass UI and submit).

**Refinement**:
-   I will verify `MAX_CAPACITY_PER_SLOT` constant availability.
-   I will modify the `WORKING_HOURS` map to disable occupied slots.

**Summary**:
Enhance the existing capacity check (which I saw in `handleSubmit` in the code reading) to be *proactive* in the UI (disabling options) rather than just reactive on submit, and ensure it covers all interfaces.