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
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
            const apiKey = 'AIzaSyCd3FJBh3wz7VkLI9VqcPi3O_H_hG5bs2I';
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const contents = messages.slice(1).map(m => ({ // Skip the initial hardcoded welcome message from context
                role: m.role,
                parts: [{ text: m.text }]
            }));
            
            const systemInstruction = {
                parts: [
                    {
                        text: `Você é o assistente inteligente da administradora do Sandy's PetShop. 
Responda às perguntas dela usando de forma precisa os dados do sistema fornecidos e o histórico da conversa.
Seja conciso, profissional, objetivo e claro. Sempre use formatação amigável (como listas ou negrito) para números.

[CACHED SYSTEM DATA - HOJE É ${new Date().toLocaleDateString('pt-BR')}]
${JSON.stringify(systemData)}`
                    }
                ]
            };

            const response = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction,
                    contents: [...contents, { role: 'user', parts: [{ text: newMsg.text }] }],
                    generationConfig: { temperature: 0.2 }
                })
            });

            const resData = await response.json();
            const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            
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
            <div className={`fixed inset-x-0 bottom-0 top-20 bg-white flex flex-col z-[10005] transition-all duration-300 transform overflow-hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-pink-600 to-rose-500 p-4 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Sandy's Assistente</h3>
                            <p className="text-xs text-pink-100">
                                {!systemData ? 'Aguarde, carregando...' : 'Online e conectada aos seus dados'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col custom-scrollbar">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} max-w-full`}>
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mr-2 border border-pink-200">
                                    <SparklesIcon className="w-4 h-4 text-pink-500" />
                                </div>
                            )}
                            <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap max-w-[80%] ${msg.role === 'user' ? 'bg-pink-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'}`}>
                                {msg.role === 'model' ? renderMessageText(msg.text) : msg.text}
                            </div>
                        </div>
                    ))}
                    {isResponding && (
                        <div className="flex justify-start">
                             <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mr-2 border border-pink-200">
                                <SparklesIcon className="w-4 h-4 text-pink-500 animate-pulse" />
                            </div>
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
                {messages.length <= 1 && (
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
                )}

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
