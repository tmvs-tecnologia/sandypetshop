# Core do Projeto Sandy's PetShop

Este é o sistema da Sandy's PetShop, projetado para gerenciamento de petshop, daycare, agendamentos, clientes, pets e pacotes.

## Invariantes Arquiteturais Críticas (SPA Horizontal)
- **SPA_HORIZONTAL_MANDATE**: Toda e qualquer nova tela ou funcionalidade do sistema (como Pets, Pacotes, Agenda, Cadastro, etc.) DEVE ser criada como uma seção (`<section class="view-section">`) dentro do carrossel horizontal (`#view-slider`) no arquivo `dashboard.html`.
- **NO_PHYSICAL_REDIRECTS**: Jamais faça redirecionamentos físicos de páginas que quebrem o fluxo SPA (como carregar outro arquivo `.html`). O trânsito entre telas deve ocorrer estritamente via transição horizontal de abas chamando a função `switchTab('nome-da-aba')` com aceleração por hardware (`translate3d`).
- **BOTTOM_NAVBAR_PERSISTENCE**: A `BottomNavBar` (menu inferior flutuante translúcido) deve permanecer colocada FORA do `#view-slider` para que fique permanentemente visível, fixada e interativa em todas as abas.
- **SLIDER_EXPANSION**: Ao adicionar novas abas ao sistema, aumente proporcionalmente a largura do `#view-slider` no CSS (ex: de `300vw` para `400vw` ou `500vw`) e atualize os cálculos de `translate3d` correspondentes na função `switchTab`.
- **DELEGATE_RESILIENCE**: Arquivos HTML externos (ex: `novoCliente.html`) que representem essas seções devem conter apenas um script de redirecionamento imediato no `<head>` usando `window.location.replace("dashboard.html?tab=nome-da-aba")` para reinserir o usuário no contexto SPA horizontal sem quebrar o histórico.
- **Jamais Remova Funcionalidades**: Nunca remova componentes ou funcionalidades criadas ao realizar uma implementação, a menos que seja explicitamente solicitado pelo usuário.
