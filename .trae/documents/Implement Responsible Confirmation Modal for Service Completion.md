I will implement the "Responsible" confirmation modal for completing services in the Bath & Grooming menu.

**Plan:**

1.  **Create `ResponsibleModal` Component**:
    -   A new React component in `App.tsx`.
    -   **UI**:
        -   Backdrop with click-to-close.
        -   Styled modal window (rounded, shadow, animation).
        -   Title: "Confirmar Conclusão".
        -   Form field: "Responsável" (Input text, required).
        -   Buttons: "Cancelar" (Gray) and "Confirmar" (Green).
    -   **Logic**:
        -   State for `responsibleName`.
        -   Validation: Disable "Confirmar" if name is empty.
        -   `onConfirm(name)` callback.

2.  **Update `AppointmentsView`**:
    -   Add state `confirmingCompletionId` to track which appointment is being completed.
    -   Modify the "Concluir" button click handler:
        -   Instead of calling `handleUpdateStatus` directly, set `confirmingCompletionId`.
        -   Open the `ResponsibleModal`.
    -   Implement `handleConfirmCompletion(name)`:
        -   Call `handleUpdateStatus` passing the `name`.
        -   Close the modal.

3.  **Update `handleUpdateStatus`**:
    -   Modify signature to accept optional `responsible` string.
    -   Update database call to include `responsible` column update (assuming column exists or user implied just for webhook/display, but "register logs" suggests DB persistence. *Self-correction: I will assume the column needs to be updated or added to the `message` field if no specific column exists, but for a "Code Assistant" I should probably try to save it properly. Given I can't check DB schema easily, I'll update the `details` or `observation` or try to update a `responsible` column if I see it, or pass it in the webhook payload.*
    -   *Refined approach*: I will look for a `responsible` field in `AdminAppointment` type. If not present, I might need to infer it or just pass it to the webhook. The prompt says "No card `div` deve aparecer o nome do responsável". This implies the data must be persisted. I will verify `AdminAppointment` type definition.

4.  **Update `AppointmentCard`**:
    -   Render "Responsável: [Nome]" in the card if the field is populated.

5.  **Verification**:
    -   Check if `AdminAppointment` interface needs update.
    -   Ensure webhook payload includes `responsible`.

**Note on Database**: Since I cannot run SQL DDL, I will assume the `responsible` column might need to be handled. If I can't modify the schema, I might store it in a JSON field or `observation`. However, usually, in these tasks, if a field is requested, I should try to use it. I will check `AdminAppointment` type in `App.tsx` first.

*Wait, I read the `App.tsx` code earlier.* I didn't see a `responsible` field in the `select` or types. I will check the `AdminAppointment` interface definition first. If it's missing, I'll add it to the interface and the `select` query, assuming the DB has it or I can just use it in the frontend/webhook context. *Actually, the prompt says "Registrar logs de confirmação"*.

**Refined Plan**:
1.  Check `AdminAppointment` interface in `App.tsx`.
2.  Add `ResponsibleModal`.
3.  Integrate modal into `AppointmentsView`.
4.  Pass `responsible` to `handleUpdateStatus`.
5.  Update `handleUpdateStatus` to include `responsible` in the DB update (I'll try to update the column `responsible`, assuming it exists or the user will handle the migration, or I'll assume it's a new requirement and I should add it to the code assuming the DB supports it).
6.  Update `AppointmentCard` to show it.

Let's check the interface first in the code I already read (or read it again if missed). I'll start by reading the beginning of `App.tsx` to find `AdminAppointment` interface.