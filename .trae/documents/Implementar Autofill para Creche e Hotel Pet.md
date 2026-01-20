Vou implementar a funcionalidade de autofill para Creche e Hotel Pet conforme solicitado:

1.  **Creche Pet (DaycareEnrollmentForm)**:
    *   Adicionar estado `isFetchingClient` para controlar o feedback visual.
    *   Adicionar lógica no `useEffect` (ou criar um novo) que monitora mudanças no `formData.contact_phone`.
    *   Implementar debounce de ~800ms.
    *   Realizar consulta na tabela `daycare_enrollments` filtrando por `contact_phone`.
    *   Se encontrar registro: preencher `formData` com os dados mais recentes (Pet, Tutor, Endereço, etc.).
    *   Se não encontrar: manter campos limpos ou permitir edição manual.
    *   Adicionar ícone de loading/sucesso no input de telefone.

2.  **Hotel Pet (HotelRegistrationForm)**:
    *   Similarmente, adicionar estado `isFetchingClient`.
    *   Monitorar `formData.tutor_phone`.
    *   Implementar debounce.
    *   Consultar tabela `hotel_registrations` filtrando por `tutor_phone`.
    *   Preencher `formData` se encontrar registro.
    *   Adicionar feedback visual no input.

**Arquivos Afetados**:
*   `App.tsx`: Modificações nos componentes `DaycareEnrollmentForm` e `HotelRegistrationForm` (ou equivalentes onde os formulários estão definidos).

**Detalhes Técnicos**:
*   Usarei `setTimeout` para o debounce.
*   Consultas ao Supabase com `.order('created_at', { ascending: false }).limit(1)` para pegar o registro mais recente.
*   Mapeamento cuidadoso dos campos retornados (snake_case do banco) para o estado do formulário.
