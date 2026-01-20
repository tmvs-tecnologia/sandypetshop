I will update the webhook payload in `EditAppointmentModal` to include the correctly formatted `customer_whatsapp_number`.

**Plan:**

1.  **Target Component**: `EditAppointmentModal` (around line 2772 in `App.tsx`).
2.  **Implementation**:
    -   Create a helper function or logic to clean and format the phone number:
        -   Remove all non-digits: `formData.whatsapp.replace(/\D/g, '')`.
        -   Ensure it starts with '55' (Brazil code) and '71' (Area code). Since the user input might be just '71999999999' or '(71) ...', I need to be careful.
        -   *Assumption based on user input*: The user said "Ex: 5571..." and "Include country code... include area code".
        -   Current `formatWhatsapp` usually formats to `(XX) XXXXX-XXXX`.
        -   The raw data from DB usually comes as is.
        -   I will take the digits. If length is 11 (e.g., 71999999999), I will prepend '55'. If length is 13 (e.g., 5571999999999), I keep it. If length is 10 (landline), I prepend '55'.
        -   *Strict User Requirement*: "Mantenha exatamente 11 dígitos para números brasileiros" is conflicting with "O número esteja completo com código do país (ex: 55)".
        -   Wait, let's re-read: "O formato exigido é: '5571999088651' (código do país + código de área + número do telefone...".
        -   "Mantenha exatamente 11 dígitos para números brasileiros" -> This might refer to the *mobile number itself* (DDD + 9 digits = 11) PLUS country code = 13 total?
        -   Let's look at the example: `5571999088651`. This has 13 digits. (55 + 71 + 999088651).
        -   So the "11 digits" requirement likely means the *local* part (DDD+Number).
        -   I will format it as `55` + `DDD` + `Number`.
        -   I'll assume if the cleaned number starts with `71` and has 11 digits, I just prepend `55`.
        -   If it already has `55` and is 13 digits, I leave it.
        -   I will add a robust cleaner.
3.  **Payload Update**:
    -   Add `customer_whatsapp_number` field to the payload object.
    -   Value: The formatted string.
4.  **Validation**:
    -   Ensure it's a string.
    -   Ensure no special chars.
5.  **Refinement**:
    -   I'll add the formatting logic right before constructing the payload.

**Summary**:
Modify the webhook payload construction to include `customer_whatsapp_number` formatted as `55` + 11-digit local number (total 13 digits), ensuring only digits are sent.