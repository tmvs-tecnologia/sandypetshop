I will implement the validation and badge display logic for "Mensalistas" (Pet Móvel) cards as requested.

1. **Refine Data Fetching**:

   * In `PetMovelView` (inside `App.tsx`), I will modify the `fetchActiveHotelRegistrations` function to:

     * Fetch records where `approval_status` is 'Aprovado' (or 'aprovado') OR `status` is 'Ativo' (checking the types, `approval_status` seems more relevant for "cadastro aprovado"). The user specifically mentioned "cadastro aprovado", so I'll check `approval_status`.

   * I will add a new function `fetchActiveDaycareEnrollments` to:

     * Fetch `daycare_enrollments` where `status` is 'Aprovado'.

2. **Implement Validation Logic**:

   * Inside the card rendering loop, I will create a robust matching function `checkRegistrationMatch` that takes a client and a list of registrations (hotel or daycare).

   * **Matching Criteria**:

     * Normalize names (trim, lowercase).

     * Check matching `pet_name` AND (`owner_name` matches `tutor_name`).

     * **Phone Validation**:

       * Clean phone numbers (remove non-digits).

       * Check if `client.whatsapp` matches `registration.contact_phone` (daycare) or `registration.tutor_phone` (hotel).

   * **Badge Display Logic**:

     * `hasDaycare`: Match found in `daycare_enrollments` with status 'Aprovado'.

     * `hasHotel`: Match found in `hotel_registrations` with approval\_status 'Aprovado'.

     * **Combined Logic**:

       * If `hasDaycare` AND `hasHotel` AND (phone matches in both): Show both badges.

       * If only one matches (or phone matches only one): Show respective badge.

       * The user requirement "Se o telefone for o mesmo nos dois cadastros... exibir ambas" implies a strict check. I will implement matching such that the badge *only* appears if the record matches the client (including phone if available).

3. **UI Updates**:

   * **Creche Badge**: `<span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1"><span>🏠</span> Creche</span>`

   * **Hotel Badge**: `<span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1"><span>🏨</span> Hotel</span>`

   * Place them in a flex container in the card header next to the pet name.

4. **Steps**:

   * Modify `App.tsx`:

     * Add state `activeDaycareEnrollments`.

     * Update `useEffect` to fetch daycare data.

     * Update `fetchActiveHotelRegistrations` to fetch based on `approval_status`.

     * Implement `normalizePhone` helper.

     * Update the rendering loop with the new matching logic and badges.

