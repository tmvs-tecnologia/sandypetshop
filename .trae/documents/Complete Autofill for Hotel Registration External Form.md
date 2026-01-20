I will finalize the autofill logic for the external Hotel Pet form (`HotelRegistrationForm` in `App.tsx`) to ensure complete data population while strictly excluding check-in/out dates.

**Plan:**

1.  **Target Component**: `HotelRegistrationForm` (lines ~8383).
2.  **Add Missing Fields**:
    -   `last_vaccination_date`: Explicitly requested by the user. I see it in `formData` state but need to confirm it's being set in the `useEffect`. It was added in my previous `Read` output (line 8486 of the *payload*, but let's check the *autofill* block).
    -   Looking at the `useEffect` (lines 8437-8466), `last_vaccination_date` is **MISSING** from the autofill logic. I will add it.
    -   **Services**: `service_bath`, `service_transport`, `service_daily_rate`, `service_extra_hour`, `service_vet`, `service_training` and `extra_services` (object) are also missing from the autofill block. I will add them to `setFormData`.
    -   **Documents**: `has_rg_document`, `has_residence_proof`, `has_vaccination_card`, `has_vet_certificate`, `has_flea_tick_remedy`, `flea_tick_remedy_date`, `photo_authorization`, `retrieve_at_checkout`.
    -   **Signatures**: `tutor_signature` (if available and reusable, though usually signatures are per-event, but the user said "all other available data"). I'll probably skip signatures as they imply consent for *this* specific stay, but `photo_authorization` is a preference.
3.  **Strict Exception**:
    -   Ensure `check_in_date`, `check_in_time`, `check_out_date`, `check_out_time` are **NOT** included in the `setFormData` update. (They are currently not there, so I will ensure they remain excluded).
4.  **Implementation**:
    -   Expand the `setFormData` object in the `useEffect` to include:
        -   `last_vaccination_date`
        -   `flea_tick_remedy_date`
        -   `has_*` boolean fields (documents/preferences).
        -   `service_*` fields (preferences for services).
        -   `extra_services` (deep merge or replace).
    -   Ensure the `cleanPhone` check is consistent (>= 10 digits).

**Summary**:
The fix involves expanding the mapping in the `useEffect` to cover the "long tail" of fields that were previously omitted, specifically `last_vaccination_date` and service preferences, ensuring the user doesn't have to re-enter them.