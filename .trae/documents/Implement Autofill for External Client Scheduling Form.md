I will implement the autofill functionality for the external scheduling form (Client View) in `App.tsx`.

**Plan:**

1.  **Target Component**: `Scheduler` (Lines ~10170 in `App.tsx`), which handles the client-facing scheduling flow.
2.  **New State**:
    -   Add `isFetchingClient` (boolean) to indicate when the system is searching for client data.
    -   Add `autoFilledFields` (string array) to track which fields were automatically populated (for visual feedback).
3.  **Autofill Logic (`useEffect`)**:
    -   Monitor changes to `formData.whatsapp`.
    -   **Debounce**: Wait 800ms after the user stops typing.
    -   **Query**: Search the `appointments` table in Supabase for the most recent record matching the phone number (`whatsapp`).
        -   `select('*').eq('whatsapp', cleanPhone).order('appointment_time', { ascending: false }).limit(1)`
    -   **Populate**: If a record is found, update `formData` with:
        -   `petName`
        -   `ownerName`
        -   `petBreed`
        -   `ownerAddress`
    -   **Feedback**: Set `isFetchingClient` to true/false to show a loading spinner.
4.  **UI Updates**:
    -   Add a loading spinner next to the WhatsApp input when searching.
    -   Add visual cues (e.g., green border or background) to fields that have been auto-filled.
5.  **Validation**: Ensure the search only triggers for valid phone number lengths (e.g., > 10 digits).

This implementation ensures that returning clients have their information automatically filled, streamlining the scheduling process.