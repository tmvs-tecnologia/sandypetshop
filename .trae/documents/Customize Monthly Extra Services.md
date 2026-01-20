I will modify `ExtraServicesModal.tsx` to explicitly handle the `monthly` type, ensuring it has its own dedicated list of services that excludes "Pernoite" and "Dias Extras", while maintaining the rest of the functionality.

1.  **Refactor Conditional Rendering**:
    -   Currently, the logic is `if (daycare) { ... } else { ... }`.
    -   I will change this to `if (daycare) { ... } else if (monthly) { ... } else { ... }` or use a `switch` statement or separate render blocks for clarity.
    -   **For `monthly`**: I will define a specific list of services that **excludes** `dias_extras` and `pernoite`, but includes the other relevant services (Adestrador, Medicamento, Ração, Veterinário, etc., plus the standard grooming services if applicable to monthly clients).
    -   *Clarification*: Based on the user request, they want to "keep basic functionality but remove Pernoite and Dias Extras". This implies that currently, or in the intended design, `monthly` *might* have had access to these (perhaps via the `daycare` logic if they were sharing it, or the user assumes they are there). My analysis showed `monthly` currently falls back to the generic list (Tosa, Banho, etc.).
    -   **Assumption**: The user likely wants `monthly` to have a comprehensive list (similar to daycare) but *specifically without* those two items. So I will create a `monthly` block that includes: Adestrador, Medicamento, Ração, Veterinário, plus the grooming services (Tosa, Banho, etc.), but **omits** Dias Extras and Pernoite.

2.  **Verify Data Handling**:
    -   The `handleSave` and `calculateTotal` functions iterate over the `extraServices` state.
    -   Since the `monthly` view won't render inputs for `dias_extras` or `pernoite`, their values in the state (defaulting to disabled/empty) won't be changed by the user.
    -   I will ensure the `extraServices` state initializes correctly for `monthly` clients (it already does as it initializes all keys).

3.  **Implementation Details**:
    -   Add `else if (type === 'monthly')` block in the JSX.
    -   Inside this block, render:
        -   Adestrador
        -   Banho
        -   Botinha
        -   Contorno
        -   Hidratação
        -   Medicamento
        -   Patacure
        -   Pintura
        -   Ração
        -   Tosa
        -   Veterinário
    -   (Note: `Dias Extras` and `Pernoite` are strictly excluded from this list).

This plan ensures `monthly` has a customized, compliant interface that explicitly forbids the excluded options.