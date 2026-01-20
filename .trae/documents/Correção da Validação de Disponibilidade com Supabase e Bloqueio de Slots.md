O problema identificado é que a lógica atual do `TimeSlotPicker` confia apenas no array `appointments` passado como prop, mas o usuário relatou que a busca e validação dos dados vindos do Supabase estão incorretas ou incompletas, especialmente para "Pet Móvel" e agendamentos existentes.

O plano é tornar a validação mais robusta, garantindo que qualquer horário com status "Agendado" (ou equivalente) no banco de dados bloqueie o slot visualmente.

### Passos da Implementação:

1.  **Refatorar `TimeSlotPicker` para Validação Explícita**:
    *   A lógica atual (`isHourAvailable`) já calcula a carga (`load`) baseada no array `appointments`.
    *   Vou reforçar essa lógica para garantir que *qualquer* agendamento existente no horário (independente de duração complexa) conte como ocupação.
    *   Se `isPetMovel` for verdadeiro, a capacidade será estritamente 1. Se houver *qualquer* agendamento no horário, `load` será >= 1 e retornará `false`.

2.  **Verificar Lógica de Fetch (`reloadAppointments`)**:
    *   Embora eu não vá alterar o fetch global agora (pois é custoso e arriscado sem mais testes), vou garantir que o componente `TimeSlotPicker` esteja recebendo a lista combinada correta de `regularAppointments` e `mobileAppointments`.
    *   Vou adicionar um log de depuração (temporário/interno) ou comentário para assegurar que a prop `appointments` contém dados de ambas as tabelas (`appointments` e `pet_movel_appointments`).
    *   O código atual já faz o merge: `setAppointments([...regularAppointments, ...mobileAppointments])`. O problema provável é na interpretação desses dados dentro do `TimeSlotPicker`.

3.  **Ajuste Crítico na Lógica de "Pet Móvel"**:
    *   Atualmente: `const capacity = isPetMovel ? 1 : MAX_CAPACITY_PER_SLOT;`
    *   Vou adicionar uma verificação extra: Se o serviço selecionado for "Pet Móvel", ele deve verificar conflitos não apenas com outros "Pet Móvel", mas também se certificar que o horário está *realmente* livre.
    *   Entretanto, o requisito do usuário é específico: "Se há agendamento... o slot deve aparecer indisponível".
    *   Vou garantir que o cálculo de `load` some agendamentos de *todos* os tipos. O código atual já faz isso (`appointments` é misto), mas vou revisar se o filtro de data (`isSameDay`) está correto para objetos `Date` vindos do Supabase (fuso horário).

4.  **Correção Visual**:
    *   Se `load >= capacity`, o botão será renderizado com `disabled={true}`, classe de opacidade e título "Indisponível", como já implementado, mas agora com a garantia de que a contagem `load` está correta.

5.  **Validação de Status**:
    *   O usuário mencionou "status Agendado". Vou verificar se os objetos de agendamento têm propriedade `status` e se devemos ignorar agendamentos "Cancelados".
    *   Se o objeto `Appointment` tiver `status`, filtrarei apenas os ativos (ex: !== 'Cancelado').

### Resumo Técnico
Vou modificar o `TimeSlotPicker` em `App.tsx` para:
1.  Filtrar agendamentos com status 'Cancelado' (se houver essa propriedade) para não bloquear slots falsamente.
2.  Garantir que a comparação de datas (`isSameDay`) seja robusta.
3.  Manter a lógica de bloqueio visual para `load >= capacity`.