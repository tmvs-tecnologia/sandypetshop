I will implement the requested updates for the Monthly services list in `ExtraServicesModal.tsx`.

1.  **Update Data Structures**:
    -   Modify `ExtraServicesData` interface to include the new keys: `tintura`, `penteado`, and `desembolo`.
    -   Update the `useState` initialization to include these new fields with default values (disabled/empty), reading from `data.extra_services` if available.

2.  **Update Rendering Logic for Monthly**:
    -   Replace the current `type === 'monthly'` block with the specified exclusive list in the exact order:
        1.  Hidratação (`hidratacao`)
        2.  Patacure (`patacure`)
        3.  Tintura (`tintura` - *Note: The user asked for "Tintura", but the codebase has "Pintura". I will check if I should map "Tintura" to the existing "pintura" key or create a new one. Given "Pintura" exists, I will map the UI label "Tintura" to the new key `tintura` to be safe and distinct as requested, or if explicitly requested as a rename, I'd use the old one. Here I will add the new key `tintura` as planned to match the request exactly.*)
        4.  Contorno (`contorno`)
        5.  Penteado (`penteado` - New key)
        6.  Hora Extra (`hora_extra` - Already exists)
        7.  Desembolo (`desembolo` - New key)
        8.  Veterinário (`veterinario`)

3.  **Validation**:
    -   Ensure only these 8 items are displayed.
    -   Ensure ARIA labels are applied (handled by the input structure generally, but I will review `renderServiceItem` to ensure accessibility).

4.  **Note on "Pintura" vs "Tintura"**:
    -   The existing code has `pintura`. The request asks for `Tintura`. I will implement `tintura` as a new separate key to avoid conflict or data loss if they are distinct concepts in the business logic, unless I see strong evidence they are the same.

5.  **Execution**:
    -   I will perform the file update in `ExtraServicesModal.tsx`.