import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        const content = isBullet ? line.trim().substring(2) : line;
        
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedLine = (
            <React.Fragment key={'line-'+i}>
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
            </React.Fragment>
        );

        if (isBullet) {
            return (
                <div key={i} className="flex gap-2 mt-1 ml-1">
                    <span className="text-pink-500 shrink-0">•</span>
                    <div>{renderedLine}</div>
                </div>
            );
        }

        return (
            <React.Fragment key={i}>
                {renderedLine}
                {i < lines.length - 1 && <br />}
            </React.Fragment>
        );
    });
};
interface AiChatModalProps {
    systemData: any;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ systemData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Olá! Sou seu assistente de IA. Estou com todos os dados do sistema carregados. O que você gostaria de saber sobre a agenda, clientes ou faturamento?' }
    ]);
    const [input, setInput] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    
    // Drag-to-close states
    const [isDragging, setIsDragging] = useState(false);
    const [dragY, setDragY] = useState(0);
    const startY = useRef(0);
    const currentY = useRef(0);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleDragStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        startY.current = y;
        currentY.current = y;
    };

    const handleDragMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        currentY.current = y;
        const diff = y - startY.current;
        if (diff > 0) {
            setDragY(diff);
        }
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (dragY > 150) {
            handleClose();
        } else {
            setDragY(0);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(() => setDragY(0), 300);
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isResponding) return;
        
        const newMsg: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setIsResponding(true);

        try {
            const apiKey = import.meta.env.VITE_GROQ_API_KEY || 'N/A';
            const groqUrl = `https://api.groq.com/openai/v1/chat/completions`;

            const systemInstructionText = `Você é o assistente inteligente da administradora do Sandy's PetShop. 
Responda às perguntas dela usando os dados fornecidos.
Seja conciso, profissional, objetivo e claro.
Se o usuário perguntar detalhes da agenda, use a ferramenta 'consultar_agendamentos'.

[CONTEXTO ATUAL - HOJE É ${new Date().toLocaleDateString('pt-BR')}]
- Data e Hora Atual: ${new Date().toLocaleString('pt-BR')}
- Total Clientes Mensalistas Ativos: ${systemData?.mensalistas?.length || 0}
- Receita Mensal Últimos 6 Meses: ${JSON.stringify(systemData?.receita_mensal_ultimos_6_meses || [])}
- Pets Sumidos há mais de 2 meses: ${JSON.stringify(systemData?.pets_sumidos_ha_mais_de_2_meses || [])}
- Clientes Pet Móvel Fieis: ${JSON.stringify(systemData?.top_clientes_pet_movel_recente || [])}
- Clientes Loja Fieis: ${JSON.stringify(systemData?.top_clientes_banho_tosa_recente || [])}
- Atenção: O usuário não enviou banco de dados de agendamentos no contexto. Para visualizar agendamentos, você DEVE SEMPRE invocar a ferramenta 'consultar_agendamentos'.`;

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

            let msgsForApi: any[] = [
                { role: 'system', content: systemInstructionText },
                ...messages.slice(1).map(m => ({
                    role: m.role === 'model' ? 'assistant' : 'user',
                    content: m.text
                })),
                { role: 'user', content: newMsg.text }
            ];

            const executeGroq = async (currentMsgs: any[]) => {
                const response = await fetch(groqUrl, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: currentMsgs,
                        tools: tools,
                        tool_choice: "auto",
                        temperature: 0.2
                    })
                });
                return await response.json();
            };

            let resData = await executeGroq(msgsForApi);
            let responseMessage = resData?.choices?.[0]?.message;

            if (responseMessage?.tool_calls) {
                // Adiciona o chamado da ferramenta no histórico da requisição
                msgsForApi.push(responseMessage);
                
                for (const toolCall of responseMessage.tool_calls) {
                    if (toolCall.function.name === 'consultar_agendamentos') {
                        try {
                            const args = JSON.parse(toolCall.function.arguments);
                            const startStr = `${args.data_inicio}T00:00:00`;
                            const endStr = `${args.data_fim}T23:59:59`;
                            
                            const [lojaRes, movelRes] = await Promise.all([
                                supabase.from('appointments').select('*').gte('appointment_time', startStr).lte('appointment_time', endStr).order('appointment_time', { ascending: true }),
                                supabase.from('pet_movel_appointments').select('*').gte('appointment_time', startStr).lte('appointment_time', endStr).order('appointment_time', { ascending: true })
                            ]);

                            const formatAppt = (a: any) => `${new Date(a.appointment_time || a.date).toLocaleString('pt-BR')} - Pet: ${a.pet_name} - Tutor: ${a.owner_name || a.client_name || ''} - Serviço: ${a.service} - Status: ${a.status || ''}`;
                            const allResults = [
                                ...(lojaRes.data || []).map(a => `[Loja] ` + formatAppt(a)),
                                ...(movelRes.data || []).map(a => `[Pet Móvel] ` + formatAppt(a))
                            ];
                            
                            const contentStr = allResults.length > 0 ? allResults.join('\n') : `Nenhum agendamento encontrado entre ${args.data_inicio} e ${args.data_fim}.`;
                            
                            msgsForApi.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: toolCall.function.name,
                                content: contentStr
                            });
                        } catch (err) {
                            console.error("Tool execution error:", err);
                            msgsForApi.push({ role: 'tool', tool_call_id: toolCall.id, name: toolCall.function.name, content: "Erro ao consultar o banco de dados." });
                        }
                    }
                }
                
                // Dispara nova chamada para processar o resultado da tool e gerar texto:
                resData = await executeGroq(msgsForApi);
                responseMessage = resData?.choices?.[0]?.message;
            }

            const textResponse = responseMessage?.content;
            
            if (textResponse) {
                setMessages(prev => [...prev, { role: 'model', text: textResponse }]);
            } else {
                console.error("Gemini Error:", resData);
                setMessages(prev => [...prev, { role: 'model', text: "Desculpe, tive um problema ao tentar entender sua pergunta. Tente novamente." }]);
            }
        } catch (e) {
            console.error('Network Error:', e);
            setMessages(prev => [...prev, { role: 'model', text: "Erro de conexão ao comunicar com a IA." }]);
        } finally {
            setIsResponding(false);
        }
    };

    return (
        <>
            {/* Botão Flutuante */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center z-40 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                title="Conversar com a IA"
            >
                <SparklesIcon className="w-6 h-6 animate-pulse" />
            </button>

            {/* Janela do Chat */}
            <div 
                className={`fixed inset-x-0 bottom-0 top-10 sm:top-20 bg-white flex flex-col z-[10005] transition-all transform overflow-hidden rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] ${isDragging ? 'duration-0' : 'duration-300'} ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
                style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : {}}
            >
                {/* Header idêntico ao "Novo Agendamento" */}
                <div
                    className="relative p-6 sm:p-10 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 overflow-hidden shrink-0 cursor-grab active:cursor-grabbing select-none"
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-pink-300/40 rounded-full mt-3 hover:bg-pink-300/60 transition-colors"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-pink-900 shadow-sm border border-pink-100/50 backdrop-blur-sm transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        title="Fechar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-950 tracking-tight mb-2">Sandy's Assistente</h2>
                            <p className="text-pink-800/80 font-medium text-sm sm:text-base">
                                {!systemData ? 'Aguarde, carregando dados...' : 'Online e conectada aos seus dados'}
                            </p>
                        </div>
                        <div className="hidden sm:flex h-20 w-20 bg-white rounded-3xl shadow-sm items-center justify-center text-4xl transform -rotate-3">
                            ✨
                        </div>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-full`}>
                            {msg.role === 'model' && (
                                <img 
                                    src="https://i.imgur.com/M3Gt3OA.png" 
                                    alt="Maga Assistente" 
                                    className="w-8 h-8 rounded-full object-cover shrink-0 mr-2 border border-pink-200 shadow-sm"
                                />
                            )}
                            <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap max-w-[80%] ${msg.role === 'user' ? 'bg-pink-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'}`}>
                                {msg.role === 'model' ? renderMessageText(msg.text) : msg.text}
                            </div>
                        </div>
                    ))}
                    {isResponding && (
                        <div className="flex justify-start">
                             <img 
                                src="https://i.imgur.com/M3Gt3OA.png" 
                                alt="Maga Assistente" 
                                className="w-8 h-8 rounded-full object-cover shrink-0 mr-2 border border-pink-200 shadow-sm animate-pulse"
                            />
                            <div className="px-5 py-3 rounded-2xl bg-white text-gray-500 rounded-tl-sm shadow-sm border border-gray-100 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-pink-300 animate-bounce"></span>
                                <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions Area */}
                <div className="bg-gray-50 px-4 pb-2 pt-1 border-b border-gray-100/50 overflow-x-auto custom-scrollbar-white flex gap-2 snap-x">
                    {[
                        "Qual foi o faturamento deste mês?",
                        "Quais pets estão sumidos?",
                        "Quem são meus melhores clientes?",
                        "Quantos agendamentos temos para hoje?",
                        "Qual o serviço mais popular?"
                    ].map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => { setInput(suggestion); }}
                            className="snap-start shrink-0 bg-white border border-pink-100 text-pink-600 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-pink-50 transition-colors shadow-sm whitespace-nowrap"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t shrink-0">
                    <form 
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                        className="flex gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!systemData || isResponding}
                            placeholder={!systemData ? "Carregando dados..." : "Pergunte algo sobre seus dados..."}
                            className="flex-1 px-4 py-3 bg-gray-100 border-transparent rounded-xl focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all text-sm outline-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !systemData || isResponding}
                            className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors shadow-sm"
                        >
                            <PaperAirplaneIcon className="w-5 h-5 -rotate-45 relative -top-0.5 right-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AiChatModal;
