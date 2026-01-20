Vou corrigir o autofill do formulário de Creche Pet (`DaycareRegistrationForm`) em `App.tsx` para garantir que todos os campos sejam preenchidos corretamente, incluindo o plano contratado e a data da última vacina.

1.  **Mapeamento de Campos**:
    *   No `useEffect` que busca os dados (`fetchDaycareClientData`), expandirei o mapeamento de `enrollmentData` para `formData`.
    *   **Plano Contratado (`contracted_plan`)**: Mapear `enrollmentData.contracted_plan` para `prev.contracted_plan`.
    *   **Última Vacina (`last_vaccine`)**: Mapear `enrollmentData.last_vaccine` para `prev.last_vaccine`.
    *   **Outros Campos**: Verificar e adicionar mapeamento para:
        *   `last_deworming` (Último vermífugo)
        *   `last_flea_remedy` (Último remédio de pulgas)
        *   `attendance_days` (Dias da semana - array de números)
        *   `delivered_items` (Itens entregues)
        *   `extra_services` (Serviços extras - mapeamento profundo para manter quantidades e preços se disponíveis)

2.  **Tratamento de Nulos**:
    *   Usar `|| prev.campo` ou valores padrão (`''`, `[]`, `null`) para garantir que o formulário não quebre se o banco retornar `null`.
    *   Exemplo: `last_vaccine: enrollmentData.last_vaccine || prev.last_vaccine || ''`.

3.  **Validação**:
    *   Garantir que os tipos de dados sejam compatíveis (ex: datas como strings, checkboxes como booleanos).

**Arquivo Afetado**: `App.tsx` (Lógica interna de `DaycareRegistrationForm`).
