I will modify `ExtraServicesModal.tsx` to implement specific services for the `daycare` type as requested.

1.  **Update Interfaces**:
    -   Extend `ExtraServicesData` interface to include the new daycare-specific keys: `adestrador`, `dias_extras`, `medicamento`, `pernoite`, `racao`, `veterinario`.

2.  **Initialize State**:
    -   Update the `useState` initialization to include these new fields, reading from `data.extra_services` or defaulting to `{ enabled: false, value: '' }`.

3.  **Conditional Rendering**:
    -   Inside the modal content (in the JSX), add a conditional check for `type === 'daycare'`.
    -   **If `daycare`**: Render the requested services in alphabetical order:
        1.  Adestrador
        2.  Dias Extras (Note: I will implement the specific requirement for "Dias Extras" to include a quantity selector if possible, or stick to the standard value input if the backend schema is rigid, but I will aim to provide a quantity input if the data structure allows `quantity`). *Self-correction based on previous context: The `dias_extras` usually implies a quantity. I will ensure the UI reflects this if the data structure supports it, otherwise I will use the standard value field effectively acting as the total price or unit price.*
        3.  Medicamento
        4.  Pernoite
        5.  Ração
        6.  Veterinário
    -   **Else (other types)**: Render the existing list (Tosa, Banho, etc.).

4.  **Helper Function**:
    -   Create or update a helper `renderServiceItem` to reduce code duplication, supporting standard boolean+value inputs.

5.  **Validation & Consistency**:
    -   Ensure all inputs are number-only for values.
    -   Maintain the pink/gray color scheme.

This plan ensures the "Creche Pet" modal displays exactly the requested options in the correct order while preserving functionality for other modules.