# Reorder Form Fields

The user wants to rearrange the fields in the "Informações do Pet e Dono" section (Step 1 of the Scheduler).

**Current Order (inferred from previous reads/context):**
1. Pet Name
2. Pet Breed
3. Owner Name
4. Owner Address
5. WhatsApp

**Requested Order:**
1. WhatsApp (`whatsapp`)
2. Owner Name (`ownerName`)
3. Pet Name (`petName`)
4. Pet Breed (`petBreed`)
5. Owner Address (`ownerAddress`)

This makes logical sense for an autofill workflow: the user types the phone number first, and the subsequent fields are populated below it.

## Plan Steps

1.  **Modify `App.tsx`**:
    -   Locate the `step === 1` block inside the `Scheduler` component's render method.
    -   Rearrange the JSX elements (divs containing labels and inputs) to match the requested order.
    -   Ensure all styling and logic remain intact, just moving the code blocks.

2.  **Verify**:
    -   The `WhatsApp` field should be at the very top.
    -   `Seu Nome` should be second.
    -   `Nome do Pet` should be third.
    -   `Raça do Pet` should be fourth.
    -   `Seu Endereço` should be last.

## Code Reference
I will edit `App.tsx` around lines 11523-11566 (based on the previous `read` output).
