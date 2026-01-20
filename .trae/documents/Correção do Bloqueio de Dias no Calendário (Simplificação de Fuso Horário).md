A investigação revelou que a lógica do componente `Calendar` (linhas 4133-4230) parece correta em termos de implementação: ela verifica `allowedDays` e, se o dia da semana não estiver incluído, bloqueia a data.

No entanto, o usuário relata que "o calendário ainda está bloqueado com dias indisponíveis" e que "deve ser somente segunda e terça". Minha análise anterior já configurou `allowedDays` para `[1, 2]`. Se *todos* os dias estão bloqueados (ou dias errados), pode haver dois problemas:

1.  **Conflito de Fuso Horário (`getSaoPauloTimeParts`)**:
    *   O código usa `getSaoPauloTimeParts(date)` para determinar o `dayOfWeek` (linha 4175). Se essa função estiver retornando o dia errado (ex: devido a deslocamento UTC), a lógica `!allowedDays.includes(dayOfWeek)` bloqueará os dias errados.
    *   Exemplo: Se Segunda-feira for interpretada como Domingo (0) devido ao fuso, ela será bloqueada.

2.  **Inicialização Incorreta do `date` no loop**:
    *   `const date = new Date(year, month, day);` (linha 4174). O construtor `new Date(y, m, d)` cria a data no horário local do navegador (00:00). Se houver discrepância com a função `getSaoPauloTimeParts`, o cálculo do dia da semana falhará.

3.  **Possível Conflito com `disableWeekends`**:
    *   A prop `disableWeekends` tem padrão `true`. Se `allowedDays` for passado, `disableWeekends` ainda é verificado separadamente: `(disableWeekends && isSaoPauloWeekend(date)) || (allowedDays && !allowedDays.includes(dayOfWeek))`.
    *   Isso não deve ser um problema para Seg/Ter, mas vale verificar se a lógica `isSaoPauloWeekend` está correta.

**Plano de Ação:**

1.  **Simplificar a Determinação do Dia da Semana**:
    *   Vou substituir o uso de `getSaoPauloTimeParts(date).day` por `date.getDay()` diretamente dentro do loop de renderização do calendário, garantindo que estamos validando o dia da semana da data que acabamos de instanciar (`new Date(year, month, day)`).
    *   Isso remove a complexidade de fuso horário apenas para a verificação visual de "Segunda ou Terça", já que `new Date(y, m, d)` é consistente localmente.

2.  **Depurar/Corrigir a Lógica de Bloqueio**:
    *   Alterar a linha 4188: `(allowedDays && !allowedDays.includes(date.getDay()))`.
    *   Isso garante que se `allowedDays` for `[1, 2]`, ele verificará diretamente contra o objeto `date` local.

3.  **Verificar Passagem de Props**:
    *   Confirmar que, ao chamar `<Calendar ... />`, a prop `allowedDays` está sendo passada corretamente com `[1, 2]`. (Já confirmei que o `useEffect` define o estado, mas preciso garantir que o componente `Calendar` receba esse estado atualizado).

Vou focar na simplificação da verificação dentro do `renderDays` no `App.tsx` para usar o método nativo `.getDay()`, que é menos propenso a erros de conversão de fuso quando trabalhamos apenas com datas visuais.