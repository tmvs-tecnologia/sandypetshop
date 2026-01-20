I have identified the location where the monthly client card is rendered in `App.tsx` (around line 5516). I will now implement the logic to check for active hotel registration and display the "Hotel" badge.

1.  **Fetch Hotel Registrations**:
    *   In the `PetMovelView` component (around line 5092), I will add a state `hotelRegistrations` to store active hotel registrations.
    *   I will add a `fetchHotelRegistrations` function (similar to `fetchMonthlyClients`) to fetch data from `hotel_registrations` table where `status` is 'Ativo'.
    *   I will call this fetch function in the `useEffect` that loads initial data.

2.  **Modify `PetMovelView` Logic**:
    *   I will create a helper function or map to quickly check if a monthly client (by pet name/owner name or ID if available) has an active hotel registration. Since there isn't a direct foreign key visible in the types, I'll match by `pet_name` and `owner_name` (or `tutor_name` in hotel schema) as a robust fallback, or just `pet_name` if names are unique enough in this context (the user prompt implies checking backend).
    *   *Refinement*: The prompt says "Verificar no backend se o usuário possui cadastro ativo no hotel". I will fetch `hotel_registrations` filtering by `status='Ativo'`. Then in the render loop, I'll check if the current monthly client's pet is in that list.

3.  **Update the UI**:
    *   Inside the card rendering loop (around line 5522), I will inject the conditional rendering logic for the "Hotel" badge.
    *   I will place the badge next to the "Creche" badge (if it exists) or in the header section of the card, matching the design of the existing "Creche" badge seen in the user's selection (which seems to be in a different view, possibly `MonthlyClientsView`? Wait, the user selected a div that looks like a *Monthly Client Card* but the code I found in `PetMovelView` (line 5518) has a slightly different structure. Let me double check if there is another view for "Mensalistas" specifically).
    *   *Re-evaluating*: The user selected a card with "Creche" badge. The `PetMovelView` has cards with "Semanal" and "Agendamentos". The user's screenshot/code snippet shows a card with `bg-gradient-to-r from-pink-500 to-purple-600`. The code I found in `PetMovelView` (line 5521) uses `bg-gradient-to-r from-pink-500 to-purple-500`. This matches closely.
    *   However, the user's snippet shows: `<span class="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">🏠 Creche</span>`.
    *   I need to find where *that* specific card structure is. It might be in `MonthlyClientsView` (which I haven't fully read yet, I read `PetMovelView`).
    *   The user's input mentions "Mensalistas". The `PetMovelView` seems to handle "Pet Móvel" clients which are also monthly. But there might be a general `MonthlyClientsView`.
    *   Let's look for the exact class string `bg-gradient-to-r from-pink-500 to-purple-600` in `App.tsx`.

4.  **Implementation Steps**:
    *   Find the exact component rendering the card from the user's snippet.
    *   Add state and effect to fetch `hotel_registrations` (active ones).
    *   Implement the `hasActiveHotel` check.
    *   Render the badge: `<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">🏨 Hotel</span>` (using blue to differentiate from yellow Creche).

Let's do one quick search for the specific gradient class to be sure I'm editing the right component.

**Plan Update**:
1.  Search for `from-pink-500 to-purple-600` to locate the exact component.
2.  Implement the fetch logic for hotel registrations in that component.
3.  Add the badge rendering logic.