Vou implementar a funcionalidade de autofill no formulário de Hotel Pet (`HotelRegistrationForm`), que está faltando.

1.  **Criar Estado de Controle**:
    *   Adicionar `isFetchingClient` (boolean) para feedback visual (spinner).
    *   Adicionar `clientFound` (boolean) para indicar sucesso e mostrar ícone de check.

2.  **Implementar `useEffect` para Busca**:
    *   Monitorar o campo `formData.tutor_phone`.
    *   Aplicar **debounce** (~800ms) para evitar requisições a cada tecla.
    *   Limpar o telefone (remover caracteres não numéricos) antes da verificação.
    *   Se o telefone for válido (> 10 dígitos), consultar a tabela `hotel_registrations` no Supabase.
    *   Ordenação: `created_at` descendente (pegar o registro mais recente).

3.  **Preenchimento de Dados**:
    *   Ao encontrar um registro, atualizar o `formData` com todos os campos relevantes:
        *   Dados do Pet (nome, raça, sexo, idade, peso, castrado, etc.)
        *   Dados do Tutor (nome, RG, endereço, email, redes sociais)
        *   Contatos (emergência, veterinário)
        *   Saúde (doenças, comportamento, medos, alergias, etc.) - *Importante: atualizar também os estados booleanos auxiliares (`hasPreexistingDisease`, etc.)*.
        *   Alimentação (marca, quantidade, frequência, observações).

4.  **Feedback Visual**:
    *   Modificar o input de telefone para exibir o spinner durante a busca e o ícone de sucesso quando encontrado.

**Arquivo Afetado**: `App.tsx` (Componente `HotelRegistrationForm`).
