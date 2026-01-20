Vou aprimorar o preenchimento automático em `App.tsx` para completar todos os passos do agendamento:

1.  **Refatorar `fetchClientData`**:
    *   **Mapeamento de Serviço**: Identificar o `ServiceType` correto a partir da string do banco (Label) comparando com `SERVICES` em `constants.ts`.
    *   **Mapeamento de Peso**: Identificar o `PetWeight` correto a partir da string do banco (Label) comparando com `PET_WEIGHT_OPTIONS` em `constants.ts`.
    *   **Lógica de Navegação de Passo**:
        *   Determinar `serviceStepView`:
            *   Se `condominium` estiver presente, definir como `'pet_movel'`.
            *   Se for um serviço de visita, definir como `'main'` (embora visita não tenha peso, vamos tratar).
            *   Caso contrário (Banho/Tosa regular), definir como `'bath_groom'`.
        *   Preencher `selectedService`, `selectedWeight`, `selectedCondo` e `selectedAddons` (se possível).
        *   **Avanço Automático**: Se todos os campos obrigatórios (Serviço, Peso - se não for visita, Condomínio - se for móvel) forem preenchidos com sucesso, avançar para o **Passo 3** (`setStep(3)`).

2.  **Impedir Alteração Manual (Requisito de Imutabilidade)**:
    *   Nos passos 1 e 2, adicionar a propriedade `disabled={clientFound}` (ou similar) aos inputs e botões de seleção, para que o usuário veja os dados preenchidos mas não possa alterá-los facilmente se vierem do autofill.
    *   *Nota*: Para garantir que o usuário não fique "preso" se quiser mudar algo, adicionarei um botão "Editar" ou "Limpar" caso ele precise, mas o comportamento padrão será bloqueado conforme solicitado.

3.  **Validação Pré-Calendário**:
    *   Garantir que o `setStep(3)` só ocorra se a validação do passo 2 (`isStep2Valid`) for satisfeita com os dados recuperados.

**Arquivos afetados:**
*   `App.tsx`
