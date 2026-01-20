# Transform Multi-Step Form into Single-Page Scrollable Form

The user wants to convert the current 4-step wizard (Dados -> Serviços -> Horário -> Resumo) into a single-page form where all sections are visible and the user can scroll down to fill them out.

## Plan Steps

1.  **Remove Step Logic in `App.tsx`**:
    -   Currently, the UI renders content conditionally based on `step === 1`, `step === 2`, etc.
    -   I will remove these conditions (`{step === X && ...}`) so that all sections render sequentially.
    -   I will remove the "Next" and "Back" buttons that controlled the step navigation.
    -   I will remove the Progress Bar (the `div` with steps 1, 2, 3, 4) as explicitly requested ("Não deve ter isso `div`").

2.  **Layout Adjustments**:
    -   Wrap the entire form content in a container that allows vertical scrolling (if not already the default).
    -   Add visual separation (margins/padding or dividers) between the sections:
        1.  **Informações do Pet e Dono** (formerly Step 1)
        2.  **Escolha de Serviços** (formerly Step 2)
        3.  **Seleção de Horário** (formerly Step 3)
        4.  **Resumo e Confirmação** (formerly Step 4)

3.  **Logic Adaptation**:
    -   **Validation**: Instead of validating step-by-step (`isStep1Valid`), the final "Agendar" button (at the bottom) will check the validity of the *entire* form (`isStep1Valid && isStep2Valid && isStep3Valid`).
    -   **Conditional Rendering of Sections**:
        -   The "Service Selection" section might need to be hidden *initially* or disabled until basic data is filled? No, the user said "Todos os campos deve aparecer numa única página".
        -   However, some logic depends on previous choices (e.g., "Service Details" appear after selecting a category). I will keep the *internal* logic of the Service section (selecting category -> selecting specific service), but it will happen in-place on the same page.
        -   The **TimeSlotPicker** (Step 3) usually requires a `selectedDate` and `selectedService`. It should probably only appear (or be active) once a service is selected. I will use conditional rendering *within* the flow: "Select Service" -> "Then Calendar Appears below".

4.  **Implementation Details**:
    -   **Section 1 (Data):** Always visible at top.
    -   **Section 2 (Service):** Always visible below Data.
    -   **Section 3 (Time):** Visible only when `selectedService` is valid (to avoid clutter or errors).
    -   **Section 4 (Summary/Submit):** Visible only when `selectedTime` is valid.

5.  **Refactoring `App.tsx`**:
    -   Delete the progress bar header.
    -   Replace `{step === 1 && ...}` with a simple `div` block.
    -   Replace `{step === 2 && ...}` with a `div` block.
    -   Replace `{step === 3 && ...}` with a conditional block `selectedService && (...)`.
    -   Replace `{step === 4 && ...}` with a conditional block `selectedTime && (...)`.

## Verification
-   The form should load with the "Data" fields and "Service Category" buttons visible.
-   Scrolling down should reveal more content as choices are made.
-   No "Next" buttons.
-   No numbered progress bar at the top.

## Code Reference
I will edit `App.tsx` extensively, removing the step state management (`step`, `setStep`) and the conditional rendering wrappers.
