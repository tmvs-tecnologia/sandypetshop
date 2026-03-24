import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { SparklesIcon, ChartBarIcon, CalendarDaysIcon, UserGroupIcon, StarIcon, TrophyIcon, ArrowTrendingUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { AdminAppointment, PetMovelAppointment } from '../../types';
import AiChatModal from './AiChatModal';

interface InsightData {
    topAvulsoLojas: { name: string; total: number; count: number }[];
    topAvulsoPetMovel: { name: string; total: number; count: number }[];
    topPets: { name: string; count: number }[];
    bottomPets: { name: string; count: number; lastVisit: string }[];
    missingPets: { name: string; lastVisit: string }[];
    missingPetsRaw: { name: string; lastVisitDate: Date; tutor: string; phone: string }[];
    weeklyAppts: { date: string; pets: string[] }[];
    monthlyAppts: { date: string; pets: string[] }[];
    monthlyEarnings: { month: string; total: number }[];
}

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}>
        <path fill="currentColor" d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-3.128,0-6.181-0.761-8.885-2.201l-10.282,2.7L4.868,43.303z"></path>
        <path fill="currentColor" d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-3.128,0-6.181-0.761-8.885-2.201l-10.282,2.7l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C12.996,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.885,10.531l10.771-2.825c2.822,1.488,6.012,2.27,9.227,2.27h0.006c11.018,0,19.983-8.963,19.987-19.981c0.002-5.337-2.075-10.359-5.848-14.135C33.972,5.686,28.956,3.999,24.014,4L24.014,4z"></path>
        <path fill="currentColor" d="M35.176,28.032c-0.61-0.305-3.612-1.782-4.171-1.986c-0.559-0.203-0.966-0.305-1.373,0.305c-0.407,0.61-1.576,1.986-1.932,2.392c-0.356,0.407-0.712,0.458-1.322,0.153c-0.61-0.305-2.58-0.952-4.912-3.041c-1.815-1.625-3.04-3.633-3.396-4.243c-0.356-0.61-0.038-0.939,0.267-1.244c0.274-0.274,0.61-0.712,0.915-1.068c0.305-0.356,0.407-0.61,0.61-1.017c0.203-0.407,0.102-0.763-0.051-1.068c-0.153-0.305-1.373-3.307-1.881-4.528c-0.495-1.189-0.997-1.026-1.373-1.044c-0.356-0.017-0.763-0.021-1.17-0.021c-0.407,0-1.068,0.153-1.627,0.763c-0.559,0.61-2.136,2.086-2.136,5.087s2.186,5.898,2.492,6.305c0.305,0.407,4.293,6.556,10.395,9.186c1.451,0.625,2.585,0.999,3.468,1.279c1.458,0.463,2.784,0.398,3.834,0.241c1.173-0.174,3.612-1.475,4.121-2.899c0.508-1.424,0.508-2.645,0.356-2.899C36.244,28.489,35.786,28.337,35.176,28.032z"></path>
    </svg>
);

const InsightsDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<InsightData | null>(null);
    const [aiComment, setAiComment] = useState<string>("Analisando inteligência artificial...");
    const [aiTips, setAiTips] = useState<string>('');
    const [globalChatContext, setGlobalChatContext] = useState<any>(null);
    const [missingPetsMonthsFilter, setMissingPetsMonthsFilter] = useState<number>(2);
    const [isResgateFlipped, setIsResgateFlipped] = useState(false);
    const [isSendingCampaign, setIsSendingCampaign] = useState(false);
    const [showCampaignSuccess, setShowCampaignSuccess] = useState(false);
    const [rescueMessage, setRescueMessage] = useState("Olá! Sentimos sua falta aqui no Sandy's PetShop. Que tal agendar um horário com 15% de desconto especial para seu pet? 🐶✂️");

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        setLoading(true);
        try {
            const [
                apptsRes, 
                petMovelRes, 
                monthlyRes, 
                clientsRes
            ] = await Promise.all([
                supabase.from('appointments').select('*').order('appointment_time', { ascending: false }).limit(2000),
                supabase.from('pet_movel_appointments').select('*').order('appointment_time', { ascending: false }).limit(2000),
                supabase.from('monthly_clients').select('*'),
                supabase.from('clients').select('*')
            ]);

            const appts: AdminAppointment[] = apptsRes.data || [];
            const petMovelAppts: PetMovelAppointment[] = petMovelRes.data || [];
            const allAppts = [...appts, ...petMovelAppts];

            // 1. Top 3 Clientes Avulsos Loja (Banho & Tosa)
            const avulsoLojas = appts.filter(a => !a.monthly_client_id);
            const lojasGrouped = avulsoLojas.reduce((acc, a) => {
                const name = a.owner_name || 'Desconhecido';
                if (!acc[name]) acc[name] = { total: 0, count: 0 };
                acc[name].total += Number(a.price) || 0;
                acc[name].count += 1;
                return acc;
            }, {} as Record<string, { total: number; count: number }>);
            const topAvulsoLojas = Object.entries(lojasGrouped)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            // 2. Top 3 Clientes Avulsos Pet Móvel
            const avulsoPetMovel = petMovelAppts.filter(a => !a.monthly_client_id);
            const petMovelGrouped = avulsoPetMovel.reduce((acc, a) => {
                const name = a.owner_name || 'Desconhecido';
                if (!acc[name]) acc[name] = { total: 0, count: 0 };
                acc[name].total += Number(a.price) || 0;
                acc[name].count += 1;
                return acc;
            }, {} as Record<string, { total: number; count: number }>);
            const topAvulsoPetMovel = Object.entries(petMovelGrouped)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            // 3. Pets que mais fazem serviço
            const petsGrouped = allAppts.reduce((acc, a) => {
                const name = a.pet_name || 'Desconhecido';
                const date = new Date(a.appointment_time);
                if (!acc[name]) acc[name] = { count: 0, lastVisit: date };
                acc[name].count += 1;
                if (date > acc[name].lastVisit) acc[name].lastVisit = date;
                return acc;
            }, {} as Record<string, { count: number, lastVisit: Date }>);
            
            const topPets = Object.entries(petsGrouped)
                .map(([name, data]) => ({ name, count: data.count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // 3.5 Pets que menos fazem serviço (mais antigos)
            const bottomPets = Object.entries(petsGrouped)
                .map(([name, data]) => ({ name, count: data.count, lastVisit: data.lastVisit }))
                .sort((a, b) => a.lastVisit.getTime() - b.lastVisit.getTime())
                .slice(0, 10)
                .map(p => ({ ...p, lastVisit: p.lastVisit.toLocaleDateString('pt-BR') }));

            // 4. Pets sumidos (Missing Pets para dicas de IA)
            const now = new Date();
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(now.getMonth() - 2);

            const lastVisits = allAppts.reduce((acc, a) => {
                const name = a.pet_name;
                const dStr = a.appointment_time || (a as any).appointmentTime || (a as any).date;
                if (!dStr) return acc;
                const date = new Date(dStr);
                const tutor = a.owner_name || (a as any).client_name || '';
                const phone = a.whatsapp || (a as any).contact_phone || (a as any).tutor_phone || '';

                if (!acc[name] || date > acc[name].date) {
                    acc[name] = { date, tutor, phone };
                }
                return acc;
            }, {} as Record<string, { date: Date; tutor: string; phone: string }>);

            const missingPets = Object.entries(lastVisits)
                .filter(([_, info]) => info.date < twoMonthsAgo)
                .map(([name, info]) => ({ name, lastVisit: info.date.toLocaleDateString('pt-BR') }))
                .slice(0, 10);

            // 4. Pets sumidos (Missing Pets para dicas de IA) - Agora salvamos as datas cruas para o filtro
            const missingPetsRaw = Object.entries(lastVisits)
                .map(([name, info]) => ({ 
                    name, 
                    lastVisitDate: info.date,
                    tutor: info.tutor,
                    phone: info.phone
                }));

            // 5 & 6. Agendamentos Admin Semana/Mês
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const weeklyApptsMap: Record<string, string[]> = {};
            const monthlyApptsMap: Record<string, string[]> = {};

            // Helper to get local date string YYYY-MM-DD to avoid toLocaleDateString hidden character bugs
            const getLocalISODate = (d: Date) => {
                const tzOffset = d.getTimezoneOffset() * 60000;
                return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
            };

            // Collect all valid dates first for sorting
            allAppts.forEach(a => {
                const date = new Date(a.appointment_time);
                if (isNaN(date.getTime())) return;

                if (date >= startOfWeek && date <= endOfWeek) {
                    const iso = getLocalISODate(date);
                    if (!weeklyApptsMap[iso]) weeklyApptsMap[iso] = [];
                    weeklyApptsMap[iso].push(a.pet_name);
                }
                if (date >= startOfMonth && date <= endOfMonth) {
                    const iso = getLocalISODate(date);
                    if (!monthlyApptsMap[iso]) monthlyApptsMap[iso] = [];
                    monthlyApptsMap[iso].push(a.pet_name);
                }
            });

            // Helper to format ISO to DD/MM/YYYY
            const formatIsoBR = (iso: string) => {
                const [y, m, d] = iso.split('-');
                return `${d}/${m}/${y}`;
            };

            const weeklyAppts = Object.entries(weeklyApptsMap)
                .sort(([isoA], [isoB]) => isoA.localeCompare(isoB)) // Standard string sort natively handles YYYY-MM-DD
                .map(([iso, pets]) => ({ date: formatIsoBR(iso), pets }));
                
            const monthlyAppts = Object.entries(monthlyApptsMap)
                .sort(([isoA], [isoB]) => isoA.localeCompare(isoB))
                .map(([iso, pets]) => ({ date: formatIsoBR(iso), pets }));

            // 7. Gráfico de Ganhos Mensais (Últimos 6 meses)
            const earningsByMonth: Record<string, number> = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthName = d.toLocaleString('pt-BR', { month: 'short' });
                earningsByMonth[monthName] = 0;
            }

            allAppts.forEach(a => {
                try {
                    const dateStr = a.appointment_time || (a as any).appointmentTime;
                    if (!dateStr) return;
                    
                    const date = new Date(dateStr);
                    if (a.status === 'CONCLUÍDO' && date >= new Date(now.getFullYear(), now.getMonth() - 5, 1)) {
                        const mStr = date.toLocaleString('pt-BR', { month: 'short' });
                        if (earningsByMonth[mStr] !== undefined) {
                            earningsByMonth[mStr] += Number(a.price) || 0;
                        }
                    }
                } catch (e) { }
            });

            const monthlyEarnings = Object.entries(earningsByMonth).map(([month, total]) => ({ month, total }));

            const parsedData = { topAvulsoLojas, topAvulsoPetMovel, topPets, bottomPets, missingPets, missingPetsRaw, weeklyAppts, monthlyAppts, monthlyEarnings };
            setData(parsedData);
            
            const simplifyAppt = (a: any) => {
                let dataHoraStr = a.appointment_time || a.date;
                try {
                    if (dataHoraStr) {
                        const dObj = new Date(dataHoraStr);
                        dataHoraStr = dObj.toLocaleString('pt-BR');
                    }
                } catch (e) {}
                return {
                    data_hora: dataHoraStr,
                    pet: a.pet_name,
                    tutor: a.owner_name || a.client_name,
                    servico: a.service,
                    preco: a.price,
                    mensalista: !!a.monthly_client_id
                };
            };
            const simplifyMonthly = (m: any) => ({
                pet: m.pet_name, tutor: m.owner_name, servico: m.service, preco: m.price, ativo: m.is_active
            });
            const simplifyClient = (c: any) => ({
                nome: c.name
            });
            
            // Limit appts for AI context to prevent "Too Many Requests" (Token limit & 413 Payload Too Large)
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            const thirtyDaysFuture = new Date();
            thirtyDaysFuture.setDate(thirtyDaysFuture.getDate() + 30);

            const filterRecent = (a: any) => {
                const d = new Date(a.appointment_time);
                return d >= fifteenDaysAgo && d <= thirtyDaysFuture;
            };
            
            setGlobalChatContext({
                dataAtual: new Date().toLocaleDateString('pt-BR'),
                agendamentos_loja: appts.filter(filterRecent).map(simplifyAppt),
                agendamentos_petmovel: petMovelAppts.filter(filterRecent).map(simplifyAppt),
                mensalistas: (monthlyRes.data || []).filter((m: any) => m.is_active).map(simplifyMonthly), // Only active monthlies
                // Removed full client list as it triggers HTTP 413 Payload Too Large on Groq. The names are already inside appointments
                // Relatórios pré-processados p/ IA:
                top_clientes_banho_tosa_recente: topAvulsoLojas.slice(0, 5),
                top_clientes_pet_movel_recente: topAvulsoPetMovel.slice(0, 5),
                frequencia_top_pets: topPets.slice(0, 5),
                pets_sumidos_ha_mais_de_2_meses: missingPets.slice(0, 5),
                receita_mensal_ultimos_6_meses: monthlyEarnings
            });

            // Ask AI for insights
            fetchAiInsights(parsedData);
        } catch (error) {
            console.error('Error fetching insights data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAiInsights = async (d: InsightData) => {
        try {
            // Check cache to avoid hitting 15 RPM Limit
            const cachedComment = sessionStorage.getItem('aiCommentCache');
            const cachedTips = sessionStorage.getItem('aiTipsCache');
            
            if (cachedComment && cachedTips) {
                setAiComment(cachedComment);
                setAiTips(cachedTips);
                return;
            }

            const apiKey = import.meta.env.VITE_GROQ_API_KEY || 'N/A';
            const groqUrl = `https://api.groq.com/openai/v1/chat/completions`;
            
            // Comment about earnings
            if (!cachedComment) {
                const earningsPrompt = `Você é um consultor inteligente do Sandy's PetShop. Forneça uma análise financeira curtíssima (máximo absoluto de 140 caracteres) sobre a evolução dos ganhos listados abaixo. Seja animador e dê uma dica rápida de negócio. Não use asteriscos.\nReceita: ${JSON.stringify(d.monthlyEarnings)}`;

                fetch(groqUrl, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'user', content: earningsPrompt }],
                        temperature: 0.7,
                        max_tokens: 50
                    }),
                }).then(r => r.json()).then(res => {
                    const text = res?.choices?.[0]?.message?.content;
                    if (text) {
                        let cleanText = text.replace(/["_*]/g, '').trim();
                        if (cleanText.length > 140) cleanText = cleanText.substring(0, 137) + '...';
                        setAiComment(cleanText);
                        sessionStorage.setItem('aiCommentCache', cleanText);
                    } else {
                        setAiComment("Ótimo movimento! Foque em converter clientes avulsos em mensalistas para crescer mais.");
                    }
                }).catch(err => { console.error("Network error API Groq:", err); setAiComment("O movimento está ótimo nas últimas semanas! Mantenha o excelente trabalho."); });
            }

            // Tips about missing pets
            if (!cachedTips) {
                if (d.missingPets.length > 0) {
                    const tipsPrompt = `Você é o especialista em marketing do Sandy's PetShop. Escreva um conselho curto (máximo 140 caracteres) voltado para a administradora do pet shop, sugerindo uma ação prática para ela reconquistar esses clientes sumidos (ex: oferecer cupom, mandar mensagem, etc). Não escreva uma mensagem para o cliente, escreva uma sugestão para a administradora. Não use asteriscos.\nPets: ${d.missingPets.map(p => p.name).join(', ')}`;

                    fetch(groqUrl, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{ role: 'user', content: tipsPrompt }],
                            temperature: 0.8,
                            max_tokens: 60
                        }),
                    }).then(r => r.json()).then(res => {
                        const text = res?.choices?.[0]?.message?.content;
                        if (text) {
                            let cleanText = text.replace(/["_*]/g, '').trim();
                            if (cleanText.length > 140) cleanText = cleanText.substring(0, 137) + '...';
                            setAiTips(cleanText);
                            sessionStorage.setItem('aiTipsCache', cleanText);
                        } else {
                            setAiTips("Envie um cupom 'Saudades' com 15% OFF pelo WhatsApp para eles!");
                        }
                    }).catch(err => { console.error("Network error API Groq Tips:", err); setAiTips("Crie uma campanha de 'Welcome Back' oferecendo um extra gratuito!"); });
                } else {
                    const defaultMsg = "Retenção incrível! Não temos pets inativos na lista.";
                    setAiTips(defaultMsg);
                    sessionStorage.setItem('aiTipsCache', defaultMsg);
                }
            } else {
                setAiTips(cachedTips);
            }
        } catch(e) {
            console.error(e);
        }
    };

    // Lógica para filtrar pets sumidos com base no estado `missingPetsMonthsFilter`
    const filteredMissingPets = useMemo(() => {
        if (!data?.missingPetsRaw) return [];
        const thresholdDate = new Date();
        thresholdDate.setMonth(thresholdDate.getMonth() - missingPetsMonthsFilter);
        
        return data.missingPetsRaw
            .filter(p => p.lastVisitDate < thresholdDate)
            .map(p => ({ name: p.name, tutor: p.tutor, phone: p.phone, lastVisit: p.lastVisitDate.toLocaleDateString('pt-BR') }))
            .slice(0, 10);
    }, [data?.missingPetsRaw, missingPetsMonthsFilter]);

    const handleSendCampaign = async () => {
        if (!rescueMessage.trim() || filteredMissingPets.length === 0) return;
        
        setIsSendingCampaign(true);
        try {
            const payload = {
                mensagem: rescueMessage,
                pets: filteredMissingPets.map(p => ({
                    pet: p.name,
                    tutor: p.tutor,
                    telefone: p.phone,
                    meses_inativo: missingPetsMonthsFilter
                }))
            };
            
            const res = await fetch('https://n8n.intelektus.tech/webhook/campanhamarketing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error('Erro na resposta do webhook');
            
            setShowCampaignSuccess(true);
            setTimeout(() => {
                setShowCampaignSuccess(false);
                setIsResgateFlipped(false);
            }, 4500);
        } catch (e) {
            console.error('Webhook error:', e);
            alert('Não foi possível enviar a campanha. Tente novamente mais tarde.');
        } finally {
            setIsSendingCampaign(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <SparklesIcon className="w-16 h-16 text-pink-400 animate-pulse" />
                <p className="text-3xl font-bold text-pink-600 tracking-tight flex items-center justify-center gap-3 animate-pulse" style={{ fontFamily: '"Lobster Two", cursive' }}>
                    Coletando Insights de <span className="font-rubik font-bold">IA</span>...
                </p>
            </div>
        );
    }

    const { topAvulsoLojas, topAvulsoPetMovel, topPets, bottomPets, weeklyAppts, monthlyAppts, monthlyEarnings } = data;

    const maxEarnings = Math.max(...monthlyEarnings.map(m => m.total), 1);

    const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            <header className="mb-10 text-center flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                     <h1 className="text-4xl font-bold text-pink-600 tracking-tight flex items-center justify-center gap-3" style={{ fontFamily: '"Lobster Two", cursive' }}>
                        Insights de <span className="font-rubik font-bold">IA</span> <SparklesIcon className="w-10 h-10 text-pink-500" />
                    </h1>
                    <p className="text-gray-600 mt-2 text-lg">Seu negócio mais inteligente. Veja dados valiosos sobre seus clientes.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Gráfico de Ganhos */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 relative overflow-hidden group text-pink-950">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-pink-900">
                        <ArrowTrendingUpIcon className="w-7 h-7 text-pink-500" /> Evolução de Receita
                    </h3>
                    
                    <div className="flex items-end gap-3 h-48 mb-6 mt-4">
                        {monthlyEarnings.map((m, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar h-full">
                                <div className="w-full relative flex items-end justify-center h-full rounded-t-xl bg-pink-100/50 border border-pink-200/50">
                                    <div 
                                        className="w-full bg-gradient-to-t from-pink-300 to-pink-500 rounded-t-xl transition-all duration-500 ease-in-out transform origin-bottom hover:scale-105 shadow-sm"
                                        style={{ height: `${Math.max((m.total / maxEarnings) * 100, 10)}%` }}
                                    ></div>
                                    {/* Tooltip */}
                                    <div className="absolute -top-10 opacity-0 group-hover/bar:opacity-100 group-hover/bar:-translate-y-2 transition-all duration-300 bg-white px-3 py-1 rounded-lg text-sm font-bold text-pink-600 shadow-xl pointer-events-none whitespace-nowrap z-10 flex items-center justify-center">
                                        {formatBRL(m.total)}
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-pink-800 uppercase tracking-wider">{m.month}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/60 hover:bg-white p-4 rounded-2xl flex gap-3 border border-pink-100/50 transition-colors duration-300 shadow-sm">
                        <SparklesIcon className="w-6 h-6 text-pink-500 flex-shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-sm font-medium text-pink-900 italic leading-relaxed text-justify">"{aiComment}"</p>
                    </div>
                </div>

                {/* Dicas de IA para Cupons (Flip Wrapper) */}
                <div className="group relative h-[450px] [perspective:1000px]">

                        {/* FRONT FACE */}
                        <div 
                            className="absolute inset-0 bg-gradient-to-br from-pink-50 to-pink-100 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col text-pink-950 overflow-hidden bg-white transition-all duration-700"
                            style={{ 
                                transform: isResgateFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                zIndex: isResgateFlipped ? 0 : 10,
                                opacity: isResgateFlipped ? 0 : 1
                            }}
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 group-hover:animate-pulse transition-all duration-700 pointer-events-none"></div>
                            
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <h3 className="text-xl font-bold flex items-center gap-2 text-pink-900">
                                     <SparklesIcon className="w-7 h-7 text-pink-500" /> Resgate
                                </h3>
                                {/* Botão WhatsApp para virar o card */}
                                <button 
                                    onClick={() => setIsResgateFlipped(true)}
                                    className="p-1.5 bg-pink-500 text-white rounded-full shadow-lg hover:scale-110 hover:bg-pink-600 transition-all duration-300 ring-2 ring-pink-100/50"
                                    title="Criar campanha no WhatsApp"
                                >
                                    <WhatsAppIcon className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <p className="text-pink-600 mb-3 font-medium relative z-10 text-sm">Sem serviços há mais de:</p>
                            
                            <div className="relative z-10 flex gap-2 mb-4 overflow-x-auto custom-scrollbar-white pb-1">
                                {[1, 2, 3, 6].map(months => (
                                    <button
                                        key={months}
                                        onClick={() => setMissingPetsMonthsFilter(months)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap ${missingPetsMonthsFilter === months ? 'bg-pink-500 text-white shadow-md scale-105 ring-2 ring-pink-200' : 'bg-white/60 text-pink-700 border border-pink-200 hover:bg-white'}`}
                                    >
                                        {months} {months === 1 ? 'mês' : 'meses'}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 relative z-10 custom-scrollbar-pink min-h-0">
                                {filteredMissingPets.length > 0 ? filteredMissingPets.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/60 hover:bg-white transition-colors duration-300 rounded-xl p-3 border border-pink-100/50 cursor-default shadow-sm">
                                        <span className="font-bold text-lg text-pink-900">{p.name}</span>
                                        <span className="text-[10px] bg-pink-100 px-3 py-1 rounded-full text-pink-700 font-bold uppercase tracking-widest">Último: {p.lastVisit}</span>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-pink-400 font-medium bg-white/40 rounded-xl border border-pink-100/50">
                                        Nenhum cliente inativo encontrado nesta categoria! 🚀
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/60 hover:bg-white transition-colors duration-300 rounded-2xl p-4 border border-pink-100/50 flex gap-3 mt-auto relative z-10 shadow-sm">
                                <StarIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-pink-900 italic leading-relaxed text-justify line-clamp-2">"{aiTips}"</p>
                            </div>
                        </div>

                        {/* BACK FACE (WhatsApp Campaign) */}
                        <div 
                            className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-600 rounded-[2rem] p-6 shadow-xl shadow-pink-200 flex flex-col text-white overflow-hidden border border-pink-400 bg-pink-500 transition-all duration-700"
                            style={{ 
                                transform: isResgateFlipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                zIndex: isResgateFlipped ? 10 : 0,
                                opacity: isResgateFlipped ? 1 : 0
                            }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-30"></div>
                            
                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                     <WhatsAppIcon className="w-6 h-6 text-green-300 drop-shadow-md" /> Mensagem em Massa
                                </h3>
                                <button 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        e.stopPropagation(); 
                                        setIsResgateFlipped(false); 
                                    }}
                                    className="p-2 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors z-50 cursor-pointer relative"
                                    title="Voltar"
                                >
                                    <XMarkIcon className="w-5 h-5 pointer-events-none" />
                                </button>
                            </div>
                            
                            <div className="relative z-10 flex flex-col flex-1 h-full min-h-0">
                                {showCampaignSuccess ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center z-50">
                                        <div className="w-20 h-20 bg-green-400 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(74,222,128,0.5)] animate-bounce">
                                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h4 className="text-2xl font-bold text-white mb-2">Sucesso!</h4>
                                        <p className="text-pink-100 font-medium text-lg leading-snug">
                                            A campanha foi enviada para o WhatsApp de <span className="font-bold text-white">{filteredMissingPets.length} pets</span>.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-pink-100 text-sm mb-2 font-medium">
                                            Enviando para <span className="text-white font-bold">{filteredMissingPets.length} pets</span> inativos há {missingPetsMonthsFilter} meses:
                                        </p>
                                        
                                        <textarea
                                            className="w-full flex-1 min-h-0 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-pink-200/60 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none mb-4 custom-scrollbar-white shadow-inner"
                                            value={rescueMessage}
                                            onChange={(e) => setRescueMessage(e.target.value)}
                                            placeholder="Escreva a mensagem (ex: Olá, estamos com saudades...)"
                                            disabled={isSendingCampaign}
                                        />

                                        <button 
                                            onClick={handleSendCampaign}
                                            disabled={isSendingCampaign || filteredMissingPets.length === 0}
                                            className="w-full bg-white text-pink-600 hover:bg-pink-50 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg mt-auto hover:shadow-pink-300/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSendingCampaign ? (
                                                <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
                                                    Disparar Campanha
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                </div>

            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Ranking Loja */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col group text-pink-950">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-800">
                        <TrophyIcon className="w-6 h-6 text-pink-500" /> Top Banho & Tosa
                    </h3>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar-white pr-2" style={{ maxHeight: '230px' }}>
                        {topAvulsoLojas.map((c, i) => (
                             <div key={i} className="flex items-center gap-4 bg-white/60 p-3 rounded-2xl border border-pink-100/50 hover:bg-white transition-colors duration-300 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-100/0 via-pink-100/30 to-pink-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm z-10 ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border border-yellow-200' : i === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 border border-gray-100' : i === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 border border-orange-200' : 'bg-gradient-to-br from-pink-200 to-pink-300 text-pink-900 border border-pink-100'}`}>
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0 z-10">
                                    <p className="font-bold text-gray-800 truncate leading-tight">{c.name}</p>
                                    <p className="text-xs text-pink-600/80 font-medium whitespace-nowrap truncate">{c.count} agendamentos</p>
                                </div>
                                <div className="font-bold text-pink-700 bg-pink-100/50 px-3 py-1.5 rounded-xl text-sm border border-pink-200/50 z-10 whitespace-nowrap flex-shrink-0">
                                    {formatBRL(c.total)}
                                </div>
                            </div>
                        ))}
                        {topAvulsoLojas.length === 0 && <p className="text-center text-sm text-pink-400/70 p-4 font-medium">Sem dados recentes</p>}
                    </div>
                </div>

                {/* Ranking Pet Móvel */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col group text-pink-950">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-800">
                        <TrophyIcon className="w-6 h-6 text-pink-500" /> Top Pet Móvel
                    </h3>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar-white pr-2" style={{ maxHeight: '230px' }}>
                        {topAvulsoPetMovel.map((c, i) => (
                             <div key={i} className="flex items-center gap-4 bg-white/60 p-3 rounded-2xl border border-pink-100/50 hover:bg-white transition-colors duration-300 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-100/0 via-pink-100/30 to-pink-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm z-10 ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 border border-yellow-200' : i === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700 border border-gray-100' : i === 2 ? 'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 border border-orange-200' : 'bg-gradient-to-br from-pink-300 to-pink-500 text-white border border-pink-200'}`}>
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0 z-10">
                                    <p className="font-bold text-gray-800 truncate leading-tight">{c.name}</p>
                                    <p className="text-xs text-pink-600/80 font-medium whitespace-nowrap truncate">{c.count} agendamentos</p>
                                </div>
                                <div className="font-bold text-pink-700 bg-pink-100/50 px-3 py-1.5 rounded-xl text-sm border border-pink-200/50 z-10 whitespace-nowrap flex-shrink-0">
                                    {formatBRL(c.total)}
                                </div>
                            </div>
                        ))}
                         {topAvulsoPetMovel.length === 0 && <p className="text-center text-sm text-pink-400/70 p-4 font-medium">Sem dados recentes</p>}
                    </div>
                </div>

                {/* Pets com Mais Serviços */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col group text-pink-950">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-800">
                        <StarIcon className="w-6 h-6 text-pink-500" /> Pets +Frequentes
                    </h3>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar-white pr-2" style={{ maxHeight: '350px' }}>
                        {topPets.map((p, i) => (
                             <div key={i} className="flex items-center gap-3 bg-white/60 hover:bg-white p-3 rounded-2xl border border-pink-100/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md">
                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-inner border rotate-3 ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-200' : i === 1 ? 'bg-gradient-to-br from-gray-200 to-gray-400 border-gray-300' : i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 border-orange-300' : 'bg-gradient-to-br from-pink-200 to-pink-300 border-pink-200'}`}>
                                     <span className={`font-black text-sm ${i === 0 ? 'text-yellow-900' : i === 1 ? 'text-gray-800' : i === 2 ? 'text-orange-950' : 'text-pink-900'}`}>{p.count}x</span>
                                </div>
                                <div className="flex-1 overflow-hidden pl-1">
                                     <p className="font-bold text-gray-800 truncate text-lg tracking-tight">{p.name}</p>
                                     <p className="text-[10px] text-pink-500 uppercase font-bold tracking-widest mt-0.5">Cliente Vip</p>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>

                {/* Pets com Menos Serviços (Antigos) */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col group text-pink-950">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-pink-800">
                        <StarIcon className="w-6 h-6 text-pink-500 opacity-50" /> Pets -Frequentes
                    </h3>
                    <div className="space-y-4 overflow-y-auto custom-scrollbar-white pr-2" style={{ maxHeight: '350px' }}>
                        {bottomPets.map((p, i) => (
                             <div key={i} className="flex items-center gap-3 bg-white/60 hover:bg-white p-3 rounded-2xl border border-pink-100/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md">
                                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex flex-col items-center justify-center shadow-inner border border-pink-200 -rotate-3">
                                     <span className="text-pink-900 font-black text-sm">{p.count}x</span>
                                </div>
                                <div className="flex-1 overflow-hidden pl-1">
                                     <p className="font-bold text-gray-800 truncate text-lg tracking-tight">{p.name}</p>
                                     <p className="text-[10px] text-pink-500 uppercase font-bold tracking-widest mt-0.5">Último: {p.lastVisit}</p>
                                </div>
                             </div>
                        ))}
                        {bottomPets.length === 0 && <p className="text-center text-sm text-pink-400/70 p-4 font-medium">Sem dados recentes</p>}
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                 {/* Agenda Semanal */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6 shrink-0 border-b border-pink-100/50 pb-4">
                        <h3 className="text-xl font-bold text-pink-900 flex items-center gap-2">
                            <CalendarDaysIcon className="w-7 h-7 text-pink-500" /> Semana Atual
                        </h3>
                        <span className="bg-gradient-to-r from-pink-400 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                            {weeklyAppts.reduce((sum, day) => sum + day.pets.length, 0)} totais
                        </span>
                    </div>
                    <div className="space-y-3 pr-2 custom-scrollbar overflow-y-auto flex-1 min-h-0">
                        {weeklyAppts.map((day, i) => (
                            <div key={i} className="border-l-4 border-pink-400 bg-white/60 rounded-r-xl p-3 hover:bg-white transition-colors duration-200 shadow-sm">
                                <p className="text-sm font-bold text-pink-900 mb-2">{day.date}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {day.pets.map((p, pIdx) => (
                                        <span key={pIdx} className="bg-pink-100/70 border border-pink-200 text-pink-800 font-medium text-xs px-2.5 py-1 rounded-lg">{p}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {weeklyAppts.length === 0 && <p className="text-pink-400 text-sm font-medium text-center py-8">Nenhum agendamento nesta semana.</p>}
                    </div>
                </div>

                {/* Agenda Mensal */}
                <div className="bg-gradient-to-br from-pink-50/90 to-pink-100/90 rounded-[2rem] p-6 shadow-xl shadow-pink-100/40 border border-pink-200/50 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6 shrink-0 border-b border-pink-100/50 pb-4">
                        <h3 className="text-xl font-bold text-pink-900 flex items-center gap-2">
                            <CalendarDaysIcon className="w-7 h-7 text-pink-500" /> Agenda do Mês
                        </h3>
                        <span className="bg-gradient-to-r from-pink-400 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                            {monthlyAppts.reduce((sum, day) => sum + day.pets.length, 0)} totais
                        </span>
                    </div>
                    <div className="space-y-3 pr-2 custom-scrollbar overflow-y-auto flex-1 min-h-0">
                        {monthlyAppts.map((day, i) => (
                            <div key={i} className="border-l-4 border-pink-400 bg-white/60 rounded-r-xl p-3 hover:bg-white transition-colors duration-200 shadow-sm">
                                <p className="text-sm font-bold text-pink-900 mb-2">{day.date}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {day.pets.map((p, pIdx) => (
                                        <span key={pIdx} className="bg-pink-100/70 border border-pink-200 text-pink-800 font-medium text-xs px-2.5 py-1 rounded-lg">{p}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {monthlyAppts.length === 0 && <p className="text-pink-400 text-sm font-medium text-center py-8">Nenhum agendamento neste mês.</p>}
                    </div>
                </div>

             </div>

             <style>{`
                .custom-scrollbar-white::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar-white::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-white::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.3);
                    border-radius: 20px;
                }
                .custom-scrollbar-white::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255,255,255,0.5);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #fbcfe8;
                    border-radius: 20px;
                }
             `}</style>
             <AiChatModal systemData={globalChatContext} />
        </div>
    );
};

export default InsightsDashboard;
