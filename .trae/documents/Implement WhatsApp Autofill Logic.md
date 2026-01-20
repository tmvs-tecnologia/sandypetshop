# Implement Autofill System for WhatsApp

I will implement the autofill system as requested, restoring and adapting the functionality to fetch customer data when a WhatsApp number is entered.

## Plan Steps

1.  **Locate and Enable Autofill Logic**:
    -   I will locate the commented-out `useEffect` block in `App.tsx` (around lines 11061-11068) that was previously responsible for autofill.
    -   I will uncomment it and ensure it triggers when `formData.whatsapp` changes.

2.  **Implement Data Fetching**:
    -   Inside the `useEffect`, I will implement a Supabase query to search for the *latest* appointment associated with the entered WhatsApp number.
    -   The query will target the `appointments` table (and optionally `pet_movel_appointments` if needed, but usually customer data is consistent across both or stored in one).
    -   I will use a debounce mechanism (e.g., 800ms) to avoid spamming the database while the user is typing.

3.  **Map Data to Fields**:
    -   When a record is found, I will update the state variables:
        -   `setFormData`: Update `petName`, `ownerName`, `petBreed`, `ownerAddress`.
        -   `setSelectedWeight`: Update the pet's weight if available in the record (mapping the string value to the `PetWeight` enum).
    -   I will also handle the `isFetchingClient` state to provide visual feedback (optional but good practice).

4.  **Preserve Existing Input**:
    -   Ensure that if no record is found, the user's manual input isn't cleared unexpectedly (though usually autofill overwrites on match).

5.  **Verify**:
    -   I will verify that typing a known WhatsApp number populates the fields correctly.

## Code Reference
I will modify `App.tsx` specifically around the `Scheduler` component's `useEffect` hooks.
