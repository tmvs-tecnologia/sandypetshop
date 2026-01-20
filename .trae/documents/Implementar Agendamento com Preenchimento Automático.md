Vou implementar o preenchimento automático de agendamento em `App.tsx` seguindo os requisitos:

1.  **Criar função de busca (`fetchClientData`)**:
    *   Consultar a tabela `appointments` no Supabase filtrando pelo `whatsapp`.
    *   Ordenar pelo agendamento mais recente (`created_at` desc).
    *   Mapear os campos retornados (snake_case) para o estado do formulário (camelCase):
        *   `owner_name` -> `ownerName`
        *   `pet_name` -> `petName`
        *   `pet_breed` -> `petBreed`
        *   `owner_address` -> `ownerAddress`
        *   `weight` -> `petWeight` (se aplicável/disponível)

2.  **Integrar com o fluxo de digitação**:
    *   Adicionar um `useEffect` que monitora o campo `whatsapp` do `formData`.
    *   Implementar *debounce* (espera de ~500ms após parar de digitar) para evitar excesso de requisições.
    *   Acionar a busca apenas quando o número tiver um tamanho válido (ex: > 10 dígitos).

3.  **Feedback Visual e Estado**:
    *   Adicionar estado `isFetchingClient` para exibir um indicador de "Buscando..." ao lado do campo.
    *   Exibir uma mensagem discreta "Dados do cliente encontrados!" quando o preenchimento ocorrer.
    *   Manter os campos editáveis caso o usuário queira ajustar os dados importados.

4.  **Segurança e Otimização**:
    *   Tratar erros de conexão silenciosamente (fallback para preenchimento manual).
    *   Usar cache simples em memória (objeto `clientCache`) para evitar re-consultar o mesmo número na mesma sessão.

**Arquivos afetados:**
*   `App.tsx` (Lógica do modal `AdminAddAppointmentModal` e renderização do input).
