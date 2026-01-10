# PRD - Sandy's Pet Shop v3

## 📋 Visão Geral do Produto

### Descrição
Sandy's Pet Shop v3 é uma aplicação web completa para gerenciamento de serviços de pet shop, desenvolvida com React, TypeScript e Vite. O sistema oferece uma solução integrada para agendamentos, clientes mensalistas, serviços móveis, creche pet e hotel pet.

### Missão
Facilitar o gerenciamento completo de um pet shop moderno, oferecendo uma experiência intuitiva tanto para clientes quanto para administradores, com foco em eficiência operacional e satisfação do cliente.

---

## 🎯 Objetivos do Produto

### Objetivos Primários
- **Automatizar agendamentos**: Sistema completo de agendamento com controle de capacidade
- **Gerenciar mensalistas**: Controle de clientes recorrentes com diferentes frequências
- **Expandir serviços**: Suporte a serviços móveis, creche e hotel pet
- **Otimizar operações**: Reduzir trabalho manual e aumentar eficiência

### Objetivos Secundários
- **Melhorar experiência do cliente**: Interface intuitiva e responsiva
- **Controlar qualidade**: Sistema de status e acompanhamento de serviços
- **Facilitar comunicação**: Integração com WhatsApp e notificações
- **Gerar insights**: Relatórios e análises de negócio

---

## 👥 Personas e Usuários

### 1. Cliente Final
- **Perfil**: Donos de pets que buscam serviços de qualidade
- **Necessidades**: Agendamento fácil, transparência de preços, acompanhamento de serviços
- **Comportamento**: Acesso via mobile, preferência por WhatsApp

### 2. Administrador/Proprietário
- **Perfil**: Gestor do pet shop
- **Necessidades**: Controle total da operação, relatórios, gestão de agenda
- **Comportamento**: Acesso via desktop/tablet, uso intensivo do sistema

### 3. Funcionários/Tosadores
- **Perfil**: Profissionais que executam os serviços
- **Necessidades**: Visualização da agenda, status dos serviços, informações dos pets
- **Comportamento**: Acesso rápido durante o trabalho

---

## 🏗️ Arquitetura do Sistema

### Stack Tecnológica
- **Frontend**: React 19.1.1 + TypeScript
- **Build Tool**: Vite 6.2.0
- **Banco de Dados**: Supabase (PostgreSQL)
- **Estilização**: Tailwind CSS
- **Autenticação**: Supabase Auth

### Estrutura de Dados
```
📊 Tabelas Principais:
├── appointments (agendamentos gerais)
├── pet_movel_appointments (agendamentos móveis)
├── monthly_clients (clientes mensalistas)
├── clients (cadastro de clientes)
├── daycare_enrollments (matrículas creche)
├── hotel_registrations (registros hotel)
├── notifications (notificações)
└── feriados (controle de feriados)
```

---

## 🚀 Funcionalidades Principais

### 1. Sistema de Agendamentos
**Descrição**: Controle completo de agendamentos com diferentes tipos de serviços

**Funcionalidades**:
- ✅ Agendamento de banho e tosa
- ✅ Controle de capacidade (2 tosadores simultâneos)
- ✅ Validação de horários de funcionamento
- ✅ Preços dinâmicos baseados no peso do pet
- ✅ Serviços adicionais (hidratação, patacure, etc.)
- ✅ Status de agendamento (Agendado/Concluído)

**Regras de Negócio**:
- Horário de funcionamento: 9h às 17h (pausa 12h-13h)
- Máximo 2 agendamentos simultâneos
- Preços variam conforme peso do pet
- Alguns serviços têm restrições de peso

### 2. Pet Móvel
**Descrição**: Serviços de banho e tosa no domicílio do cliente

**Funcionalidades**:
- ✅ Agendamento específico para condomínios
- ✅ Controle de endereços e apartamentos
- ✅ Preços diferenciados para serviços móveis
- ✅ Agenda separada para organização
- ✅ Sem limitação de capacidade (serviço externo)

**Condomínios Atendidos**:
- Paseo
- Vitta Parque
- Maxhaus
- Outros conforme expansão

### 3. Clientes Mensalistas
**Descrição**: Sistema de assinatura para clientes recorrentes

