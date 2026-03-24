import fs from 'fs';

const mensalistas = Array(50).fill({ pet: 'Rex', tutor: 'Joao', servico: 'Banho', preco: 50, ativo: true });
const receita = [{ month: 'Feb', total: 500 }, { month: 'Mar', total: 1000 }];
const pets_sumidos = Array(5).fill({ name: 'Bidu', lastVisit: '2025-01-01' });
const top = Array(5).fill({ name: 'Maria', totalSpent: 200, pets: ['Mel'] });

const systemInstructionText = `Você é o assistente inteligente da administradora do Sandy's PetShop. 
Responda às perguntas dela usando os dados fornecidos.
Seja conciso, profissional, objetivo e claro.
Se o usuário perguntar detalhes da agenda, use a ferramenta 'consultar_agendamentos'.

[CONTEXTO ATUAL - HOJE É ${new Date().toLocaleDateString('pt-BR')}]
- Data e Hora Atual: ${new Date().toLocaleString('pt-BR')}
- Clientes Mensalistas Ativos: ${JSON.stringify(mensalistas)}
- Receita Mensal Últimos 6 Meses: ${JSON.stringify(receita)}
- Pets Sumidos há mais de 2 meses: ${JSON.stringify(pets_sumidos)}
- Clientes Pet Móvel Fieis: ${JSON.stringify(top)}
- Clientes Loja Fieis: ${JSON.stringify(top)}
- Atenção: O usuário não enviou banco de dados de agendamentos no contexto. Para visualizar agendamentos, você DEVE SEMPRE invocar a ferramenta 'consultar_agendamentos'.`;

console.log("System Prompt Length:", systemInstructionText.length, "bytes");

const tools = [
    {
        type: "function",
        function: {
            name: "consultar_agendamentos",
            description: "Busca no banco de dados os agendamentos da loja e do Pet Móvel para uma data ou período específico.",
            parameters: {
                type: "object",
                properties: {
                    data_inicio: { type: "string", description: "Data inicial no formato YYYY-MM-DD" },
                    data_fim: { type: "string", description: "Data final no formato YYYY-MM-DD" }
                },
                required: ["data_inicio", "data_fim"]
            }
        }
    }
];

const payload = JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'system', content: systemInstructionText }, { role: 'user', content: 'Qual foi o faturamento deste mês?' }],
    tools: tools,
    tool_choice: "auto",
    temperature: 0.2
});

console.log("Full Payload Size:", payload.length, "bytes");
