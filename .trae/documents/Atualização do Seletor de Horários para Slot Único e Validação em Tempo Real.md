A proposta é refatorar o componente visual de seleção de horários (`TimeSlotPicker`) para simplificar a interface e garantir a validação em tempo real, conforme solicitado.

### Passos da Implementação:

1.  **Refatoração do Componente `TimeSlotPicker` (App.tsx)**:
    *   **Remover Múltiplos Botões**: Alterar a lógica de renderização para exibir **apenas um botão por horário** (ex: um único botão "9:00" em vez de dois ou três), eliminando a duplicidade visual.
    *   **Cálculo de Disponibilidade Real**:
        *   Implementar uma contagem de agendamentos existentes para cada horário (`appointmentsAtHour`).
        *   Comparar a contagem com a capacidade máxima (`MAX_CAPACITY_PER_SLOT` para loja, `1` para Pet Móvel).
    *   **Validação de Duração de Serviço (Banho & Tosa)**:
        *   Adicionar verificação inteligente: se o serviço selecionado durar mais de 1 hora (ex: Banho & Tosa), o sistema verificará se o horário seguinte *também* está livre. Se o horário seguinte estiver ocupado, o horário atual ficará indisponível.
    *   **Bloqueio Visual**:
        *   Se o horário estiver lotado (ou bloqueado pela regra de duração), o botão será renderizado com estilo "desabilitado" (cor cinza, cursor bloqueado) e título "Indisponível", impedindo o clique.

2.  **Lógica de "Pet Móvel"**:
    *   Manter a capacidade restrita a **1 agendamento por horário** quando o serviço for Pet Móvel.
    *   Garantir que a verificação de dias permitidos por condomínio continue funcionando.

3.  **Atualização da Interface**:
    *   O usuário verá uma grade limpa com horários únicos.
    *   Horários ocupados ficarão visivelmente indisponíveis instantaneamente, baseados nos dados carregados do banco.

Esta mudança resolve a duplicidade visual e previne conflitos de agendamento diretamente na interface de seleção.