**Funcionalidades**:
- ✅ Cadastro de mensalistas com diferentes frequências
- ✅ Tipos de recorrência: semanal, quinzenal, mensal
- ✅ Geração automática de agendamentos futuros
- ✅ Controle de pagamentos e vencimentos
- ✅ Descontos especiais para pacotes
- ✅ Gestão de status (ativo/inativo)

**Tipos de Pacotes**:
- **Semanal**: 4 agendamentos por mês
- **Quinzenal**: 2 agendamentos por mês
- **Mensal**: 1 agendamento por mês

### 4. Creche Pet
**Descrição**: Serviço de daycare para pets

**Funcionalidades**:
- ✅ Formulário completo de matrícula
- ✅ Informações veterinárias e comportamentais
- ✅ Controle de itens entregues
- ✅ Planos de frequência (2x a 5x por semana)
- ✅ Desconto para irmãos
- ✅ Status de aprovação

**Informações Coletadas**:
- Dados do pet (nome, raça, idade, sexo)
- Informações do tutor
- Histórico veterinário
- Comportamento e socialização
- Contatos de emergência

### 5. Hotel Pet
**Descrição**: Hospedagem para pets

**Funcionalidades**:
- ✅ Registro completo de hospedagem
- ✅ Check-in e check-out controlados
- ✅ Informações detalhadas de alimentação
- ✅ Serviços adicionais (banho, transporte, veterinário)
- ✅ Autorização de fotos
- ✅ Assinatura digital dos tutores

**Serviços Inclusos**:
- Hospedagem diária
- Alimentação controlada
- Cuidados veterinários
- Atividades e socialização

### 6. Painel Administrativo
**Descrição**: Interface completa para gestão do negócio

**Funcionalidades**:
- ✅ Dashboard com visão geral
- ✅ Gestão de agendamentos (editar, cancelar, concluir)
- ✅ Controle de clientes e mensalistas
- ✅ Relatórios de serviços
- ✅ Gestão de matrículas e hospedagens
- ✅ Sistema de notificações

**Visualizações**:
- Agenda diária e geral
- Lista de clientes
- Controle de mensalistas
- Relatórios financeiros

---

## 💰 Modelo de Preços

### Serviços Regulares (Banho)
| Peso do Pet | Preço |
|-------------|-------|
| Até 5kg | R$ 65,00 |
| Até 10kg | R$ 75,00 |
| Até 15kg | R$ 85,00 |
| Até 20kg | R$ 95,00 |
| Até 25kg | R$ 105,00 |
| Até 30kg | R$ 115,00 |
| Acima 30kg | R$ 150,00 |

### Serviços Regulares (Tosa)
| Peso do Pet | Preço |
|-------------|-------|
| Até 5kg | R$ 130,00 |
| Até 10kg | R$ 150,00 |
| Até 15kg | R$ 170,00 |
| Até 20kg | R$ 190,00 |
| Até 25kg | R$ 210,00 |
| Até 30kg | R$ 230,00 |
| Acima 30kg | R$ 300,00 |

### Serviços Adicionais
- **Tosa na Tesoura**: R$ 160,00 (apenas até 5kg)
- **Aparação Contorno**: R$ 35,00
- **Hidratação**: R$ 25,00 (acima de 5kg)
- **Botinhas**: R$ 25,00
- **Desembolo**: R$ 25,00
- **Patacure (1 cor)**: R$ 10,00
- **Patacure (2 cores)**: R$ 20,00
- **Tintura (1 parte)**: R$ 20,00

### Descontos Mensalistas
- **Pacotes mensais**: Desconto aplicado no valor total
- **Fidelidade**: Preços especiais para clientes recorrentes

---

## 🔧 Especificações Técnicas

### Funcionalidades do Sistema

#### Timezone Management
- **Fuso horário**: UTC-3 (São Paulo)
- **Funções específicas**: `toSaoPauloUTC()`, `getSaoPauloTimeParts()`
- **Validações**: Controle de datas passadas e finais de semana

#### Validações de Negócio
- **Capacidade máxima**: 2 agendamentos por horário
- **Horários válidos**: 9h-11h, 13h-17h
- **Peso mínimo**: Validação de serviços por faixa de peso
- **Conflitos**: Detecção automática de sobreposições

#### Formatação de Dados
- **WhatsApp**: Máscara (XX) XXXXX-XXXX
- **Datas**: Formato brasileiro DD/MM/AAAA
- **Preços**: Formato monetário brasileiro

### Integrações

#### Supabase
- **Autenticação**: Sistema de login administrativo
- **Banco de dados**: PostgreSQL com triggers
- **Notificações**: Sistema automático de alertas
- **Políticas RLS**: Controle de acesso por usuário

#### Recursos Externos
- **Ícones**: Flaticon para interface
- **Imagens**: CDN para otimização
- **Fontes**: Sistema de fontes web

---

## 📱 Interface e Experiência

### Design System
- **Cores primárias**: Rosa (#EC4899), Branco, Cinza
- **Tipografia**: Sistema de fontes responsivo
- **Componentes**: Biblioteca própria de componentes React
- **Responsividade**: Mobile-first design

### Fluxos de Usuário

#### Cliente (Agendamento)
1. Seleção do tipo de serviço
2. Escolha de data e horário
3. Preenchimento de dados do pet
4. Seleção de serviços adicionais
5. Confirmação e finalização

#### Administrador (Gestão)
1. Login no painel administrativo
2. Visualização do dashboard
3. Gestão de agendamentos
4. Controle de clientes e mensalistas
5. Relatórios e análises

### Componentes Principais
- **AlertModal**: Notificações e confirmações
- **ConfirmationModal**: Ações críticas
- **DatePicker**: Seleção de datas
- **ServiceSelector**: Escolha de serviços
- **ClientForm**: Formulários de cadastro

---

## 🔒 Segurança e Compliance

### Autenticação
- **Sistema**: Supabase Auth
- **Níveis**: Público (agendamento) e Administrativo
- **Sessões**: Controle automático de expiração

### Proteção de Dados
- **LGPD**: Conformidade com lei de proteção de dados
- **Criptografia**: Dados sensíveis protegidos
- **Backup**: Sistema automático de backup

### Validações
- **Frontend**: Validação em tempo real
- **Backend**: Validação no servidor
- **Sanitização**: Limpeza de dados de entrada

---

## 📊 Métricas e KPIs

### Métricas de Negócio
- **Agendamentos por dia/mês**
- **Taxa de ocupação dos horários**
- **Receita por tipo de serviço**
- **Clientes mensalistas ativos**
- **Taxa de conversão de agendamentos**

### Métricas Técnicas
- **Tempo de carregamento**
- **Taxa de erro de agendamentos**
- **Disponibilidade do sistema**
- **Performance das consultas**

### Relatórios Disponíveis
- Dashboard administrativo em tempo real
- Relatórios de agendamentos
- Controle financeiro
- Análise de clientes

---

## 🚀 Roadmap e Futuras Implementações

### Fase 1 - Atual ✅
- Sistema básico de agendamentos
- Pet Móvel
- Clientes mensalistas
- Creche e Hotel Pet
- Painel administrativo

### Fase 2 - Próximas Implementações
- **App Mobile**: Aplicativo nativo
- **Notificações Push**: Lembretes automáticos
- **Pagamento Online**: Integração com gateways
- **Relatórios Avançados**: Business Intelligence
- **API Pública**: Integrações externas

### Fase 3 - Expansão
- **Multi-unidades**: Suporte a filiais
- **Marketplace**: Produtos pet shop
- **Telemedicina**: Consultas veterinárias online
- **Programa de Fidelidade**: Pontuação e recompensas

---

## 🛠️ Manutenção e Suporte

### Atualizações
- **Frequência**: Releases quinzenais
- **Tipo**: Correções, melhorias e novas funcionalidades
- **Versionamento**: Semantic versioning

### Monitoramento
- **Logs**: Sistema completo de auditoria
- **Alertas**: Notificações automáticas de problemas
- **Backup**: Backup diário automático

### Suporte
- **Documentação**: Guias de usuário
- **Treinamento**: Capacitação da equipe
- **Suporte técnico**: Canal direto de comunicação

---

## 📞 Contato e Informações

### Equipe de Desenvolvimento
- **Desenvolvedor Principal**: Sistema desenvolvido para Sandy's Pet Shop
- **Tecnologias**: React, TypeScript, Supabase
- **Versão Atual**: v3.0

### Ambiente de Produção
- **URL**: Configurável conforme ambiente
- **Banco**: Supabase Cloud
- **Hospedagem**: Vercel/Netlify (recomendado)

---

*Documento atualizado em: Outubro 2025*
*Versão do PRD: 1.0*