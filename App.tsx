
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircleIcon as CheckCircleOutlineIcon, XCircleIcon as XCircleOutlineIcon, EyeIcon as EyeOutlineIcon, PencilSquareIcon as PencilOutlineIcon, PlusIcon as PlusOutlineIcon, TrashIcon as TrashOutlineIcon } from '@heroicons/react/24/outline';
// FIX: Moved AddonService from constants import to types import, as it's a type defined in types.ts.
import { Appointment, ServiceType, PetWeight, AdminAppointment, Client, MonthlyClient, DaycareRegistration, PetMovelAppointment, AddonService, HotelRegistration } from './types';
import { SERVICES, WORKING_HOURS, MAX_CAPACITY_PER_SLOT, LUNCH_HOUR, PET_WEIGHT_OPTIONS, SERVICE_PRICES, ADDON_SERVICES, VISIT_WORKING_HOURS, DAYCARE_PLAN_PRICES, DAYCARE_EXTRA_SERVICES_PRICES, HOTEL_BASE_PRICE, HOTEL_EXTRA_SERVICES_PRICES } from './constants';
import { supabase } from './supabaseClient';
import NotificationBell from './NotificationBell';
import ExtraServicesModal from './ExtraServicesModal';
import ActionChooserModal from './src/ActionChooserModal';
import { Menu, MenuItem } from './src/components/ui/menu';
import { Button } from './src/components/ui/button';


const planLabels: Record<string, string> = {
  '4x_month': '4 X MÊS',
  '8x_month': '8 X MÊS',
  '12x_month': '12 X MÊS',
  '16x_month': '16 X MÊS',
  '20x_month': '20 X MÊS',
  '2x_week': '2 X SEMANA',
  '3x_week': '3 X SEMANA',
  '4x_week': '4 X SEMANA',
  '5x_week': '5 X SEMANA',
};

const AiChatView: React.FC<{ key?: number }> = () => {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
        try {
            const cached = localStorage.getItem('ai_chat_messages');
            if (cached) return JSON.parse(cached);
        } catch {}
        return [{ role: 'assistant', content: 'Olá! Sou sua assistente. Como posso ajudar hoje?' }];
    });
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        try { localStorage.setItem('ai_chat_messages', JSON.stringify(messages)); } catch {}
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    const sendSystemDataToWebhook = async (mensagem: string): Promise<{ ok: boolean; status: number; message: string; reply?: string }> => {
        try {
            const [appointmentsRes, petMovelRes, monthlyRes, hotelRes, daycareRes, clientsRes] = await Promise.all([
                supabase.from('appointments').select('*'),
                supabase.from('pet_movel_appointments').select('*'),
                supabase.from('monthly_clients').select('*'),
                supabase.from('hotel_registrations').select('*'),
                supabase.from('daycare_enrollments').select('*'),
                supabase.from('clients').select('*'),
            ]);

            const payload = {
                gerado_em: new Date().toISOString(),
                origem: 'SandyPetShop_v3',
                mensagem,
                agendamentos: appointmentsRes.data || [],
                agendamentos_pet_movel: petMovelRes.data || [],
                mensalistas: monthlyRes.data || [],
                registros_hotel: hotelRes.data || [],
                matriculas_creche: daycareRes.data || [],
                clientes: clientsRes.data || [],
                estatisticas: {
                    total_agendamentos: (appointmentsRes.data || []).length,
                    total_agendamentos_pet_movel: (petMovelRes.data || []).length,
                    total_mensalistas: (monthlyRes.data || []).length,
                    total_registros_hotel: (hotelRes.data || []).length,
                    total_matriculas_creche: (daycareRes.data || []).length,
                    total_clientes: (clientsRes.data || []).length,
                }
            };

            const hookUrl = 'https://n8n.intelektus.tech/webhook/sandypetrobo';
            const res = await fetch(hookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const ok = res.ok;
            const status = res.status;
            let reply: string | undefined = undefined;
            try {
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) {
                    const body = await res.json();
                    reply = String(body?.reply || body?.resposta || body?.mensagem || body?.message || JSON.stringify(body));
                } else {
                    reply = await res.text();
                }
            } catch {}
            if (!ok) {
                return { ok, status, message: reply || 'Falha ao enviar para webhook.', reply };
            }
            return { ok, status, message: 'Dados enviados com sucesso ao webhook.', reply };
        } catch (err: any) {
            return { ok: false, status: 0, message: err?.message || 'Erro inesperado ao enviar dados.' };
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isSending) return;
        setIsSending(true);
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        // Exporta todos os dados do sistema para o webhook
        const exportResult = await sendSystemDataToWebhook(text);
        if (exportResult.reply) {
            setMessages(prev => [...prev, { role: 'assistant', content: exportResult.reply! }]);
        } else {
            setMessages(prev => [...prev, { role: 'assistant', content: exportResult.ok ? `Webhook: ${exportResult.message} (status ${exportResult.status})` : `Webhook erro (status ${exportResult.status}): ${exportResult.message}` }]);
        }

        const endpoint = import.meta.env.VITE_AI_CHAT_ENDPOINT || '';
        try {
            if (endpoint && !exportResult.reply) {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages }),
                });
                const data = await res.json();
                const reply = String(data?.reply || 'Sem resposta.');
                setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
            } else {
                if (!exportResult.reply) {
                    const reply = `Você disse: "${text}". Para respostas reais, configure VITE_AI_CHAT_ENDPOINT.`;
                    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
                }
            }
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Falha ao conectar à IA.' }]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Chat com IA</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[70vh]">
                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((m, idx) => (
                        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-pink-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>{m.content}</div>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t flex items-center gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isSending}
                        className="px-4 py-2 rounded-lg bg-pink-600 text-white font-semibold disabled:opacity-50"
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- TIMEZONE-AWARE HELPER FUNCTIONS (UTC-3 / SÃO PAULO) ---
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Creates a Date object in UTC that represents the desired wall-clock time in São Paulo.
 * Example: toSaoPauloUTC(2025, 9, 21, 11) creates a Date object for 2025-10-21 14:00:00Z.
 */
const toSaoPauloUTC = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => {
    return new Date(Date.UTC(year, month, day, hour, minute, second) + SAO_PAULO_OFFSET_MS);
}

/**
 * Takes a Date object (which is inherently UTC based) and returns the São Paulo wall-clock time parts.
 */
const getSaoPauloTimeParts = (date: Date) => {
    const spDate = new Date(date.getTime() - SAO_PAULO_OFFSET_MS);
    return {
        year: spDate.getUTCFullYear(),
        month: spDate.getUTCMonth(),
        date: spDate.getUTCDate(),
        hour: spDate.getUTCHours(),
        day: spDate.getUTCDay(), // 0 = Sunday
    }
}

// Parse YYYY-MM-DD as a São Paulo wall-clock date using midday to avoid DST/offset edge cases
const parseISODateAsSaoPaulo = (isoDate: string): Date => {
    const [y, m, d] = isoDate.split('-').map(Number);
    return toSaoPauloUTC(y, (m - 1), d, 12, 0, 0);
};

const isSameSaoPauloDay = (date1: Date, date2: Date): boolean => {
  const d1 = date1.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const d2 = date2.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return d1 === d2;
};

const isPastSaoPauloDate = (date: Date): boolean => {
    const now = new Date();
    const todaySaoPaulo = getSaoPauloTimeParts(now);
    const dateSaoPaulo = getSaoPauloTimeParts(date);
    
    const today = new Date(Date.UTC(todaySaoPaulo.year, todaySaoPaulo.month, todaySaoPaulo.date));
    const compareDate = new Date(Date.UTC(dateSaoPaulo.year, dateSaoPaulo.month, dateSaoPaulo.date));

    return compareDate < today;
};

const isSaoPauloWeekend = (date: Date): boolean => {
    const { day } = getSaoPauloTimeParts(date);
    return day === 0 || day === 6;
};

const formatWhatsapp = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  const formatted = digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
  return formatted.slice(0, 15);
};

const formatDateToBR = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    // Handles both date (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:mm:ss.sssZ) strings
    const datePart = dateString.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return dateString; // Fallback
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};


const getPlanLabel = (client: MonthlyClient) => {
    switch (client.recurrence_type) {
        case 'weekly': return 'Semanal';
        case 'bi-weekly': return 'Quinzenal';
        case 'monthly': return 'Mensal';
        default: return 'Não definido';
    }
};

const getCurrentMonthPaymentDueISO = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const day = monthIndex === 1 ? '28' : '30';
    const month = String(monthIndex + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getNextAppointmentDateText = (client: MonthlyClient) => {
    const now = new Date();
    const recurrenceDay = parseInt(String(client.recurrence_day), 10);
    const recurrenceTime = parseInt(String(client.recurrence_time), 10);
    if (client.recurrence_type === 'weekly' || client.recurrence_type === 'bi-weekly') {
        let firstDate = new Date();
        const todaySaoPaulo = getSaoPauloTimeParts(firstDate);
        const firstDateDayOfWeek = todaySaoPaulo.day === 0 ? 7 : todaySaoPaulo.day;
        let daysToAdd = (recurrenceDay - firstDateDayOfWeek + 7) % 7;
        if (daysToAdd === 0 && todaySaoPaulo.hour >= recurrenceTime) {
            daysToAdd = 7;
        }
        firstDate.setDate(firstDate.getDate() + daysToAdd);
        const appointmentTime = toSaoPauloUTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), recurrenceTime);
        const dateStr = appointmentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
        const timeStr = appointmentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        return `${dateStr} às ${timeStr}`;
    } else {
        let targetDate = new Date();
        const todaySaoPaulo = getSaoPauloTimeParts(targetDate);
        targetDate.setDate(recurrenceDay);
        if (targetDate < now || (isSameSaoPauloDay(targetDate, now) && todaySaoPaulo.hour >= recurrenceTime)) {
            targetDate.setMonth(targetDate.getMonth() + 1);
        }
        const appointmentTime = toSaoPauloUTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), recurrenceTime);
        const dateStr = appointmentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
        const timeStr = appointmentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        return `${dateStr} às ${timeStr}`;
    }
};

const formatDateToISO = (dateString: string | null): string => {
    if (!dateString) return '';
    // Handles both date (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:mm:ss.sssZ) strings
    const datePart = dateString.split('T')[0];
    return datePart;
};

const getCurrentMonthPaymentDueDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let day = 30;
    if (month === 1) {
        day = new Date(year, 2, 0).getDate();
    } else {
        day = 30;
    }
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getWeightKeyFromLabel = (label: string | null): PetWeight | null => {
    if (!label) return null;
    const keys = Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[];
    return keys.find(k => PET_WEIGHT_OPTIONS[k] === label) || null;
};

const inferServiceTypeFromLabel = (label: string | null): ServiceType | null => {
    if (!label) return null;
    const l = label.toLowerCase();
    const isPetMovel = l.includes('pet móvel');
    const hasBathTosa = l.includes('banho & tosa') || l.includes('banho e tosa');
    const hasBath = l.includes('banho');
    const hasTosa = l.includes('tosa');
    if (isPetMovel && hasBathTosa) return ServiceType.PET_MOBILE_BATH_AND_GROOMING;
    if (isPetMovel && hasBath && !hasBathTosa) return ServiceType.PET_MOBILE_BATH;
    if (isPetMovel && hasTosa && !hasBathTosa) return ServiceType.PET_MOBILE_GROOMING_ONLY;
    if (hasBathTosa) return ServiceType.BATH_AND_GROOMING;
    if (hasBath && !hasBathTosa) return ServiceType.BATH;
    if (hasTosa && !hasBathTosa) return ServiceType.GROOMING_ONLY;
    return null;
};

const getUnitPriceByType = (weightKey: PetWeight | null | undefined, type: ServiceType | null | undefined): number => {
    if (!weightKey || !type) return 0;
    const prices = SERVICE_PRICES[weightKey];
    if (!prices) return 0;
    if (type === ServiceType.BATH_AND_GROOMING || type === ServiceType.PET_MOBILE_BATH_AND_GROOMING) {
        return Number(prices[ServiceType.BATH]) + Number(prices[ServiceType.GROOMING_ONLY]);
    }
    if (type === ServiceType.BATH || type === ServiceType.PET_MOBILE_BATH) {
        return Number(prices[ServiceType.BATH]);
    }
    if (type === ServiceType.GROOMING_ONLY || type === ServiceType.PET_MOBILE_GROOMING_ONLY) {
        return Number(prices[ServiceType.GROOMING_ONLY]);
    }
    return 0;
};

const formatCurrency = (value: string | number): string => {
    // Se o valor é um número, converte para string
    let stringValue = typeof value === 'number' ? value.toString() : value;
    
    // Se é um valor numérico direto (como 50.00), formata diretamente
    if (typeof value === 'number') {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }
    
    // Remove tudo que não é dígito
    const numericValue = stringValue.replace(/\D/g, '');
    
    // Se não há valor, retorna R$ 0,00
    if (!numericValue) return 'R$ 0,00';
    
    // Converte para número e divide por 100 para ter centavos
    const number = parseInt(numericValue) / 100;
    
    // Formata como moeda brasileira
    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

const parseCurrencyToNumber = (value: string): number => {
    // Remove símbolos de moeda e espaços, substitui vírgula por ponto
    const numericString = value
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const number = parseFloat(numericString);
    return isNaN(number) ? 0 : number;
};

const formatCurrencyInput = (value: string): string => {
    // Remove tudo que não é dígito
    const numericValue = value.replace(/\D/g, '');
    
    // Se não há valor, retorna 0,00
    if (!numericValue) return '0,00';
    
    // Converte para número e divide por 100 para ter centavos
    const number = parseInt(numericValue) / 100;
    
    // Formata sem o símbolo R$, apenas com vírgula e pontos
    return number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// Função para calcular o valor total dos serviços extras
const calculateExtraServicesTotal = (extraServices: any): number => {
    let total = 0;
    
    if (extraServices?.pernoite && extraServices.pernoite_quantity && extraServices.pernoite_price) {
        total += Number(extraServices.pernoite_quantity) * Number(extraServices.pernoite_price);
    }
    
    if (extraServices?.banho_tosa && extraServices.banho_tosa_quantity && extraServices.banho_tosa_price) {
        total += Number(extraServices.banho_tosa_quantity) * Number(extraServices.banho_tosa_price);
    }
    
    if (extraServices?.so_banho && extraServices.so_banho_quantity && extraServices.so_banho_price) {
        total += Number(extraServices.so_banho_quantity) * Number(extraServices.so_banho_price);
    }
    
    if (extraServices?.adestrador && extraServices.adestrador_quantity && extraServices.adestrador_price) {
        total += Number(extraServices.adestrador_quantity) * Number(extraServices.adestrador_price);
    }
    
    if (extraServices?.despesa_medica && extraServices.despesa_medica_quantity && extraServices.despesa_medica_price) {
        total += Number(extraServices.despesa_medica_quantity) * Number(extraServices.despesa_medica_price);
    }
    
    if (extraServices?.dia_extra && extraServices.dia_extra_quantity && extraServices.dia_extra_price) {
        total += Number(extraServices.dia_extra_quantity) * Number(extraServices.dia_extra_price);
    }
    
    return total;
};

// Função para calcular o valor total da fatura da creche
const calculateDaycareInvoiceTotal = (enrollment: DaycareRegistration): number => {
    const base = (typeof enrollment.total_price === 'number' && enrollment.total_price > 0)
        ? Number(enrollment.total_price)
        : (enrollment.contracted_plan && DAYCARE_PLAN_PRICES[enrollment.contracted_plan])
            ? DAYCARE_PLAN_PRICES[enrollment.contracted_plan]
            : 0;

    let extras = 0;
    const es: any = enrollment.extra_services as any;
    if (es) {
        // Novo formato (enabled/value/quantity)
        if (es.pernoite?.enabled) extras += Number(es.pernoite.value ?? DAYCARE_EXTRA_SERVICES_PRICES.pernoite);
        if (es.banho_tosa?.enabled) extras += Number(es.banho_tosa.value ?? DAYCARE_EXTRA_SERVICES_PRICES.banho_tosa);
        if (es.so_banho?.enabled) extras += Number(es.so_banho.value ?? DAYCARE_EXTRA_SERVICES_PRICES.so_banho);
        if (es.adestrador?.enabled) extras += Number(es.adestrador.value ?? DAYCARE_EXTRA_SERVICES_PRICES.adestrador);
        if (es.despesa_medica?.enabled) extras += Number(es.despesa_medica.value ?? DAYCARE_EXTRA_SERVICES_PRICES.despesa_medica);
        if (es.dias_extras?.quantity && es.dias_extras.quantity > 0) {
            extras += Number(es.dias_extras.quantity) * Number(es.dias_extras.value ?? DAYCARE_EXTRA_SERVICES_PRICES.dia_extra);
        }

        // Formato antigo (booleans e número para dia_extra)
        if (es.pernoite === true) extras += DAYCARE_EXTRA_SERVICES_PRICES.pernoite;
        if (es.banho_tosa === true) extras += DAYCARE_EXTRA_SERVICES_PRICES.banho_tosa;
        if (es.so_banho === true) extras += DAYCARE_EXTRA_SERVICES_PRICES.so_banho;
        if (es.adestrador === true) extras += DAYCARE_EXTRA_SERVICES_PRICES.adestrador;
        if (es.despesa_medica === true) extras += DAYCARE_EXTRA_SERVICES_PRICES.despesa_medica;
        if (typeof es.dia_extra === 'number' && es.dia_extra > 0) {
            extras += es.dia_extra * DAYCARE_EXTRA_SERVICES_PRICES.dia_extra;
        }
    }

    return base + extras;
};

// Função para calcular o valor total da fatura do hotel pet
const calculateHotelInvoiceTotal = (registration: HotelRegistration): number => {
    let total = 0;
    
    // Calcular número de dias de hospedagem
    let days = 1; // Valor padrão
    if (registration.check_in_date && registration.check_out_date) {
        const checkIn = new Date(registration.check_in_date);
        const checkOut = new Date(registration.check_out_date);
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    
    // Valor base por dia
    total += HOTEL_BASE_PRICE * days;
    
    // Valor dos serviços extras
    if (registration.extra_services) {
        if (registration.extra_services.banho_tosa?.enabled) {
            total += registration.extra_services.banho_tosa.value || HOTEL_EXTRA_SERVICES_PRICES.banho_tosa;
        }
        if (registration.extra_services.adestrador?.enabled) {
            total += registration.extra_services.adestrador.value || HOTEL_EXTRA_SERVICES_PRICES.adestramento;
        }
        if (registration.extra_services.despesa_medica?.enabled) {
            total += registration.extra_services.despesa_medica.value || HOTEL_EXTRA_SERVICES_PRICES.veterinario;
        }
        if (registration.extra_services.so_banho?.enabled) {
            total += registration.extra_services.so_banho.value || 40; // Preço do banho simples
        }
        if (registration.extra_services.pernoite?.enabled) {
            total += registration.extra_services.pernoite.value || 50; // Preço do pernoite
        }
        if (registration.extra_services.dias_extras?.quantity > 0) {
            total += registration.extra_services.dias_extras.quantity * (registration.extra_services.dias_extras.value || 30);
        }
    }
    
    // Verificar serviços booleanos do registro
    if (registration.service_transport) {
        total += HOTEL_EXTRA_SERVICES_PRICES.transporte;
    }
    if (registration.service_vet) {
        total += HOTEL_EXTRA_SERVICES_PRICES.veterinario;
    }
    if (registration.service_training) {
        total += HOTEL_EXTRA_SERVICES_PRICES.adestramento;
    }
    if (registration.service_bath) {
        total += HOTEL_EXTRA_SERVICES_PRICES.banho_tosa;
    }
    
    // Se existe um total_services_price definido, usar ele ao invés do calculado
    if (registration.total_services_price && registration.total_services_price > 0) {
        return registration.total_services_price;
    }
    
    return total;
};


// --- SVG ICONS ---
// FIX: Update ChevronLeftIcon and ChevronRightIcon to accept SVG props to allow passing className.
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const Collapsible: React.FC<{ title: string; defaultOpen?: boolean; className?: string }> = ({ title, defaultOpen = true, className, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={className || ''}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between">
                <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-2">{title}</h3>
                <ChevronRightIcon className={`h-6 w-6 text-gray-500 transform transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-1">
                    {children}
                </div>
            )}
        </div>
    );
};
const SignaturePad: React.FC<{ value?: string; onChange: (dataUrl: string) => void; height?: number }> = ({ value, onChange, height = 180 }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = window.devicePixelRatio || 1;
        const rectWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
        canvas.width = Math.max(300, rectWidth) * ratio;
        canvas.height = height * ratio;
        canvas.style.width = '100%';
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(ratio, ratio);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, [height]);

    const getPos = (e: PointerEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const getTouchPos = (e: TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const t = e.touches[0] || e.changedTouches[0];
        return t ? { x: t.clientX - rect.left, y: t.clientY - rect.top } : null;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const handleDown = (e: PointerEvent) => {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            isDrawingRef.current = true;
            lastPosRef.current = getPos(e, canvas);
        };
        const handleMove = (e: PointerEvent) => {
            if (!isDrawingRef.current || !lastPosRef.current) return;
            const pos = getPos(e, canvas);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPosRef.current = pos;
        };
        const handleUp = (e: PointerEvent) => {
            if (!isDrawingRef.current) return;
            isDrawingRef.current = false;
            lastPosRef.current = null;
            onChange(canvas.toDataURL('image/png'));
        };
        canvas.addEventListener('pointerdown', handleDown);
        canvas.addEventListener('pointermove', handleMove);
        canvas.addEventListener('pointerup', handleUp);
        canvas.addEventListener('pointerleave', handleUp);
        const handleTouchStart = (e: TouchEvent) => {
            e.preventDefault();
            isDrawingRef.current = true;
            const p = getTouchPos(e, canvas);
            lastPosRef.current = p || null;
        };
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (!isDrawingRef.current) return;
            const p = getTouchPos(e, canvas);
            if (!p || !lastPosRef.current) return;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            lastPosRef.current = p;
        };
        const handleTouchEnd = (e: TouchEvent) => {
            e.preventDefault();
            if (!isDrawingRef.current) return;
            isDrawingRef.current = false;
            lastPosRef.current = null;
            onChange(canvas.toDataURL('image/png'));
        };
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        return () => {
            canvas.removeEventListener('pointerdown', handleDown);
            canvas.removeEventListener('pointermove', handleMove);
            canvas.removeEventListener('pointerup', handleUp);
            canvas.removeEventListener('pointerleave', handleUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onChange]);

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onChange('');
    };

    return (
        <div className="space-y-2">
            <div className="border-2 border-gray-300 rounded-md bg-white">
                <canvas ref={canvasRef} className="w-full" style={{ touchAction: 'none' }} />
            </div>
            <div className="flex items-center gap-2">
                <button type="button" onClick={handleClear} className="px-3 py-2 rounded-md border bg-gray-100 hover:bg-gray-200 text-gray-700">Limpar</button>
                {value && <span className="text-xs text-gray-500">Assinatura capturada</span>}
            </div>
        </div>
    );
};
const PawIcon = () => <img src="https://static.thenounproject.com/png/pet-icon-6939415-512.png" alt="Pet Icon" className="h-7 w-7 opacity-60" />;
const UserIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/10754/10754012.png" alt="User Icon" className="h-7 w-7 opacity-60" />;
const WhatsAppIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/15713/15713434.png" alt="WhatsApp Icon" className="h-5 w-5 opacity-60" />;
const SuccessIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="min-h-[64px] w-24 text-green-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const FunnelIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M3 4.5A1.5 1.5 0 014.5 3h15a1.5 1.5 0 011.2 2.4l-6.3 8.4v4.2a1.5 1.5 0 01-.9 1.37l-3 1.5A1.5 1.5 0 018 19.5v-5.7L1.3 5.4A1.5 1.5 0 013 4.5z"/></svg>;
const BreedIcon = () => <img src="https://static.thenounproject.com/png/pet-icon-7326432-512.png" alt="Breed Icon" className="h-7 w-7 opacity-60" />;
const AddressIcon = () => <img src="https://static.thenounproject.com/png/location-icon-7979305-512.png" alt="Address Icon" className="h-7 w-7 opacity-60" />;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5h10a1 1 0 100-2H3zm12.293 4.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 13H9a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 10.586V6z" clipRule="evenodd" /></svg>;
const CameraAddIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="3" y="6" width="18" height="13" rx="3" fill="currentColor" />
    <rect x="8" y="3" width="4" height="3" rx="1" fill="currentColor" />
    <circle cx="12" cy="12.5" r="5" fill="#ffffff" />
    <circle cx="12" cy="12.5" r="2.6" fill="currentColor" />
  </svg>
);
const TagIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/13733/13733507.png" alt="Tag" className="h-5 w-5 mr-1.5" />;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
const UserPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" /></svg>;
const EditIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
);
const ObservationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 11-2 0V4H6v12a1 1 0 11-2 0V4zm4 12a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>;
const DeleteIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
);
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const SuccessAlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// FIX: CalendarIcon uses requested PNG asset instead of inline SVG
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <img src="https://cdn-icons-png.flaticon.com/512/4288/4288266.png" alt="Calendário" className={className || 'h-6 w-6'} />
);
const LockClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const LockOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>;

// --- NEW ADMIN MENU ICONS ---
const BathTosaIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho & Tosa Icon" className="h-7 w-7" />;
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 9l6 6 6-6" />
    </svg>
);
// ChevronRightIcon já está definido acima; evitando redefinição
const DaycareIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet Icon" className="h-7 w-7" />;
const ClientsMenuIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/1192/1192913.png" alt="Clientes Icon" className="h-7 w-7" />;
const MonthlyIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/13731/13731277.png" alt="Mensalistas Icon" className="h-7 w-7" />;
const HotelIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/1131/1131938.png" alt="Hotel Pet Icon" className="h-7 w-7" />;
const PetMovelIcon = () => <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel Icon" className="h-7 w-7" />;


// --- ADMIN COMPONENTS ---

const AlertModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant: 'success' | 'error';
}> = ({ isOpen, onClose, title, message, variant }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-full sm:max-w-md animate-scaleIn text-center border-4" style={{ borderColor: variant === 'success' ? '#86EFAC' : '#FCA5A5' }}>
                <div className="p-8">
                     <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full shadow-lg" style={{ backgroundColor: variant === 'success' ? '#D1FAE5' : '#FEE2E2' }}>
                        {variant === 'success' ? <SuccessAlertIcon /> : <ErrorIcon />}
                    </div>
                    <h2 className="mt-6 text-4xl font-bold text-gray-800">{title}</h2>
                    <p className="mt-4 text-gray-600 whitespace-pre-wrap text-lg leading-relaxed">{message}</p>
                </div>
                <div className="p-6 bg-gradient-to-t from-gray-50 to-white flex justify-center rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gradient-to-r from-pink-600 to-pink-700 text-white font-bold py-4 px-12 rounded-xl hover:from-pink-700 hover:to-pink-800 transition-all shadow-lg hover:shadow-xl"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    isLoading: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'primary', isLoading }) => {
    if (!isOpen) return null;

    const confirmButtonClasses = {
        primary: 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800',
        danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-full sm:max-w-md animate-scaleIn border-2 border-gray-200">
                <div className="p-8">
                    <h2 className="text-4xl font-bold text-gray-800">{title}</h2>
                    <p className="mt-4 text-gray-600 text-lg leading-relaxed">{message}</p>
                </div>
                <div className="p-6 bg-gradient-to-t from-gray-50 to-white flex justify-end gap-4 rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="bg-white border-2 border-gray-300 text-gray-700 font-bold py-4 px-6 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 shadow-sm hover:shadow"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 shadow-lg hover:shadow-xl ${confirmButtonClasses[variant]}`}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mx-auto"></div>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ViewHotelRegistrationModal: React.FC<{
    registration: HotelRegistration;
    onClose: () => void;
    onAddExtraServices: (reg: HotelRegistration) => void;
    onChangePhoto: (reg: HotelRegistration) => void;
}> = ({ registration, onClose, onAddExtraServices, onChangePhoto }) => {
    const buildWhatsAppLink = (phone: string) => {
        const digits = String(phone || '').replace(/\D/g, '');
        const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
        return withCountry ? `https://wa.me/${withCountry}` : '#';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10001] overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">Detalhes do Registro</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <CloseIcon />
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Informações do Pet</h4>
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center gap-2">
                                <img src={registration.pet_photo_url || "https://cdn-icons-png.flaticon.com/512/3009/3009489.png"} alt="Foto do Pet" className="w-24 h-24 rounded-full object-cover" />
                                <button
                                    onClick={() => onChangePhoto(registration)}
                                    className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors text-xs font-medium"
                                >
                                    Atualizar foto
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm flex-1">
                                <div><span className="font-semibold">Nome:</span> {registration.pet_name}</div>
                                <div><span className="font-semibold">Raça:</span> {registration.pet_breed || '—'}</div>
                                <div><span className="font-semibold">Idade:</span> {registration.pet_age || '—'}</div>
                                <div><span className="font-semibold">Sexo:</span> {registration.pet_sex || '—'}</div>
                                <div className="sm:col-span-2"><span className="font-semibold">Peso:</span> {registration.pet_weight ? PET_WEIGHT_OPTIONS[registration.pet_weight as PetWeight] : '—'}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Informações do Tutor</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div><span className="font-semibold">Nome:</span> {registration.tutor_name}</div>
                            <div className="flex items-center gap-2"><span className="font-semibold">Telefone:</span> <a href={buildWhatsAppLink(registration.tutor_phone || '')} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">{registration.tutor_phone || '—'}</a></div>
                            <div><span className="font-semibold">Email:</span> {registration.tutor_email || '—'}</div>
                            <div className="sm:col-span-2"><span className="font-semibold">Endereço:</span> {registration.tutor_address || '—'}</div>
                        </div>
                    </div>

                    {(registration.check_in_date || registration.check_out_date) && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Hospedagem</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {registration.check_in_date && <div><span className="font-semibold">Check-in:</span> {formatDateToBR(registration.check_in_date)} {String(registration.check_in_time ?? '').split(':').slice(0,2).join(':')}</div>}
                                {registration.check_out_date && <div><span className="font-semibold">Check-out:</span> {formatDateToBR(registration.check_out_date)} {String(registration.check_out_time ?? '').split(':').slice(0,2).join(':')}</div>}
                            </div>
                        </div>
                    )}

                    {registration.extra_services && (
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Serviços Extras</h4>
                            <div className="flex flex-wrap gap-2">
                                {registration.extra_services.pernoite && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Pernoite</span>
                                )}
                                {registration.extra_services.banho_tosa && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Banho & Tosa</span>
                                )}
                                {registration.extra_services.so_banho && (
                                    <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">Só banho</span>
                                )}
                                {registration.extra_services.adestrador && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Adestrador</span>
                                )}
                                {registration.extra_services.despesa_medica && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Despesa médica</span>
                                )}
                                {registration.extra_services.dia_extra && registration.extra_services.dia_extra > 0 && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">{registration.extra_services.dia_extra} dia{registration.extra_services.dia_extra > 1 ? 's' : ''} extra{registration.extra_services.dia_extra > 1 ? 's' : ''}</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Status</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div><span className="font-semibold">Aprovação:</span> {(registration.approval_status ?? 'pending') === 'approved' ? 'Aprovado' : (registration.approval_status ?? 'pending') === 'rejected' ? 'Rejeitado' : 'Em Análise'}</div>
                            <div><span className="font-semibold">Check-in:</span> {(registration.check_in_status ?? 'pending') === 'checked_in' ? 'Ativo' : (registration.check_in_status ?? 'pending') === 'checked_out' ? 'Finalizado' : 'Pendente'}</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Documentos</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div><span className="font-semibold">RG:</span> {registration.has_rg_document ? 'Sim' : 'Não'}</div>
                            <div><span className="font-semibold">Comprovante de residência:</span> {registration.has_residence_proof ? 'Sim' : 'Não'}</div>
                            <div><span className="font-semibold">Carteira de vacinação:</span> {registration.has_vaccination_card ? 'Sim' : 'Não'}</div>
                            <div><span className="font-semibold">Atestado veterinário:</span> {registration.has_vet_certificate ? 'Sim' : 'Não'}</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Financeiro</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div><span className="font-semibold">Total dos serviços:</span> R$ {(registration.total_services_price ?? 0).toFixed(2).replace('.', ',')}</div>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Informações Adicionais</h4>
                        <div className="text-sm">{registration.additional_info || '—'}</div>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={() => { onClose(); onAddExtraServices(registration); }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Adicionar Serviços Extras
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminLogin: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        } else {
            onLoginSuccess();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
             <header className="text-center mb-6">
                <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="h-20 w-20 mx-auto mb-2"/>
                <h1 className="font-brand text-5xl text-pink-800">Sandy's Pet Shop</h1>
                <p className="text-gray-600 text-lg">Admin Login</p>
            </header>
            <div className="w-full max-w-full sm:max-w-sm bg-white p-8 rounded-2xl shadow-lg">
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-base font-semibold text-gray-700">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500"/>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-base font-semibold text-gray-700">Senha</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-pink-500 focus:border-pink-500"/>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-3.5 px-6 border border-transparent rounded-md shadow-sm text-base font-semibold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400 min-h-[56px]">
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
};





const AddMonthlyClientView: React.FC<{ onBack: () => void; onSuccess: () => void; }> = ({ onBack, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const [formData, setFormData] = useState({ petName: '', ownerName: '', whatsapp: '', petBreed: '', ownerAddress: '', condominium: '' });
    const [serviceQuantities, setServiceQuantities] = useState<Record<string, number>>({});
    const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
    const [packagePrice, setPackagePrice] = useState(0);
    const [recurrence, setRecurrence] = useState<{ type: 'weekly' | 'bi-weekly' | 'monthly', day: number, time: number }>({ type: 'weekly', day: 1, time: 9 });
  
    const [serviceStartDate, setServiceStartDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const calculatePrice = () => {
            if (!selectedWeight) {
                setPackagePrice(0);
                return;
            }

            const prices = SERVICE_PRICES[selectedWeight];
            if (!prices) {
                setPackagePrice(0);
                return;
            }

            let newTotalPrice = 0;
            // Calculate main service prices
            for (const serviceKey in serviceQuantities) {
                const quantity = serviceQuantities[serviceKey];
                if (quantity > 0) {
                    let servicePrice = 0;
                    if (serviceKey === ServiceType.BATH_AND_GROOMING) {
                        // FIX: Explicitly cast to number to prevent type errors in arithmetic operations.
                        servicePrice = (prices[ServiceType.BATH] as number) + (prices[ServiceType.GROOMING_ONLY] as number);
                    } else if (serviceKey === ServiceType.BATH || serviceKey === ServiceType.GROOMING_ONLY) {
                        // FIX: Explicitly cast to Number to prevent type errors in arithmetic operations.
                        servicePrice = Number(prices[serviceKey as keyof typeof prices]);
                    } else if ([ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(serviceKey as ServiceType)) {
                         if (serviceKey === ServiceType.PET_MOBILE_BATH) {
                            servicePrice = prices[ServiceType.BATH];
                         } else if (serviceKey === ServiceType.PET_MOBILE_GROOMING_ONLY) {
                             servicePrice = prices[ServiceType.GROOMING_ONLY];
                         } else if (serviceKey === ServiceType.PET_MOBILE_BATH_AND_GROOMING) {
                             // FIX: Operator '+' cannot be applied to types 'unknown' and 'number'. Cast values to `number` to ensure type-safe addition.
                             servicePrice = Number(prices[ServiceType.BATH]) + Number(prices[ServiceType.GROOMING_ONLY]);
                         }
                    }
                    // Apply R$ 10 discount for each service in the monthly package
                    const discountedServicePrice = Math.max(0, servicePrice - 10);
                    // FIX: Explicitly cast `quantity` to a number to prevent type errors during arithmetic operations.
                    newTotalPrice += discountedServicePrice * Number(quantity);
                }
            }

            // Calculate addon prices
            let addonsPrice = 0;
            Object.keys(selectedAddons).forEach(addonId => {
                if (selectedAddons[addonId]) {
                    const addon = ADDON_SERVICES.find(a => a.id === addonId);
                    if (addon) addonsPrice += addon.price;
                }
            });

            setPackagePrice(newTotalPrice + addonsPrice);
        };
        calculatePrice();
    }, [serviceQuantities, selectedWeight, selectedAddons]);
    
    // Effect to reset incompatible addons when weight changes
    useEffect(() => {
        if (!selectedWeight) return;

        const newAddons = { ...selectedAddons };
        let addonsChanged = false;
        ADDON_SERVICES.forEach(addon => {
            if (selectedAddons[addon.id]) {
                const isExcluded = addon.excludesWeight?.includes(selectedWeight);
                const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight);
                if (isExcluded || requiresNotMet) {
                    newAddons[addon.id] = false;
                    addonsChanged = true;
                }
            }
        });
        if (addonsChanged) {
            setSelectedAddons(newAddons);
        }
    }, [selectedWeight]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'whatsapp' ? formatWhatsapp(value) : value }));
    };

    const handleQuantityChange = (service: ServiceType, change: number) => {
        setServiceQuantities(prev => {
            const currentQuantity = prev[service] || 0;
            const newQuantity = Math.max(0, currentQuantity + change);
            return { ...prev, [service]: newQuantity };
        });
    };
    
    const handleAddonToggle = (addonId: string) => {
        const newAddons = { ...selectedAddons };
        newAddons[addonId] = !newAddons[addonId];
        if (addonId === 'patacure1' && newAddons[addonId]) newAddons['patacure2'] = false;
        else if (addonId === 'patacure2' && newAddons[addonId]) newAddons['patacure1'] = false;
        setSelectedAddons(newAddons);
    };

// FIX: Ensure recurrence day and time are stored as numbers to prevent comparison/arithmetic errors.
    const handleRecurrenceChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setRecurrence(prev => ({...prev, [name]: name === 'type' ? value : Number(value)}));
    };
    
    const changeStep = (nextStep: number) => {
        setIsAnimating(true);
        setTimeout(() => {
          setStep(nextStep);
          setIsAnimating(false);
        }, 300);
    };

    const handleAlertClose = () => {
        const wasSuccess = alertInfo?.variant === 'success';
        setAlertInfo(null);
        if (wasSuccess) {
            onSuccess();
        }
    };
    
    const getPackageDetails = () => {
        const serviceLabels: string[] = [];
        let totalDuration = 0;

        Object.entries(serviceQuantities).forEach(([key, quantity]) => {
            // FIX: Cast quantity to a number to allow comparison.
            if (Number(quantity) > 0) {
                const service = SERVICES[key as ServiceType];
                serviceLabels.push(`${quantity}x ${service.label}`);
                // FIX: Explicitly cast to Number to prevent type errors in arithmetic operations.
                totalDuration += Number(service.duration) * Number(quantity);
            }
        });

        const addonLabels = ADDON_SERVICES
            .filter(addon => selectedAddons[addon.id])
            .map(addon => addon.label);

        const fullServiceString = serviceLabels.join(', ') + (addonLabels.length > 0 ? ` + ${addonLabels.join(', ')}` : '');
        
        return {
            serviceString: fullServiceString,
            duration: totalDuration,
            addonLabels: addonLabels,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Cast quantity to a number before reducing to prevent type errors.
        const selectedServicesCount = Object.values(serviceQuantities).reduce((sum: number, qty: number) => sum + Number(qty), 0);
        if (selectedServicesCount === 0 || !selectedWeight) {
            setAlertInfo({ title: 'Campos Incompletos', message: 'Por favor, selecione ao menos um serviço e o peso do pet.', variant: 'error' });
            return;
        }
        setIsSubmitting(true);

        // Recalculate price directly before submission to ensure it's not stale.
        let finalPrice = 0;
        if (selectedWeight) {
            const prices = SERVICE_PRICES[selectedWeight];
            if (prices) {
                let newTotalPrice = 0;
                // Calculate main service prices
                for (const serviceKey in serviceQuantities) {
                    const quantity = serviceQuantities[serviceKey];
                    if (quantity > 0) {
                        let servicePrice = 0;
                        if (serviceKey === ServiceType.BATH_AND_GROOMING) {
                            servicePrice = (prices[ServiceType.BATH] as number) + (prices[ServiceType.GROOMING_ONLY] as number);
                        } else if (serviceKey === ServiceType.BATH || serviceKey === ServiceType.GROOMING_ONLY) {
                            servicePrice = Number(prices[serviceKey as keyof typeof prices]);
                        } else if ([ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(serviceKey as ServiceType)) {
                             if (serviceKey === ServiceType.PET_MOBILE_BATH) servicePrice = prices[ServiceType.BATH];
                             else if (serviceKey === ServiceType.PET_MOBILE_GROOMING_ONLY) servicePrice = prices[ServiceType.GROOMING_ONLY];
                             else if (serviceKey === ServiceType.PET_MOBILE_BATH_AND_GROOMING) servicePrice = Number(prices[ServiceType.BATH]) + Number(prices[ServiceType.GROOMING_ONLY]);
                        }
                        // Apply R$ 10 discount for each service in the monthly package
                        const discountedServicePrice = Math.max(0, servicePrice - 10);
                        newTotalPrice += discountedServicePrice * Number(quantity);
                    }
                }
                // Calculate addon prices
                let addonsPrice = 0;
                Object.keys(selectedAddons).forEach(addonId => {
                    if (selectedAddons[addonId]) {
                        const addon = ADDON_SERVICES.find(a => a.id === addonId);
                        if (addon) addonsPrice += addon.price;
                    }
                });
                finalPrice = newTotalPrice + addonsPrice;
            }
        }

        try {
            const { data: allAppointments, error: fetchError } = await supabase.from('appointments').select('appointment_time');
            if (fetchError) throw new Error("Não foi possível verificar a agenda existente. Tente novamente.");

            const hourlyOccupation: Record<string, number> = {};
            allAppointments.forEach((appt: { appointment_time: string }) => {
                hourlyOccupation[new Date(appt.appointment_time).toISOString()] = (hourlyOccupation[new Date(appt.appointment_time).toISOString()] || 0) + 1;
            });

            const appointmentsToCreate: { appointment_time: string }[] = [];
            const { serviceString, addonLabels } = getPackageDetails();
            const recurrenceDay = parseInt(String(recurrence.day), 10);
            const recurrenceTime = parseInt(String(recurrence.time), 10);
            const now = new Date();
            
            // Use service start date as the reference date instead of current date
            const serviceStartDateObj = serviceStartDate ? parseISODateAsSaoPaulo(serviceStartDate) : new Date();

            if (recurrence.type === 'weekly' || recurrence.type === 'bi-weekly') {
                let firstDate = new Date(serviceStartDateObj);
                const startDateSaoPaulo = getSaoPauloTimeParts(firstDate);
                let firstDateDayOfWeek = startDateSaoPaulo.day === 0 ? 7 : startDateSaoPaulo.day;
                let daysToAdd = (recurrenceDay - firstDateDayOfWeek + 7) % 7;
                firstDate.setDate(firstDate.getDate() + daysToAdd);

                const intervalDays = recurrence.type === 'weekly' ? 7 : 14;
                const endLimit = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));

                let cursor = new Date(firstDate);
                while (cursor <= endLimit) {
                    const appointmentTime = toSaoPauloUTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), recurrenceTime);
                    appointmentsToCreate.push({ appointment_time: appointmentTime.toISOString() });
                    cursor.setDate(cursor.getDate() + intervalDays);
                }
            } else {
                const endLimit = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
                let cursor = new Date(serviceStartDateObj);
                const year = cursor.getFullYear();
                const month = cursor.getMonth();
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                const targetDay = Math.min(recurrenceDay, lastDayOfMonth);
                cursor.setDate(targetDay);
                if (cursor < serviceStartDateObj) cursor.setMonth(cursor.getMonth() + 1);
                while (cursor <= endLimit) {
                    const y = cursor.getFullYear();
                    const m = cursor.getMonth();
                    const ldm = new Date(y, m + 1, 0).getDate();
                    const day = Math.min(recurrenceDay, ldm);
                    const appointmentTime = toSaoPauloUTC(y, m, day, recurrenceTime);
                    appointmentsToCreate.push({ appointment_time: appointmentTime.toISOString() });
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }

            // No conflict checking - all appointments are allowed

            const { data: existingClient, error: checkError } = await supabase.from('clients').select('id').eq('phone', formData.whatsapp).limit(1).single();
            if (checkError && checkError.code !== 'PGRST116') throw new Error(`Erro ao verificar cliente: ${checkError.message}`);
            if (!existingClient) {
                const { error: insertError } = await supabase.from('clients').insert({ name: formData.ownerName, phone: formData.whatsapp });
                if (insertError) throw new Error(`Erro ao criar novo cliente: ${insertError.message}`);
            }
            
            const { data: newClient, error: clientError } = await supabase.from('monthly_clients').insert({
                pet_name: formData.petName, 
                pet_breed: formData.petBreed, 
                owner_name: formData.ownerName, 
                owner_address: formData.ownerAddress,
                whatsapp: formData.whatsapp, 
                service: serviceString, 
                weight: PET_WEIGHT_OPTIONS[selectedWeight!], 
                price: finalPrice,
                recurrence_type: recurrence.type,
                recurrence_day: recurrenceDay,
                recurrence_time: recurrenceTime,
                is_active: true,
                payment_status: 'Pendente',
                condominium: formData.condominium
            }).select().single();

            if (clientError || !newClient) throw new Error(clientError?.message || "Falha ao criar o cadastro do mensalista.");

            const primaryServiceOrder: ServiceType[] = [
                ServiceType.BATH_AND_GROOMING,
                ServiceType.BATH,
                ServiceType.GROOMING_ONLY,
                ServiceType.PET_MOBILE_BATH_AND_GROOMING,
                ServiceType.PET_MOBILE_BATH,
                ServiceType.PET_MOBILE_GROOMING_ONLY
            ];
            const primaryType = primaryServiceOrder.find(s => Number(serviceQuantities[s] || 0) > 0) || null;
            const unitPrice = getUnitPriceByType(selectedWeight!, primaryType || null) || finalPrice;
            const canonicalServiceLabel = primaryType ? SERVICES[primaryType].label : SERVICES[ServiceType.BATH].label;
            const { data: existingAppts } = await supabase
                .from('appointments')
                .select('appointment_time')
                .eq('monthly_client_id', newClient.id);
            const { data: existingPetMovelAppts } = await supabase
                .from('pet_movel_appointments')
                .select('appointment_time')
                .eq('monthly_client_id', newClient.id);

            const existingTimes = new Set<string>();
            (existingAppts || []).forEach((r: any) => {
                try { existingTimes.add(new Date(r.appointment_time).toISOString()); } catch {}
            });
            (existingPetMovelAppts || []).forEach((r: any) => {
                try { existingTimes.add(new Date(r.appointment_time).toISOString()); } catch {}
            });

            const supabasePayloads = appointmentsToCreate
                .filter(app => !existingTimes.has(app.appointment_time))
                .map(app => ({
                    owner_name: formData.ownerName,
                    pet_name: formData.petName,
                    service: canonicalServiceLabel,
                    appointment_time: app.appointment_time,
                    status: isPastSaoPauloDate(new Date(app.appointment_time)) ? 'CONCLUÍDO' : 'AGENDADO',
                    price: unitPrice,
                    whatsapp: formData.whatsapp,
                    pet_breed: formData.petBreed,
                    owner_address: formData.ownerAddress,
                    weight: PET_WEIGHT_OPTIONS[selectedWeight!],
                    condominium: formData.condominium,
                    monthly_client_id: newClient.id
                }));

            // Check if any of the selected services is a Pet Móvel service
            const isPetMovelService = Object.keys(serviceQuantities).some(serviceKey => 
                Number(serviceQuantities[serviceKey]) > 0 && 
                [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(serviceKey as ServiceType)
            );

            if (supabasePayloads.length > 0) {
                if (isPetMovelService) {
                    // For Pet Móvel services, create specific payloads for pet_movel_appointments
                    const petMovelPayloads = appointmentsToCreate
                        .filter(app => !existingTimes.has(app.appointment_time))
                        .map(app => ({
                            owner_name: formData.ownerName,
                            pet_name: formData.petName,
                            pet_breed: formData.petBreed,
                            service: canonicalServiceLabel,
                            appointment_time: app.appointment_time,
                            status: isPastSaoPauloDate(new Date(app.appointment_time)) ? 'CONCLUÍDO' : 'AGENDADO',
                            price: unitPrice,
                            whatsapp: formData.whatsapp,
                            owner_address: formData.ownerAddress,
                            weight: PET_WEIGHT_OPTIONS[selectedWeight!],
                            condominium: formData.condominium,
                            monthly_client_id: newClient.id
                        }));
                    
                    // Insert into BOTH tables with appropriate payloads
                    const [appointmentsResult, petMovelResult] = await Promise.all([
                        supabase.from('appointments').insert(supabasePayloads),
                        supabase.from('pet_movel_appointments').insert(petMovelPayloads)
                    ]);
                    
                    if (appointmentsResult.error || petMovelResult.error) {
                        const errorMsg = appointmentsResult.error?.message || petMovelResult.error?.message;
                        throw new Error(`Cadastro criado, mas erro ao gerar agendamentos: ${errorMsg}`);
                    }
                } else {
                    // For regular services, insert only into appointments table
                    const { error } = await supabase.from('appointments').insert(supabasePayloads);
                    if (error) throw new Error(`Cadastro criado, mas erro ao gerar agendamentos: ${error.message}`);
                }
                
                setAlertInfo({ title: 'Mensalista Cadastrado!', message: `Mensalista ${formData.petName} cadastrado com sucesso! ${supabasePayloads.length} agendamentos foram criados.`, variant: 'success' });
            } else {
                setAlertInfo({ title: 'Aviso', message: "Nenhum agendamento futuro pôde ser criado com as regras fornecidas.", variant: 'error' });
            }
        } catch (error: any) {
            setAlertInfo({ title: 'Erro na Operação', message: error.message, variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isStep1Valid = formData.petName && formData.ownerName && formData.whatsapp.length > 13 && formData.petBreed && formData.ownerAddress && formData.condominium;
    // FIX: Cast quantity to a number before checking if any service is selected.
    const isStep2Valid = Object.values(serviceQuantities).some(q => Number(q) > 0) && selectedWeight;

    return (
        <>
            {alertInfo && <AlertModal isOpen={true} onClose={handleAlertClose} title={alertInfo.title} message={alertInfo.message} variant={alertInfo.variant} />}
            <div className="w-full max-w-3xl mx-auto bg-rose-50 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
                 <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                        {['Dados', 'Serviços', 'Recorrência & Resumo'].map((name, index) => (
                            <div key={name} className={`flex items-center gap-3 ${step > index + 1 ? 'text-pink-600' : ''} ${step === index + 1 ? 'text-pink-600 font-bold' : ''}`}>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${step >= index + 1 ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {step > index + 1 ? '✓' : index + 1}
                                </div>
                                <span className="hidden sm:inline">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className={`relative p-6 sm:p-8 transition-all duration-300 ${isAnimating ? 'animate-slideOutToLeft' : 'animate-slideInFromRight'}`}>
                    {step === 1 && (
                         <div className="space-y-7">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">Informações do Pet e Dono</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label htmlFor="petName" className="block text-base font-semibold text-gray-700">Nome do Pet</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><PawIcon/></span><input type="text" name="petName" id="petName" value={formData.petName} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg"/></div></div>
                                <div><label htmlFor="petBreed" className="block text-base font-semibold text-gray-700">Raça do Pet</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><BreedIcon/></span><input type="text" name="petBreed" id="petBreed" value={formData.petBreed} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg"/></div></div>
                                <div><label htmlFor="ownerName" className="block text-base font-semibold text-gray-700">Nome do Dono</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon/></span><input type="text" name="ownerName" id="ownerName" value={formData.ownerName} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg"/></div></div>
                                <div><label htmlFor="whatsapp" className="block text-base font-semibold text-gray-700">WhatsApp</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><WhatsAppIcon/></span><input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" maxLength={15} className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg"/></div></div>
                                <div><label htmlFor="condominium" className="block text-base font-semibold text-gray-700">Condomínio</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><AddressIcon/></span>
                                    <select name="condominium" id="condominium" value={formData.condominium} onChange={handleInputChange} className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg">
                                        <option value="">Selecione um condomínio</option>
                                        <option value="Nenhum Condomínio">Banho & Tosa Fixo</option>
                                        <option value="Vitta Parque">Vitta Parque</option>
                                        <option value="Max Haus">Max Haus</option>
                                        <option value="Paseo">Paseo</option>
                                    </select>
                                </div></div>
                                <div className="md:col-span-2"><label htmlFor="ownerAddress" className="block text-base font-semibold text-gray-700">Endereço</label><div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><AddressIcon/></span><input type="text" name="ownerAddress" id="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg"/></div></div>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                         <div className="space-y-6">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">Escolha os Serviços do Pacote</h2>
                            <div>
                                <h3 className="text-md font-semibold text-gray-700 mb-2">1. Serviço(s)</h3>
                                <div className="space-y-3">
                                {Object.entries(SERVICES).filter(([key]) => [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_GROOMING_ONLY, ServiceType.PET_MOBILE_BATH_AND_GROOMING].includes(key as ServiceType)).map(([key, { label }]) => {
                                    const displayLabel = (key === ServiceType.PET_MOBILE_BATH)
                                        ? 'Banho'
                                        : (key === ServiceType.PET_MOBILE_BATH_AND_GROOMING)
                                            ? 'Banho & Tosa'
                                            : (key === ServiceType.PET_MOBILE_GROOMING_ONLY)
                                                ? 'Só Tosa'
                                                : label;
                                    return (
                                    <div key={key} className="flex items-center justify-between p-6 sm:p-5 rounded-lg bg-white border-2 border-gray-200">
                                        <span className="font-semibold text-gray-800">{displayLabel}</span>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => handleQuantityChange(key as ServiceType, -1)} className="w-8 h-8 rounded-full bg-gray-200 text-lg font-bold hover:bg-gray-300">-</button>
                                            <span className="w-10 text-center font-semibold text-lg">{serviceQuantities[key] || 0}</span>
                                            <button type="button" onClick={() => handleQuantityChange(key as ServiceType, 1)} className="w-8 h-8 rounded-full bg-pink-500 text-white text-lg font-bold hover:bg-pink-600">+</button>
                                        </div>
                                    </div>
                                );
                                })}
                                </div>
                            </div>
                             <div>
                                <label htmlFor="petWeight" className="block text-md font-semibold text-gray-700 mb-2">2. Peso do Pet</label>
                                <select id="petWeight" value={selectedWeight || ''} onChange={e => setSelectedWeight(e.target.value as PetWeight)} required className="block w-full py-3 px-3 bg-gray-50 border border-gray-300 rounded-lg">
                                    <option value="" disabled>Selecione o peso</option>
                                    {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (<option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>))}
                                </select>
                            </div>
                            <div>
                                <h3 className="text-md font-semibold text-gray-700 mb-2">3. Serviços Adicionais (Opcional)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    {ADDON_SERVICES.filter(a => a.id !== 'tosa_higienica').map(addon => {
                                        const isDisabled = !selectedWeight || Object.values(serviceQuantities).reduce((a, b) => Number(a) + Number(b), 0) === 0 || addon.excludesWeight?.includes(selectedWeight!) || (addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight!));
                                        return (
                                            <label key={addon.id} className={`flex items-center p-6 sm:p-5 rounded-lg border-2 transition-all ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer bg-white hover:bg-pink-50'} ${selectedAddons[addon.id] ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                                                <input type="checkbox" onChange={() => handleAddonToggle(addon.id)} checked={!!selectedAddons[addon.id]} disabled={isDisabled} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                                <span className="ml-2.5">{addon.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="w-full p-3 border rounded-lg bg-gray-100 flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Preço do Pacote Mensal:</span>
                                <span className="font-bold text-2xl text-gray-900">R$ {(packagePrice ?? 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">Recorrência e Resumo</h2>
                             <div className="p-4 bg-white rounded-lg border space-y-6">
                                <h3 className="font-semibold text-gray-700">Regra de Recorrência</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select name="type" onChange={handleRecurrenceChange} value={recurrence.type} className="w-full px-5 py-4 border rounded-lg bg-gray-50">
                                        <option value="weekly">Semanal (4x no mês)</option>
                                        <option value="bi-weekly">Quinzenal (2x no mês)</option>
                                        <option value="monthly">Mensal (1x no mês)</option>
                                    </select>
                                    {recurrence.type === 'weekly' || recurrence.type === 'bi-weekly' ? (
                                        <select name="day" onChange={handleRecurrenceChange} value={recurrence.day} className="w-full px-5 py-4 border rounded-lg bg-gray-50">
                                            <option value={1}>Segunda-feira</option><option value={2}>Terça-feira</option><option value={3}>Quarta-feira</option><option value={4}>Quinta-feira</option><option value={5}>Sexta-feira</option>
                                        </select>
                                    ) : (
                                        <input type="number" name="day" min="1" max="31" value={recurrence.day} onChange={handleRecurrenceChange} placeholder="Dia do mês" className="w-full px-5 py-4 border rounded-lg bg-gray-50"/>
                                    )}
                                </div>
                                <select name="time" onChange={handleRecurrenceChange} value={recurrence.time} className="w-full px-5 py-4 border rounded-lg bg-gray-50">
                                    {WORKING_HOURS.map(h => <option key={h} value={h}>{`${h}:00`}</option>)}
                                </select>
                                
                                <div>
                                    <DatePicker 
                                        value={serviceStartDate} 
                                        onChange={setServiceStartDate}
                                        label="Data de Início do Serviço"
                                        required
                                        className="mt-1" 
                                    />
                                </div>
                            </div>
                             <div className="p-4 bg-white rounded-lg space-y-2 text-gray-700 border">
                                <h3 className="font-semibold mb-2 text-gray-700">Resumo</h3>
                                <p><strong>Pet:</strong> {formData.petName} ({formData.petBreed})</p>
                                <p><strong>Responsável:</strong> {formData.ownerName}</p>
                                <p><strong>Serviços:</strong> {getPackageDetails().serviceString || 'Nenhum'}</p>
                                <p><strong>Peso:</strong> {selectedWeight ? PET_WEIGHT_OPTIONS[selectedWeight] : 'Nenhum'}</p>
                                <p className="mt-2 pt-2 border-t font-bold text-lg"><strong>Preço do Pacote: R$ {(packagePrice ?? 0).toFixed(2).replace('.', ',')}</strong></p>
                             </div>
                        </div>
                    )}
                    <div className="mt-8 flex justify-between items-center">
                        <button type="button" onClick={onBack} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-5 rounded-lg hover:bg-gray-300 transition-colors">{step === 1 ? 'Cancelar' : 'Voltar'}</button>
                        <div className="flex-grow"></div>
                        {step < 3 && <button type="button" onClick={() => changeStep(step + 1)} disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)} className="w-full md:w-auto bg-pink-600 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-pink-700 transition-colors disabled:bg-gray-300">Avançar</button>}
                        {step === 3 && <button type="submit" disabled={isSubmitting} className="w-full md:w-auto bg-green-500 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300">{isSubmitting ? 'Salvando...' : 'Salvar Mensalista'}</button>}
                    </div>
                </form>
            </div>
        </>
    );
};

interface StatisticsData {
    daily: {
        count: number;
        revenue: number;
        services: { [key: string]: number };
    };
    weekly: {
        count: number;
        revenue: number;
        services: { [key: string]: number };
    };
    monthly: {
        count: number;
        revenue: number;
        services: { [key: string]: number };
    };
}

const StatisticsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [statistics, setStatistics] = useState<StatisticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });

    const fetchStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const [ty, tm, td] = selectedDailyDate.split('-').map(Number);
            const todayDate = new Date(ty, tm - 1, td);
            const toISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const todayISO = toISO(todayDate);

            const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);
            const weekStartISO = toISO(weekStartDate);
            const weekEndISO = toISO(weekEndDate);

            const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const monthStartISO = toISO(monthStartDate);
            const monthEndISO = toISO(monthEndDate);

            // Buscar agendamentos concluídos de ambas as tabelas
            const [regularResult, petMovelResult] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('*')
                    .eq('status', 'CONCLUÍDO')
                    .order('appointment_time', { ascending: false }),
                supabase
                    .from('pet_movel_appointments')
                    .select('*')
                    .eq('status', 'CONCLUÍDO')
                    .order('appointment_time', { ascending: false })
            ]);

            if (regularResult.error || petMovelResult.error) {
                console.error('Erro ao buscar estatísticas:', regularResult.error || petMovelResult.error);
                return;
            }

            // Combinar agendamentos de ambas as tabelas
            const appointments = [...(regularResult.data || []), ...(petMovelResult.data || [])];

            const stats: StatisticsData = {
                daily: { count: 0, revenue: 0, services: {} },
                weekly: { count: 0, revenue: 0, services: {} },
                monthly: { count: 0, revenue: 0, services: {} }
            };

            appointments?.forEach(appointment => {
                const apptDateISO = String(appointment.appointment_time || '').split('T')[0];
                const price = appointment.price || 0;
                const service = appointment.service || 'Não especificado';

                if (apptDateISO === todayISO) {
                    stats.daily.count++;
                    stats.daily.revenue += price;
                    stats.daily.services[service] = (stats.daily.services[service] || 0) + 1;
                }

                if (apptDateISO >= weekStartISO && apptDateISO <= weekEndISO) {
                    stats.weekly.count++;
                    stats.weekly.revenue += price;
                    stats.weekly.services[service] = (stats.weekly.services[service] || 0) + 1;
                }

                if (apptDateISO >= monthStartISO && apptDateISO <= monthEndISO) {
                    stats.monthly.count++;
                    stats.monthly.revenue += price;
                    stats.monthly.services[service] = (stats.monthly.services[service] || 0) + 1;
                }
            });

            setStatistics(stats);
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDailyDate]);

    useEffect(() => {
        if (isOpen) {
            fetchStatistics();
        }
    }, [isOpen, fetchStatistics]);

    if (!isOpen) return null;

    const StatCard: React.FC<{ title: string; data: { count: number; revenue: number; services: { [key: string]: number } } }> = ({ title, data }) => (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 border-b pb-2">{title}</h3>
            <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600">Total de Serviços</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{data.count}</p>
                    </div>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600">Receita Total</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">
                            R$ {data.revenue.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                </div>
                {Object.keys(data.services).length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Serviços Realizados:</h4>
                        <div className="space-y-2">
                            {Object.entries(data.services).map(([service, count]) => (
                                <div key={service} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <span className="text-gray-700">{service}</span>
                                    <span className="font-semibold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[10001] p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">📊 Estatísticas de Serviços</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    {loading ? (
                        <div className="flex justify-center py-12 sm:py-16">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-pink-500"></div>
                        </div>
                    ) : statistics ? (
                        <div className="space-y-6 sm:space-y-8">
                            <div className="flex justify-end">
                                <div className="w-full sm:w-80">
                                    <DatePicker 
                                        value={selectedDailyDate}
                                        onChange={setSelectedDailyDate}
                                        label="Selecione o dia"
                                        className="mt-1"
                                        disableWeekends={false}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <StatCard title={`📅 Hoje (${formatDateToBR(selectedDailyDate)})`} data={statistics.daily} />
                                <StatCard title="📊 Esta Semana" data={statistics.weekly} />
                                <StatCard title="📈 Este Mês" data={statistics.monthly} />
                            </div>
                            
                            {(statistics.daily.count === 0 && statistics.weekly.count === 0 && statistics.monthly.count === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 text-lg">Nenhum serviço concluído encontrado para exibir estatísticas.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">Erro ao carregar estatísticas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente de Estatísticas para Mensalistas
const MonthlyClientsStatisticsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const selectedMonthLabel = useMemo(() => {
        const parts = selectedMonth.split('-');
        const y = parts[0] || '';
        const m = parts[1] || '';
        return `${m}/${y}`;
    }, [selectedMonth]);

    const [expandedCondos, setExpandedCondos] = useState<Record<string, boolean>>({});
    const toggleExpanded = (condo: string) => setExpandedCondos(prev => ({ ...prev, [condo]: !prev[condo] }));

    const fetchMonthlyClientsStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

            // Buscar todos os mensalistas
            const { data: monthlyClients, error: clientsError } = await supabase
                .from('monthly_clients')
                .select('*')
                .eq('is_active', true);

            if (clientsError) {
                console.error('Erro ao buscar mensalistas:', clientsError);
                return;
            }

            // Buscar agendamentos dos mensalistas no mês selecionado
            const { data: appointments, error: appointmentsError } = await supabase
                .from('pet_movel_appointments')
                .select('*')
                .gte('appointment_time', monthStart.toISOString())
                .lte('appointment_time', monthEnd.toISOString())
                .not('monthly_client_id', 'is', null);

            if (appointmentsError) {
                console.error('Erro ao buscar agendamentos:', appointmentsError);
                return;
            }

            // Filtrar mensalistas pelo mês de vencimento (payment_due_date) correspondente ao mês selecionado
            const selectedYearMonth = `${year}-${String(month).padStart(2, '0')}`;
            const monthlyClientsForMonth = (monthlyClients || []).filter((client: any) => {
                const dueDate: string | null = client.payment_due_date || null;
                if (!dueDate || typeof dueDate !== 'string') return false;
                // Comparar ano-mês sem depender de fuso horário
                return dueDate.slice(0, 7) === selectedYearMonth;
            });

            // Filtrar agendamentos para apenas os mensalistas do mês
            const clientIdsForMonth = new Set(monthlyClientsForMonth.map((c: any) => c.id));
            const appointmentsForMonthClients = (appointments || []).filter(apt => clientIdsForMonth.has(apt.monthly_client_id));

            const totalClients = monthlyClients.length;
            const totalAppointments = (appointments || []).length;
            const completedAppointments = (appointments || []).filter(apt => apt.status === 'CONCLUÍDO').length;
            const pendingAppointments = (appointments || []).filter(apt => apt.status === 'AGENDADO').length;
            
            // Calcular receita realizada (agendamentos concluídos)
            const realizedRevenue = appointmentsForMonthClients
                .filter(apt => apt.status === 'CONCLUÍDO')
                .reduce((sum, apt) => sum + (apt.price || 0), 0);

            const calculateMonthlyClientTotal = (client: any) => {
                let total = Number(client.price || 0);
                const ex: any = client.extra_services || {};
                if (ex.pernoite?.enabled) total += Number(ex.pernoite.value || 0);
                if (ex.banho_tosa?.enabled) total += Number(ex.banho_tosa.value || 0);
                if (ex.so_banho?.enabled) total += Number(ex.so_banho.value || 0);
                if (ex.adestrador?.enabled) total += Number(ex.adestrador.value || 0);
                if (ex.despesa_medica?.enabled) total += Number(ex.despesa_medica.value || 0);
                if ((ex.dias_extras?.quantity || 0) > 0) {
                    total += Number(ex.dias_extras.quantity) * Number(ex.dias_extras.value || 0);
                }
                return total;
            };
            const estimatedRevenue = (monthlyClientsForMonth || []).reduce((sum, client: any) => sum + calculateMonthlyClientTotal(client), 0);

            const allCondos = ['Vitta Parque', 'Paseo', 'Max Haus', 'Nenhum Condomínio'];
            const condominiumStats: { [key: string]: { clients: number; appointments: number; revenue: number; members: { pet: string; owner: string }[] } } = {};
            allCondos.forEach(c => { condominiumStats[c] = { clients: 0, appointments: 0, revenue: 0, members: [] }; });

            (monthlyClientsForMonth || []).forEach((client: any) => {
                const raw = client.condominium ? String(client.condominium).trim() : '';
                const condo = raw || 'Nenhum Condomínio';
                if (!condominiumStats[condo]) condominiumStats[condo] = { clients: 0, appointments: 0, revenue: 0, members: [] };
                condominiumStats[condo].clients++;
                condominiumStats[condo].revenue += calculateMonthlyClientTotal(client);
                condominiumStats[condo].members.push({ pet: String(client.pet_name || ''), owner: String(client.owner_name || '') });
            });

            appointmentsForMonthClients.forEach((apt: any) => {
                const client = (monthlyClientsForMonth || []).find((c: any) => c.id === apt.monthly_client_id);
                const raw = client?.condominium ? String(client.condominium).trim() : '';
                const condo = raw || 'Nenhum Condomínio';
                if (!condominiumStats[condo]) condominiumStats[condo] = { clients: 0, appointments: 0, revenue: 0, members: [] };
                condominiumStats[condo].appointments += 1;
            });

            const normalizePayment = (s: any) => {
                const raw = String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const clean = raw.replace(/[^a-z]/g, '');
                if (clean.includes('pago') || clean.includes('paid') || clean.includes('ok') || clean.includes('confirm') || clean.includes('concluido')) return 'Pago';
                if (clean.includes('pendente') || clean.includes('pending') || clean.includes('atrasado') || clean.includes('aberto')) return 'Pendente';
                return 'Pendente';
            };
            const paymentStats: { [key: string]: number } = {};
            let paidCount = 0;
            let pendingCount = 0;
            monthlyClientsForMonth.forEach((client: any) => {
                const canonical = normalizePayment(client.payment_status);
                paymentStats[canonical] = (paymentStats[canonical] || 0) + 1;
                if (canonical === 'Pago') paidCount++; else pendingCount++;
            });

            setStatistics({
                totalClients,
                totalAppointments,
                completedAppointments,
                pendingAppointments,
                realizedRevenue,
                estimatedRevenue,
                condominiumStats,
                paymentStats,
                paymentSummary: { paid: paidCount, pending: pendingCount },
                selectedMonth: `${month}/${year}`
            });
        } catch (error) {
            console.error('Erro ao calcular estatísticas dos mensalistas:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth]);

    useEffect(() => {
        if (isOpen) {
            fetchMonthlyClientsStatistics();
        }
    }, [isOpen, fetchMonthlyClientsStatistics]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[10001] p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">📊 Estatísticas dos Mensalistas</h2>
                        <div className="flex items-center gap-3">
                            <MonthPicker 
                                value={`${selectedMonth}-01`} 
                                onChange={(v) => setSelectedMonth(v.slice(0, 7))} 
                                placeholder="Selecione o mês"
                                className="max-w-[240px]"
                            />
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    {loading ? (
                        <div className="flex justify-center py-12 sm:py-16">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-green-500"></div>
                        </div>
                    ) : statistics ? (
                        <div className="space-y-6 sm:space-y-8">
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Resumo Geral</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                                    <div className="text-center">
                                        <h3 className="text-sm font-medium text-blue-600 mb-1">Total Geral Mensalistas</h3>
                                        <p className="text-2xl font-bold text-blue-700">{statistics.totalClients}</p>
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-sm font-medium text-green-600 mb-1">Receita Estimada</h3>
                                        <p className="text-2xl font-bold text-green-700">R$ {statistics.estimatedRevenue.toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    
                                </div>
                            </div>

                            {/* Estatísticas por Condomínio */}
                            {Object.keys(statistics.condominiumStats).length > 0 && (
                                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📍 Por Condomínio</h3>
                                    <div className="space-y-3">
                                    {Object.entries(statistics.condominiumStats).map(([condo, stats]: [string, any]) => (
                                        <div key={condo} className="bg-gray-50 rounded-lg">
                                            <button type="button" onClick={() => toggleExpanded(condo)} className="w-full flex justify-between items-center p-3">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{condo === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : condo}</p>
                                                    <p className="text-sm text-gray-600">{stats.clients} mensalistas</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-600">R$ {stats.revenue.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </button>
                                            {expandedCondos[condo] && (
                                                <div className="px-3 pb-3">
                                                    <ul className="bg-white border border-gray-200 rounded-lg divide-y">
                                                        {stats.members.map((m: any, idx: number) => (
                                                            <li key={idx} className="py-2 px-3 flex justify-between">
                                                                <span className="text-gray-800 font-medium">{m.pet}</span>
                                                                <span className="text-gray-600">{m.owner}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            )}

                            {Object.keys(statistics.paymentStats).length > 0 && (
                                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">💳 Status de Pagamento</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {Object.entries(statistics.paymentStats).map(([status, count]) => (
                                            <div key={status} className="bg-gray-50 p-3 rounded-lg text-center">
                                                <p className="text-sm text-gray-600">{status}</p>
                                                <p className="text-xl font-bold text-gray-800">{count}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">Erro ao carregar estatísticas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente de Estatísticas para Creche Pet
const DaycareStatisticsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showApproved, setShowApproved] = useState(true);

    const fetchDaycareStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            // Buscar matrículas da creche
            const { data: enrollments, error } = await supabase
                .from('daycare_enrollments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar estatísticas da creche:', error);
                return;
            }

            const stats = {
                daily: { count: 0, revenue: 0, plans: {} as { [key: string]: number }, items: [] as { pet_name: string; plan: string }[] },
                weekly: { count: 0, revenue: 0, plans: {} as { [key: string]: number }, items: [] as { pet_name: string; plan: string }[] },
                monthly: { count: 0, revenue: 0, plans: {} as { [key: string]: number }, items: [] as { pet_name: string; plan: string }[] },
                total: { 
                    approved: 0, 
                    pending: 0, 
                    rejected: 0,
                    totalRevenue: 0,
                    plans: {} as { [key: string]: number },
                    items: [] as { pet_name: string; plan: string }[]
                }
            };
            let monthlyApprovedCheckIns = 0;

            enrollments?.forEach(enrollment => {
                const enrollmentDate = new Date(enrollment.created_at);
                const price = enrollment.total_price || 0;
                const plan = enrollment.contracted_plan || 'Não especificado';
                const status = enrollment.status;

                // Criar data de fim do dia para comparação correta
                const endOfToday = new Date(today);
                endOfToday.setHours(23, 59, 59, 999);

                // Estatísticas totais por status
                if (status === 'Aprovado') {
                    stats.total.approved++;
                    stats.total.items.push({ pet_name: enrollment.pet_name, plan });
                }
                else if (status === 'Pendente') stats.total.pending++;
                else if (status === 'Rejeitado') stats.total.rejected++;

                stats.total.totalRevenue += price;
                stats.total.plans[plan] = (stats.total.plans[plan] || 0) + 1;

                // Estatísticas diárias - apenas matrículas de hoje
                if (enrollmentDate >= today && enrollmentDate <= endOfToday) {
                    stats.daily.count++;
                    stats.daily.revenue += price;
                    stats.daily.plans[plan] = (stats.daily.plans[plan] || 0) + 1;
                    stats.daily.items.push({ pet_name: enrollment.pet_name, plan });
                }

                // Estatísticas semanais - matrículas desta semana
                if (enrollmentDate >= weekStart) {
                    stats.weekly.count++;
                    stats.weekly.revenue += price;
                    stats.weekly.plans[plan] = (stats.weekly.plans[plan] || 0) + 1;
                    stats.weekly.items.push({ pet_name: enrollment.pet_name, plan });
                }

                // Estatísticas mensais - matrículas deste mês
                if (enrollmentDate >= monthStart) {
                    stats.monthly.revenue += price;
                    stats.monthly.plans[plan] = (stats.monthly.plans[plan] || 0) + 1;
                    stats.monthly.items.push({ pet_name: enrollment.pet_name, plan });
                }

                if (status === 'Aprovado') {
                    const cstr = (enrollment as any).check_in_date as string | null;
                    if (cstr) {
                        const cdate = new Date(cstr.split('T')[0]);
                        if (cdate.getFullYear() === now.getFullYear() && cdate.getMonth() === now.getMonth()) {
                            monthlyApprovedCheckIns++;
                        }
                    }
                }
            });

            stats.monthly.count = monthlyApprovedCheckIns;
            setStatistics(stats);
        } catch (error) {
            console.error('Erro ao calcular estatísticas da creche:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchDaycareStatistics();
        }
    }, [isOpen, fetchDaycareStatistics]);

    if (!isOpen) return null;

    const translatePlan = (code: string) => {
        if (planLabels[code]) return planLabels[code];
        const m = code.match(/^(\d+)x_(month|week)$/);
        if (m) {
            const qty = m[1];
            const unit = m[2] === 'month' ? 'MÊS' : 'SEMANA';
            return `${qty} X ${unit}`;
        }
        return code.replace(/_/g, ' ').replace(/month/i, 'MÊS').replace(/week/i, 'SEMANA').toUpperCase();
    };

    const DaycareStatCard: React.FC<{ title: string; data: { count: number; revenue: number; plans: { [key: string]: number }; items?: { pet_name: string; plan: string }[] } }> = ({ title, data }) => (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 border-b pb-2">{title}</h3>
            <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600">Total de Matrículas</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{data.count}</p>
                    </div>
                    <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                        <p className="text-xs sm:text-sm text-gray-600">Receita Total</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">
                            R$ {data.revenue.toFixed(2).replace('.', ',')}
                        </p>
                    </div>
                </div>
                {data.items && data.items.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Planos Contratados:</h4>
                        <div className="space-y-2">
                            {data.items.map((item, idx) => (
                                <div key={`${item.pet_name}-${idx}`} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <span className="text-gray-700">{item.pet_name}</span>
                                    <span className="font-semibold text-gray-900">{translatePlan(item.plan)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[10001] p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">🏫 Estatísticas da Creche Pet</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    {loading ? (
                        <div className="flex justify-center py-12 sm:py-16">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-500"></div>
                        </div>
                    ) : statistics ? (
                        <div className="space-y-6 sm:space-y-8">
                            {/* Estatísticas Gerais */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Resumo Geral</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">{statistics.total.approved}</p>
                                        <p className="text-sm text-gray-600">Aprovadas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-yellow-600">{statistics.total.pending}</p>
                                        <p className="text-sm text-gray-600">Pendentes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-red-600">{statistics.total.rejected}</p>
                                        <p className="text-sm text-gray-600">Rejeitadas</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg sm:text-xl font-bold text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">
                                            R$ {statistics.total.totalRevenue.toFixed(2).replace('.', ',')}
                                        </p>
                                        <p className="text-sm text-gray-600">Receita Total</p>
                                    </div>
                                </div>
                                {statistics.total.items && statistics.total.items.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-semibold text-gray-700">Reservas Aprovadas</h4>
                                            <button type="button" onClick={() => setShowApproved(s => !s)} className="p-1 rounded hover:bg-gray-100 text-gray-600" aria-expanded={showApproved} aria-controls="approved_reservations_list">
                                                {showApproved ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {showApproved && (
                                            <div id="approved_reservations_list" className="space-y-2">
                                                {statistics.total.items.map((item: { pet_name: string; plan: string }, idx: number) => (
                                                    <div key={`${item.pet_name}-${idx}`} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                        <span className="text-gray-700">{item.pet_name}</span>
                                                        <span className="font-semibold text-gray-900">{translatePlan(item.plan)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg sm:text-xl font-bold text-gray-800">Novas Matrículas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                <DaycareStatCard title="📅 Hoje" data={statistics.daily} />
                                <DaycareStatCard title="📊 Esta Semana" data={statistics.weekly} />
                                <DaycareStatCard title="📈 Este Mês" data={statistics.monthly} />
                            </div>
                            
                            {(statistics.daily.count === 0 && statistics.weekly.count === 0 && statistics.monthly.count === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 text-lg">Nenhuma matrícula encontrada para exibir estatísticas.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">Erro ao carregar estatísticas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Componente de Estatísticas para Hotel Pet
const HotelStatisticsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const [statistics, setStatistics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedMonthValue, setSelectedMonthValue] = useState<string>(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01`;
    });

    const fetchHotelStatistics = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const [selYearStr, selMonthStr] = selectedMonthValue.split('-');
            const selYear = Number(selYearStr);
            const selMonthIndex = Number(selMonthStr) - 1;
            const monthStart = new Date(selYear, selMonthIndex, 1);
            const nextMonthStart = new Date(selYear, selMonthIndex + 1, 1);

            // Buscar registros do hotel
            const { data: registrations, error } = await supabase
                .from('hotel_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar estatísticas do hotel:', error);
                return;
            }

            const stats = {
                daily: { count: 0, revenue: 0, services: {} as { [key: string]: number } },
                weekly: { count: 0, revenue: 0, services: {} as { [key: string]: number } },
                monthly: { count: 0, revenue: 0, services: {} as { [key: string]: number }, details: [] as { pet: string; tutor: string; total: number; extras: string[] }[] },
                total: { 
                    checkedIn: 0, 
                    checkedOut: 0, 
                    totalRevenue: 0,
                    services: {} as { [key: string]: number }
                }
            };

            registrations?.forEach(registration => {
                const registrationDate = new Date(registration.created_at);
                const price = calculateHotelInvoiceTotal(registration);
                const isCheckedIn = String(registration.check_in_status || '').toLowerCase() === 'checked_in';
                const normAppr = String(registration.approval_status || '').trim().toLowerCase();
                const isApproved = normAppr === 'approved' || normAppr === 'aprovado';

                // Criar data de fim do dia para comparação correta
                const endOfToday = new Date(today);
                endOfToday.setHours(23, 59, 59, 999);

                // Estatísticas totais por status
                if (isCheckedIn) stats.total.checkedIn++;
                else stats.total.checkedOut++;

                if (isApproved) stats.total.totalRevenue += price;

                // Contar serviços extras
                if (registration.extra_services) {
                    const services = registration.extra_services;
                    if (services.banho_tosa) {
                        stats.total.services['Banho e Tosa'] = (stats.total.services['Banho e Tosa'] || 0) + 1;
                    }
                    if (services.transporte) {
                        stats.total.services['Transporte'] = (stats.total.services['Transporte'] || 0) + 1;
                    }
                    if (services.veterinario) {
                        stats.total.services['Veterinário'] = (stats.total.services['Veterinário'] || 0) + 1;
                    }
                }

                // Estatísticas diárias - apenas registros de hoje
                if (registrationDate >= today && registrationDate <= endOfToday) {
                    stats.daily.count++;
                    stats.daily.revenue += price;
                    
                    if (registration.extra_services) {
                        const services = registration.extra_services;
                        if (services.banho_tosa) {
                            stats.daily.services['Banho e Tosa'] = (stats.daily.services['Banho e Tosa'] || 0) + 1;
                        }
                        if (services.transporte) {
                            stats.daily.services['Transporte'] = (stats.daily.services['Transporte'] || 0) + 1;
                        }
                        if (services.veterinario) {
                            stats.daily.services['Veterinário'] = (stats.daily.services['Veterinário'] || 0) + 1;
                        }
                    }
                }

                // Estatísticas semanais - registros desta semana
                if (registrationDate >= weekStart) {
                    stats.weekly.count++;
                    stats.weekly.revenue += price;
                    
                    if (registration.extra_services) {
                        const services = registration.extra_services;
                        if (services.banho_tosa) {
                            stats.weekly.services['Banho e Tosa'] = (stats.weekly.services['Banho e Tosa'] || 0) + 1;
                        }
                        if (services.transporte) {
                            stats.weekly.services['Transporte'] = (stats.weekly.services['Transporte'] || 0) + 1;
                        }
                        if (services.veterinario) {
                            stats.weekly.services['Veterinário'] = (stats.weekly.services['Veterinário'] || 0) + 1;
                        }
                    }
                }

                const isInApprovedSection = isApproved 
                    && String(registration.check_in_status || '').toLowerCase() !== 'checked_in' 
                    && String(registration.check_in_status || '').toLowerCase() !== 'checked_out'
                    && String(registration.status || '') !== 'Concluído';

                if (isInApprovedSection) {
                    stats.monthly.count++;
                    stats.monthly.revenue += price;
                    const extrasList: string[] = [];
                    const esAny: any = registration.extra_services || {};
                    if (esAny.banho_tosa?.enabled || esAny.banho_tosa === true) extrasList.push('Banho & Tosa');
                    if (esAny.so_banho?.enabled || esAny.so_banho === true) extrasList.push('Só banho');
                    if (esAny.adestrador?.enabled || esAny.adestrador === true) extrasList.push('Adestrador');
                    if (esAny.despesa_medica?.enabled || esAny.despesa_medica === true) extrasList.push('Despesa médica');
                    if (esAny.pernoite?.enabled || esAny.pernoite === true) extrasList.push('Pernoite');
                    const dx = esAny.dias_extras;
                    if (dx && ((typeof dx === 'object' && Number(dx.quantity) > 0) || dx === true)) extrasList.push('Dias extras');
                    stats.monthly.details.push({ pet: registration.pet_name, tutor: registration.tutor_name, total: price, extras: extrasList });
                    if (registration.extra_services) {
                        const es: any = registration.extra_services;
                        if (es.banho_tosa?.enabled || es.banho_tosa === true) {
                            stats.monthly.services['Banho & Tosa'] = (stats.monthly.services['Banho & Tosa'] || 0) + 1;
                        }
                        if (es.so_banho?.enabled || es.so_banho === true) {
                            stats.monthly.services['Só banho'] = (stats.monthly.services['Só banho'] || 0) + 1;
                        }
                        if (es.adestrador?.enabled || es.adestrador === true) {
                            stats.monthly.services['Adestrador'] = (stats.monthly.services['Adestrador'] || 0) + 1;
                        }
                        if (es.despesa_medica?.enabled || es.despesa_medica === true) {
                            stats.monthly.services['Despesa médica'] = (stats.monthly.services['Despesa médica'] || 0) + 1;
                        }
                        if (es.pernoite?.enabled || es.pernoite === true) {
                            stats.monthly.services['Pernoite'] = (stats.monthly.services['Pernoite'] || 0) + 1;
                        }
                    }
                }
            });

            setStatistics(stats);
        } catch (error) {
            console.error('Erro ao calcular estatísticas do hotel:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonthValue]);

    useEffect(() => {
        if (isOpen) {
            fetchHotelStatistics();
        }
    }, [isOpen, fetchHotelStatistics]);

    if (!isOpen) return null;

    const HotelStatCard: React.FC<{ title: string; data: { count: number; revenue: number; services: { [key: string]: number }; details?: { pet: string; tutor: string; total: number; extras: string[] }[] } }> = ({ title, data }) => (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-200">
            <div className="mb-3 sm:mb-4 border-b pb-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h3>
            </div>
            <div className="space-y-3 sm:space-y-4">
                {data.details && data.details.length > 0 ? (
                    <div className="space-y-2">
                        {data.details.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between bg-gray-50 p-3 rounded">
                                <div>
                                    <p className="font-semibold text-gray-800">{item.pet}</p>
                                    <p className="text-xs text-gray-600">Tutor: {item.tutor}</p>
                                    {item.extras.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.extras.map((ex, i) => (
                                                <span key={i} className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-700">{ex}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">Valor Total</p>
                                    <p className="text-lg font-bold text-gray-900">R$ {item.total.toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">Sem hospedagens aprovadas.</div>
                )}
                {Object.keys(data.services).length > 0 && (
                    <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Serviços Extras:</h4>
                        <div className="space-y-2">
                            {Object.entries(data.services).map(([service, count]) => (
                                <div key={service} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <span className="text-gray-700">{service}</span>
                                    <span className="font-semibold text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[10001] p-2 sm:p-4 animate-fadeIn">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">🏨 Estatísticas do Hotel Pet</h2>
                        <div className="flex items-center gap-3">
                            <MonthPicker 
                                value={selectedMonthValue} 
                                onChange={setSelectedMonthValue} 
                                placeholder="Selecione o mês"
                                className="max-w-[240px]"
                            />
                            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center">×</button>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 sm:p-6">
                    {loading ? (
                        <div className="flex justify-center py-12 sm:py-16">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
                        </div>
                    ) : statistics ? (
                        <div className="space-y-6 sm:space-y-8">
                            {/* Estatísticas Gerais */}
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Resumo Geral</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">{statistics.total.checkedIn}</p>
                                        <p className="text-sm text-gray-600">Check-ins Ativos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-blue-600">{statistics.monthly.count}</p>
                                        <p className="text-sm text-gray-600">Total de Hospedagens</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg sm:text-xl font-bold text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">R$ {statistics.monthly.revenue.toFixed(2).replace('.', ',')}</p>
                                        <p className="text-sm text-gray-600">Receita Total</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:gap-6">
                                <HotelStatCard title="📈 Este Mês" data={statistics.monthly} />
                            </div>
                            
                            {(statistics.daily.count === 0 && statistics.weekly.count === 0 && statistics.monthly.count === 0) && (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 text-lg">Nenhuma hospedagem encontrada para exibir estatísticas.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg">Erro ao carregar estatísticas.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditAppointmentModal: React.FC<{ appointment: AdminAppointment; onClose: () => void; onAppointmentUpdated: (updatedAppointment: AdminAppointment) => void; }> = ({ appointment, onClose, onAppointmentUpdated }) => {
    const [formData, setFormData] = useState<Omit<AdminAppointment, 'id' | 'addons' | 'appointment_time'>>(appointment);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const initialSaoPauloDate = getSaoPauloTimeParts(new Date(appointment.appointment_time));
    const [datePart, setDatePart] = useState(new Date(Date.UTC(initialSaoPauloDate.year, initialSaoPauloDate.month, initialSaoPauloDate.date)).toISOString().split('T')[0]);
    const [timePart, setTimePart] = useState(initialSaoPauloDate.hour);
    const visitDaycareLabel = SERVICES[ServiceType.VISIT_DAYCARE].label;
    const visitHotelLabel = SERVICES[ServiceType.VISIT_HOTEL].label;


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'whatsapp' ? formatWhatsapp(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const [year, month, day] = datePart.split('-').map(Number);
        const newAppointmentTime = toSaoPauloUTC(year, month - 1, day, timePart);

        const { pet_name, owner_name, whatsapp, service, weight, price, status } = formData;
        const normalizedService = service === 'Creche Pet' ? visitDaycareLabel : (service === 'Hotel Pet' ? visitHotelLabel : service);
        
        const updatePayload = {
            pet_name,
            owner_name,
            whatsapp,
            service: normalizedService,
            weight,
            price: Number(price),
            status,
            appointment_time: newAppointmentTime.toISOString(),
            // Preservar campos opcionais importantes se existirem
            ...(appointment.monthly_client_id && { monthly_client_id: appointment.monthly_client_id }),
            ...(appointment.owner_address && { owner_address: appointment.owner_address }),
            ...(appointment.pet_breed && { pet_breed: appointment.pet_breed }),
            ...(appointment.condominium && { condominium: appointment.condominium }),
            ...(appointment.extra_services && { extra_services: appointment.extra_services }),
        };

        const [appointmentsResult, petMovelResult] = await Promise.all([
            supabase
                .from('appointments')
                .update(updatePayload)
                .eq('id', appointment.id)
                .select(),
            supabase
                .from('pet_movel_appointments')
                .update(updatePayload)
                .eq('id', appointment.id)
                .select()
        ]);

        if (appointmentsResult.error && petMovelResult.error) {
            const msg = appointmentsResult.error?.message || petMovelResult.error?.message || 'Erro desconhecido';
            alert(`Falha ao atualizar o agendamento: ${msg}`);
            setIsSubmitting(false);
        } else {
            const updatedData = (Array.isArray(appointmentsResult.data) && appointmentsResult.data[0]) || (Array.isArray(petMovelResult.data) && petMovelResult.data[0]) || null;
            if (updatedData) {
                onAppointmentUpdated(updatedData as AdminAppointment);
            } else {
                alert('Nenhum registro foi atualizado.');
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[10001] p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scaleIn">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-3xl font-bold text-gray-800">Editar Agendamento</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><label className="font-semibold text-gray-600">Nome do Pet</label><input name="pet_name" value={formData.pet_name} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Nome do Dono</label><input name="owner_name" value={formData.owner_name} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">WhatsApp</label><input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Serviço</label><input name="service" value={formData.service} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Peso</label><input name="weight" value={formData.weight} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Preço (R$)</label><input type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><DatePicker value={datePart} onChange={setDatePart} label="Data" className="mt-1" /></div>
                        <div>
                            <label className="font-semibold text-gray-600">Hora</label>
                            <select value={timePart} onChange={e => setTimePart(Number(e.target.value))} className="w-full mt-1 px-5 py-4 border rounded-lg bg-white">
                                {( ['Creche Pet','Hotel Pet', visitDaycareLabel, visitHotelLabel].includes(formData.service) ? VISIT_WORKING_HOURS : WORKING_HOURS ).map(h => <option key={h} value={h}>{`${h}:00`}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                           <label className="font-semibold text-gray-600">Status</label>
                           <select name="status" value={formData.status} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg bg-white">
                              <option value="AGENDADO">Agendado</option>
                              <option value="CONCLUÍDO">Concluído</option>
                           </select>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:bg-gray-400">
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminAddAppointmentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onAppointmentCreated: (created: AdminAppointment) => void; 
}> = ({ isOpen, onClose, onAppointmentCreated }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ 
        petName: '', 
        ownerName: '', 
        whatsapp: '', 
        petBreed: '', 
        ownerAddress: '' 
    });
    const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
    const [serviceStepView, setServiceStepView] = useState<'main' | 'bath_groom' | 'pet_movel' | 'pet_movel_condo' | 'hotel_pet' | 'daycare_options' | 'hotel_options'>('main');
    const [selectedCondo, setSelectedCondo] = useState<string | null>(null);
    const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(null);
    const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
    const [totalPrice, setTotalPrice] = useState(0);
    // Initialize selectedDate with a smart default (today or tomorrow based on current time)
    const getInitialDate = () => {
        const now = new Date();
        const currentHour = now.getHours();
        // If it's after 6 PM, start with tomorrow, otherwise start with today
        if (currentHour >= 18) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        }
        return now;
    };

    const [selectedDate, setSelectedDate] = useState(getInitialDate());
    const [selectedTime, setSelectedTime] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allowedDays, setAllowedDays] = useState<number[] | undefined>(undefined);
    const [appointments, setAppointments] = useState<Appointment[]>([]);

    const isVisitService = useMemo(() => 
        selectedService === ServiceType.VISIT_DAYCARE || selectedService === ServiceType.VISIT_HOTEL,
        [selectedService]
    );
    
    const isPetMovel = useMemo(() => serviceStepView === 'pet_movel', [serviceStepView]);

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setFormData({ petName: '', ownerName: '', whatsapp: '', petBreed: '', ownerAddress: '' });
            setSelectedService(null);
            setServiceStepView('main');
            setSelectedCondo(null);
            setSelectedWeight(null);
            setSelectedAddons({});
            setTotalPrice(0);
            setSelectedDate(getInitialDate()); // Use smart initial date
            setSelectedTime(null);
            setIsSubmitting(false);
            setAllowedDays(undefined);
        }
    }, [isOpen]);

    // Fetch appointments for time slot validation
    useEffect(() => {
        const fetchAppointments = async () => {
            const { data: regularData, error: regularError } = await supabase
                .from('appointments')
                .select('*');

            if (regularError) {
                console.error('Error fetching appointments:', regularError);
                return;
            }

            const { data: petMovelData, error: petMovelError } = await supabase
                .from('pet_movel_appointments')
                .select('*');

            if (petMovelError) {
                console.error('Error fetching pet_movel_appointments:', petMovelError);
                return;
            }
            
                const combinedData = [...(regularData || []), ...(petMovelData || [])];

                if (combinedData.length > 0) {
                const allAppointments: Appointment[] = combinedData
                    .map((dbRecord: any) => {
                        const serviceKey = Object.keys(SERVICES).find(key => SERVICES[key as ServiceType].label === dbRecord.service) as ServiceType | undefined;
                        
                        if (!serviceKey) {
                            return null;
                        }
                
                        return {
                            id: dbRecord.id,
                            petName: dbRecord.pet_name,
                            ownerName: dbRecord.owner_name,
                            whatsapp: dbRecord.whatsapp,
                            service: serviceKey,
                            appointmentTime: new Date(dbRecord.appointment_time),
                        };
                    })
                    .filter(Boolean) as Appointment[];
                
                setAppointments(allAppointments);
            }
        };

        if (isOpen) {
            fetchAppointments();
        }
    }, [isOpen]);

    // Calendar day restrictions based on service type
    useEffect(() => {
        if (step === 3) {
            if (serviceStepView === 'bath_groom') {
                setAllowedDays([1, 2]); // Monday and Tuesday
            } else if (serviceStepView === 'pet_movel') {
                // Pet Móvel is now available on all days - no restrictions
                setAllowedDays(undefined);
            } else {
                setAllowedDays(undefined);
            }
        }
    }, [step, serviceStepView, selectedCondo]);

    // Ensure initial selected date is the next allowed (Mon/Tue), never today
    useEffect(() => {
        if (step === 3 && serviceStepView === 'bath_groom' && allowedDays && allowedDays.length > 0) {
            const now = new Date();
            const next = new Date(now);
            next.setDate(next.getDate() + 1);
            for (let i = 0; i < 31; i++) {
                const probe = new Date(next);
                probe.setDate(next.getDate() + i);
                const { day } = getSaoPauloTimeParts(probe);
                if (allowedDays.includes(day)) {
                    setSelectedDate(probe);
                    break;
                }
            }
        }
    }, [step, serviceStepView, allowedDays]);

    // Reset selected time when date or service changes
    useEffect(() => { 
        setSelectedTime(null); 
    }, [selectedDate, selectedService]);

    // Calculate total price
    useEffect(() => {
        if (isVisitService) {
            setTotalPrice(0);
            return;
        }
        
        if (!selectedService || !selectedWeight) {
            setTotalPrice(0);
            return;
        }

        let basePrice = 0;
        
        const isRegularService = [ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING].includes(selectedService);
        const isMobileService = [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService);

        if (isRegularService || isMobileService) {
            const prices = SERVICE_PRICES[selectedWeight];
            if (prices) {
                if (selectedService === ServiceType.BATH || selectedService === ServiceType.PET_MOBILE_BATH) {
                    basePrice = prices[ServiceType.BATH] ?? 0;
                } else if (selectedService === ServiceType.GROOMING_ONLY || selectedService === ServiceType.PET_MOBILE_GROOMING_ONLY) {
                    basePrice = prices[ServiceType.GROOMING_ONLY] ?? 0;
                } else if (selectedService === ServiceType.BATH_AND_GROOMING || selectedService === ServiceType.PET_MOBILE_BATH_AND_GROOMING) {
                    basePrice = (prices[ServiceType.BATH] ?? 0) + (prices[ServiceType.GROOMING_ONLY] ?? 0);
                }
            }
        }
        
        let addonsPrice = 0;
        Object.keys(selectedAddons).forEach(addonId => {
            if (selectedAddons[addonId]) {
                const addon = ADDON_SERVICES.find(a => a.id === addonId);
                if (addon) addonsPrice += addon.price;
            }
        });
        setTotalPrice(basePrice + addonsPrice);
    }, [selectedService, selectedWeight, selectedAddons, isVisitService]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'whatsapp' ? formatWhatsapp(value) : value }));
    };

    const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newWeight = e.target.value as PetWeight;
        setSelectedWeight(newWeight);
        const newAddons = {...selectedAddons};
        ADDON_SERVICES.forEach(addon => {
            if (selectedAddons[addon.id]) {
                const isExcluded = addon.excludesWeight?.includes(newWeight);
                const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(newWeight);
                if(isExcluded || requiresNotMet) newAddons[addon.id] = false;
            }
        });
        setSelectedAddons(newAddons);
    };

    const handleAddonToggle = (addonId: string) => {
        const newAddons = { ...selectedAddons };
        newAddons[addonId] = !newAddons[addonId];
        if (addonId === 'patacure1' && newAddons[addonId]) newAddons['patacure2'] = false;
        else if (addonId === 'patacure2' && newAddons[addonId]) newAddons['patacure1'] = false;
        setSelectedAddons(newAddons);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedService || !selectedTime) return;
        setIsSubmitting(true);
        
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();
    const appointmentTime = toSaoPauloUTC(year, month, day, selectedTime);

    const isPetMovelSubmit = !!selectedCondo;
    // All appointments go to the same table
    const targetTable = 'appointments';
    
    // Capacity check com regra: Banho considera 1 slot consumido por Banho & Tosa do horário anterior
    try {
        if (selectedService === ServiceType.BATH) {
            const { data: bathAtHour, error: bathErr } = await supabase
                .from(targetTable)
                .select('id')
                .eq('appointment_time', appointmentTime.toISOString())
                .eq('service', SERVICES[ServiceType.BATH].label);
            if (bathErr) throw bathErr;
            const prevHourTime = toSaoPauloUTC(year, month, day, selectedTime - 1);
            const { data: bathGroomPrev, error: bgErr } = await supabase
                .from(targetTable)
                .select('id')
                .eq('appointment_time', prevHourTime.toISOString())
                .eq('service', SERVICES[ServiceType.BATH_AND_GROOMING].label);
            if (bgErr) throw bgErr;
            const total = (Array.isArray(bathAtHour) ? bathAtHour.length : 0) + (Array.isArray(bathGroomPrev) ? bathGroomPrev.length : 0);
            if (total >= MAX_CAPACITY_PER_SLOT) {
                alert('Este horário está completo para Banho. Selecione outro horário.');
                setIsSubmitting(false);
                return;
            }
        } else if (selectedService === ServiceType.BATH_AND_GROOMING) {
            const { data: bgtAtHour, error: bgtErr } = await supabase
                .from(targetTable)
                .select('id')
                .eq('appointment_time', appointmentTime.toISOString())
                .eq('service', SERVICES[ServiceType.BATH_AND_GROOMING].label);
            if (bgtErr) throw bgtErr;
            const count = Array.isArray(bgtAtHour) ? bgtAtHour.length : 0;
            if (count >= MAX_CAPACITY_PER_SLOT) {
                alert('Este horário está completo para Banho & Tosa. Selecione outro horário.');
                setIsSubmitting(false);
                return;
            }
        } else {
            const { data: existingAtTime, error: countError } = await supabase
                .from(targetTable)
                .select('id')
                .eq('appointment_time', appointmentTime.toISOString())
                .eq('service', SERVICES[selectedService].label);
            if (countError) throw countError;
            const count = Array.isArray(existingAtTime) ? existingAtTime.length : 0;
            if (count >= MAX_CAPACITY_PER_SLOT) {
                alert('Este horário está completo. Selecione outro horário.');
                setIsSubmitting(false);
                return;
            }
        }
    } catch (err) {
        console.error('Erro ao validar capacidade do horário:', err);
        alert('Não foi possível validar a disponibilidade deste horário. Tente outro horário.');
        setIsSubmitting(false);
        return;
    }
    if (isPetMovelSubmit) {
        try {
            const { data: monthlyBathAtTime, error: mbErr } = await supabase
                .from('appointments')
                .select('id')
                .eq('appointment_time', appointmentTime.toISOString())
                .eq('service', SERVICES[ServiceType.BATH].label)
                .not('monthly_client_id', 'is', null);
            if (mbErr) throw mbErr;
            const mbCount = Array.isArray(monthlyBathAtTime) ? monthlyBathAtTime.length : 0;
            if (mbCount > 0) {
                alert('Horário indisponível para Pet Móvel devido a mensalistas de banho. Selecione outro horário.');
                setIsSubmitting(false);
                return;
            }
        } catch (error) {
            console.error('Erro ao verificar mensalistas de banho:', error);
            alert('Não foi possível verificar disponibilidade por mensalistas. Tente outro horário.');
            setIsSubmitting(false);
            return;
        }
    }

        const basePayload = {
            appointment_time: appointmentTime.toISOString(),
            pet_name: formData.petName,
            pet_breed: formData.petBreed,
            owner_name: formData.ownerName,
            whatsapp: formData.whatsapp,
            service: SERVICES[selectedService].label,
            weight: isVisitService ? 'N/A' : (selectedWeight ? PET_WEIGHT_OPTIONS[selectedWeight] : 'N/A'),
            addons: isVisitService ? [] : ADDON_SERVICES.filter(addon => selectedAddons[addon.id]).map(addon => addon.label),
            price: totalPrice,
            status: 'AGENDADO'
        };
        
        // Always include owner_address and condominium fields (they can be null for regular services)
        const supabasePayload = {
            ...basePayload, 
            owner_address: formData.ownerAddress || null,
            condominium: selectedCondo || null
        };

        try {
            // No conflict checking - all appointments are allowed
            const { data: newDbAppointment, error: supabaseError } = await supabase.from(targetTable).insert([supabasePayload]).select().single();
            if (supabaseError) throw supabaseError;

            // Auto-register client if not exists
            try {
                const { data: existingClient } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('phone', supabasePayload.whatsapp)
                    .limit(1)
                    .single();

                if (!existingClient) {
                    const { error: clientInsertError } = await supabase
                        .from('clients')
                        .insert({ 
                            name: supabasePayload.owner_name, 
                            phone: supabasePayload.whatsapp 
                        });
                    if (clientInsertError) {
                        console.error('Failed to auto-register client:', clientInsertError.message);
                    }
                }
            } catch (error) {
                console.error('An error occurred during client auto-registration:', error);
            }
            
            // Send webhook notification
            try {
                // Choose webhook based on whether this is a Pet Móvel submission
                const webhookUrl = isPetMovelSubmit
                    ? 'https://n8n.intelektus.tech/webhook/petMovelAgendado'
                    : 'https://n8n.intelektus.tech/webhook/servicoAgendado';
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(supabasePayload),
                });

                if (!response.ok) {
                    throw new Error(`Webhook (${webhookUrl.includes('petMovelAgendado') ? 'petMovelAgendado' : 'servicoAgendado'}) failed with status ${response.status}`);
                }
            } catch (webhookError) {
                console.error('Error sending new appointment webhook:', webhookError);
            }

            // Build AdminAppointment from inserted record and notify parent
            const createdAdminAppointment: AdminAppointment = {
                id: newDbAppointment.id,
                appointment_time: newDbAppointment.appointment_time,
                pet_name: newDbAppointment.pet_name,
                owner_name: newDbAppointment.owner_name,
                service: newDbAppointment.service,
                status: newDbAppointment.status,
                price: Number(newDbAppointment.price || 0),
                addons: Array.isArray(newDbAppointment.addons) ? newDbAppointment.addons : [],
                whatsapp: newDbAppointment.whatsapp,
                weight: newDbAppointment.weight,
                monthly_client_id: newDbAppointment.monthly_client_id,
                owner_address: newDbAppointment.owner_address,
                pet_breed: newDbAppointment.pet_breed,
                condominium: newDbAppointment.condominium,
                extra_services: newDbAppointment.extra_services,
            };
            onAppointmentCreated(createdAdminAppointment);
            onClose();
        } catch (error: any) {
            console.error("Error submitting appointment:", error);
            alert(error.message || 'Não foi possível concluir o agendamento. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isStep1Valid = formData.petName && formData.ownerName && formData.whatsapp.length > 13 && formData.petBreed && formData.ownerAddress;
    const isStep2Valid = serviceStepView !== 'main' && selectedService && (isVisitService || selectedWeight);
    const isStep3Valid = selectedTime !== null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10001]">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Adicionar Agendamento</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center space-x-4">
                            {[1, 2, 3].map((stepNumber) => (
                                <div key={stepNumber} className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        step >= stepNumber ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {stepNumber}
                                    </div>
                                    {stepNumber < 3 && (
                                        <div className={`w-12 h-1 mx-2 ${
                                            step > stepNumber ? 'bg-pink-600' : 'bg-gray-200'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Step 1: Pet and Owner Information */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações do Pet e Tutor</h3>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Pet</label>
                                    <input
                                        type="text"
                                        name="petName"
                                        value={formData.petName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Raça do Pet</label>
                                    <input
                                        type="text"
                                        name="petBreed"
                                        value={formData.petBreed}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Tutor</label>
                                    <input
                                        type="text"
                                        name="ownerName"
                                        value={formData.ownerName}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                                    <input
                                        type="tel"
                                        name="whatsapp"
                                        value={formData.whatsapp}
                                        onChange={handleInputChange}
                                        placeholder="(11) 99999-9999"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                    <input
                                        type="text"
                                        name="ownerAddress"
                                        value={formData.ownerAddress}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        disabled={!isStep1Valid}
                                        className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Service Selection */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Seleção de Serviço</h3>
                                
                                {serviceStepView === 'main' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setServiceStepView('bath_groom')}
                                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 transition-colors text-left"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <BathTosaIcon />
                                                <div>
                                                    <h4 className="font-medium text-gray-800">Banho & Tosa</h4>
                                                    <p className="text-sm text-gray-600">Serviços de higiene e estética</p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setServiceStepView('pet_movel')}
                                            className="p-4 border-2 border-gray-200 rounded-lg hover:border-pink-500 transition-colors text-left"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <PetMovelIcon />
                                                <div>
                                                    <h4 className="font-medium text-gray-800">Pet Móvel</h4>
                                                    <p className="text-sm text-gray-600">Atendimento em condomínios</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {serviceStepView === 'bath_groom' && (
                                    <div className="space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => setServiceStepView('main')}
                                            className="flex items-center text-pink-600 hover:text-pink-700 mb-4"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                                            Voltar
                                        </button>

                                        <div className="space-y-3">
                                            {[ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING, ServiceType.VISIT_DAYCARE, ServiceType.VISIT_HOTEL].map((service) => (
                                                <label key={service} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="service"
                                                        value={service}
                                                        checked={selectedService === service}
                                                        onChange={(e) => setSelectedService(e.target.value as ServiceType)}
                                                        className="text-pink-600 focus:ring-pink-500"
                                                    />
                                                    <span className="text-gray-800">{SERVICES[service].label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {selectedService && !isVisitService && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Porte do Pet</label>
                                                <select
                                                    value={selectedWeight || ''}
                                                    onChange={handleWeightChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                    required
                                                >
                                                    <option value="">Selecione o porte</option>
                                                    {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {selectedService && selectedWeight && !isVisitService && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Serviços Adicionais</h4>
                                                <div className="space-y-2">
                                                    {ADDON_SERVICES.filter(addon => {
                                                        const isExcluded = addon.excludesWeight?.includes(selectedWeight);
                                                        const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight);
                                                        return !isExcluded && !requiresNotMet;
                                                    }).map((addon) => (
                                                        <label key={addon.id} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedAddons[addon.id] || false}
                                                                onChange={() => handleAddonToggle(addon.id)}
                                                                className="text-pink-600 focus:ring-pink-500"
                                                            />
                                                            <span className="flex-1 text-gray-800">{addon.label}</span>
                                                            <span className="text-pink-600 font-medium">R$ {addon.price.toFixed(2)}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {totalPrice > 0 && (
                                            <div className="bg-pink-50 p-4 rounded-lg">
                                                <div className="text-lg font-semibold text-pink-800">
                                                    Total: R$ {(totalPrice ?? 0).toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {serviceStepView === 'pet_movel' && (
                                    <div className="space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => setServiceStepView('main')}
                                            className="flex items-center text-pink-600 hover:text-pink-700 mb-4"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4 mr-1" />
                                            Voltar
                                        </button>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
                                            <select
                                                value={selectedCondo || ''}
                                                onChange={(e) => setSelectedCondo(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                required
                                            >
                                                <option value="">Selecione o condomínio</option>
                                                <option value="Vitta Parque">Vitta Parque</option>
                                                <option value="Max Haus">Max Haus</option>
                                                <option value="Paseo">Paseo</option>
                                            </select>
                                        </div>

                                        {selectedCondo && (
                                            <div className="space-y-3">
                                                {[ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_GROOMING_ONLY, ServiceType.PET_MOBILE_BATH_AND_GROOMING].map((service) => (
                                                    <label key={service} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="service"
                                                            value={service}
                                                            checked={selectedService === service}
                                                            onChange={(e) => setSelectedService(e.target.value as ServiceType)}
                                                            className="text-pink-600 focus:ring-pink-500"
                                                        />
                                                        <span className="text-gray-800">{SERVICES[service].label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {selectedService && selectedCondo && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Porte do Pet</label>
                                                <select
                                                    value={selectedWeight || ''}
                                                    onChange={handleWeightChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                                    required
                                                >
                                                    <option value="">Selecione o porte</option>
                                                    {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {selectedService && selectedWeight && selectedCondo && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Serviços Adicionais</h4>
                                                <div className="space-y-2">
                                                    {ADDON_SERVICES.filter(addon => {
                                                        const isExcluded = addon.excludesWeight?.includes(selectedWeight);
                                                        const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight);
                                                        return !isExcluded && !requiresNotMet;
                                                    }).map((addon) => (
                                                        <label key={addon.id} className="flex items-center space-x-3 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedAddons[addon.id] || false}
                                                                onChange={() => handleAddonToggle(addon.id)}
                                                                className="text-pink-600 focus:ring-pink-500"
                                                            />
                                                            <span className="flex-1 text-gray-800">{addon.label}</span>
                                                            <span className="text-pink-600 font-medium">R$ {addon.price.toFixed(2)}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {totalPrice > 0 && (
                                            <div className="bg-pink-50 p-4 rounded-lg">
                                                <div className="text-lg font-semibold text-pink-800">
                                                    Total: R$ {(totalPrice ?? 0).toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        disabled={!isStep2Valid}
                                        className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Próximo
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Date and Time Selection */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Data e Horário</h3>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Data do Agendamento</label>
                                    <Calendar
                                        selectedDate={selectedDate}
                                        onDateChange={setSelectedDate}
                                        disablePast={true}
                                        disableWeekends={true}
                                        allowedDays={allowedDays}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Horário</label>
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  selectedService={selectedService}
                  appointments={appointments}
                  onTimeSelect={setSelectedTime}
                  selectedTime={selectedTime}
                  workingHours={isVisitService ? VISIT_WORKING_HOURS : WORKING_HOURS}
                  isPetMovel={isPetMovel}
                  allowedDays={allowedDays}
                  selectedCondo={selectedCondo}
                  disablePastTimes={false}
                />
                                </div>

                                <div className="flex justify-between pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        Anterior
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isStep3Valid || isSubmitting}
                                        className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                                    >
                                        {isSubmitting && <LoadingSpinner />}
                                        <span>{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};


{/* FIX: Changed the `status` prop type from `string` to the specific union type to match the `AdminAppointment` interface. */}
const AppointmentCard: React.FC<{ 
    appointment: AdminAppointment; 
    onUpdateStatus: (id: string, status: 'AGENDADO' | 'CONCLUÍDO') => void; 
    isUpdating: boolean; 
    onEdit: (appointment: AdminAppointment) => void; 
    onDelete: (appointment: AdminAppointment) => void; 
    isDeleting: boolean; 
    onOpenActionMenu: (appointment: AdminAppointment, event: React.MouseEvent) => void;
    onDeleteObservation: (appointment: AdminAppointment) => void;
}> = ({ appointment, onUpdateStatus, isUpdating, onEdit, onDelete, isDeleting, onOpenActionMenu, onDeleteObservation }) => {
    const { id, appointment_time, pet_name, owner_name, service, status, price, addons, whatsapp, monthly_client_id, observation } = appointment;
    const isCompleted = status === 'CONCLUÍDO';
    const rawPhone = String(whatsapp || '');
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const phoneWithCountry = phoneDigits ? (phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`) : '';
    const whatsappHref = phoneWithCountry ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}` : '#';
    
    // Calcular total de serviços extras do agendamento (soma ao preço exibido)
    const es: any = (appointment as any).extra_services || null;
    const extrasTotal: number = (() => {
        if (!es) return 0;
        let total = 0;
        if (es.pernoite?.enabled) total += Number(es.pernoite.value || 0);
        if (es.banho_tosa?.enabled) total += Number(es.banho_tosa.value || 0);
        if (es.so_banho?.enabled) total += Number(es.so_banho.value || 0);
        if (es.adestrador?.enabled) total += Number(es.adestrador.value || 0);
        if (es.despesa_medica?.enabled) total += Number(es.despesa_medica.value || 0);
        if (es.dias_extras?.quantity > 0) total += Number(es.dias_extras.quantity) * Number(es.dias_extras.value || 0);
        return total;
    })();
    const hasExtras: boolean = Boolean(
        es && (
            es.pernoite?.enabled ||
            es.banho_tosa?.enabled ||
            es.so_banho?.enabled ||
            es.adestrador?.enabled ||
            es.despesa_medica?.enabled ||
            (es.dias_extras?.quantity > 0)
        )
    );
    const monthlyDiscount = monthly_client_id ? 10 : 0;
    const displayPrice: number = Math.max(0, Number(price || 0) - monthlyDiscount) + extrasTotal;
    
    const statusStyles: Record<string, string> = {
        'AGENDADO': 'bg-blue-100 text-blue-800',
        'CONCLUÍDO': 'bg-green-100 text-green-800',
        'pending': 'bg-blue-100 text-blue-800',
    };

    return (
        <div className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${isDeleting ? 'opacity-40 animate-pulse' : 'transform hover:scale-[1.02]'}`}>
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center text-sm font-semibold text-pink-600">
                            <ClockIcon />
                            <span>
                                {new Date(appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}, {new Date(appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                            </span>
                        </div>
                        <p className="mt-1 text-3xl font-bold text-gray-900">{pet_name}</p>
                        <p className="text-base text-gray-600">Dono(a): {owner_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
                            {status === 'pending' ? 'AGENDADO' : status}
                        </div>
                         {monthly_client_id && (
                            <div className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                                Mensalista
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between text-base text-gray-700">
                        <div className="flex items-center">
                            <TagIcon />
                            <span className="font-semibold mr-2">Serviço:</span> {service}
                        </div>
                        {((service === 'Creche Pet' || service === 'Hotel Pet') && !monthly_client_id) && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                🏠 Visita
                            </span>
                        )}
                    </div>
                    {addons && addons.length > 0 && 
                        <div className="text-xs text-gray-500 mt-1 ml-6">
                           + {addons.join(', ')}
                        </div>
                    }
                     <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-base text-gray-700 mt-2 hover:text-green-700"
                        aria-label="Conversar no WhatsApp"
                    >
                        <WhatsAppIcon />
                        <span className="font-semibold mr-2 ml-1.5">Contato:</span>
                        <span className="text-green-600 ml-1 underline">{whatsapp}</span>
                    </a>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <p className="text-2xl font-bold text-gray-800">R$ {displayPrice.toFixed(2).replace('.', ',')}
                        {hasExtras && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700" title="Serviços extras adicionados">(i)</span>
                        )}
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => onOpenActionMenu(appointment, e)}
                            disabled={isUpdating || isDeleting}
                            className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Mais ações"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                         <button 
                            onClick={() => onEdit(appointment)}
                            disabled={isUpdating || isDeleting}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Editar agendamento"
                        >
                            <EditIcon />
                        </button>

                        <button 
                            onClick={() => onDelete(appointment)}
                            disabled={isUpdating || isDeleting}
                            className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Excluir agendamento"
                        >
                            <DeleteIcon />
                        </button>
                        <button 
                            onClick={() => onUpdateStatus(id, 'CONCLUÍDO')}
                            disabled={isCompleted || isUpdating || isDeleting}
                            className={`p-2 rounded-full text-white transition-colors duration-200 disabled:cursor-not-allowed ${
                                isCompleted ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
                            }`}
                            aria-label="Concluir serviço"
                        >
                            {isUpdating && !isDeleting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <CheckCircleIcon/>}
                        </button>
                    </div>
                </div>
                {observation && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-600 flex-1">
                                <strong className="text-gray-800">Observação:</strong> {observation}
                            </p>
                            <button 
                                onClick={() => onDeleteObservation(appointment)}
                                disabled={isUpdating || isDeleting}
                                className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Excluir observação"
                            >
                                <DeleteIcon />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// FIX: Define the missing Calendar component
const Calendar: React.FC<{
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    disablePast?: boolean;
    disableWeekends?: boolean;
    allowedDays?: number[];
    disabledDates?: string[];
  }> = ({ selectedDate, onDateChange, disablePast = false, disableWeekends = true, allowedDays, disabledDates }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  
    useEffect(() => {
      // Sync currentMonth with selectedDate if selectedDate's month changes from outside
      if (selectedDate.getMonth() !== currentMonth.getMonth() || selectedDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      }
    }, [selectedDate]);
  
    const changeMonth = (offset: number) => {
      const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
      if (disablePast) {
        const today = new Date();
        const firstAllowedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        if (next < firstAllowedMonth) {
          setCurrentMonth(firstAllowedMonth);
          return;
        }
      }
      setCurrentMonth(next);
    };
  
    const renderDays = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, ...
  
      const days = [];
      for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="p-2 w-10 h-10"></div>);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const { day: dayOfWeek } = getSaoPauloTimeParts(date);
        const isSelected = isSameSaoPauloDay(date, selectedDate);
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);
        const candidateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const isPastLocal = candidateLocal < todayLocal;
        const sp = getSaoPauloTimeParts(date);
        const y = String(sp.year);
        const m = String(sp.month + 1).padStart(2, '0');
        const d = String(sp.date).padStart(2, '0');
        const ymd = `${y}-${m}-${d}`;
        const isDisabled = (disablePast && (isPastSaoPauloDate(date) || isPastLocal)) ||
                          (disableWeekends && isSaoPauloWeekend(date)) ||
                          (allowedDays && !allowedDays.includes(dayOfWeek)) ||
                          (!!disabledDates && disabledDates.includes(ymd));
  
        days.push(
          <button
            key={day}
            type="button"
            onClick={() => {
              if (isDisabled) {
                if (!!disabledDates && disabledDates.includes(ymd)) {
                  alert('Atendimento Indisponível');
                }
                return;
              }
              onDateChange(date);
            }}
            className={`p-2 w-10 h-10 rounded-full text-center transition-colors flex items-center justify-center
              ${isSelected ? 'bg-pink-300 text-black font-bold border border-pink-600' : 'hover:bg-pink-100'}
              ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700'}
            `}
          >
            {day}
          </button>
        );
      }
      return days;
    };
  
    return (
      <div className="w-full max-w-full sm:max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-4 px-2">
          <button type="button" onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon /></button>
          <h3 className="font-semibold text-lg capitalize">
            {currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
        </div>
        <div className="grid grid-cols-7 gap-3 text-center text-base text-gray-500 mb-2 font-semibold">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-3 place-items-center">
          {renderDays()}
        </div>
      </div>
    );
  };

// DatePicker Component - Minimalist date picker with Calendar integration
const DatePicker: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
    disablePast?: boolean;
    disableWeekends?: boolean;
    allowedDays?: number[];
    disabledDates?: string[];
}> = ({ 
    value, 
    onChange, 
    label, 
    placeholder = "Selecione uma data", 
    required = false, 
    className = "", 
    disablePast = false,
    disableWeekends = true,
    allowedDays,
    disabledDates
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (value) {
            const [year, month, day] = value.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date();
    });

    // Sync selectedDate when value prop changes
    useEffect(() => {
        if (value) {
            const [year, month, day] = value.split('-').map(Number);
            setSelectedDate(new Date(year, month - 1, day));
        }
    }, [value]);

    const handleDateChange = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        onChange(dateString);
        setSelectedDate(date);
        setIsOpen(false);
    };

    const displayValue = value ? formatDateToBR(value) : '';

    return (
        <div className="relative">
            {label && (
                <label className="block text-base font-semibold text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={displayValue}
                    placeholder={placeholder}
                    readOnly
                    required={required}
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-5 py-4 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${className}`}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>
            
            {isOpen && (
                <div className="absolute z-[10001] top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[90vw] left-0 right-0 mx-auto">
                    <Calendar
                        selectedDate={selectedDate}
                        onDateChange={handleDateChange}
                        disablePast={disablePast}
                        disableWeekends={disableWeekends}
                        allowedDays={allowedDays}
                        disabledDates={disabledDates}
                    />
                    <div className="flex justify-between mt-4 pt-3 border-t">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                handleDateChange(today);
                            }}
                            className="px-4 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700"
                        >
                            Hoje
                        </button>
                    </div>
                </div>
            )}
            
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[9998] bg-black bg-opacity-10" 
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

const MonthPicker: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, label, placeholder = "Selecione o mês", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLDivElement | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const initialDate = (() => {
        if (value) {
            const [year, month] = value.split('-').map(Number);
            return new Date(year, month - 1, 1);
        }
        return new Date();
    })();
    const [displayYear, setDisplayYear] = useState(initialDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());

    useEffect(() => {
        if (value) {
            const [year, month] = value.split('-').map(Number);
            setDisplayYear(year);
            setSelectedMonth(month - 1);
        }
    }, [value]);

    useEffect(() => {
        const updatePosition = () => {
            if (!inputRef.current) return;
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
        };
        if (isOpen) {
            updatePosition();
            const handler = () => updatePosition();
            window.addEventListener('resize', handler);
            window.addEventListener('scroll', handler, true);
            return () => {
                window.removeEventListener('resize', handler);
                window.removeEventListener('scroll', handler, true);
            };
        }
    }, [isOpen]);

    const monthNames = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

    const handleSelectMonth = (monthIndex: number) => {
        const y = displayYear;
        const m = String(monthIndex + 1).padStart(2, '0');
        const newVal = `${y}-${m}-01`;
        setSelectedMonth(monthIndex);
        onChange(newVal);
        setIsOpen(false);
    };

    const formattedValue = (() => {
        if (!value) return '';
        const [y, m] = value.split('-');
        const idx = Number(m) - 1;
        const name = monthNames[idx];
        return `${name} de ${y}`;
    })();

    return (
        <div className="relative">
            {label && (
                <label className="block text-base font-semibold text-gray-700 mb-1">{label}</label>
            )}
            <div className="relative" ref={inputRef}>
                <input
                    type="text"
                    value={formattedValue}
                    placeholder={placeholder}
                    readOnly
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-5 py-4 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors ${className}`}
                />
            </div>
            {isOpen && createPortal(
                <div
                    className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[320px] max-w-[90vw]"
                    style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, transform: 'translateX(-50%)', zIndex: 10001 }}
                >
                    <div className="w-full max-w-full sm:max-w-sm mx-auto">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <button type="button" className="p-2 rounded-full hover:bg-gray-100" onClick={() => setDisplayYear(displayYear - 1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <h3 className="font-semibold text-lg capitalize">{displayYear}</h3>
                            <button type="button" className="p-2 rounded-full hover:bg-gray-100" onClick={() => setDisplayYear(displayYear + 1)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 place-items-center">
                            {monthNames.map((name, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectMonth(idx)}
                                    className={`px-3 py-2 rounded-full text-center transition-colors flex items-center justify-center ${selectedMonth === idx ? 'bg-pink-300 text-black font-bold border border-pink-600' : 'hover:bg-pink-100 text-gray-700'}`}
                                >
                                    {name.charAt(0).toUpperCase() + name.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between mt-4 pt-3 border-t">
                        <button type="button" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" onClick={() => setIsOpen(false)}>Cancelar</button>
                        <button
                            type="button"
                            className="px-4 py-2 text-sm bg-pink-600 text-white rounded hover:bg-pink-700"
                            onClick={() => {
                                const d = new Date();
                                setDisplayYear(d.getFullYear());
                                handleSelectMonth(d.getMonth());
                            }}
                        >
                            Este mês
                        </button>
                    </div>
                </div>,
                document.body
            )}
            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9998] bg-black bg-opacity-10" onClick={() => setIsOpen(false)} />, document.body
            )}
        </div>
    );
};

// --- ADMIN DASHBOARD VIEWS ---

interface AppointmentsViewProps {
  refreshKey?: number;
  onAddObservation: (appointment: AdminAppointment) => void;
  appointments: AdminAppointment[];
  setAppointments: React.Dispatch<React.SetStateAction<AdminAppointment[]>>;
  onOpenActionMenu: (appointment: AdminAppointment, event: React.MouseEvent) => void;
  onDeleteObservation: (appointment: AdminAppointment) => void;
}

const AppointmentsView: React.FC<AppointmentsViewProps> = ({ refreshKey, onAddObservation, appointments, setAppointments, onOpenActionMenu, onDeleteObservation }) => {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdminDate, setSelectedAdminDate] = useState(new Date());
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [adminView, setAdminView] = useState<'daily' | 'all'>('daily');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<AdminAppointment | null>(null);
    const [appointmentToDelete, setAppointmentToDelete] = useState<AdminAppointment | null>(null);
    const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
    const [isCloseDayModalOpen, setIsCloseDayModalOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(true);
    const [closeDaysMonth, setCloseDaysMonth] = useState<string>(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}-01`;
    });
    const [selectedCloseDays, setSelectedCloseDays] = useState<Set<string>>(new Set());
    const [applyBathGroom, setApplyBathGroom] = useState(true);
    const [applyPetMovel, setApplyPetMovel] = useState(true);

    useEffect(() => {
        // A busca de agendamentos agora é feita no componente App
        // e os dados são passados via props.
        // Apenas definimos o loading como false aqui.
        setLoading(false);
    }, [refreshKey, appointments]);

    // FIX: Changed `newStatus` type from `string` to the specific union type to match `AdminAppointment['status']`.
    const handleUpdateStatus = async (id: string, newStatus: 'AGENDADO' | 'CONCLUÍDO') => {
        const appointmentToUpdate = appointments.find(app => app.id === id);
        if (!appointmentToUpdate) return;
        setUpdatingStatusId(id);
        
        // Try to update in both tables since we don't know which table the appointment is in
        const [appointmentsResult, petMovelResult] = await Promise.all([
            supabase.from('appointments').update({ status: newStatus }).eq('id', id),
            supabase.from('pet_movel_appointments').update({ status: newStatus }).eq('id', id)
        ]);

        // Check if at least one update was successful
        const hasError = appointmentsResult.error && petMovelResult.error;
        
        if (hasError) {
            console.error('Error updating in appointments:', appointmentsResult.error);
            console.error('Error updating in pet_movel_appointments:', petMovelResult.error);
            alert('Falha ao atualizar o status.');
        } else {
            const updatedAppointment = { ...appointmentToUpdate, status: newStatus };
            setAppointments(prev => prev.map(app => app.id === id ? updatedAppointment : app));
            if (newStatus === 'CONCLUÍDO') {
                // Dispara webhook específico quando for uma visita (Creche ou Hotel)
            const visitLabels = [
            SERVICES[ServiceType.VISIT_DAYCARE].label,
            SERVICES[ServiceType.VISIT_HOTEL].label,
            ];
            // Só considera visita quando não for mensalista
            const isVisit = visitLabels.includes(appointmentToUpdate.service) && !appointmentToUpdate.monthly_client_id;
                const url = isVisit
                    ? 'https://n8n.intelektus.tech/webhook/visitaRealizada'
                    : 'https://n8n.intelektus.tech/webhook/servicoConcluido';
                try {
                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...updatedAppointment,
                            message: isVisit ? 'Visita Realizada' : 'Serviço Concluído',
                            isVisit,
                        }),
                    });
                } catch (webhookError) {
                    console.error('Error sending webhook:', webhookError);
                }
            }
        }
        setUpdatingStatusId(null);
    };
    
    const handleOpenEditModal = (appointment: AdminAppointment) => { setEditingAppointment(appointment); setIsEditModalOpen(true); };
    const handleCloseEditModal = () => { setEditingAppointment(null); setIsEditModalOpen(false); };
    const handleAppointmentUpdated = (updatedAppointment: AdminAppointment) => {
        setAppointments(prev => prev.map(app => app.id === updatedAppointment.id ? updatedAppointment : app));
        try {
            const sp = getSaoPauloTimeParts(new Date(updatedAppointment.appointment_time));
            const nextSelected = new Date(Date.UTC(sp.year, sp.month, sp.date));
            setSelectedAdminDate(nextSelected);
        } catch {}
        handleCloseEditModal();
    };
    const handleOpenAddModal = () => {
        setIsAddModalOpen(true);
    };
    const handleCloseAddModal = () => setIsAddModalOpen(false);
    const handleAppointmentCreated = (created: AdminAppointment) => {
        setAppointments(prev => [created, ...prev]);
        handleCloseAddModal();
    };
    const handleRequestDelete = (appointment: AdminAppointment) => setAppointmentToDelete(appointment);
    const handleConfirmDelete = async () => {
        if (!appointmentToDelete) return;
        setDeletingAppointmentId(appointmentToDelete.id);
        
        // Try to delete from both tables since we don't know which table the appointment is in
        const [appointmentsResult, petMovelResult] = await Promise.all([
            supabase.from('appointments').delete().eq('id', appointmentToDelete.id),
            supabase.from('pet_movel_appointments').delete().eq('id', appointmentToDelete.id)
        ]);
        
        // Check if at least one deletion was successful
        const hasError = appointmentsResult.error && petMovelResult.error;
        
        if (hasError) {
            console.error('Error deleting from appointments:', appointmentsResult.error);
            console.error('Error deleting from pet_movel_appointments:', petMovelResult.error);
            alert('Falha ao excluir o agendamento.');
        } else {
            setAppointments(prev => prev.filter(app => app.id !== appointmentToDelete.id));
        }
        
        setDeletingAppointmentId(null);
        setAppointmentToDelete(null);
    };

    const handleToggleAdminView = () => {
        if (adminView === 'daily') {
            setAdminView('all');
        } else {
            setAdminView('daily');
            setShowCalendar(true);
        }
    };

    const filteredAppointments = useMemo(() => {
        if (!searchTerm) return appointments;
        return appointments.filter(app =>
            app.pet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.service.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [appointments, searchTerm]);
    
    const dailyAppointments = useMemo(() => filteredAppointments.filter(app => isSameSaoPauloDay(new Date(app.appointment_time), selectedAdminDate)).sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()), [filteredAppointments, selectedAdminDate]);
    const dailyScheduled = useMemo(() => dailyAppointments.filter(a => String(a.status) === 'AGENDADO' || String(a.status) === 'pending'), [dailyAppointments]);
    const dailyCompleted = useMemo(() => dailyAppointments.filter(a => a.status === 'CONCLUÍDO'), [dailyAppointments]);
    
    const { upcomingAppointments, pastAppointments } = useMemo(() => {
        if (adminView !== 'all') return { upcomingAppointments: [], pastAppointments: [] };
        const today = new Date(); 
        const upcoming: AdminAppointment[] = []; const past: AdminAppointment[] = [];
        filteredAppointments.forEach(app => {
            if (new Date(app.appointment_time) >= today) upcoming.push(app); else past.push(app);
        });
        upcoming.sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
        return { upcomingAppointments: upcoming, pastAppointments: past };
    }, [filteredAppointments, adminView]);

    const renderAppointments = (apps: AdminAppointment[]) => apps.map(app => <AppointmentCard key={app.id} appointment={app} onUpdateStatus={handleUpdateStatus} isUpdating={updatingStatusId === app.id} onEdit={handleOpenEditModal} onDelete={handleRequestDelete} isDeleting={deletingAppointmentId === app.id} onOpenActionMenu={onOpenActionMenu} onDeleteObservation={onDeleteObservation} />);

    return (
        <>
            {isEditModalOpen && editingAppointment && <EditAppointmentModal appointment={editingAppointment} onClose={handleCloseEditModal} onAppointmentUpdated={handleAppointmentUpdated} />}
            {isAddModalOpen && <AdminAddAppointmentModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onAppointmentCreated={handleAppointmentCreated} />}
            {appointmentToDelete && <ConfirmationModal isOpen={!!appointmentToDelete} onClose={() => setAppointmentToDelete(null)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o agendamento para ${appointmentToDelete.pet_name}?`} confirmText="Excluir" variant="danger" isLoading={deletingAppointmentId === appointmentToDelete.id} />}
            <StatisticsModal isOpen={isStatisticsModalOpen} onClose={() => setIsStatisticsModalOpen(false)} />
            {isCloseDayModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scaleIn">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">Fechar Agenda do Dia</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <MonthPicker value={closeDaysMonth} onChange={setCloseDaysMonth} label="Mês" />
                            <div className="grid grid-cols-7 gap-3 place-items-center">
                                {(() => {
                                    const [yStr, mStr] = closeDaysMonth.split('-');
                                    const y = Number(yStr);
                                    const m = Number(mStr) - 1;
                                    const firstDay = new Date(y, m, 1).getDay();
                                    const daysInMonth = new Date(y, m + 1, 0).getDate();
                                    const cells: React.ReactNode[] = [];
                                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="p-2 w-10 h-10" />);
                                    for (let d = 1; d <= daysInMonth; d++) {
                                        const dateStr = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`;
                                        const isSelected = selectedCloseDays.has(dateStr);
                                        cells.push(
                                            <button
                                                key={dateStr}
                                                type="button"
                                                onClick={() => {
                                                    const next = new Set(selectedCloseDays);
                                                    if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
                                                    setSelectedCloseDays(next);
                                                }}
                                                className={`p-2 w-10 h-10 rounded-full text-center transition-colors flex items-center justify-center ${isSelected ? 'bg-pink-300 text-black font-bold border border-pink-600' : 'hover:bg-pink-100 text-gray-700'}`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    }
                                    return cells;
                                })()}
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2"><input type="checkbox" checked={applyBathGroom} onChange={(e) => setApplyBathGroom(e.target.checked)} className="h-4 w-4" /> <span>Banho & Tosa</span></label>
                                <label className="flex items-center gap-2"><input type="checkbox" checked={applyPetMovel} onChange={(e) => setApplyPetMovel(e.target.checked)} className="h-4 w-4" /> <span>Pet Móvel</span></label>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end items-center gap-2">
                            <button type="button" onClick={() => setIsCloseDayModalOpen(false)} className="inline-flex items-center justify-center h-10 w-1/2 sm:min-w-[140px] sm:w-auto rounded-lg text-sm font-bold whitespace-nowrap bg-gray-200 text-gray-800 hover:bg-gray-300">Cancelar</button>
                            <button
                                    type="button"
                                    onClick={async () => {
                                        const rows: any[] = [];
                                        selectedCloseDays.forEach((d) => {
                                            if (applyBathGroom) rows.push({ date: d, service: 'BATH_GROOM' });
                                            if (applyPetMovel) rows.push({ date: d, service: 'PET_MOVEL' });
                                        });
                                        if (rows.length === 0) { setIsCloseDayModalOpen(false); return; }
                                        try {
                                            const { error } = await supabase.from('disabled_dates').upsert(rows, { onConflict: 'date,service' });
                                            if (!error) {
                                                setIsCloseDayModalOpen(false);
                                                setSelectedCloseDays(new Set());
                                            } else {
                                                alert('Falha ao salvar dias fechados.');
                                            }
                                        } catch (_e) {
                                            alert('Falha ao salvar dias fechados.');
                                        }
                                    }}
                                    className="inline-flex items-center justify-center h-10 w-1/2 sm:min-w-[140px] sm:w-auto rounded-lg text-sm font-bold whitespace-nowrap bg-pink-600 text-white hover:bg-pink-700"
                                >
                                    Salvar
                                </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Banho & Tosa</h2>
                        <p className="text-sm text-gray-600 text-center">Agenda Banho & Tosa - Pet Móvel - Mensalistas</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button onClick={handleOpenAddModal} title="Adicionar Agendamento" className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none">
                            <img alt="Adicionar Agendamento" className="h-6 w-6" src="https://i.imgur.com/ZimMFxY.png" />
                        </button>
                        <button onClick={() => setIsStatisticsModalOpen(true)} title="Estatísticas" className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                        <button onClick={() => setIsCloseDayModalOpen(true)} title="Bloquear Dias" className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none">
                            <img
                                alt="Bloquear Dias"
                                className="h-6 w-6"
                                src="https://i.imgur.com/BaVdolX.png"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/16253/16253757.png'; }}
                            />
                        </button>
                    <button onClick={handleToggleAdminView} title={adminView === 'daily' ? 'Ver Todos' : 'Ver Calendário'} className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none">
                        <img alt="Ver Todos" className="h-6 w-6" src="https://i.imgur.com/y2cVM07.png" onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://i.imgur.com/iexNNE5.png'; }} />
                    </button>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="relative">
                        <input type="text" placeholder="Buscar por pet, dono ou serviço..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    </div>
                </div>
                {searchTerm.trim() && (
                    <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-3 max-h-[50vh] overflow-y-auto">
                        {filteredAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {filteredAppointments.slice(0,5).map(app => (
                                    <div key={app.id} className="w-full">
                                        <AppointmentCard 
                                            appointment={app} 
                                            onUpdateStatus={handleUpdateStatus} 
                                            isUpdating={updatingStatusId === app.id} 
                                            onEdit={handleOpenEditModal} 
                                            onDelete={handleRequestDelete} 
                                            isDeleting={deletingAppointmentId === app.id}
                                            onOpenActionMenu={onOpenActionMenu}
                                            onDeleteObservation={onDeleteObservation}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-gray-500">Nenhum resultado encontrado</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {!searchTerm.trim() && (loading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
                <>
                    {adminView === 'daily' ? (
                        <>
                            {showCalendar && (
                                <section className="mb-8 p-4 bg-white rounded-2xl shadow-sm animate-fadeIn"><Calendar selectedDate={selectedAdminDate} onDateChange={(d: Date) => { setSelectedAdminDate(d); setShowCalendar(false); }} /></section>
                            )}
                            <section className="animate-fadeInUp">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-700 pb-2 border-b-2 border-pink-200 whitespace-nowrap truncate">Agendamentos - {selectedAdminDate.toLocaleDateString('pt-BR')}</h2>
                                    {!showCalendar && (
                                        <button onClick={() => setShowCalendar(true)} className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                                            <CalendarIcon className="h-5 w-5" />
                                            <span className="hidden sm:inline">Mostrar Calendário</span>
                                        </button>
                                    )}
                                </div>
                                {dailyAppointments.length > 0 ? (
                                    <>
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Agendados</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                             {dailyScheduled.map(app => (
                                                <div key={app.id} className="w-full">
                                                     <AppointmentCard appointment={app} onUpdateStatus={handleUpdateStatus} isUpdating={updatingStatusId === app.id} onEdit={handleOpenEditModal} onDelete={handleRequestDelete} isDeleting={deletingAppointmentId === app.id} onOpenActionMenu={onOpenActionMenu} onDeleteObservation={onDeleteObservation} />
                                                 </div>
                                             ))}
                                             </div>

                                            <div className="mt-8">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-3">Concluídos</h3>
                                                {dailyCompleted.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                         {dailyCompleted.map(app => (
                                                            <div key={app.id} className="w-full">
                                                                 <AppointmentCard appointment={app} onUpdateStatus={handleUpdateStatus} isUpdating={updatingStatusId === app.id} onEdit={handleOpenEditModal} onDelete={handleRequestDelete} isDeleting={deletingAppointmentId === app.id} onOpenActionMenu={onOpenActionMenu} onDeleteObservation={onDeleteObservation} />
                                                             </div>
                                                         ))}
                                                         </div>
                                                ) : (
                                                    <div className="text-center py-6 bg-white rounded-lg shadow-sm">
                                                        <p className="text-gray-500">Nenhum concluído para este dia.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-16 bg-white rounded-lg shadow-sm"><p className="text-gray-500 text-lg">Nenhum agendamento para este dia.</p></div>
                                    )}
                                </section>
                            </>
                        ) : (
                            <div className="space-y-12 animate-fadeIn">
                                <section>
                                    <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-pink-200">Próximos Agendamentos</h2>
                                    {upcomingAppointments.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{renderAppointments(upcomingAppointments)}</div> : <div className="text-center py-12 bg-white rounded-lg shadow-sm"><p className="text-gray-500">Nenhum próximo agendamento encontrado.</p></div>}
                                </section>
                                <section>
                                    <h2 className="text-2xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-pink-200">Agendamentos Anteriores</h2>
                                    {pastAppointments.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{renderAppointments(pastAppointments)}</div> : <div className="text-center py-12 bg-white rounded-lg shadow-sm"><p className="text-gray-500">Nenhum agendamento anterior encontrado.</p></div>}
                                </section>
                            </div>
                        )}
                </>
            ))}
        </>
    );
};

const EditPetMovelAppointmentModal: React.FC<{
    appointment: PetMovelAppointment;
    onClose: () => void;
    onAppointmentUpdated: (updatedAppointment: PetMovelAppointment) => void;
}> = ({ appointment, onClose, onAppointmentUpdated }) => {
    const [formData, setFormData] = useState<Omit<PetMovelAppointment, 'id' | 'addons' | 'appointment_time' | 'monthly_client_id'>>(appointment);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const initialSaoPauloDate = getSaoPauloTimeParts(new Date(appointment.appointment_time));
    const [datePart, setDatePart] = useState(new Date(Date.UTC(initialSaoPauloDate.year, initialSaoPauloDate.month, initialSaoPauloDate.date)).toISOString().split('T')[0]);
    const [timePart, setTimePart] = useState(initialSaoPauloDate.hour);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'whatsapp' ? formatWhatsapp(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const [year, month, day] = datePart.split('-').map(Number);
        const newAppointmentTime = toSaoPauloUTC(year, month - 1, day, timePart);

        const { pet_name, owner_name, whatsapp, service, weight, price, status, owner_address, condominium } = formData;
        
        const updatePayload = {
            pet_name,
            owner_name,
            whatsapp,
            service,
            weight,
            price: Number(price),
            status,
            owner_address,
            condominium,
            appointment_time: newAppointmentTime.toISOString(),
            // Preservar campos opcionais importantes se existirem
            ...(appointment.monthly_client_id && { monthly_client_id: appointment.monthly_client_id }),
            ...(appointment.pet_breed && { pet_breed: appointment.pet_breed }),
            ...(appointment.extra_services && { extra_services: appointment.extra_services }),
        };

        const { data, error } = await supabase
            .from('pet_movel_appointments')
            .update(updatePayload)
            .eq('id', appointment.id)
            .select()
            .single();

        if (error) {
            alert('Falha ao atualizar o agendamento do Pet Móvel.');
            console.error(error);
            setIsSubmitting(false);
        } else {
            onAppointmentUpdated(data as PetMovelAppointment);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scaleIn">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-3xl font-bold text-gray-800">Editar Agendamento (Pet Móvel)</h2></div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><label className="font-semibold text-gray-600">Nome do Pet</label><input name="pet_name" value={formData.pet_name} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Nome do Dono</label><input name="owner_name" value={formData.owner_name} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">WhatsApp</label><input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Serviço</label><input name="service" value={formData.service} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div><label className="font-semibold text-gray-600">Endereço (Apto/Casa)</label><input name="owner_address" value={formData.owner_address} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div>
                           <label className="font-semibold text-gray-600">Condomínio</label>
                           <select name="condominium" value={formData.condominium} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg bg-white">
                              <option value="Vitta Parque">Vitta Parque</option>
                              <option value="Max Haus">Max Haus</option>
                              <option value="Paseo">Paseo</option>
                           </select>
                        </div>
                        <div><label className="font-semibold text-gray-600">Preço (R$)</label><input type="number" name="price" value={formData.price || ''} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg"/></div>
                        <div>
                           <label className="font-semibold text-gray-600">Status</label>
                           <select name="status" value={formData.status} onChange={handleInputChange} className="w-full mt-1 px-5 py-4 border rounded-lg bg-white">
                              <option value="AGENDADO">Agendado</option>
                              <option value="CONCLUÍDO">Concluído</option>
                           </select>
                        </div>
                        <div><DatePicker value={datePart} onChange={setDatePart} label="Data" className="mt-1" /></div>
                        <div>
                            <label className="font-semibold text-gray-600">Hora</label>
                            <select value={timePart} onChange={e => setTimePart(Number(e.target.value))} className="w-full mt-1 px-5 py-4 border rounded-lg bg-white">
                                {WORKING_HOURS.map(h => <option key={h} value={h}>{`${h}:00`}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:bg-gray-400">
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PetMovelAppointmentDetailsModal: React.FC<{
    appointment: PetMovelAppointment;
    onClose: () => void;
    onEdit: (appointment: PetMovelAppointment) => void;
    onDelete: (appointment: PetMovelAppointment) => void;
}> = ({ appointment, onClose, onEdit, onDelete }) => {
    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-gray-800">{value || 'Não informado'}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-rose-50 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scaleIn">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-gray-800">Detalhes do Agendamento</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><CloseIcon /></button>
                    </div>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <DetailItem label="Pet" value={appointment.pet_name} />
                        <DetailItem label="Tutor" value={appointment.owner_name} />
                        <DetailItem label="Contato" value={appointment.whatsapp} />
                        <DetailItem label="Condomínio" value={appointment.condominium} />
                        <DetailItem label="Endereço" value={appointment.owner_address} />
                        <DetailItem label="Serviço" value={appointment.service} />
                        <DetailItem label="Data e Hora" value={new Date(appointment.appointment_time).toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'})} />
                        <DetailItem label="Preço" value={`R$ ${Number(appointment.price || 0).toFixed(2).replace('.', ',')}`} />
                        <DetailItem label="Status" value={appointment.status} />
                        <DetailItem label="Adicionais" value={appointment.addons && appointment.addons.length > 0 ? appointment.addons.join(', ') : 'Nenhum'} />
                    </div>
                </div>
                <div className="p-4 bg-white mt-auto rounded-b-2xl flex justify-end items-center gap-3">
                    <button onClick={() => { onClose(); onDelete(appointment); }} className="bg-red-100 text-red-700 font-bold py-3.5 px-4 rounded-lg hover:bg-red-200 transition-colors">Excluir</button>
                    <button onClick={() => { onClose(); onEdit(appointment); }} className="bg-blue-100 text-blue-700 font-bold py-3.5 px-4 rounded-lg hover:bg-blue-200 transition-colors">Editar</button>
                </div>
            </div>
        </div>
    );
};

const PetMovelView: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
    const [monthlyClients, setMonthlyClients] = useState<MonthlyClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCondos, setExpandedCondos] = useState<string[]>([]);
    const [selectedForDetails, setSelectedForDetails] = useState<MonthlyClient | null>(null);
    const [selectedForEdit, setSelectedForEdit] = useState<MonthlyClient | null>(null);
    const [selectedForDelete, setSelectedForDelete] = useState<MonthlyClient | null>(null);
    const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<PetMovelAppointment | null>(null);
    const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<PetMovelAppointment | null>(null);
    const [selectedAppointmentForDelete, setSelectedAppointmentForDelete] = useState<PetMovelAppointment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [selectedClientForAppointments, setSelectedClientForAppointments] = useState<MonthlyClient | null>(null);
    const [clientAppointments, setClientAppointments] = useState<AdminAppointment[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [calendarAppointments, setCalendarAppointments] = useState<PetMovelAppointment[]>([]);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedAppointment, setSelectedAppointment] = useState<AdminAppointment | PetMovelAppointment | null>(null);

    const fetchMonthlyClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('monthly_clients')
                .select('*')
                .order('condominium', { ascending: true })
                .order('owner_name', { ascending: true });
            if (error) {
                const cached = localStorage.getItem('cached_monthly_clients');
                if (cached) {
                    const parsed = JSON.parse(cached) as MonthlyClient[];
                    setMonthlyClients(parsed);
                    if (parsed && parsed.length > 0) {
                        setExpandedCondos([parsed[0].condominium || 'Nenhum Condomínio']);
                    }
                }
            } else {
                const petMovelCondominiums = [
                    'Vitta Parque', 'Paseo', 'Max Haus', 'Nenhum Condomínio'
                ];
                const petMovelClients = (data as MonthlyClient[]).filter(client => {
                    const raw = client.condominium ? String(client.condominium).trim() : '';
                    if (!raw) return true;
                    const condominium = raw.toLowerCase();
                    return petMovelCondominiums.some(targetCondo => targetCondo.toLowerCase() === condominium);
                });
                setMonthlyClients(petMovelClients);
                if (petMovelClients && petMovelClients.length > 0) {
                    setExpandedCondos([petMovelClients[0].condominium || 'Nenhum Condomínio']);
                }
                try { localStorage.setItem('cached_monthly_clients', JSON.stringify(data || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_monthly_clients');
            if (cached) {
                const parsed = JSON.parse(cached) as MonthlyClient[];
                setMonthlyClients(parsed);
                if (parsed && parsed.length > 0) {
                    setExpandedCondos([parsed[0].condominium || 'Nenhum Condomínio']);
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMonthlyClients();
    }, [refreshKey]);

    const fetchClientAppointments = useCallback(async (clientId: string) => {
        setLoadingAppointments(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('monthly_client_id', clientId)
                .order('appointment_time', { ascending: false });

            if (error) {
                console.error('Error fetching client appointments:', error);
                setClientAppointments([]);
            } else {
                const rows = (data as AdminAppointment[]) || [];
                const map = new Map<string, AdminAppointment[]>();
                for (const r of rows) {
                    const t = new Date(r.appointment_time);
                    const key = `${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')} ${String(t.getUTCHours()).padStart(2,'0')}:${String(t.getUTCMinutes()).padStart(2,'0')}`;
                    const g = map.get(key) || [];
                    g.push(r);
                    map.set(key, g);
                }
                const toDelete: string[] = [];
                const unique: AdminAppointment[] = [];
                for (const [, list] of map.entries()) {
                    if (list.length > 1) {
                        unique.push(list[0]);
                        for (let i = 1; i < list.length; i++) toDelete.push(list[i].id);
                    } else {
                        unique.push(list[0]);
                    }
                }
                if (toDelete.length > 0) {
                    await supabase.from('appointments').delete().in('id', toDelete);
                }
                setClientAppointments(unique);
            }
        } catch (error) {
            console.error('Error fetching client appointments:', error);
            setClientAppointments([]);
        } finally {
            setLoadingAppointments(false);
        }
    }, []);

    const handleClientUpdated = (updatedClient: MonthlyClient) => {
        setMonthlyClients(prev => prev.map(client => client.id === updatedClient.id ? updatedClient : client));
        setSelectedForEdit(null);
    };

    const handleOpenAppointmentsModal = async (client: MonthlyClient) => {
        setSelectedClientForAppointments(client);
        await fetchClientAppointments(client.id);
    };

    const handleCloseAppointmentsModal = () => {
        setSelectedClientForAppointments(null);
        setClientAppointments([]);
    };

    const handleAppointmentUpdated = (updatedAppointment: PetMovelAppointment) => {
        setCalendarAppointments(prev => prev.map(appt => appt.id === updatedAppointment.id ? updatedAppointment : appt));
        setSelectedAppointmentForEdit(null);
    };

    const handleConfirmDeleteAppointment = async () => {
        if (!selectedAppointmentForDelete) return;
        
        setIsDeleting(true);
        const { error } = await supabase
            .from('pet_movel_appointments')
            .delete()
            .eq('id', selectedAppointmentForDelete.id);

        if (error) {
            alert('Falha ao excluir o agendamento.');
            console.error(error);
        } else {
            setCalendarAppointments(prev => prev.filter(appt => appt.id !== selectedAppointmentForDelete.id));
        }
        
        setIsDeleting(false);
        setSelectedAppointmentForDelete(null);
    };

    const fetchCalendarAppointments = useCallback(async () => {
        setLoadingCalendar(true);
        try {
            // Buscar nomes dos pets dos clientes Pet Móvel
            const petMovelPetNames = monthlyClients.map(client => client.pet_name).filter(name => name && name.trim());
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .order('appointment_time', { ascending: true });

            if (error) {
                console.error('Error fetching calendar appointments:', error);
                setCalendarAppointments([]);
            } else {
                const filtered = (data as AdminAppointment[]).filter(appointment => {
                    const name = appointment.pet_name?.trim().toLowerCase();
                    const isMonthly = petMovelPetNames.some(n => n && n.trim().toLowerCase() === name);
                    const isVisit = appointment.service === 'Creche Pet' || appointment.service === 'Hotel Pet';
                    return isMonthly || isVisit;
                });
                const enrichedAppointments = filtered.map(appointment => {
                    const monthlyClient = monthlyClients.find(client => 
                        client.pet_name && client.pet_name.trim().toLowerCase() === appointment.pet_name.trim().toLowerCase()
                    );
                    
                    // Extrair condomínio e apartamento do endereço
                    let condominium = 'Não informado';
                    let apartment = '';
                    
                    if (monthlyClient?.owner_address || appointment.owner_address) {
                        const address = monthlyClient?.owner_address || appointment.owner_address || '';
                        // Tentar extrair apartamento (padrões comuns: "Apt 123", "Apto 123", "123")
                        const aptMatch = address.match(/(?:apt|apto|apartamento)\s*\.?\s*(\d+)/i) || 
                                       address.match(/\b(\d{2,4})\b/);
                        if (aptMatch) {
                            apartment = aptMatch[1];
                        }
                        
                        condominium = address;
                    }
                    
                    return {
                        ...appointment,
                        condominium,
                        client_name: monthlyClient?.owner_name || appointment.owner_name,
                        apartment,
                        date: appointment.appointment_time.split('T')[0],
                        time: appointment.appointment_time.split('T')[1]?.substring(0, 5) || '00:00'
                    } as PetMovelAppointment;
                });
                
                setCalendarAppointments(enrichedAppointments);
            }
        } catch (error) {
            console.error('Error fetching calendar appointments:', error);
            setCalendarAppointments([]);
        } finally {
            setLoadingCalendar(false);
        }
    }, [monthlyClients]);

    useEffect(() => {
        if (viewMode === 'calendar') {
            fetchCalendarAppointments();
        }
    }, [viewMode, monthlyClients, fetchCalendarAppointments]);

    const handleConfirmDelete = async () => {
        if (!selectedForDelete) return;
        setIsDeleting(true);
        const getDbId = (id: any) => { const s = String(id ?? ''); return /^\d+$/.test(s) ? Number(s) : id; };
        const dbId = getDbId(selectedForDelete.id);

        try {
            await Promise.all([
                supabase.from('appointments').delete().eq('monthly_client_id', dbId),
                supabase.from('pet_movel_appointments').delete().eq('monthly_client_id', dbId)
            ]);
            const { error: delErr } = await supabase.from('monthly_clients').delete().eq('id', dbId);
            if (delErr) {
                alert('Falha ao excluir o mensalista.');
            } else {
                setMonthlyClients(prev => prev.filter(client => client.id !== selectedForDelete.id));
            }
        } finally {
            setIsDeleting(false);
            setSelectedForDelete(null);
        }
    };

    const groupedClients = useMemo(() => {
        const groups: Record<string, Record<string, MonthlyClient[]>> = {};
        const ALL_CONDOS = ['Vitta Parque', 'Paseo', 'Max Haus', 'Nenhum Condomínio'];
        ALL_CONDOS.forEach(c => { groups[c] = {}; });
        const extractNumber = (address: string | null) => address ? `Apto/Casa ${address.match(/\d+/)?.[0] || address}` : 'Endereço não informado';
        
        // Filtrar clientes baseado no termo de busca
        const filteredClients = monthlyClients.filter(client => {
            if (!searchTerm.trim()) return true;
            
            const searchLower = searchTerm.toLowerCase().trim();
            const petName = (client.pet_name || '').toLowerCase();
            const ownerName = (client.owner_name || '').toLowerCase();
            const condominium = (client.condominium || '').toLowerCase();
            const address = (client.owner_address || '').toLowerCase();
            
            return petName.includes(searchLower) || 
                   ownerName.includes(searchLower) || 
                   condominium.includes(searchLower) ||
                   address.includes(searchLower);
        });
        
        filteredClients.forEach(client => {
            const condo = client.condominium || 'Nenhum Condomínio';
            const number = extractNumber(client.owner_address);
            if (!groups[condo]) groups[condo] = {};
            if (!groups[condo][number]) groups[condo][number] = [];
            groups[condo][number].push(client);
        });
        return groups;
    }, [monthlyClients, searchTerm]);

    const condoScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const toggleCondo = (condoName: string) => {
        setExpandedCondos(prev => {
            const next = prev.includes(condoName) ? prev.filter(c => c !== condoName) : [...prev, condoName];
            if (!prev.includes(condoName)) {
                setTimeout(() => {
                    const container = condoScrollRefs.current[condoName];
                    if (container) {
                        const first = container.querySelector('[data-card-item]') as HTMLDivElement | null;
                        if (first) {
                            const width = container.clientWidth;
                            const cardWidth = first.clientWidth;
                            container.scrollLeft = first.offsetLeft + (cardWidth / 2) - (width / 2);
                        }
                    }
                }, 0);
            }
            return next;
        });
    };

    // Expandir automaticamente todos os condomínios quando há busca ativa
    useEffect(() => {
        if (searchTerm.trim()) {
            const allCondos = Object.keys(groupedClients);
            setExpandedCondos(allCondos);
        }
    }, [searchTerm, groupedClients]);

    const adminTitleFull = "Sandy's Pet Admin";
    const [adminTitle, setAdminTitle] = useState('');
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setAdminTitle(adminTitleFull.slice(0, i + 1));
            i++;
            if (i >= adminTitleFull.length) {
                clearInterval(timer);
            }
        }, 45);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="animate-fadeIn bg-gray-50 min-h-screen px-0 sm:px-2 py-4">
            {selectedForEdit && <EditMonthlyClientAdvancedModal client={selectedForEdit} onClose={() => setSelectedForEdit(null)} onMonthlyClientUpdated={handleClientUpdated} />}
            {selectedForDelete && <ConfirmationModal isOpen={!!selectedForDelete} onClose={() => setSelectedForDelete(null)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o mensalista ${selectedForDelete.pet_name}?`} confirmText="Excluir" variant="danger" isLoading={isDeleting} />}
            
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Pet Móvel</h2>
                        <p className="text-sm text-gray-600 text-center">Gerencie seus clientes Pet Móvel</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                        <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-800">{Object.values(groupedClients).reduce((total, clients) => total + Object.values(clients).reduce((sum, list) => sum + list.length, 0), 0)}</div>
                            <div className="text-sm text-gray-600">Total Clientes</div>
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-800">{Object.keys(groupedClients).length}</div>
                            <div className="text-sm text-gray-600">Condomínios</div>
                        </div>
                    </div>
                    <div className="mt-2">
                        <input
                            type="text"
                            placeholder="Buscar por nome do pet ou dono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            
            
            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingSpinner />
                </div>
            ) : Object.keys(groupedClients).length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SearchIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {searchTerm.trim() ? 'Nenhum resultado encontrado' : 'Nenhum cliente encontrado'}
                        </h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm.trim() ? 
                                `Não encontramos resultados para "${searchTerm}"` : 
                                'Não há mensalistas Pet Móvel cadastrados ainda.'
                            }
                        </p>
                        {searchTerm.trim() && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                            >
                                Limpar busca
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedClients)
                        .sort(([a], [b]) => {
                            const pa = a === 'Nenhum Condomínio' ? 0 : 1;
                            const pb = b === 'Nenhum Condomínio' ? 0 : 1;
                            if (pa !== pb) return pa - pb;
                            return a.localeCompare(b);
                        })
                        .map(([condo, clients]) => (
                        <div key={condo} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 w-full">
                            <button 
                                onClick={() => toggleCondo(condo)} 
                                className="w-full text-left p-6 flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <img 
                                        src="https://cdn-icons-png.flaticon.com/512/6917/6917662.png" 
                                        alt={condo === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : `Condomínio ${condo}`} 
                                        className="w-12 h-12 rounded-lg object-cover"
                                    />
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{condo === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : condo}</h3>
                                        <p className="text-sm text-gray-500">
                                            {Object.values(clients).reduce((sum, list) => sum + list.length, 0)} clientes
                                        </p>
                                    </div>
                                </div>
                                <ChevronRightIcon className={`h-6 w-6 text-gray-400 transform transition-transform ${expandedCondos.includes(condo) ? 'rotate-90' : ''}`} />
                            </button>
                            
                            {expandedCondos.includes(condo) && (
                                <div className="border-t border-gray-100 bg-gray-50/50 animate-fadeIn">
                                    <div className="p-6">
                                        <div className="overflow-x-auto snap-x snap-mandatory -mx-6" ref={(el) => { condoScrollRefs.current[condo] = el; }}>
                                            <div className="flex gap-4 pb-2 justify-start">
                                                {Object.values(clients).flat().map((client) => (
                                                    <div key={client.id} data-card-item className="flex-none min-w-full snap-center" style={{ scrollSnapStop: 'always' }}>
                                                        <div 
                                                            className="bg-white rounded-2xl shadow-sm p-6 min-h-[380px] hover:shadow-md transition-shadow border border-gray-200 cursor-pointer flex flex-col"
                                                            onClick={() => handleOpenAppointmentsModal(client)}
                                                        >
                                                            <div className="rounded-xl mb-3 p-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <img
                                                                        src="https://cdn-icons-png.flaticon.com/512/2171/2171990.png"
                                                                        alt={`Pet ${client.pet_name}`}
                                                                        className="w-10 h-10 rounded-full object-cover"
                                                                    />
                                                                    <div>
                                                                        <h5 className="text-lg font-bold leading-none">{client.pet_name}</h5>
                                                                        <p className="text-xs opacity-90">{client.owner_name}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs opacity-90">Preço</p>
                                                                    <p className="text-lg font-extrabold">R$ {(client.price ?? 0).toFixed(2).replace('.', ',')}</p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">{client.service}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                                                    <span>{client.recurrence_type === 'weekly' ? 'Semanal' : client.recurrence_type === 'bi-weekly' ? 'Quinzenal' : 'Mensal'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-gray-600">
                                                                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                                                    <span className="text-xs">Agendamentos: toque para ver datas</span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-auto pt-4">
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); handleOpenAppointmentsModal(client); }}
                                                                        className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                                                        title="Visualizar"
                                                                    >
                                                                        <EyeOutlineIcon className="w-4 h-4" />
                                                                        <span>Visualizar</span>
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedForEdit(client); }} 
                                                                        className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                                                        aria-label="Editar"
                                                                    >
                                                                        <EditIcon className="w-4 h-4" />
                                                                        <span>Editar</span>
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedForDelete(client); }} 
                                                                        className="w-full bg-red-50 text-red-600 py-1.5 px-2 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                                                        aria-label="Excluir"
                                                                    >
                                                                        <DeleteIcon className="w-4 h-4" />
                                                                        <span>Excluir</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modo Calendário */}
            {viewMode === 'calendar' && (
                <div className="space-y-4">
                    {loadingCalendar ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                        </div>
                    ) : calendarAppointments.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">Nenhum agendamento encontrado para esta data.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {calendarAppointments.map((appointment) => (
                                <div key={appointment.id} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-lg text-gray-800">{appointment.pet_name}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {appointment.status === 'confirmed' ? 'Confirmado' :
                                                     appointment.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                                </span>
                                                {((appointment.service === 'Creche Pet' || appointment.service === 'Hotel Pet') && !appointment.monthly_client_id) && (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        🏠 Visita
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <p><span className="font-medium">Dono:</span> {appointment.owner_name}</p>
                                                <p><span className="font-medium">Serviço:</span> {appointment.service}</p>
                                                <p><span className="font-medium">Horário:</span> {new Date(appointment.appointment_time).toLocaleString('pt-BR')}</p>
                                                <p><span className="font-medium">Endereço:</span> {appointment.owner_address}</p>
                                                {appointment.condominium && (
                                                    <p><span className="font-medium">Condomínio:</span> {appointment.condominium}</p>
                                                )}
                                                <p><span className="font-medium">Preço:</span> R$ {(appointment.price ?? 0).toFixed(2).replace('.', ',')}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => setSelectedAppointmentForDetails(appointment)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setSelectedAppointmentForEdit(appointment)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => setSelectedAppointmentForDelete(appointment)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Modal de Agendamentos do Cliente */}
            {selectedClientForAppointments && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold">Agendamentos de {selectedClientForAppointments.pet_name}</h2>
                                    <p className="text-pink-100 mt-1">Tutor: {selectedClientForAppointments.owner_name}</p>
                                </div>
                                <button 
                                    onClick={handleCloseAppointmentsModal} 
                                    className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                                >
                                    <CloseIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            {loadingAppointments ? (
                                <div className="flex justify-center py-12">
                                    <LoadingSpinner />
                                </div>
                            ) : clientAppointments.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4">
                                        {clientAppointments.map(appointment => (
                                            <div key={appointment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <img 
                                                            src="https://cdn-icons-png.flaticon.com/512/2171/2171990.png" 
                                                            alt="Ícone do pet" 
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <h4 className="font-semibold text-gray-800">
                                                                {new Date(appointment.appointment_time).toLocaleDateString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: 'long',
                                                                    year: 'numeric',
                                                                    timeZone: 'America/Sao_Paulo'
                                                                })}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">
                                                                {new Date(appointment.appointment_time).toLocaleTimeString('pt-BR', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    timeZone: 'America/Sao_Paulo'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                            appointment.status === 'CONCLUÍDO' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {appointment.status}
                                                        </div>
                                                        {((appointment.service === 'Creche Pet' || appointment.service === 'Hotel Pet') && !appointment.monthly_client_id) && (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    🏠 Visita
                                                </span>
                                            )}
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-500 font-medium">Serviço</p>
                                                        <p className="text-gray-800">{appointment.service}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 font-medium">Peso</p>
                                                        <p className="text-gray-800">{appointment.weight}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500 font-medium">Preço</p>
                                                        <p className="text-green-600 font-semibold">
                                                            R$ {Number(appointment.price || 0).toFixed(2).replace('.', ',')}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {appointment.addons && appointment.addons.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <p className="text-gray-500 font-medium text-sm mb-2">Adicionais</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {appointment.addons.map((addon, index) => (
                                                                <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                                                    {addon}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum agendamento encontrado</h3>
                                    <p className="text-gray-500">Este cliente ainda não possui agendamentos registrados.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal de Detalhes do Agendamento do Calendário */}
            {selectedAppointment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Detalhes do Agendamento</h3>
                                <button
                                    onClick={() => setSelectedAppointment(null)}
                                    className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Pet</h4>
                                    <p className="text-gray-700">{selectedAppointment.pet_name}</p>
                                    <p className="text-sm text-gray-500">{selectedAppointment.pet_breed}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Tutor</h4>
                                    <p className="text-gray-700">{selectedAppointment.owner_name}</p>
                                    <p className="text-sm text-gray-500">{selectedAppointment.whatsapp}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Serviço</h4>
                                    <p className="text-gray-700">{selectedAppointment.service}</p>
                                    <p className="text-sm text-green-600 font-medium">R$ {selectedAppointment.price}</p>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                        selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        selectedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {selectedAppointment.status === 'confirmed' ? 'Confirmado' :
                                         selectedAppointment.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                    </span>
                                </div>
                                
                                {selectedAppointment.pet_movel_appointments && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Pet Móvel</h4>
                                        <p className="text-sm text-gray-600">Endereço: {selectedAppointment.pet_movel_appointments.owner_address}</p>
                                        {selectedAppointment.pet_movel_appointments.condominium && (
                                            <p className="text-sm text-gray-600">Condomínio: {selectedAppointment.pet_movel_appointments.condominium}</p>
                                        )}
                                    </div>
                                )}
                                
                                {selectedAppointment.addons && selectedAppointment.addons.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Adicionais</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            {selectedAppointment.addons.map((addon, index) => (
                                                <li key={index}>• {addon}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                
                                {selectedAppointment.notes && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Observações</h4>
                                        <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


const EditClientModal: React.FC<{ client: Client; onClose: () => void; onClientUpdated: (client: Client) => void; }> = ({ client, onClose, onClientUpdated }) => {
    const [name, setName] = useState(client.name);
    const [phone, setPhone] = useState(client.phone);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data, error } = await supabase
            .from('clients')
            .update({ name, phone })
            .eq('id', client.id)
            .select()
            .single();
        if (error) {
            alert("Erro ao atualizar cliente.");
            setIsSubmitting(false);
        } else {
            onClientUpdated(data as Client);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-scaleIn">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b"><h2 className="text-3xl font-bold text-gray-800">Editar Cliente</h2></div>
                    <div className="p-6 space-y-6">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cliente" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        <input type="text" value={phone} onChange={e => setPhone(formatWhatsapp(e.target.value))} placeholder="Telefone / WhatsApp" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                    </div>
                    <div className="p-6 bg-gray-50 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:bg-gray-400">
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ClientsView: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddClientOpenMobile, setIsAddClientOpenMobile] = useState(false);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('clients').select('*').order('name');
            if (error) {
                const cached = localStorage.getItem('cached_clients');
                if (cached) setClients(JSON.parse(cached));
            } else {
                setClients(data as Client[]);
                try { localStorage.setItem('cached_clients', JSON.stringify(data || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_clients');
            if (cached) setClients(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients, refreshKey]);

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { data, error } = await supabase.from('clients').insert([{ name, phone: phone }]).select().single();
        if (error) {
            alert("Erro ao adicionar cliente. Verifique se a tabela 'clients' existe e tem as políticas de segurança corretas.");
        } else {
            setClients(prev => [...prev, data as Client].sort((a,b) => a.name.localeCompare(b.name)));
            setName(''); setPhone('');
        }
        setIsSubmitting(false);
    };
    
    const handleConfirmDelete = async () => {
        if (!clientToDelete) return;
        setIsDeleting(true);
        const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
        if (error) {
            alert("Erro ao excluir cliente.");
        } else {
            setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
        }
        setIsDeleting(false);
        setClientToDelete(null);
    };

    const handleClientUpdated = (updatedClient: Client) => {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c).sort((a,b) => a.name.localeCompare(b.name)));
        setEditingClient(null);
    };

    return (
        <div className="space-y-8">
            {editingClient && <EditClientModal client={editingClient} onClose={() => setEditingClient(null)} onClientUpdated={handleClientUpdated} />}
            {clientToDelete && <ConfirmationModal isOpen={!!clientToDelete} onClose={() => setClientToDelete(null)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o cliente ${clientToDelete.name}?`} confirmText="Excluir" variant="danger" isLoading={isDeleting} />}

            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Meus Clientes</h2>
                        <p className="text-sm text-gray-600 text-center">Agenda de Clientes</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button
                            onClick={() => setIsAddClientOpenMobile(prev => !prev)}
                            title="Adicionar Cliente"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <img alt="Adicionar Cliente" className="h-6 w-6" src="https://i.imgur.com/19QrZ6g.png" />
                        </button>
                    </div>
                </div>
            </div>
            

            {/* Formulário: oculto no mobile até clicar no botão; visível sempre em sm+ */}
            <div className={`p-6 bg-white rounded-2xl shadow-sm ${isAddClientOpenMobile ? 'block' : 'hidden sm:block'}`}>
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Adicionar Novo Cliente</h2>
                <form onSubmit={handleAddClient} className="flex flex-col sm:flex-row gap-4">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Cliente" required className="flex-grow w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                    <input type="text" value={phone} onChange={e => setPhone(formatWhatsapp(e.target.value))} placeholder="Telefone / WhatsApp" required className="w-full sm:w-52 px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                    <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-pink-700 transition-colors disabled:bg-gray-400">
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </form>
            </div>
            
            <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center" style={{fontFamily: 'Inter, sans-serif'}}>Lista de Clientes</h2>
                {loading ? <div className="flex justify-center py-6 sm:py-8"><LoadingSpinner /></div> : (
                    <div className="divide-y divide-gray-200">
                        {clients.length > 0 ? clients.map(client => (
                            <div key={client.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{client.name}</p>
                                    <p className="text-base text-gray-500">{client.phone}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => setEditingClient(client)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-700 transition-colors" aria-label="Editar cliente">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => setClientToDelete(client)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-700 transition-colors" aria-label="Excluir cliente">
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 py-6 sm:py-8">Nenhum cliente cadastrado.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

const EditMonthlyClientModal: React.FC<{ client: MonthlyClient; onClose: () => void; onMonthlyClientUpdated: () => void; }> = ({ client, onClose, onMonthlyClientUpdated }) => {
    const serviceKey = Object.keys(SERVICES).find(key => SERVICES[key as ServiceType].label === client.service) as ServiceType | undefined;
    const weightKey = Object.keys(PET_WEIGHT_OPTIONS).find(key => PET_WEIGHT_OPTIONS[key as PetWeight] === (client as any).weight) as PetWeight | undefined;
    
    const [formData, setFormData] = useState({ 
        petName: client.pet_name, 
        ownerName: client.owner_name, 
        whatsapp: client.whatsapp, 
        petBreed: (client as any).pet_breed || '', 
        ownerAddress: (client as any).owner_address || '',
        condominium: (client as any).condominium || ''
    });
    const [selectedService, setSelectedService] = useState<ServiceType | null>(serviceKey || null);
    const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(weightKey || null);
    const [price, setPrice] = useState((client as any).price || 0);
    const [recurrence, setRecurrence] = useState({ type: client.recurrence_type, day: client.recurrence_day, time: client.recurrence_time });
    const [paymentDueDate, setPaymentDueDate] = useState(client.payment_due_date ? client.payment_due_date.split('T')[0] : '');
    const [isActive, setIsActive] = useState(client.is_active);
    const [paymentStatus, setPaymentStatus] = useState(client.payment_status || 'Pendente');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'price') {
            // Converter para número e evitar enviar string vazia que quebra numeric no banco
            const numeric = Number(value);
            setPrice(Number.isFinite(numeric) ? numeric : 0);
        } else {
            setFormData(prev => ({ ...prev, [name]: name === 'whatsapp' ? formatWhatsapp(value) : value }));
        }
    };

// FIX: Ensure recurrence day and time are stored as numbers to prevent comparison/arithmetic errors.
    const handleRecurrenceChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setRecurrence(prev => ({ ...prev, [name]: name === 'type' ? value : Number(value) }));
    };

    const handleAlertClose = () => {
        const wasSuccess = alertInfo?.variant === 'success';
        setAlertInfo(null);
        if (wasSuccess) {
            onMonthlyClientUpdated();
            onClose();
        }
    };

    // Gera lista de rótulos dos campos alterados para mensagem de sucesso
    const getChangedFieldLabels = (payload: any): string[] => {
        const labels: Record<string, string> = {
            pet_name: 'Nome do Pet',
            pet_breed: 'Raça',
            owner_name: 'Nome do Dono',
            owner_address: 'Endereço',
            whatsapp: 'WhatsApp',
            condominium: 'Condomínio',
            service: 'Serviço',
            weight: 'Peso',
            price: 'Valor total',
            recurrence_type: 'Recorrência',
            recurrence_day: 'Dia da recorrência',
            recurrence_time: 'Hora da recorrência',
            payment_due_date: 'Data de vencimento',
            is_active: 'Status ativo',
            payment_status: 'Status do pagamento',
        };

        const normalizeDate = (v: any) => {
            if (!v) return null;
            const s = String(v);
            return s.includes('T') ? s.split('T')[0] : s;
        };

        const changed: string[] = [];
        const original: any = client as any;
        const keys = Object.keys(labels);
        for (const k of keys) {
            let orig = original[k];
            let next = payload[k];
            if (k === 'payment_due_date') {
                orig = normalizeDate(orig);
                next = normalizeDate(next);
            }
            if (orig !== next) {
                changed.push(labels[k]);
            }
        }
        return changed;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Permitir edição mesmo com campos incompletos
        setIsSubmitting(true);

        const today = new Date().toISOString();

        const { error: deleteError } = await supabase.from('appointments').delete().eq('monthly_client_id', client.id).gte('appointment_time', today);
        if (deleteError) {
            setAlertInfo({ title: 'Erro', message: "Erro ao limpar agendamentos antigos. A atualização foi cancelada.", variant: 'error' });
            setIsSubmitting(false);
            return;
        }

        // Também limpar agendamentos de Pet Móvel quando aplicável
        const isPetMovelSelected = !!selectedService && [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService as ServiceType);
        const looksLikePetMovel = typeof client.service === 'string' && client.service.toLowerCase().includes('pet móvel');
        if (isPetMovelSelected || looksLikePetMovel) {
            const { error: deletePetMovelError } = await supabase
                .from('pet_movel_appointments')
                .delete()
                .eq('monthly_client_id', client.id)
                .gte('appointment_time', today);
            if (deletePetMovelError) {
                setAlertInfo({ title: 'Erro', message: "Erro ao limpar agendamentos de Pet Móvel antigos.", variant: 'error' });
                setIsSubmitting(false);
                return;
            }
        }

        // Fallbacks seguros para evitar violação de NOT NULL no banco
        const safeRecurrenceDay = Number.isFinite(Number(recurrence.day)) ? parseInt(String(recurrence.day), 10) : client.recurrence_day;
        const safeRecurrenceTime = Number.isFinite(Number(recurrence.time)) ? parseInt(String(recurrence.time), 10) : client.recurrence_time;
        const safePrice = Number.isFinite(Number(price)) ? Number(price) : (client as any).price || 0;

        const updatePayload = {
            pet_name: formData.petName,
            pet_breed: formData.petBreed,
            owner_name: formData.ownerName,
            owner_address: formData.ownerAddress,
            whatsapp: formData.whatsapp,
            condominium: formData.condominium,
            service: selectedService ? SERVICES[selectedService].label : client.service,
            weight: selectedWeight ? PET_WEIGHT_OPTIONS[selectedWeight] : (client as any).weight,
            price: safePrice,
            recurrence_type: recurrence.type,
            recurrence_day: safeRecurrenceDay,
            recurrence_time: safeRecurrenceTime,
            // Enviar null quando vazio para evitar erro de sintaxe de data (400 Bad Request)
            payment_due_date: paymentDueDate && paymentDueDate.trim() !== '' ? paymentDueDate : null,
            is_active: isActive,
            payment_status: paymentStatus,
        };
        const { error: updateError } = await supabase.from('monthly_clients').update(updatePayload).eq('id', client.id);
        if (updateError) {
            setAlertInfo({ title: 'Erro', message: "Erro ao atualizar os dados do mensalista.", variant: 'error' });
            setIsSubmitting(false);
            return;
        }

        const changedLabels = getChangedFieldLabels(updatePayload);
        const baseSuccessMessage = changedLabels.length <= 1
            ? `${changedLabels[0] ?? 'Dados'} atualizado(s) com sucesso.`
            : `Campos atualizados: ${changedLabels.join(', ')}.`;

        if (isActive && selectedService && selectedWeight) {
            const appointmentsToCreate: { appointment_time: string }[] = [];
            const serviceDuration = SERVICES[selectedService].duration;
            const recurrenceDay = parseInt(String(recurrence.day), 10);
            const recurrenceTime = parseInt(String(recurrence.time), 10);
            const now = new Date();

            if (recurrence.type === 'weekly' || recurrence.type === 'bi-weekly') {
                let firstDate = new Date();
                const todaySaoPaulo = getSaoPauloTimeParts(firstDate);
                let firstDateDayOfWeek = todaySaoPaulo.day === 0 ? 7 : todaySaoPaulo.day;

                let daysToAdd = (recurrenceDay - firstDateDayOfWeek + 7) % 7;
                if (daysToAdd === 0 && todaySaoPaulo.hour >= recurrenceTime) {
                    daysToAdd = 7;
                }
                firstDate.setDate(firstDate.getDate() + daysToAdd);

                const appointmentsToGenerate = recurrence.type === 'weekly' ? 4 : 2;
                const intervalDays = recurrence.type === 'weekly' ? 7 : 15;

                for (let i = 0; i < appointmentsToGenerate; i++) {
                    const targetDate = new Date(firstDate);
                    targetDate.setDate(targetDate.getDate() + (i * intervalDays));
                    const appointmentTime = toSaoPauloUTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), recurrenceTime);
                    appointmentsToCreate.push({ appointment_time: appointmentTime.toISOString() });
                }
            } else { // monthly
                let targetDate = new Date();
                const todaySaoPaulo = getSaoPauloTimeParts(targetDate);
                targetDate.setDate(recurrenceDay);
                if (targetDate < now || (isSameSaoPauloDay(targetDate, now) && todaySaoPaulo.hour >= recurrenceTime)) {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                }
                const appointmentTime = toSaoPauloUTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), recurrenceTime);
                appointmentsToCreate.push({ appointment_time: appointmentTime.toISOString() });
            }


            const unitPriceEdit = (() => {
                const prices = selectedWeight ? SERVICE_PRICES[selectedWeight] : null;
                if (!prices || !selectedService) return Number(price || 0);
                if (selectedService === ServiceType.BATH_AND_GROOMING || selectedService === ServiceType.PET_MOBILE_BATH_AND_GROOMING) {
                    return Number(prices[ServiceType.BATH]) + Number(prices[ServiceType.GROOMING_ONLY]);
                }
                if (selectedService === ServiceType.BATH || selectedService === ServiceType.PET_MOBILE_BATH) {
                    return Number(prices[ServiceType.BATH]);
                }
                if (selectedService === ServiceType.GROOMING_ONLY || selectedService === ServiceType.PET_MOBILE_GROOMING_ONLY) {
                    return Number(prices[ServiceType.GROOMING_ONLY]);
                }
                return Number(price || 0);
            })();
            const supabasePayloads = appointmentsToCreate.map(app => ({
                pet_name: formData.petName,
                owner_name: formData.ownerName,
                whatsapp: formData.whatsapp,
                pet_breed: formData.petBreed,
                owner_address: formData.ownerAddress,
                service: SERVICES[selectedService!].label,
                weight: PET_WEIGHT_OPTIONS[selectedWeight!],
                price: unitPriceEdit,
                status: 'AGENDADO',
                appointment_time: app.appointment_time,
                monthly_client_id: client.id,
                extra_services: {
                    pernoite: { enabled: false, quantity: 0 },
                    banho_tosa: { enabled: false, value: 0 },
                    so_banho: { enabled: false, value: 0 },
                    adestrador: { enabled: false, value: 0 },
                    despesa_medica: { enabled: false, value: 0 },
                    dias_extras: { enabled: false, quantity: 0 }
                }
            }));

            if (supabasePayloads.length > 0) {
                if (isPetMovelSelected || looksLikePetMovel) {
                    // Montar payloads para pet_movel_appointments com nomenclatura do módulo Pet Móvel
                    const petMovelPayloads = appointmentsToCreate.map(app => ({
                        owner_name: formData.ownerName,
                        pet_name: formData.petName,
                        pet_breed: formData.petBreed,
                        service: SERVICES[selectedService!].label,
                        appointment_time: app.appointment_time,
                        status: 'AGENDADO',
                        price: unitPriceEdit,
                        whatsapp: formData.whatsapp,
                        owner_address: formData.ownerAddress,
                        condominium: formData.condominium,
                        monthly_client_id: client.id,
                    }));

                    const [appointmentsResult, petMovelResult] = await Promise.all([
                        supabase.from('appointments').insert(supabasePayloads),
                        supabase.from('pet_movel_appointments').insert(petMovelPayloads),
                    ]);

                    if (appointmentsResult.error || petMovelResult.error) {
                        const errorMsg = appointmentsResult.error?.message || petMovelResult.error?.message || 'Erro desconhecido';
                        setAlertInfo({ title: 'Erro Parcial', message: `${baseSuccessMessage} Falha ao recriar agendamentos: ${errorMsg}`, variant: 'error' });
                    } else {
                        setAlertInfo({ title: 'Sucesso!', message: `${baseSuccessMessage} Agendamentos (incluindo Pet Móvel) recriados com sucesso!`, variant: 'success' });
                    }
                } else {
                    const { error: insertError } = await supabase.from('appointments').insert(supabasePayloads);
                    if (insertError) {
                        setAlertInfo({ title: 'Erro Parcial', message: `${baseSuccessMessage} Houve um erro ao recriar os agendamentos futuros.`, variant: 'error' });
                    } else {
                        setAlertInfo({ title: 'Sucesso!', message: `${baseSuccessMessage} Agendamentos futuros recriados com sucesso!`, variant: 'success' });
                    }
                }
            } else {
                setAlertInfo({ title: 'Sucesso', message: `${baseSuccessMessage} Nenhum agendamento futuro foi criado.`, variant: 'success' });
            }
        } else {
             setAlertInfo({ title: 'Sucesso', message: baseSuccessMessage, variant: 'success' });
        }

        setIsSubmitting(false);
    };

    return (
        <>
            {alertInfo && <AlertModal isOpen={true} onClose={handleAlertClose} title={alertInfo.title} message={alertInfo.message} variant={alertInfo.variant} />}
            <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 border-b"><h2 className="text-3xl font-bold text-gray-800">Editar Mensalista</h2></div>
                        <div className="p-6 space-y-6">
                            <input type="text" name="petName" placeholder="Nome do Pet" value={formData.petName} onChange={handleInputChange} required className="w-full px-5 py-4 border rounded-lg"/>
                            <input type="text" name="ownerName" placeholder="Nome do Dono" value={formData.ownerName} onChange={handleInputChange} required className="w-full px-5 py-4 border rounded-lg"/>
                            <input type="text" name="whatsapp" placeholder="WhatsApp" value={formData.whatsapp} onChange={handleInputChange} required className="w-full px-5 py-4 border rounded-lg"/>
                            <input type="text" name="condominium" placeholder="Nome do Condomínio" value={formData.condominium} onChange={handleInputChange} className="w-full px-5 py-4 border rounded-lg"/>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <select name="service" value={selectedService || ''} onChange={e => setSelectedService(e.target.value as ServiceType || null)} className="w-full px-5 py-4 border rounded-lg bg-white">
                                    <option value="">Selecione o serviço (opcional)</option>
                                    {Object.entries(SERVICES).map(([key, {label}]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <select name="weight" value={selectedWeight || ''} onChange={e => setSelectedWeight(e.target.value as PetWeight || null)} className="w-full px-5 py-4 border rounded-lg bg-white">
                                    <option value="">Selecione o peso (opcional)</option>
                                    {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                            </div>
                            <input type="number" name="price" placeholder="Preço Fixo (R$)" value={price} onChange={handleInputChange} required className="w-full px-5 py-4 border rounded-lg"/>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h3 className="font-semibold mb-2">Regra de Recorrência</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select name="type" onChange={handleRecurrenceChange} value={recurrence.type} className="w-full px-5 py-4 border rounded-lg bg-white">
                                       <option value="weekly">Semanal</option>
                                       <option value="bi-weekly">Quinzenal</option>
                                       <option value="monthly">Mensal</option>
                                    </select>
                                    {recurrence.type === 'weekly' || recurrence.type === 'bi-weekly' ? (
                                        <select name="day" onChange={handleRecurrenceChange} value={recurrence.day} className="w-full px-5 py-4 border rounded-lg bg-white">
                                           <option value={1}>Segunda-feira</option><option value={2}>Terça-feira</option><option value={3}>Quarta-feira</option><option value={4}>Quinta-feira</option><option value={5}>Sexta-feira</option>
                                        </select>
                                    ) : <input type="number" name="day" min="1" max="31" value={recurrence.day} onChange={handleRecurrenceChange} className="w-full px-5 py-4 border rounded-lg"/>}
                                </div>
                                <select name="time" onChange={handleRecurrenceChange} value={recurrence.time} className="w-full px-5 py-4 border rounded-lg mt-4 bg-white">{WORKING_HOURS.map(h => <option key={h} value={h}>{`${h}:00`}</option>)}</select>
                                <div className="mt-4">
                                    <DatePicker 
                                        value={paymentDueDate} 
                                        onChange={setPaymentDueDate}
                                        label="Data de Vencimento do Pagamento"
                                        required
                                        className="w-full mt-1"
                                        disableWeekends={false}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h3 className="font-semibold mb-2">Status</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div>
                                        <label className="font-semibold text-gray-700 text-sm">Status do Pagamento</label>
                                        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as 'Pendente' | 'Pago')} className="w-full px-5 py-4 border rounded-lg bg-white mt-1">
                                            <option value="Pendente">Pendente</option>
                                            <option value="Pago">Pago</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label htmlFor="is_active" className="flex items-center gap-3 text-gray-700 cursor-pointer">
                                            <input type="checkbox" id="is_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                            Manter mensalista ativo
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:bg-gray-400">{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

const MonthlyClientDetailsModal: React.FC<{ client: MonthlyClient | null; onClose: () => void; }> = ({ client, onClose }) => {
    const [data, setData] = useState<MonthlyClient | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!client) return;
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('monthly_clients')
                    .select('*')
                    .eq('id', client.id)
                    .single();
                if (error) {
                    setError('Falha ao carregar os dados do mensalista.');
                    setData(client);
                } else {
                    setData(data as MonthlyClient);
                }
            } catch (_) {
                setError('Erro inesperado ao carregar os dados.');
                setData(client);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [client]);

    if (!client) return null;

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-gray-800">{value || 'Não informado'}</p>
        </div>
    );

    const getRecurrenceText = (c: MonthlyClient) => {
        const time = `às ${c.recurrence_time}:00`;
        const day = c.recurrence_day;
        const weekDays: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
        switch (c.recurrence_type) {
            case 'weekly': return `Semanal, ${weekDays[day]} ${time}`;
            case 'bi-weekly': return `Quinzenal, ${weekDays[day]} ${time}`;
            case 'monthly': return `Mensal, dia ${day} ${time}`;
            default: return '';
        }
    };

    const phoneDigits = String(data?.whatsapp || client.whatsapp || '')?.replace(/\D/g, '');
    const phoneWithCountry = phoneDigits ? (phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`) : '';
    const whatsappHref = phoneWithCountry ? `https://api.whatsapp.com/send?phone=${phoneWithCountry}` : '#';

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={(data?.pet_photo_url || client.pet_photo_url) || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'}
                            alt={String(data?.pet_name || client.pet_name || 'Pet')}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        <h2 className="text-2xl font-bold text-gray-800">Detalhes do Mensalista</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label="Fechar"><CloseIcon /></button>
                </div>
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-8"><LoadingSpinner /></div>
                    ) : (
                        <>
                            {error && <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
                            {(() => {
                                const row: any = data || client;
                                const entries = Object.entries(row || {});
                                const PT_LABELS: Record<string, string> = { id: 'ID', created_at: 'Criado em', pet_name: 'Pet', pet_breed: 'Raça', owner_name: 'Tutor', owner_address: 'Endereço', whatsapp: 'WhatsApp', service: 'Serviço', weight: 'Peso', price: 'Preço', recurrence_type: 'Recorrência', recurrence_day: 'Dia da recorrência', recurrence_time: 'Hora da recorrência', is_active: 'Ativo', payment_status: 'Status do pagamento', payment_due_date: 'Data de vencimento', condominium: 'Condomínio', extra_services: 'Serviços extras', pet_photo_url: 'Foto do pet' };
                                const formatLabel = (k: string) => PT_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                                const renderValue = (k: string, v: any) => {
                                    if (k === 'whatsapp') return (<a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 underline break-all">{String(v || '')}</a>);
                                    if (k === 'payment_due_date' || k === 'created_at' || /_date$/.test(k)) return formatDateToBR(v || null);
                                    if (k === 'price') return `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;
                                    if (k === 'recurrence_type') return v === 'weekly' ? 'Semanal' : v === 'bi-weekly' ? 'Quinzenal' : v === 'monthly' ? 'Mensal' : String(v ?? '');
                                    if (k === 'recurrence_time') return `${v}:00`;
                                    if (k === 'recurrence_day') {
                                        const t = (row?.recurrence_type as string) || '';
                                        if (t === 'weekly' || t === 'bi-weekly') {
                                            const wd: Record<number, string> = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
                                            const num = Number(v);
                                            return wd[num] || String(v ?? '');
                                        }
                                        return String(v ?? '');
                                    }
                                    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
                                    if (k === 'extra_services' && v) {
                                        const ex = v || {};
                                        const items = Object.keys(ex);
                                        return items.length ? (
                                            <div className="space-y-1">
                                                {items.map((ek) => (
                                                    <div key={ek} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                        <span className="text-gray-700">{formatLabel(ek)}</span>
                                                        <span className="font-semibold text-gray-900">{typeof ex[ek] === 'object' ? JSON.stringify(ex[ek]) : String(ex[ek])}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : 'Nenhum';
                                    }
                                    return String(v ?? '');
                                };
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        {entries.map(([k, v]) => (
                                            <DetailItem key={k} label={formatLabel(k)} value={renderValue(k, v)} />
                                        ))}
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Fechar</button>
                </div>
            </div>
        </div>
    );
};


const EditMonthlyClientAdvancedModal: React.FC<{ client: MonthlyClient; onClose: () => void; onMonthlyClientUpdated: () => void; }> = ({ client, onClose, onMonthlyClientUpdated }) => {
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('monthly_clients')
                    .select('*')
                    .eq('id', client.id)
                    .single();
                if (error) {
                    setError('Falha ao carregar os dados completos.');
                    setData(client);
                } else {
                    setData(data);
                }
            } catch (_) {
                setError('Erro inesperado ao carregar os dados completos.');
                setData(client);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [client]);

    const PT_LABELS: Record<string, string> = { id: 'ID', created_at: 'Criado em', pet_name: 'Pet', pet_breed: 'Raça', owner_name: 'Tutor', owner_address: 'Endereço', whatsapp: 'WhatsApp', service: 'Serviço', weight: 'Peso', price: 'Preço', recurrence_type: 'Recorrência', recurrence_day: 'Dia da recorrência', recurrence_time: 'Hora da recorrência', is_active: 'Ativo', payment_status: 'Status do pagamento', payment_due_date: 'Data de vencimento', condominium: 'Condomínio', extra_services: 'Serviços extras', pet_photo_url: 'Foto do pet' };
    const formatLabel = (k: string) => PT_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const isReadOnly = (k: string) => ['id', 'created_at'].includes(k);
    const isDateField = (k: string) => k.endsWith('_date') || k === 'payment_due_date' || k === 'created_at';

    const handleChange = (k: string, v: any) => {
        setData((prev: any) => ({ ...(prev || {}), [k]: v }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data) return;
        setIsSaving(true);
        const payload: any = { ...data };
        delete payload.id;
        if (payload.payment_due_date === '') payload.payment_due_date = null;
        if (typeof payload.extra_services === 'string') {
            try { payload.extra_services = JSON.parse(payload.extra_services); } catch {}
        }
        const { error } = await supabase.from('monthly_clients').update(payload).eq('id', client.id);
        if (error) {
            setAlertInfo({ title: 'Erro', message: 'Erro ao salvar os dados completos do mensalista.', variant: 'error' });
        } else {
            setAlertInfo({ title: 'Sucesso', message: 'Dados completos atualizados com sucesso.', variant: 'success' });
        }
        setIsSaving(false);
    };

    const handleAlertClose = () => {
        const ok = alertInfo?.variant === 'success';
        setAlertInfo(null);
        if (ok) {
            onMonthlyClientUpdated();
            onClose();
        }
    };

    return (
        <>
            {alertInfo && <AlertModal isOpen={true} onClose={handleAlertClose} title={alertInfo.title} message={alertInfo.message} variant={alertInfo.variant} />}
            <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-3xl font-bold text-gray-800">Editar Mensalista</h2>
                            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><CloseIcon /></button>
                        </div>
                        <div className="p-6">
                            {loading ? (
                                <div className="flex justify-center py-12"><LoadingSpinner /></div>
                            ) : (
                                <>
                                    {error && <div className="p-3 bg-yellow-50 text-yellow-700 rounded-md text-sm">{error}</div>}
                                    {data && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.entries(data).map(([k, v]) => (
                                                <div key={k} className="flex flex-col">
                                                    <label className="text-sm font-semibold text-gray-700">{formatLabel(k)}</label>
                                                    {k === 'extra_services' ? (
                                                        <textarea value={typeof v === 'string' ? v : JSON.stringify(v || {}, null, 2)} onChange={(e) => handleChange(k, e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" rows={4} />
                                                    ) : isReadOnly(k) ? (
                                                        <input value={String(v ?? '')} readOnly className="mt-1 w-full px-3 py-2 bg-gray-100 border rounded-md" />
                                                    ) : typeof v === 'boolean' ? (
                                                        <div className="mt-1"><input type="checkbox" checked={!!v} onChange={(e) => handleChange(k, e.target.checked)} /></div>
                                                    ) : typeof v === 'number' ? (
                                                        <input type="number" value={Number(v)} onChange={(e) => handleChange(k, Number(e.target.value))} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                                    ) : isDateField(k) ? (
                                                        <input type="date" value={(String(v || '')).split('T')[0] || ''} onChange={(e) => handleChange(k, e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                                    ) : (
                                                        <input type="text" value={String(v ?? '')} onChange={(e) => handleChange(k, e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 flex justify-end gap-4">
                            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

const MonthlyClientsView: React.FC<{ onAddClient: () => void; onDataChanged: () => void; }> = ({ onAddClient, onDataChanged }) => {
    const [monthlyClients, setMonthlyClients] = useState<MonthlyClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<MonthlyClient | null>(null);
    const [deletingClient, setDeletingClient] = useState<MonthlyClient | null>(null);
    const [viewingClient, setViewingClient] = useState<MonthlyClient | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [alertInfo, setAlertInfo] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'stack' | 'list'>('cards');
    // Filtro de status de pagamento: '' (Todos), 'Pendente' ou 'Pago'
    const [filterPaymentStatus, setFilterPaymentStatus] = useState<'' | 'Pendente' | 'Pago'>('');
    const [monthlyMobileSearchOpen, setMonthlyMobileSearchOpen] = useState(false);
    const [isUploadMonthlyPhotoModalOpen, setIsUploadMonthlyPhotoModalOpen] = useState(false);
    const [uploadTargetMonthlyClient, setUploadTargetMonthlyClient] = useState<MonthlyClient | null>(null);
    const [isUploadingMonthlyPhoto, setIsUploadingMonthlyPhoto] = useState(false);
    const [monthlyUploadError, setMonthlyUploadError] = useState<string | null>(null);
    const [selectedMonthlyPhotoName, setSelectedMonthlyPhotoName] = useState<string>('');
    
    // Estados para filtros
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [filterCondominium, setFilterCondominium] = useState('');
    const [filterDueDate, setFilterDueDate] = useState('');
    const [sortBy, setSortBy] = useState(''); // 'pet-az', 'owner-az'
    
    // Estados para modal de serviços extras
    const [isMonthlyExtraServicesModalOpen, setIsMonthlyExtraServicesModalOpen] = useState(false);
    const [monthlyClientForExtraServices, setMonthlyClientForExtraServices] = useState<MonthlyClient | null>(null);
    
    // Estado para modal de estatísticas
    const [showStatisticsModal, setShowStatisticsModal] = useState(false);
    
    // Estado para dados de creche
    const [daycareEnrollments, setDaycareEnrollments] = useState<DaycareRegistration[]>([]);

    const archivedCount = useMemo(() => monthlyClients.filter(c => c.payment_status === 'Pago').length, [monthlyClients]);
    const pendingCount = useMemo(() => monthlyClients.filter(c => c.payment_status === 'Pendente').length, [monthlyClients]);

    const createTestData = async () => {
        console.log('Criando dados de teste...');
        const testClients = [
            {
                pet_name: 'Rex Teste',
                pet_breed: 'Golden Retriever',
                owner_name: 'João Silva',
                owner_address: 'Rua Teste, 123',
                whatsapp: '11999999999',
                service: 'Banho e Tosa',
                weight: 'Grande (20-40kg)',
                price: 80,
                recurrence_type: 'monthly',
                recurrence_day: 15,
                recurrence_time: 9,
                payment_due_date: '2025-11-30',
                is_active: true,
                payment_status: 'Pendente'
            },
            {
                pet_name: 'Bella Teste',
                pet_breed: 'Poodle',
                owner_name: 'Maria Santos',
                owner_address: 'Av. Teste, 456',
                whatsapp: '11888888888',
                service: 'Banho',
                weight: 'Médio (10-20kg)',
                price: 50,
                recurrence_type: 'weekly',
                recurrence_day: 2,
                recurrence_time: 14,
                payment_due_date: '2025-10-29',
                is_active: true,
                payment_status: 'Pendente'
            }
        ];

        const { error } = await supabase.from('monthly_clients').insert(testClients);
        if (error) {
            console.error('Erro ao criar dados de teste:', error);
        } else {
            console.log('Dados de teste criados com sucesso!');
        }
    };

    const fetchMonthlyClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('monthly_clients').select('*');
            if (error) {
                const cached = localStorage.getItem('cached_monthly_clients');
                if (cached) setMonthlyClients(JSON.parse(cached));
            } else {
                let sortedData = (data as MonthlyClient[]).sort((a, b) => a.owner_name.localeCompare(b.owner_name));
                if (!data || data.length === 0) {
                    await createTestData();
                    const { data: newData, error: newError } = await supabase.from('monthly_clients').select('*');
                    if (!newError && newData) {
                        sortedData = (newData as MonthlyClient[]).sort((a, b) => a.owner_name.localeCompare(b.owner_name));
                    }
                }
                setMonthlyClients(sortedData);
                try { localStorage.setItem('cached_monthly_clients', JSON.stringify(sortedData || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_monthly_clients');
            if (cached) setMonthlyClients(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDaycareEnrollments = useCallback(async () => {
        try {
            const { data, error } = await supabase.from('daycare_enrollments').select('*').eq('status', 'Aprovado');
            if (error) {
                const cached = localStorage.getItem('cached_daycare_enrollments');
                if (cached) setDaycareEnrollments(JSON.parse(cached));
            } else {
                setDaycareEnrollments(data as DaycareRegistration[]);
                try { localStorage.setItem('cached_daycare_enrollments', JSON.stringify(data || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_daycare_enrollments');
            if (cached) setDaycareEnrollments(JSON.parse(cached));
        }
    }, []);

    useEffect(() => {
        fetchMonthlyClients();
        fetchDaycareEnrollments();
    }, [fetchMonthlyClients, fetchDaycareEnrollments]);
    
    const ensureCurrentMonthDueDate = useCallback(async () => {
        const due = getCurrentMonthPaymentDueDate();
        const monthKey = due.slice(0, 7);
        const last = localStorage.getItem('last_payment_due_update_month') || '';
        if (last === monthKey) return;
        const { error } = await supabase.from('monthly_clients').update({ payment_due_date: due });
        if (!error) {
            try { localStorage.setItem('last_payment_due_update_month', monthKey); } catch {}
            setMonthlyClients(prev => prev.map(c => ({ ...c, payment_due_date: due })));
            onDataChanged();
        }
    }, [onDataChanged]);

    useEffect(() => {
        ensureCurrentMonthDueDate();
    }, [ensureCurrentMonthDueDate]);
    
    // Função para verificar se um cliente mensalista também é cliente de creche
    const isClientInDaycare = useCallback((monthlyClient: MonthlyClient): boolean => {
        return daycareEnrollments.some(enrollment => 
            enrollment.pet_name.toLowerCase() === monthlyClient.pet_name.toLowerCase() &&
            enrollment.tutor_name.toLowerCase() === monthlyClient.owner_name.toLowerCase()
        );
    }, [daycareEnrollments]);

    const handleUpdateSuccess = () => { fetchMonthlyClients(); onDataChanged(); setEditingClient(null); };

    const handleConfirmDelete = async () => {
        if (!deletingClient) return;
        setIsDeleting(true);
        const dbId = getMonthlyDbId(deletingClient.id);
        try {
            await Promise.all([
                supabase.from('appointments').delete().eq('monthly_client_id', dbId),
                supabase.from('pet_movel_appointments').delete().eq('monthly_client_id', dbId)
            ]);
            const { error: clientError } = await supabase.from('monthly_clients').delete().eq('id', dbId);
            if (clientError) {
                setAlertInfo({ title: 'Erro na Exclusão', message: 'Os agendamentos foram removidos, mas ocorreu um erro ao excluir o cadastro do mensalista.', variant: 'error' });
            } else {
                setMonthlyClients(prev => prev.filter(c => c.id !== deletingClient.id));
                onDataChanged();
            }
        } finally {
            setIsDeleting(false);
            setDeletingClient(null);
        }
    };

    
    
    const weekDays: Record<number, string> = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta" };
    
    const getRecurrenceText = (client: MonthlyClient) => {
        const time = `às ${client.recurrence_time}:00`;
        const day = client.recurrence_day;
        switch (client.recurrence_type) {
            case 'weekly': return `Toda ${weekDays[day]} ${time}`;
            case 'bi-weekly': return `Quinzenal, ${weekDays[day]} ${time}`;
            case 'monthly': return `Todo dia ${day} ${time}`;
            default: return '';
        }
    };

    // Filter and sort clients based on search term, filters and archive toggle
    const filteredClients = useMemo(() => {
        let filtered = monthlyClients;
        
        // Filtro por termo de busca
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(client =>
                client.pet_name.toLowerCase().includes(searchLower) ||
                client.owner_name.toLowerCase().includes(searchLower)
            );
        }
        
        // Filtro por condomínio
        if (filterCondominium) {
            filtered = filtered.filter(client => client.condominium === filterCondominium);
        }
        
        // Filtro por data de vencimento
        if (filterDueDate) {
            console.log('Filtro por data:', filterDueDate);
            console.log('Clientes antes do filtro:', filtered.length);
            filtered = filtered.filter(client => {
                const clientDate = formatDateToISO(client.payment_due_date);
                const match = clientDate === filterDueDate;
                if (match) {
                    console.log('Cliente encontrado:', client.name, 'Data original:', client.payment_due_date, 'Data formatada:', clientDate);
                }
                return match;
            });
            console.log('Clientes após filtro:', filtered.length);
        }

        // Filtro por status de pagamento (Pendente/Pago)
        if (filterPaymentStatus) {
            filtered = filtered.filter(client => client.payment_status === filterPaymentStatus);
        }
        
        // Ordenação
        if (sortBy === 'pet-az') {
            filtered = [...filtered].sort((a, b) => a.pet_name.localeCompare(b.pet_name));
        } else if (sortBy === 'owner-az') {
            filtered = [...filtered].sort((a, b) => a.owner_name.localeCompare(b.owner_name));
        } else {
            // Ordenação padrão por nome do tutor
            filtered = [...filtered].sort((a, b) => a.owner_name.localeCompare(b.owner_name));
        }
        
        return filtered;
    }, [monthlyClients, searchTerm, filterCondominium, filterDueDate, sortBy, filterPaymentStatus]);

    const handleTogglePaymentStatus = async (client: MonthlyClient, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent the card's onClick from firing
        const newStatus = client.payment_status === 'Pendente' ? 'Pago' : 'Pendente';
        const originalStatus = client.payment_status;

        // Optimistic UI update
        setMonthlyClients(prevClients =>
            prevClients.map(c =>
                c.id === client.id ? { ...c, payment_status: newStatus } : c
            )
        );

        const { error } = await supabase
            .from('monthly_clients')
            .update({ payment_status: newStatus })
            .eq('id', client.id);

        if (error) {
            // Revert on error
            setMonthlyClients(prevClients =>
                prevClients.map(c =>
                    c.id === client.id ? { ...c, payment_status: originalStatus } : c
                )
            );
            setAlertInfo({ title: 'Erro de Atualização', message: 'Não foi possível alterar o status do pagamento. Tente novamente.', variant: 'error' });
        }
    };

    const handleAddExtraServices = (client: MonthlyClient) => {
        setMonthlyClientForExtraServices(client);
        setIsMonthlyExtraServicesModalOpen(true);
    };

    const handleExtraServicesSuccess = (updatedClient: MonthlyClient) => {
        setMonthlyClients(prev => prev.map(client => client.id === updatedClient.id ? updatedClient : client));
        setIsMonthlyExtraServicesModalOpen(false);
        setMonthlyClientForExtraServices(null);
        onDataChanged();
    };

    const getMonthlyDbId = (id: any) => {
        const s = String(id ?? '');
        return /^\d+$/.test(s) ? Number(s) : id;
    };

    const handleMonthlyPetPhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMonthlyUploadError(null);
        const input = (e.currentTarget.elements.namedItem('monthly_pet_photo') as HTMLInputElement);
        const file = input?.files?.[0];
        if (!file) { setMonthlyUploadError('Selecione uma imagem'); return; }
        setIsUploadingMonthlyPhoto(true);
        try {
            const mc = uploadTargetMonthlyClient as MonthlyClient;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const base = (mc.id || mc.pet_name.replace(/\s+/g,'_'));
            const path = `${base}_${Date.now()}.${ext}`;
            const oldUrl = (mc as any).pet_photo_url as string | undefined;
            if (oldUrl) {
                try {
                    const u = new URL(oldUrl);
                    const prefix = '/storage/v1/object/public/monthly_pet_photos/';
                    const idx = u.pathname.indexOf(prefix);
                    if (idx !== -1) {
                        const oldPath = u.pathname.substring(idx + prefix.length);
                        await supabase.storage.from('monthly_pet_photos').remove([oldPath]);
                    }
                } catch {}
            }
            const { error: upErr } = await supabase.storage.from('monthly_pet_photos').upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('monthly_pet_photos').getPublicUrl(path);
            const publicUrl = data.publicUrl;
            const { error: dbErr } = await supabase.from('monthly_clients').update({ pet_photo_url: publicUrl }).eq('id', getMonthlyDbId(mc.id)).select().single();
            if (dbErr) throw dbErr;
            setMonthlyClients(prev => prev.map(c => c.id === mc.id ? { ...c, pet_photo_url: publicUrl } : c));
            setIsUploadMonthlyPhotoModalOpen(false);
            setUploadTargetMonthlyClient(null);
        } catch (err: any) {
            setMonthlyUploadError(err.message || 'Falha ao enviar');
        } finally {
            setIsUploadingMonthlyPhoto(false);
            setSelectedMonthlyPhotoName('');
        }
    };

    return (
        <>
            {alertInfo && <AlertModal isOpen={!!alertInfo} onClose={() => setAlertInfo(null)} title={alertInfo.title} message={alertInfo.message} variant={alertInfo.variant} />}
            {editingClient && <EditMonthlyClientAdvancedModal client={editingClient} onClose={() => setEditingClient(null)} onMonthlyClientUpdated={handleUpdateSuccess} />}
            {deletingClient && <ConfirmationModal isOpen={!!deletingClient} onClose={() => setDeletingClient(null)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja excluir o mensalista ${deletingClient.pet_name}? Todos os seus agendamentos futuros também serão removidos.`} confirmText="Excluir" variant="danger" isLoading={isDeleting} />}
            
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Mensalistas</h2>
                        <p className="text-sm text-gray-600 text-center">Meus Clientes Mensalistas</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button
                            onClick={onAddClient}
                            title="Adicionar Mensalista"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <img alt="Adicionar Mensalista" className="h-6 w-6" src="https://i.imgur.com/19QrZ6g.png" />
                        </button>
                        
                        <button
                            onClick={() => setShowFilterPanel(!showFilterPanel)}
                            title="Filtros"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-gray-100 text-gray-700 font-semibold h-11 px-5 text-base rounded-lg hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <img alt="Filtros" className="h-6 w-6" src="https://cdn-icons-png.flaticon.com/512/9702/9702724.png" />
                        </button>
                        <button
                            onClick={() => setViewMode(prev => prev === 'cards' ? 'stack' : prev === 'stack' ? 'list' : 'cards')}
                            title="Visualização"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <img alt="Visualização" className="w-6 h-6" src={viewMode === 'cards' ? 'https://i.imgur.com/JsRhJWq.png' : (viewMode === 'stack' ? 'https://i.imgur.com/oz6qjaI.png' : 'https://i.imgur.com/vRrOtbI.png')} />
                        </button>
                        <button
                            onClick={() => setShowStatisticsModal(true)}
                            title="Estatísticas"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Buscar por nome do pet ou dono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                </div>
            </div>
            
            {/* Painel de Filtros */}
            {showFilterPanel && (
                <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filtros e Ordenação
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Filtro por Condomínio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
                            <select
                                value={filterCondominium}
                                onChange={(e) => setFilterCondominium(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todos os condomínios</option>
                                {Array.from(new Set(monthlyClients.map(client => client.condominium))).sort().map(condo => (
                                    <option key={condo} value={condo}>{condo === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : condo}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Filtro por Data de Vencimento */}
                        <div>
                            <DatePicker
                                value={filterDueDate}
                                onChange={setFilterDueDate}
                                label="Data de Vencimento"
                                className="w-full"
                                disableWeekends={false}
                            />
                        </div>
                        
                        {/* Filtro por Status de Pagamento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status de Pagamento</label>
                            <select
                                value={filterPaymentStatus}
                                onChange={(e) => setFilterPaymentStatus(e.target.value as '' | 'Pendente' | 'Pago')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Todos</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Pago">Pago</option>
                            </select>
                        </div>

                        {/* Ordenação */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Padrão (Tutor A-Z)</option>
                                <option value="pet-az">Pet A-Z</option>
                                <option value="owner-az">Tutor A-Z</option>
                            </select>
                        </div>
                        
                        {/* Botão Limpar Filtros */}
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setFilterCondominium('');
                                    setFilterDueDate('');
                                    setFilterPaymentStatus('');
                                    setSortBy('');
                                }}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Limpar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {loading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
                filteredClients.length > 0 ? (
                    viewMode === 'cards' ? (
                        // Visualização em Cards com carrossel horizontal no mobile
                        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory md:mx-0 md:px-0 md:grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {filteredClients.map(client => (
                                <div key={client.id} className="flex-none w-full max-w-[420px] lg:max-w-[460px] md:min-w-0 snap-center px-4">
                                    <MonthlyClientCard
                                        client={client}
                                        onEdit={() => setEditingClient(client)}
                                        onDelete={() => setDeletingClient(client)}
                                        onAddExtraServices={() => handleAddExtraServices(client)}
                                        onTogglePaymentStatus={(clientArg, e) => handleTogglePaymentStatus(clientArg, e)}
                                        isClientInDaycare={isClientInDaycare(client)}
                                        onChangePhoto={(mc) => { setUploadTargetMonthlyClient(mc); setIsUploadMonthlyPhotoModalOpen(true); }}
                                        onView={(mc) => setViewingClient(mc)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : viewMode === 'stack' ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredClients.map(client => (
                                <div key={client.id} className="px-4">
                                    <MonthlyClientCard
                                        client={client}
                                        onEdit={() => setEditingClient(client)}
                                        onDelete={() => setDeletingClient(client)}
                                        onAddExtraServices={() => handleAddExtraServices(client)}
                                        onTogglePaymentStatus={(clientArg, e) => handleTogglePaymentStatus(clientArg, e)}
                                        isClientInDaycare={isClientInDaycare(client)}
                                        onChangePhoto={(mc) => { setUploadTargetMonthlyClient(mc); setIsUploadMonthlyPhotoModalOpen(true); }}
                                        onView={(mc) => setViewingClient(mc)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Visualização em Lista
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {filteredClients.map(client => (
                                    <div key={client.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-x-4 gap-y-2 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEditingClient(client)}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{client.pet_name}</p>
                                            <p className="text-base text-gray-600 truncate">{client.owner_name}</p>
                                            {client.condominium && (
                                                <p className="text-sm text-gray-500 truncate">
                                                    <span className="font-medium">Condomínio:</span> {client.condominium === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : client.condominium}
                                                </p>
                                            )}
                                        </div>
                                        <div className="w-full sm:w-auto flex items-center justify-between mt-2 sm:mt-0">
                                           <div className="flex items-center gap-3 flex-wrap">
                                                <p className="text-xs text-pink-800 bg-pink-100 font-semibold py-1 px-2 rounded-full truncate">
                                                   {getRecurrenceText(client)}
                                               </p>
                                               <p className="text-xs text-purple-800 bg-purple-100 font-semibold py-1 px-2 rounded-full truncate">
                                                   Plano: {getPlanLabel(client)}
                                               </p>
                                               <p className="text-xs text-green-800 bg-green-100 font-semibold py-1 px-2 rounded-full truncate">
                                                   Próximo: {getNextAppointmentDateText(client)}
                                               </p>
                                               <p className="text-xs text-blue-800 bg-blue-100 font-semibold py-1 px-2 rounded-full truncate">
                                                   Vencimento: {formatDateToBR(getCurrentMonthPaymentDueISO())}
                                               </p>
                                               <button
                                                    onClick={(e) => handleTogglePaymentStatus(client, e)}
                                                    className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap transition-colors ${
                                                        client.payment_status === 'Pendente' 
                                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    }`}
                                                >
                                                    {client.payment_status === 'Pendente' ? 'Pagamento Pendente' : 'Pagamento Realizado'}
                                                </button>
                                           </div>
                                            <div className="flex-shrink-0 flex items-center gap-1 sm:ml-4" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setEditingClient(client)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-blue-700 transition-colors" aria-label="Editar mensalista"><EditIcon /></button>
                                                <button onClick={() => setDeletingClient(client)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-700 transition-colors" aria-label="Excluir mensalista"><DeleteIcon /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            {searchTerm.trim() ? 'Nenhum resultado encontrado' : 'Nenhum mensalista cadastrado'}
                        </h3>
                        <p className="text-gray-500">
                            {searchTerm.trim() 
                                ? `Não encontramos mensalistas para "${searchTerm}".` 
                                : 'Comece adicionando seu primeiro cliente mensalista.'
                            }
                        </p>
                    </div>
                )
            )}

            {/* Modal de Serviços Extras para Mensalistas */}
            {isMonthlyExtraServicesModalOpen && monthlyClientForExtraServices && (
                <ExtraServicesModal
                    isOpen={isMonthlyExtraServicesModalOpen}
                    onClose={() => {
                        setIsMonthlyExtraServicesModalOpen(false);
                        setMonthlyClientForExtraServices(null);
                    }}
                    onSuccess={handleExtraServicesSuccess}
                    data={monthlyClientForExtraServices}
                    type="monthly"
                    title="Serviços Extras - Cliente Mensalista"
                />
            )}


            {/* Modal de Estatísticas de Mensalistas */}
            <MonthlyClientsStatisticsModal
                isOpen={showStatisticsModal}
                onClose={() => setShowStatisticsModal(false)}
            />

            {viewingClient && (
                <MonthlyClientDetailsModal client={viewingClient} onClose={() => setViewingClient(null)} />
            )}

            {isUploadMonthlyPhotoModalOpen && uploadTargetMonthlyClient && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Trocar foto do pet</h3>
                        <form onSubmit={handleMonthlyPetPhotoUpload}>
                            <input id="monthly_pet_photo_input" type="file" name="monthly_pet_photo" accept="image/*" className="sr-only" onChange={(e) => setSelectedMonthlyPhotoName(e.target.files?.[0]?.name || '')} />
                            <div className="flex items-center gap-3 mb-4">
                                <label htmlFor="monthly_pet_photo_input" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">Escolher arquivo</label>
                                <span className="text-sm text-gray-600">{selectedMonthlyPhotoName || 'Nenhum arquivo selecionado'}</span>
                            </div>
                            {monthlyUploadError && <p className="text-red-600 text-sm mb-2">{monthlyUploadError}</p>}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsUploadMonthlyPhotoModalOpen(false); setUploadTargetMonthlyClient(null); setSelectedMonthlyPhotoName(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancelar</button>
                                <button type="submit" disabled={isUploadingMonthlyPhoto} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50">{isUploadingMonthlyPhoto ? 'Enviando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

// Add Extra Services Modal for Hotel
// Monthly Client Card Component
const MonthlyClientCard: React.FC<{
    client: MonthlyClient;
    onClick?: (client: MonthlyClient) => void;
    onEdit: (client: MonthlyClient) => void;
    onDelete: (client: MonthlyClient) => void;
    onAddExtraServices: (client: MonthlyClient) => void;
    onTogglePaymentStatus: (client: MonthlyClient, e: React.MouseEvent) => void;
    isClientInDaycare?: boolean;
    onChangePhoto: (client: MonthlyClient) => void;
    onView: (client: MonthlyClient) => void;
}> = ({ client, onClick, onEdit, onDelete, onAddExtraServices, onTogglePaymentStatus, isClientInDaycare = false, onChangePhoto, onView }) => {
    
    const getRecurrenceText = (client: MonthlyClient) => {
        if (client.recurrence_type === 'weekly') return 'Semanal';
        if (client.recurrence_type === 'bi-weekly') return 'Quinzenal';
        if (client.recurrence_type === 'monthly') return 'Mensal';
        return 'Não definido';
    };

    const formatDateToBR = (dateString: string) => {
        // Evitar conversão de fuso: tratar como data pura (YYYY-MM-DD)
        const datePart = (dateString || '').split('T')[0];
        const parts = datePart.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    const calculateTotalInvoiceValue = (client: MonthlyClient) => {
        let total = Number(client.price || 0);
        
        if (client.extra_services) {
            // Usar os valores dinâmicos dos serviços extras
            if (client.extra_services.pernoite?.enabled) {
                total += Number(client.extra_services.pernoite.value || 0);
            }
            if (client.extra_services.banho_tosa?.enabled) {
                total += Number(client.extra_services.banho_tosa.value || 0);
            }
            if (client.extra_services.so_banho?.enabled) {
                total += Number(client.extra_services.so_banho.value || 0);
            }
            if (client.extra_services.adestrador?.enabled) {
                total += Number(client.extra_services.adestrador.value || 0);
            }
            if ((client.extra_services as any).hidratacao?.enabled) {
                total += Number((client.extra_services as any).hidratacao?.value || 0);
            }
            if (client.extra_services.despesa_medica?.enabled) {
                total += Number(client.extra_services.despesa_medica.value || 0);
            }
            if (client.extra_services.dias_extras?.quantity > 0) {
                total += (client.extra_services.dias_extras.quantity * Number(client.extra_services.dias_extras.value || 0));
            }
        }
        
        return total;
    };

    const totalInvoiceValue = calculateTotalInvoiceValue(client);
    const hasMonthlyExtras: boolean = Boolean(
        client.extra_services && (
            client.extra_services.pernoite?.enabled ||
            client.extra_services.banho_tosa?.enabled ||
            client.extra_services.so_banho?.enabled ||
            client.extra_services.adestrador?.enabled ||
            client.extra_services.despesa_medica?.enabled ||
            (client.extra_services.dias_extras?.quantity > 0)
        )
    );

    const weekDaysLabel: Record<number, string> = { 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira' };
    const recurrenceDayLabel = client.recurrence_type === 'monthly' ? `Dia ${client.recurrence_day}` : (weekDaysLabel[client.recurrence_day] || String(client.recurrence_day));
    const recurrenceTimeLabel = `${String(client.recurrence_time).padStart(2, '0')}:00`;
    const condoLabel = client.condominium ? (client.condominium === 'Nenhum Condomínio' ? 'Banho & Tosa Fixo' : client.condominium) : null;

    return (
        <div 
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform md:hover:scale-[1.02] cursor-pointer overflow-hidden border border-gray-100 w-full max-w-full mx-auto min-h-0 md:min-h-[65vh] flex flex-col"
            onClick={() => onClick(client)}
        >
            {/* Header do Card */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 sm:p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <img
                            src={client.pet_photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'}
                            alt={client.pet_name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); onChangePhoto(client); }}
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg sm:text-xl font-bold truncate">{client.pet_name}</h3>
                                {isClientInDaycare && (
                                    <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
                                        🏠 Creche
                                    </span>
                                )}
                            </div>
                            <div className="mt-0.5">
                                <span className="text-[11px] sm:text-xs font-semibold text-pink-100 bg-pink-600/30 px-2 sm:px-3 py-0.5 rounded-full">
                                    {getRecurrenceText(client)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-pink-100">Valor Total</p>
                        <p className="text-base sm:text-lg font-bold">R$ {totalInvoiceValue.toFixed(2).replace('.', ',')}
                            {hasMonthlyExtras && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700" title="Serviços extras adicionados">(i)</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
                {condoLabel && (
                    <div className="flex items-center space-x-2 text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <span className="text-sm font-medium">Condomínio:</span>
                        <span className="text-sm truncate">{condoLabel}</span>
                    </div>
                )}
                
                {/* Informações básicas */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tutor</p>
                        <p className="text-gray-800 font-medium">{client.owner_name || 'Não informado'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</p>
                        <p className="text-gray-800 font-medium">
                            {(() => {
                                const raw = String(client.whatsapp || '');
                                const digits = raw.replace(/\D/g, '');
                                const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
                                const href = withCountry ? `https://api.whatsapp.com/send?phone=${withCountry}` : '#';
                                return raw ? (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800 underline break-all">{raw}</a>
                                ) : (
                                    'Não informado'
                                );
                            })()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Serviço</p>
                        <p className="text-gray-800 font-medium">{client.service || 'Não informado'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preço Base</p>
                        <p className="text-gray-800 font-medium">R$ {Number(client.price || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                    
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">DIA</p>
                        <p className="text-gray-800 font-medium">{recurrenceDayLabel}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">HORA</p>
                        <p className="text-gray-800 font-medium">{recurrenceTimeLabel}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Próximo agendamento</p>
                        <p className="text-gray-800 font-medium">{getNextAppointmentDateText(client)}</p>
                    </div>
                </div>

                {/* Data de Pagamento (exibe data de vencimento como referência de pagamento) */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de pagamento</p>
                        <p className="text-gray-800 font-medium">{formatDateToBR(getCurrentMonthPaymentDueISO())}</p>
                    </div>
                </div>

                {client.extra_services && (
                    (() => {
                        const ex = client.extra_services as any;
                        const hasExtras = Boolean(
                            (ex?.pernoite?.enabled || ex?.pernoite === true) ||
                            (ex?.banho_tosa?.enabled || ex?.banho_tosa === true) ||
                            (ex?.so_banho?.enabled || ex?.so_banho === true) ||
                            (ex?.adestrador?.enabled || ex?.adestrador === true) ||
                            (ex?.despesa_medica?.enabled || ex?.despesa_medica === true) ||
                            (ex?.hidratacao?.enabled || ex?.hidratacao === true) ||
                            (((ex?.dias_extras?.quantity ?? 0) > 0))
                        );
                        if (!hasExtras) return null;
                        return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="text-sm text-gray-600 font-semibold mb-2">Serviços Extras:</div>
                                <div className="flex flex-wrap gap-1">
                                    {(ex?.pernoite?.enabled || ex?.pernoite === true) && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Pernoite</span>
                                    )}
                                    {(ex?.banho_tosa?.enabled || ex?.banho_tosa === true) && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Banho & Tosa</span>
                                    )}
                                    {(ex?.so_banho?.enabled || ex?.so_banho === true) && (
                                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">Só banho</span>
                                    )}
                                    {(ex?.adestrador?.enabled || ex?.adestrador === true) && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Adestrador</span>
                                    )}
                                    {(ex?.despesa_medica?.enabled || ex?.despesa_medica === true) && (
                                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Despesa médica</span>
                                    )}
                                    {(ex?.hidratacao?.enabled || ex?.hidratacao === true) && (
                                        <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full">Hidratação</span>
                                    )}
                                    {((ex?.dias_extras?.quantity ?? 0) > 0) && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">{ex?.dias_extras?.quantity} dia{ex?.dias_extras?.quantity > 1 ? 's' : ''} extra{ex?.dias_extras?.quantity > 1 ? 's' : ''}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                )}

                {/* Status do Pagamento */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-sm font-medium text-gray-600">Status do Pagamento:</span>
                    <button
                        onClick={(e) => onTogglePaymentStatus(client, e)}
                        className={`px-4 py-2 text-sm font-bold rounded-full transition-all duration-200 ${
                            client.payment_status === 'Pendente' 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
                        }`}
                    >
                        {client.payment_status === 'Pendente' ? '⏳ Pendente' : '✅ Pago'}
                    </button>
                </div>
            </div>

            <div className="p-2 bg-gray-50 border-t border-gray-100">
                <div className="grid grid-cols-4 gap-1.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddExtraServices(client); }}
                        className="w-full bg-purple-100 text-purple-700 py-1.5 px-2 rounded-md hover:bg-purple-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Extras</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onView(client); }}
                        className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        aria-label="Visualizar mensalista"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Visualizar</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                        className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        aria-label="Editar mensalista"
                    >
                        <EditIcon className="w-4 h-4" />
                        <span>Editar</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                        className="w-full bg-red-50 text-red-600 py-1.5 px-2 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        aria-label="Excluir mensalista"
                    >
                        <DeleteIcon className="w-4 h-4" />
                        <span>Excluir</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DaycareEnrollmentCard: React.FC<{
    enrollment: DaycareRegistration;
    onClick: () => void;
    onEdit: (enrollment: DaycareRegistration) => void;
    onDelete: (enrollment: DaycareRegistration) => void;
    onAddExtraServices: (enrollment: DaycareRegistration) => void;
    sectionId: 'pending' | 'approved' | 'inDaycare';
    isDraggable?: boolean;
    onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
    onChangePhoto: (enrollment: DaycareRegistration) => void;
    onOpenDiary?: (enrollment: DaycareRegistration) => void;
    onApprove?: (enrollment: DaycareRegistration) => void;
    onTogglePaymentStatus?: (enrollment: DaycareRegistration) => void;
    paymentUpdatingId?: string | null;
}> = ({ enrollment, onClick, onEdit, onDelete, onAddExtraServices, sectionId, isDraggable = false, onDragStart, onChangePhoto, onOpenDiary, onApprove, onTogglePaymentStatus, paymentUpdatingId }) => {
    const { created_at, pet_name, tutor_name, contracted_plan, status } = enrollment;
    const formatTimeText = (time: string | null | undefined): string => {
        if (!time) return 'Não definido';
        const s = String(time);
        const m = s.match(/^(\d{1,2}):(\d{2})/);
        return m ? `${m[1].padStart(2,'0')}:${m[2]}` : s;
    };
    const checkInTimeText = formatTimeText(enrollment.check_in_time);
    const checkOutTimeText = formatTimeText(enrollment.check_out_time);

    const statusStyles: Record<string, string> = {
        'Pendente': 'bg-blue-100 text-blue-800',
        'Aprovado': 'bg-green-100 text-green-800',
        'Rejeitado': 'bg-red-100 text-red-800',
    };

    const planLabels: Record<string, string> = {
      '4x_month': '4x no Mês',
      '8x_month': '8x no Mês',
      '12x_month': '12x no Mês',
      '16x_month': '16x no Mês',
      '20x_month': '20x no Mês',
      '2x_week': '2x por Semana',
      '3x_week': '3x por Semana',
      '4x_week': '4x por Semana',
      '5x_week': '5x por Semana',
    };

    const buildWhatsAppLink = (phone: string) => {
        const digits = String(phone || '').replace(/\D/g, '');
        const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
        return withCountry ? `https://wa.me/${withCountry}` : '#';
    };

    // Calcular o valor total da fatura
    const invoiceTotal = calculateDaycareInvoiceTotal(enrollment);

    return (
        <div 
            draggable={isDraggable}
            onDragStart={isDraggable ? onDragStart : undefined}
            onClick={onClick}
            className={`bg-white rounded-2xl shadow-md overflow-hidden transition-transform transform hover:scale-[1.02] flex flex-col min-h-[360px] ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        >
            <div className="p-5 flex-grow">
                <div className="rounded-xl mb-3 p-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={enrollment.pet_photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} alt={enrollment.pet_name} className="w-10 h-10 rounded-full object-cover cursor-pointer" onClick={(e) => { e.stopPropagation(); onChangePhoto(enrollment); }} />
                        <div>
                            <p className="text-2xl font-bold leading-none">{pet_name}</p>
                            <p className="text-xs opacity-90">{tutor_name}</p>
                            {(() => {
                                const raw = String(enrollment.last_vaccine || '');
                                if (!raw) return null;
                                const datePart = raw.split('T')[0];
                                const parts = datePart.split('-').map(Number);
                                if (parts.length !== 3 || parts.some(isNaN)) return null;
                                const last = new Date(parts[0], parts[1] - 1, parts[2]);
                                const now = new Date();
                                const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays > 365) {
                                    return (
                                        <div className="mt-1 flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-md">
                                            <img src="https://cdn-icons-png.flaticon.com/512/564/564619.png" alt="Alerta" className="h-4 w-4" />
                                            <span className="min-w-0 truncate whitespace-nowrap leading-none text-[10px] sm:text-[11px] font-semibold">Última vacina há mais de um ano</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs opacity-90">Valor Total</p>
                        <p className="text-lg font-extrabold">R$ {invoiceTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
                <div className="mb-3">
                    <div className="flex items-center justify-between">
                        <div className={`px-3 py-1 text-[11px] font-bold rounded-full whitespace-nowrap truncate ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>{status}</div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-gray-500">Status do pagamento</span>
                            {(() => {
                                const current = (enrollment.payment_status === 'Pago') ? 'Pago' : 'Pendente';
                                const cls = current === 'Pago'
                                    ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                    : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
                                return (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus && onTogglePaymentStatus(enrollment); }}
                                        disabled={paymentUpdatingId === enrollment.id}
                                        className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate border ${cls}`}
                                        title={current === 'Pago' ? 'Marcar como pendente' : 'Marcar como pago'}
                                    >
                                        {paymentUpdatingId === enrollment.id ? 'Atualizando...' : current}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-700">
                        <TagIcon />
                        <span className="font-semibold mr-2">Plano</span> {contracted_plan ? planLabels[contracted_plan] : 'Não informado'}
                    </div>
                </div>
                
                <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                            <WhatsAppIcon />
                            {enrollment.contact_phone ? (
                                <a href={buildWhatsAppLink(enrollment.contact_phone)} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                                    {enrollment.contact_phone}
                                </a>
                            ) : (
                                <span>Sem telefone</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <CalendarIcon className="h-5 w-5" />
                            <span>Início:</span>
                            <span className="font-semibold">{formatDateToBR(enrollment.check_in_date || null)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <img src="https://cdn-icons-png.flaticon.com/512/9576/9576046.png" alt="Entrada Icon" className="h-5 w-5" />
                            <span>Entrada:</span>
                            <span className="font-semibold">{checkInTimeText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <img src="https://cdn-icons-png.flaticon.com/512/9576/9576053.png" alt="Saída Icon" className="h-5 w-5" />
                            <span>Saída:</span>
                            <span className="font-semibold">{checkOutTimeText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <CalendarIcon className="h-5 w-5" />
                            <span>
                                Dias da semana: {(enrollment.attendance_days && enrollment.attendance_days.length > 0) 
                                    ? (enrollment.attendance_days as any[]).map((idx: number) => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][idx]).join(', ') 
                                    : 'Não informado'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Serviços Extras */}
                    {enrollment.extra_services && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="text-sm text-gray-600 font-semibold mb-2">Serviços Extras:</div>
                            <div className="flex flex-wrap gap-1">
                                {((enrollment as any).extra_services?.pernoite?.enabled || (enrollment as any).extra_services?.pernoite === true) && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Pernoite</span>
                                )}
                                {((enrollment as any).extra_services?.banho_tosa?.enabled || (enrollment as any).extra_services?.banho_tosa === true) && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Banho & Tosa</span>
                                )}
                                {((enrollment as any).extra_services?.so_banho?.enabled || (enrollment as any).extra_services?.so_banho === true) && (
                                    <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">Só banho</span>
                                )}
                                {((enrollment as any).extra_services?.adestrador?.enabled || (enrollment as any).extra_services?.adestrador === true) && (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Adestrador</span>
                                )}
                                {((enrollment as any).extra_services?.despesa_medica?.enabled || (enrollment as any).extra_services?.despesa_medica === true) && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Despesa médica</span>
                                )}
                                {(((enrollment as any).extra_services?.dias_extras?.quantity ?? 0) > 0) && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                                        {(enrollment as any).extra_services.dias_extras.quantity} dia{(enrollment as any).extra_services.dias_extras.quantity > 1 ? 's' : ''} extra{(enrollment as any).extra_services.dias_extras.quantity > 1 ? 's' : ''}
                                    </span>
                                )}
                                {(!((enrollment as any).extra_services?.pernoite?.enabled || (enrollment as any).extra_services?.banho_tosa?.enabled || (enrollment as any).extra_services?.so_banho?.enabled || (enrollment as any).extra_services?.adestrador?.enabled || (enrollment as any).extra_services?.despesa_medica?.enabled || (((enrollment as any).extra_services?.dias_extras?.quantity ?? 0) > 0) || (enrollment as any).extra_services?.pernoite === true || (enrollment as any).extra_services?.banho_tosa === true || (enrollment as any).extra_services?.so_banho === true || (enrollment as any).extra_services?.adestrador === true || (enrollment as any).extra_services?.despesa_medica === true || (typeof (enrollment as any).extra_services?.dia_extra === 'number' && (enrollment as any).extra_services?.dia_extra > 0))) && (
                                    <span className="text-xs text-gray-500">Nenhum serviço extra</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                    {status === 'Pendente' && onApprove && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onApprove(enrollment); }}
                            className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span>Aprovar</span>
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onAddExtraServices(enrollment); }}
                        className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        title="Adicionar Serviços Extras"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span>Extras</span>
                    </button>
                    {(sectionId === 'approved' || sectionId === 'inDaycare') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenDiary && onOpenDiary(enrollment); }}
                            className="w-full bg-purple-200 text-black py-1.5 px-2 rounded-md hover:bg-purple-300 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                            title="Diário"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
                                <circle cx="9" cy="10" r="1" fill="currentColor" />
                                <circle cx="15" cy="10" r="1" fill="currentColor" />
                                <path d="M8 14c1.5 1 3 1.5 4 1.5s2.5-.5 4-1.5" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span>Diário</span>
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(enrollment); }}
                        className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        aria-label="Editar matrícula"
                    >
                        <EditIcon className="w-4 h-4" />
                        <span>Editar</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(enrollment); }}
                        className="w-full bg-red-50 text-red-600 py-1.5 px-2 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                        aria-label="Excluir matrícula"
                    >
                        <DeleteIcon className="w-4 h-4" />
                        <span>Excluir</span>
                    </button>
                </div>
             </div>
        </div>
    );
};









const DaycareEnrollmentDetailsModal: React.FC<{
    enrollment: DaycareRegistration;
    onClose: () => void;
    onUpdateStatus: (id: string, status: 'Pendente' | 'Aprovado' | 'Rejeitado') => void;
    isUpdating: boolean;
    onAddExtraServices?: (enrollment: DaycareRegistration) => void;
}> = ({ enrollment, onClose, onUpdateStatus, isUpdating, onAddExtraServices }) => {
    const { id, status } = enrollment;

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-gray-800">{value || 'Não informado'}</p>
        </div>
    );

    const planLabels: Record<string, string> = {
        '4x_month': '4x no Mês', '8x_month': '8x no Mês', '12x_month': '12x no Mês', '16x_month': '16x no Mês', '20x_month': '20x no Mês',
        '2x_week': '2x por Semana', '3x_week': '3x por Semana', '4x_week': '4x por Semana', '5x_week': '5x por Semana',
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-rose-50 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scaleIn">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-gray-800">Detalhes da Matrícula</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><CloseIcon /></button>
                    </div>
                    <p className="text-gray-600">Revisão completa dos dados para {enrollment.pet_name}.</p>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Pet Info */}
                    <section>
                        <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Dados do Pet</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <DetailItem label="Nome do Pet" value={enrollment.pet_name} />
                            <DetailItem label="Raça" value={enrollment.pet_breed} />
                            <DetailItem label="Idade" value={enrollment.pet_age} />
                            <DetailItem label="Sexo" value={enrollment.pet_sex} />
                            <DetailItem label="Castrado(a)" value={enrollment.is_neutered ? 'Sim' : 'Não'} />
                            <DetailItem label="Desconto Irmão" value={enrollment.has_sibling_discount ? 'Sim (10%)' : 'Não'} />
        </div>
        
      </section>
                     {/* Tutor Info */}
                    <section>
                        <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Dados do Tutor</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <DetailItem label="Nome do Tutor" value={enrollment.tutor_name} />
                            <DetailItem label="RG" value={enrollment.tutor_rg} />
                            <DetailItem label="Telefone" value={enrollment.contact_phone} />
                            <DetailItem label="Contato de Emergência" value={enrollment.emergency_contact_name} />
                            <DetailItem label="Telefone do Veterinário" value={enrollment.vet_phone} />
                            <DetailItem label="Endereço" value={enrollment.address} />
          </div>
          
        </section>
                     {/* Health Info */}
                    <section>
                        <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Saúde e Comportamento</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                           <DetailItem label="Se dá bem com outros animais?" value={enrollment.gets_along_with_others ? 'Sim' : 'Não'} />
                           <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <DetailItem label="Última Vacina" value={formatDateToBR(enrollment.last_vaccine)} />
                              <DetailItem label="Último Vermífugo" value={formatDateToBR(enrollment.last_deworming)} />
                              <DetailItem label="Último Antipulgas" value={formatDateToBR(enrollment.last_flea_remedy)} />
                           </div>
                           <DetailItem label="Possui Alergias?" value={enrollment.has_allergies ? 'Sim' : 'Não'} />
                           {enrollment.has_allergies && <DetailItem label="Descrição da Alergia" value={enrollment.allergies_description} />}
                           <DetailItem label="Necessita de Cuidados Especiais?" value={enrollment.needs_special_care ? 'Sim' : 'Não'} />
                           {enrollment.needs_special_care && <DetailItem label="Descrição do Cuidado" value={enrollment.special_care_description} />}
          </div>
          
        </section>
                    {/* Plan & Belongings */}
                    <section>
                         <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Plano, Pertences e Detalhes Financeiros</h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                             <DetailItem label="Plano Contratado" value={enrollment.contracted_plan ? planLabels[enrollment.contracted_plan] : 'N/A'} />
                            <DetailItem label="Itens Entregues" value={(enrollment.delivered_items?.items ?? []).join(', ')} />
                            <DetailItem label="Outros Itens" value={enrollment.delivered_items?.other ?? ''} />
                             <DetailItem label="Valor Total" value={enrollment.total_price ? `R$ ${Number(enrollment.total_price).toFixed(2).replace('.', ',')}` : 'N/A'} />
                             <DetailItem label="Data Pagamento" value={formatDateToBR(enrollment.payment_date || null)} />
                         </div>
                    </section>
                    
                    {/* Dates & Attendance */}
                    <section>
                        <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Datas, Horários e Dias</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <DetailItem label="Data de Matrícula" value={formatDateToBR(enrollment.enrollment_date || null)} />
                            <DetailItem label="Entrada" value={(enrollment.check_in_date ? `${formatDateToBR(enrollment.check_in_date)} ${String(enrollment.check_in_time ?? '').split(':').slice(0,2).join(':')}` : 'Não informado')} />
                            <DetailItem label="Saída" value={(enrollment.check_out_date ? `${formatDateToBR(enrollment.check_out_date)} ${String(enrollment.check_out_time ?? '').split(':').slice(0,2).join(':')}` : 'Não informado')} />
                            <DetailItem label="Dias da Semana" value={(enrollment.attendance_days && enrollment.attendance_days.length > 0) ? (enrollment.attendance_days as any[]).map((idx: number) => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][idx]).join(', ') : 'Não informado'} />
                        </div>
                    </section>

                    {/* Extra Services */}
                    {enrollment.extra_services && (
                        <section>
                            <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-4">Serviços Extras</h3>
                            {(() => {
                                const es: any = (enrollment as any).extra_services || {};
                                const priceBRL = (v: any) => {
                                    const num = Number(v || 0);
                                    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                };
                                const getQtyPriceValue = (qty?: any, price?: any, fallback?: number) => {
                                    const q = Number(qty || 0);
                                    const p = price !== undefined && price !== null ? Number(price) : (fallback ?? 0);
                                    return q > 0 ? `${q} × ${priceBRL(p)}` : priceBRL(p);
                                };
                                const rows: { label: string; value: string | React.ReactNode }[] = [];
                                // New format
                                if (es.pernoite?.enabled) rows.push({ label: 'Pernoite', value: getQtyPriceValue(es.pernoite.quantity, es.pernoite.value) });
                                if (es.banho_tosa?.enabled) rows.push({ label: 'Banho & Tosa', value: getQtyPriceValue(es.banho_tosa.quantity, es.banho_tosa.value) });
                                if (es.so_banho?.enabled) rows.push({ label: 'Só banho', value: getQtyPriceValue(es.so_banho.quantity, es.so_banho.value) });
                                if (es.adestrador?.enabled) rows.push({ label: 'Adestrador', value: getQtyPriceValue(es.adestrador.quantity, es.adestrador.value) });
                                if (es.despesa_medica?.enabled) rows.push({ label: 'Despesa médica', value: getQtyPriceValue(es.despesa_medica.quantity, es.despesa_medica.value) });
                                if ((es.dias_extras?.quantity ?? 0) > 0) rows.push({ label: 'Dias extras', value: getQtyPriceValue(es.dias_extras.quantity, es.dias_extras.value) });
                                // Old format
                                if (es.pernoite === true) rows.push({ label: 'Pernoite', value: getQtyPriceValue(es.pernoite_quantity, es.pernoite_price) });
                                if (es.banho_tosa === true) rows.push({ label: 'Banho & Tosa', value: getQtyPriceValue(es.banho_tosa_quantity, es.banho_tosa_price) });
                                if (es.so_banho === true) rows.push({ label: 'Só banho', value: getQtyPriceValue(es.so_banho_quantity, es.so_banho_price) });
                                if (es.adestrador === true) rows.push({ label: 'Adestrador', value: getQtyPriceValue(es.adestrador_quantity, es.adestrador_price) });
                                if (es.despesa_medica === true) rows.push({ label: 'Despesa médica', value: getQtyPriceValue(es.despesa_medica_quantity, es.despesa_medica_price) });
                                if ((es.dia_extra ?? 0) > 0) rows.push({ label: 'Dias extras', value: getQtyPriceValue(es.dia_extra, es.dia_extra_price) });
                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                        {rows.length > 0 ? rows.map(r => (<DetailItem key={r.label} label={r.label} value={r.value} />)) : <span className="text-sm text-gray-500">Nenhum serviço extra</span>}
                                    </div>
                                );
                            })()}
                        </section>
                    )}
                </div>
                <div className="p-6 bg-white mt-auto rounded-b-2xl">
                    <div className="flex justify-between items-center">
                        {/* Botão Adicionar Serviços Extras */}
                        {onAddExtraServices && (
                            <button 
                                onClick={() => onAddExtraServices(enrollment)}
                                className="bg-purple-500 text-white font-bold py-3.5 px-4 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                            >
                                <span>+</span>
                                Adicionar Serviços Extras
                            </button>
                        )}
                        
                        {/* Botões de Status */}
                        {status === 'Pendente' ? (
                            <div className="flex items-center gap-3">
                                <button onClick={() => onUpdateStatus(id!, 'Rejeitado')} disabled={isUpdating} className="bg-red-500 text-white font-bold py-3.5 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-300">Rejeitar</button>
                                <button onClick={() => onUpdateStatus(id!, 'Aprovado')} disabled={isUpdating} className="bg-green-500 text-white font-bold py-3.5 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300">{isUpdating ? <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-white mx-auto"></div> : 'Aprovar'}</button>
                            </div>
                        ) : (
                             <div className="text-gray-600 font-semibold">Esta matrícula já foi {status === 'Aprovado' ? 'aprovada' : 'rejeitada'}.</div>
                        )}
                    </div>
                </div>
                </div>
        </div>,
        document.body
    );
};

const EditDaycareEnrollmentModal: React.FC<{
    enrollment: DaycareRegistration;
    onClose: () => void;
    onUpdated: (updatedEnrollment: DaycareRegistration) => void;
}> = ({ enrollment, onClose, onUpdated }) => {
    const [formData, setFormData] = useState<DaycareRegistration>(enrollment);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Ensure date fields are in YYYY-MM-DD format for the input[type=date]
        const formattedEnrollment = {
            ...enrollment,
            last_vaccine: enrollment.last_vaccine?.split('T')[0] || '',
            last_deworming: enrollment.last_deworming?.split('T')[0] || '',
            last_flea_remedy: enrollment.last_flea_remedy?.split('T')[0] || '',
            payment_date: enrollment.payment_date?.split('T')[0] || '',
            delivered_items: (enrollment as any).delivered_items || { items: [], other: '' },
            enrollment_date: (enrollment.enrollment_date || '').split('T')[0] || '',
            check_in_date: (enrollment.check_in_date || '').split('T')[0] || '',
            check_out_date: (enrollment.check_out_date || '').split('T')[0] || '',
            check_in_time: enrollment.check_in_time ? String(enrollment.check_in_time).split(':').slice(0,2).join(':') : '',
            check_out_time: enrollment.check_out_time ? String(enrollment.check_out_time).split(':').slice(0,2).join(':') : '',
        };
        const es: any = (enrollment as any).extra_services || {};
        const flattenEs: any = {
            pernoite: es?.pernoite?.enabled === true || es?.pernoite === true || false,
            pernoite_quantity: es?.pernoite?.quantity ?? es?.pernoite_quantity ?? undefined,
            pernoite_price: es?.pernoite?.value ?? es?.pernoite_price ?? undefined,
            banho_tosa: es?.banho_tosa?.enabled === true || es?.banho_tosa === true || false,
            banho_tosa_quantity: es?.banho_tosa?.quantity ?? es?.banho_tosa_quantity ?? undefined,
            banho_tosa_price: es?.banho_tosa?.value ?? es?.banho_tosa_price ?? undefined,
            so_banho: es?.so_banho?.enabled === true || es?.so_banho === true || false,
            so_banho_quantity: es?.so_banho?.quantity ?? es?.so_banho_quantity ?? undefined,
            so_banho_price: es?.so_banho?.value ?? es?.so_banho_price ?? undefined,
            adestrador: es?.adestrador?.enabled === true || es?.adestrador === true || false,
            adestrador_quantity: es?.adestrador?.quantity ?? es?.adestrador_quantity ?? undefined,
            adestrador_price: es?.adestrador?.value ?? es?.adestrador_price ?? undefined,
            despesa_medica: es?.despesa_medica?.enabled === true || es?.despesa_medica === true || false,
            despesa_medica_quantity: es?.despesa_medica?.quantity ?? es?.despesa_medica_quantity ?? undefined,
            despesa_medica_price: es?.despesa_medica?.value ?? es?.despesa_medica_price ?? undefined,
            dia_extra: (typeof es?.dia_extra === 'number' && es?.dia_extra > 0) || (es?.dias_extras?.quantity ?? 0) > 0 ? true : false,
            dia_extra_quantity: es?.dia_extra ?? es?.dias_extras?.quantity ?? undefined,
            dia_extra_price: es?.dia_extra_price ?? es?.dias_extras?.value ?? undefined,
        };
        setFormData({ ...formattedEnrollment, ...flattenEs });
    }, [enrollment]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const shouldFormat = name === 'contact_phone' || name === 'vet_phone';
        setFormData(prev => ({ ...prev, [name]: shouldFormat ? formatWhatsapp(value) : value }));
    };

    const handleRadioChange = (name: keyof DaycareRegistration, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    // Cálculo automático removido - valor total agora é inserido manualmente

    const handleBelongingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const newBelongings = checked
                ? [...prev.delivered_items.items, value]
                : prev.delivered_items.items.filter(item => item !== value);
            return { ...prev, delivered_items: { ...prev.delivered_items, items: newBelongings } };
        });
    };
    const handleOtherBelongingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, delivered_items: { ...prev.delivered_items, other: value } }));
    };
    
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
                const payload: Partial<DaycareRegistration> & { extra_services?: any } = {
                pet_name: formData.pet_name || '',
                pet_breed: formData.pet_breed || '',
                is_neutered: formData.is_neutered,
                pet_sex: formData.pet_sex || '',
                pet_age: formData.pet_age || '',
                has_sibling_discount: formData.has_sibling_discount || false,
                tutor_name: formData.tutor_name || '',
                tutor_rg: formData.tutor_rg || '',
                address: formData.address || '',
                contact_phone: formData.contact_phone || '',
                emergency_contact_name: formData.emergency_contact_name || '',
                vet_phone: formData.vet_phone || '',
                gets_along_with_others: formData.gets_along_with_others,
                last_vaccine: formData.last_vaccine || null,
                last_deworming: formData.last_deworming || null,
                last_flea_remedy: formData.last_flea_remedy || null,
                has_allergies: formData.has_allergies,
                allergies_description: formData.has_allergies ? formData.allergies_description : null,
                needs_special_care: formData.needs_special_care,
                special_care_description: formData.needs_special_care ? formData.special_care_description : null,
                delivered_items: formData.delivered_items,
                contracted_plan: formData.contracted_plan,
                total_price: formData.total_price ? parseFloat(String(formData.total_price)) : null,
                payment_date: formData.payment_date || null,
                status: formData.status,
                pet_photo_url: formData.pet_photo_url,
                check_in_date: formData.check_in_date || null,
                check_in_time: formData.check_in_time || null,
                check_out_date: formData.check_out_date || null,
                check_out_time: formData.check_out_time || null,
                attendance_days: formData.attendance_days || [],
                enrollment_date: formData.enrollment_date || null,
            };
            (payload as any).extra_services = (() => {
                const es: any = (formData as any);
                const getNum = (v: any) => v === '' || v === undefined || v === null ? undefined : Number(v);
                return {
                    pernoite: es.pernoite || false,
                    pernoite_quantity: es.pernoite ? getNum(es.pernoite_quantity ?? 1) : undefined,
                    pernoite_price: es.pernoite ? getNum(es.pernoite_price ?? 0) : undefined,
                    banho_tosa: es.banho_tosa || false,
                    banho_tosa_quantity: es.banho_tosa ? getNum(es.banho_tosa_quantity) : undefined,
                    banho_tosa_price: es.banho_tosa ? getNum(es.banho_tosa_price) : undefined,
                    so_banho: es.so_banho || false,
                    so_banho_quantity: es.so_banho ? getNum(es.so_banho_quantity) : undefined,
                    so_banho_price: es.so_banho ? getNum(es.so_banho_price) : undefined,
                    adestrador: es.adestrador || false,
                    adestrador_quantity: es.adestrador ? getNum(es.adestrador_quantity) : undefined,
                    adestrador_price: es.adestrador ? getNum(es.adestrador_price) : undefined,
                    despesa_medica: es.despesa_medica || false,
                    despesa_medica_quantity: es.despesa_medica ? getNum(es.despesa_medica_quantity) : undefined,
                    despesa_medica_price: es.despesa_medica ? getNum(es.despesa_medica_price) : undefined,
                    dia_extra: es.dia_extra ? getNum(es.dia_extra_quantity) : undefined,
                    dia_extra_price: es.dia_extra ? getNum(es.dia_extra_price) : undefined,
                };
            })();
            delete (payload as any).created_at; // Do not send created_at on update
            
            const { data, error } = await supabase.from('daycare_enrollments').update(payload).eq('id', enrollment.id).select().single();
            if (error) throw error;
            
            onUpdated(data as DaycareRegistration);

        } catch (error: any) {
            alert(`Erro ao atualizar: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderRadioGroup = (label: string, name: keyof DaycareRegistration, options: { label: string, value: any }[]) => (
        <div>
            <label className="block text-base font-semibold text-gray-700 mb-1">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button type="button" key={opt.label} onClick={() => handleRadioChange(name, opt.value)}
                        className={`px-4 py-3.5 rounded-lg border text-sm font-semibold transition-colors ${formData[name as keyof typeof formData] === opt.value ? 'bg-pink-300 text-black border-pink-600' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
    
    return createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <form onSubmit={handleUpdate} className="bg-rose-50 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scaleIn">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-3xl font-bold text-gray-800">Editar Matrícula</h2>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Pet and Tutor Info */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <h3 className="md:col-span-2 text-lg font-semibold text-pink-700 border-b pb-2 mb-2">Dados do Pet</h3>
                        <div><label className="block text-base font-semibold text-gray-700">Nome</label><input type="text" name="pet_name" value={formData.pet_name} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">Raça</label><input type="text" name="pet_breed" value={formData.pet_breed} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">Idade</label><input type="text" name="pet_age" value={formData.pet_age} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">Sexo</label><input type="text" name="pet_sex" value={formData.pet_sex} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        {renderRadioGroup('Castrado (a)', 'is_neutered', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                        <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-700">Foto do Pet (URL)</label><input type="url" name="pet_photo_url" value={formData.pet_photo_url || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <h3 className="md:col-span-2 text-lg font-semibold text-pink-700 border-b pb-2 mb-2 mt-4">Dados do Tutor</h3>
                        <div><label className="block text-base font-semibold text-gray-700">Tutor</label><input type="text" name="tutor_name" value={formData.tutor_name} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">RG</label><input type="text" name="tutor_rg" value={formData.tutor_rg} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-700">Endereço</label><input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">Telefone</label><input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div><label className="block text-base font-semibold text-gray-700">Emergência</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                        <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-700">Telefone Vet.</label><input type="text" name="vet_phone" value={formData.vet_phone} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                    </div>
                     {/* Health & Plan */}
                     <div className="space-y-6">
                       <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-2">Saúde, Plano e Status</h3>
                       {renderRadioGroup('Se dá bem com outros animais', 'gets_along_with_others', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                       {renderRadioGroup('Alergias', 'has_allergies', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                       {formData.has_allergies && (
                           <div>
                               <label className="block text-base font-semibold text-gray-700 mb-1">Alergias (descreva)</label>
                               <textarea name="allergies_description" value={formData.allergies_description || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" rows={2} />
                           </div>
                       )}
                       {renderRadioGroup('Cuidados especiais', 'needs_special_care', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                       {formData.needs_special_care && (
                           <div>
                               <label className="block text-base font-semibold text-gray-700 mb-1">Cuidado especial (descreva)</label>
                               <textarea name="special_care_description" value={formData.special_care_description || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" rows={2} />
                           </div>
                       )}
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                           <div><label className="block text-base font-semibold text-gray-700">Última vacina</label><input type="date" name="last_vaccine" value={formData.last_vaccine} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                           <div><label className="block text-base font-semibold text-gray-700">Último vermífugo</label><input type="date" name="last_deworming" value={formData.last_deworming} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                           <div><label className="block text-base font-semibold text-gray-700">Último antipulgas</label><input type="date" name="last_flea_remedy" value={formData.last_flea_remedy} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md"/></div>
                       </div>
                        {renderRadioGroup('Plano (Mensal)', 'contracted_plan', [ {label: '4 X MÊS', value: '4x_month'}, {label: '8 X MÊS', value: '8x_month'}, {label: '12 X MÊS', value: '12x_month'}, {label: '16 X MÊS', value: '16x_month'}, {label: '20 X MÊS', value: '20x_month'}])}
                        
                        <div className="space-y-6">
                            <h4 className="text-base font-semibold text-pink-700 border-b pb-1">Objetos entregues</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['Bolinha','Pelucia','Cama','Coleira','Comedouro'].map(item => (
                                    <label key={item} className="flex items-center gap-2 text-gray-700 font-medium bg-white p-3 rounded-lg border-2 border-gray-200">
                                        <input type="checkbox" value={item} checked={formData.delivered_items.items.includes(item)} onChange={handleBelongingsChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                        {item}
                                    </label>
                                ))}
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-gray-700">Outros</label>
                                <input type="text" name="other_belongings" value={formData.delivered_items.other} onChange={handleOtherBelongingsChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-base font-semibold text-pink-700 border-b pb-1">Datas, Horários e Dias</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-700">Data de Matrícula</label>
                                    <input type="date" name="enrollment_date" value={formData.enrollment_date || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700">Data de Entrada</label>
                                    <input type="date" name="check_in_date" value={formData.check_in_date || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700">Horário de Entrada</label>
                                    <select name="check_in_time" value={formData.check_in_time || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md">
                                        <option value="">Selecionar</option>
                                        {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                            const h = 7 + Math.floor(i / 2);
                                            const m = i % 2 ? '30' : '00';
                                            const t = `${String(h).padStart(2,'0')}:${m}`;
                                            return (<option key={t} value={t}>{t}</option>);
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700">Data de Saída</label>
                                    <input type="date" name="check_out_date" value={formData.check_out_date || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700">Horário de Saída</label>
                                    <select name="check_out_time" value={formData.check_out_time || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md">
                                        <option value="">Selecionar</option>
                                        {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                            const h = 7 + Math.floor(i / 2);
                                            const m = i % 2 ? '30' : '00';
                                            const t = `${String(h).padStart(2,'0')}:${m}`;
                                            return (<option key={t} value={t}>{t}</option>);
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-base font-semibold text-gray-700 mb-1">Dias da Semana</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((label, idx) => (
                                        <label key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold bg-white text-gray-700">
                                            <input type="checkbox" checked={(formData.attendance_days || []).includes(idx)} onChange={() => {
                                                setFormData(prev => {
                                                    const current = prev.attendance_days || [];
                                                    const exists = current.includes(idx);
                                                    const next = exists ? current.filter(d => d !== idx) : [...current, idx];
                                                    return { ...prev, attendance_days: next };
                                                });
                                            }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Extra Services */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold text-pink-700 border-b pb-1">Serviços Extras</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {/* Pernoite */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.pernoite || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                pernoite: e.target.checked,
                                                pernoite_quantity: e.target.checked ? (prev.pernoite_quantity || 1) : undefined,
                                                pernoite_price: e.target.checked ? (prev.pernoite_price || 0) : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Pernoite</span>
                                    </div>
                                    {formData.pernoite && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.pernoite_quantity || 1}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        pernoite_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.pernoite_price || 0}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        pernoite_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Banho & Tosa */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.banho_tosa || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                banho_tosa: e.target.checked,
                                                banho_tosa_quantity: e.target.checked ? (prev.banho_tosa_quantity || '') : undefined,
                                                banho_tosa_price: e.target.checked ? (prev.banho_tosa_price || '') : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Banho & Tosa</span>
                                    </div>
                                    {formData.banho_tosa && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.banho_tosa_quantity || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        banho_tosa_quantity: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.banho_tosa_price || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        banho_tosa_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Só banho */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.so_banho || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                so_banho: e.target.checked,
                                                so_banho_quantity: e.target.checked ? (prev.so_banho_quantity || '') : undefined,
                                                so_banho_price: e.target.checked ? (prev.so_banho_price || '') : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Só banho</span>
                                    </div>
                                    {formData.so_banho && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.so_banho_quantity || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        so_banho_quantity: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.so_banho_price || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        so_banho_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Adestrador */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.adestrador || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                adestrador: e.target.checked,
                                                adestrador_quantity: e.target.checked ? (prev.adestrador_quantity || '') : undefined,
                                                adestrador_price: e.target.checked ? (prev.adestrador_price || '') : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Adestrador</span>
                                    </div>
                                    {formData.adestrador && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.adestrador_quantity || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        adestrador_quantity: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.adestrador_price || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        adestrador_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Despesa médica */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.despesa_medica || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                despesa_medica: e.target.checked,
                                                despesa_medica_quantity: e.target.checked ? (prev.despesa_medica_quantity || '') : undefined,
                                                despesa_medica_price: e.target.checked ? (prev.despesa_medica_price || '') : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Despesa médica</span>
                                    </div>
                                    {formData.despesa_medica && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.despesa_medica_quantity || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        despesa_medica_quantity: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.despesa_medica_price || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        despesa_medica_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Dia extra */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.dia_extra || false}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                dia_extra: e.target.checked,
                                                dia_extra_quantity: e.target.checked ? (prev.dia_extra_quantity || '') : undefined,
                                dia_extra_price: e.target.checked ? (prev.dia_extra_price || '') : undefined
                                            }))}
                                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                        />
                                        <span className="text-gray-700 font-medium">Dia extra</span>
                                    </div>
                                    {formData.dia_extra && (
                                        <div className="flex gap-2 ml-6">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">Qtd:</span>
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={formData.dia_extra_quantity || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        dia_extra_quantity: e.target.value
                                                    }))}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm text-gray-600">R$:</span>
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.dia_extra_price || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        dia_extra_price: e.target.value
                                                    }))}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-base font-semibold text-gray-700">Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md">
                                <option value="Pendente">Pendente</option>
                                <option value="Aprovado">Aprovado</option>
                                <option value="Rejeitado">Rejeitado</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-base font-semibold text-gray-700">Valor Total</label>
                            <input type="number" name="total_price" value={formData.total_price ?? ''} onChange={handleInputChange} className="mt-1 block w-full p-2 bg-gray-50 border rounded-md" />
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-white mt-auto rounded-b-2xl flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-lg">Cancelar</button>
                    <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-3.5 px-4 rounded-lg disabled:bg-gray-400">{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</button>
                </div>
            </form>
        </div>,
        document.body
    );
};

const HotelRegistrationForm: React.FC<{
    setView?: (view: 'scheduler' | 'login' | 'hotelRegistration') => void;
    onSuccess?: () => void;
}> = ({ setView, onSuccess }) => {
    const [formData, setFormData] = useState<HotelRegistration>({
        pet_name: '', pet_sex: null, pet_breed: '', is_neutered: null, pet_age: '',
        pet_weight: null,
        tutor_name: '', tutor_rg: '', tutor_address: '', tutor_phone: '', tutor_email: '', tutor_social_media: '',
        veterinarian: '', vet_phone: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
        has_rg_document: null, has_residence_proof: null, has_vaccination_card: null, has_vet_certificate: null,
        has_flea_tick_remedy: null, flea_tick_remedy_date: '', photo_authorization: null, retrieve_at_checkout: null,
        preexisting_disease: null, allergies: null, behavior: null, fears_traumas: null, wounds_marks: null,
        food_brand: null, food_quantity: null, feeding_frequency: null, food_observations: null, accepts_treats: null, special_food_care: null,
        check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '',
        service_bath: null, service_transport: null, service_daily_rate: null, service_extra_hour: null,
        service_vet: null, service_training: null, total_services_price: 0, additional_info: '',
        professional_name: '', registration_date: new Date().toISOString().split('T')[0],
        tutor_check_in_signature: '', tutor_check_out_signature: '', tutor_signature: '', declaration_accepted: false, status: 'Ativo',
        last_vaccination_date: '',
        extra_services: {
            pernoite: false, pernoite_quantity: 0, pernoite_price: 0,
            banho_tosa: false, banho_tosa_price: 0,
            so_banho: false, so_banho_price: 0,
            adestrador: false, adestrador_price: 0,
            despesa_medica: false, despesa_medica_price: 0,
            dias_extras: false, dias_extras_quantity: 0, dias_extras_price: 0
        }
    });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!formData.payment_date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const defaultPaymentDate = `${year}-${month}-30`;
            setFormData(prev => ({ ...prev, payment_date: defaultPaymentDate }));
        }
    }, []);
    const [isExtraServicesExpanded, setIsExtraServicesExpanded] = useState(false);
    const [step, setStep] = useState(1);
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [checkInHour, setCheckInHour] = useState<number | null>(null);
    const [checkOutHour, setCheckOutHour] = useState<number | null>(null);
    const [serviceBathText, setServiceBathText] = useState('');
    const [serviceTransportText, setServiceTransportText] = useState('');
    const [serviceDailyText, setServiceDailyText] = useState('');
    const [serviceExtraHourText, setServiceExtraHourText] = useState('');
    const [serviceTrainingText, setServiceTrainingText] = useState('');
    const [hasPreexistingDisease, setHasPreexistingDisease] = useState(false);
    const [needsSpecialFoodCare, setNeedsSpecialFoodCare] = useState(false);
    const [hasBehavior, setHasBehavior] = useState(false);
    const [hasFearsTraumas, setHasFearsTraumas] = useState(false);
    const [hasWoundsMarks, setHasWoundsMarks] = useState(false);
    const [hasAllergies, setHasAllergies] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showCheckinWarning, setShowCheckinWarning] = useState(false);

    const holidaySet = new Set(['12-23','12-24','12-25','12-30','12-31','1-1']);
    function addDays(base: Date, days: number) {
        const r = new Date(base);
        r.setDate(r.getDate() + days);
        return r;
    }
    function getEasterDate(year: number) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const L = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * L) / 451);
        const month = Math.floor((h + L - 7 * m + 114) / 31); // 3=March, 4=April
        const day = ((h + L - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }
    function isHoliday(date: Date) {
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const key = `${m}-${d}`;
        if (holidaySet.has(key)) return true;
        const year = date.getFullYear();
        const easter = getEasterDate(year);
        const goodFriday = addDays(easter, -2);
        const easterSaturday = addDays(easter, -1);
        const easterSunday = easter;
        const carnivalMonday = addDays(easter, -48);
        const carnivalTuesday = addDays(easter, -47);
        const cmp = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        return (
            cmp(date, goodFriday) ||
            cmp(date, easterSaturday) ||
            cmp(date, easterSunday) ||
            cmp(date, carnivalMonday) ||
            cmp(date, carnivalTuesday)
        );
    }
    function normalizeWeight(w: any): 'UP_TO_5' | 'KG_10' | 'KG_20' {
        if (w === 'UP_TO_5') return 'UP_TO_5';
        if (w === 'KG_10' || w === 'KG_15') return 'KG_10';
        return 'KG_20';
    }
    function getLengthBracket(n: number): '2_3' | '4_5' | '6_7' {
        if (n <= 3) return '2_3';
        if (n <= 5) return '4_5';
        return '6_7';
    }
    const priceBase = {
        '2_3': { UP_TO_5: 100, KG_10: 120, KG_20: 150 },
        '4_5': { UP_TO_5: 90, KG_10: 110, KG_20: 140 },
        '6_7': { UP_TO_5: 80, KG_10: 100, KG_20: 130 },
    } as const;
    const priceHoliday = { UP_TO_5: 120, KG_10: 140, KG_20: 160 } as const;
    function calculateTotal(ci: string | null, co: string | null, w: any) {
        if (!ci || !co) return { total: 0, nDiarias: 0, holidayDates: [] as Date[] };
        const ciPart = (ci || '').split('T')[0];
        const coPart = (co || '').split('T')[0];
        const ciParts = ciPart.split('-').map(Number);
        const coParts = coPart.split('-').map(Number);
        if (ciParts.length !== 3 || coParts.length !== 3) return { total: 0, nDiarias: 0, holidayDates: [] as Date[] };
        const start = new Date(ciParts[0], ciParts[1] - 1, ciParts[2]);
        const end = new Date(coParts[0], coParts[1] - 1, coParts[2]);
        const days: Date[] = [];
        const cur = new Date(start);
        while (cur < end) {
            days.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        if (days.length === 0) {
            days.push(new Date(start)); // mínimo de 1 diária mesmo se check-out no mesmo dia
        }
        const bracket = getLengthBracket(days.length);
        const normalized = normalizeWeight(w);
        let total = 0;
        const holidayDates: Date[] = [];
        for (const d of days) {
            if (isHoliday(d)) {
                total += priceHoliday[normalized];
                holidayDates.push(d);
            } else {
                total += priceBase[bracket][normalized];
            }
        }
        return { total, nDiarias: days.length, holidayDates };
    }

    useEffect(() => {
        if (checkInDate && checkInHour !== null) {
            const dateStr = checkInDate.toISOString().split('T')[0];
            const timeStr = `${checkInHour.toString().padStart(2, '0')}:00`;
            setFormData(prev => ({ ...prev, check_in_date: dateStr, check_in_time: timeStr }));
        }
    }, [checkInDate, checkInHour]);

    useEffect(() => {
        if (checkOutDate && checkOutHour !== null) {
            const dateStr = checkOutDate.toISOString().split('T')[0];
            const timeStr = `${checkOutHour.toString().padStart(2, '0')}:00`;
            setFormData(prev => ({ ...prev, check_out_date: dateStr, check_out_time: timeStr }));
        }
    }, [checkOutDate, checkOutHour]);

    // Cálculo automático do total de serviços


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            // Permite digitação livre para campos numéricos, sem conversão imediata
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            const shouldFormat = name === 'tutor_phone' || name === 'emergency_contact_phone' || name === 'vet_phone';
            setFormData(prev => ({ ...prev, [name]: shouldFormat ? formatWhatsapp(value) : value }));
        }
    };

    const handleRadioChange = (name: keyof HotelRegistration, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.declaration_accepted) {
            alert('Por favor, aceite a declaração antes de prosseguir');
            return;
        }
        setIsSubmitting(true);
        try {
            const { total: computedTotal } = calculateTotal(formData.check_in_date || null, formData.check_out_date || null, formData.pet_weight);
            
            const payload = {
                pet_name: formData.pet_name || '',
                pet_sex: formData.pet_sex,
                pet_breed: formData.pet_breed || '',
                is_neutered: formData.is_neutered,
                pet_age: formData.pet_age || '',
                pet_weight: formData.pet_weight || null,
                tutor_name: formData.tutor_name || '',
                tutor_rg: formData.tutor_rg || '',
                tutor_address: formData.tutor_address || '',
                tutor_phone: formData.tutor_phone || '',
                tutor_email: formData.tutor_email || '',
                tutor_social_media: formData.tutor_social_media || '',
                vet_phone: formData.vet_phone || '',
                emergency_contact_name: formData.emergency_contact_name || '',
                emergency_contact_phone: formData.emergency_contact_phone || '',
                emergency_contact_relation: formData.emergency_contact_relation || '',
                has_rg_document: formData.has_rg_document,
                has_residence_proof: formData.has_residence_proof,
                has_vaccination_card: formData.has_vaccination_card,
                has_vet_certificate: formData.has_vet_certificate,
                has_flea_tick_remedy: formData.has_flea_tick_remedy,
                flea_tick_remedy_date: formData.flea_tick_remedy_date || null,
                last_vaccination_date: formData.last_vaccination_date || null,
                photo_authorization: formData.photo_authorization,
                retrieve_at_checkout: formData.retrieve_at_checkout,
                preexisting_disease: formData.preexisting_disease,
                allergies: formData.allergies,
                behavior: formData.behavior,
                fears_traumas: formData.fears_traumas,
                wounds_marks: formData.wounds_marks,
                food_brand: formData.food_brand,
                food_quantity: formData.food_quantity,
                feeding_frequency: formData.feeding_frequency,
                food_observations: formData.food_observations,
                accepts_treats: formData.accepts_treats,
                special_food_care: formData.special_food_care,
                check_in_date: formData.check_in_date || null,
                check_in_time: formData.check_in_time || null,
                check_out_date: formData.check_out_date || null,
                check_out_time: formData.check_out_time || null,
                service_bath: formData.service_bath,
                service_transport: formData.service_transport,
                service_daily_rate: formData.service_daily_rate,
                service_extra_hour: formData.service_extra_hour,
                service_vet: formData.service_vet,
                service_training: formData.service_training,
                total_services_price: computedTotal,
                additional_info: formData.additional_info || '',
                professional_name: formData.professional_name || '',
                registration_date: formData.registration_date || new Date().toISOString().split('T')[0],
                tutor_check_in_signature: formData.tutor_check_in_signature || '',
                tutor_check_out_signature: formData.tutor_check_out_signature || '',
                tutor_signature: formData.tutor_signature || '',
                declaration_accepted: formData.declaration_accepted || false,
                contract_accepted: formData.contract_accepted || false,
                status: formData.status || 'Ativo',
                extra_services: formData.extra_services || {},
                // Campos que existem na tabela mas podem estar faltando
                check_in_status: 'pending',
                checked_in_at: null,
                checked_out_at: null,
                payment_status: 'Pendente',
                responsible_signature: formData.tutor_signature || '', // Usar tutor_signature como fallback
                veterinarian: formData.veterinarian || ''
            };
            
            console.log('Payload completo:', payload);
            
            let { error } = await supabase.from('hotel_registrations').insert(payload);
            if (error) {
                const msg = String(error.message || '');
                if (msg.includes("pet_weight") && msg.includes("schema cache")) {
                    const fallback = { ...payload } as any;
                    delete fallback.pet_weight;
                    const weightLabel = formData.pet_weight ? PET_WEIGHT_OPTIONS[formData.pet_weight as PetWeight] : 'N/A';
                    fallback.additional_info = `${fallback.additional_info ? fallback.additional_info + '\n' : ''}Peso do Pet: ${weightLabel}`;
                    const retry = await supabase.from('hotel_registrations').insert(fallback);
                    error = retry.error;
                }
            }
            if (error) throw error;
            setShowCheckinWarning(false);
            setIsSuccess(true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            alert(`Erro ao criar registro de hotel: ${error.message}`);
            setIsSubmitting(false);
        }
    };
    
    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-pink-600 bg-opacity-90 flex items-center justify-center z-50 animate-fadeIn p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-full sm:max-w-sm mx-auto">
                    <SuccessIcon />
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">Solicitação Enviada!</h2>
                    <p className="text-gray-600 mt-2">Recebemos sua solicitação de check-in. Entraremos em contato em breve.</p>
                    <button onClick={() => setView && setView('scheduler')} className="mt-6 bg-pink-600 text-white font-bold py-3.5 px-8 rounded-lg hover:bg-pink-700 transition-colors">OK</button>
                </div>
            </div>
        );
    }

    const renderRadioGroup = (label: string, name: keyof HotelRegistration, options: { label: string, value: any }[]) => (
        <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                <button type="button" key={opt.label} onClick={() => handleRadioChange(name, opt.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${formData[name as keyof typeof formData] === opt.value ? 'bg-pink-300 text-black border-pink-600' : 'bg-white text-gray-700 border-gray-300 hover:border-pink-400'}`}>
                    {opt.label}
                </button>
                ))}
            </div>
        </div>
    );

    const hotelHours = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18];

    const onBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            setView && setView('scheduler');
        }
    };

    const isStep1Valid = formData.pet_name && formData.tutor_name && formData.tutor_phone && formData.pet_breed && formData.tutor_address;
    const isStep2Valid = true;
    const isStep3Valid = true;
    const isStep4Valid = formData.check_in_date && formData.check_in_time && formData.check_out_date && formData.check_out_time;
    const isStep5Valid = true;

    return (
        <div className="w-full max-w-3xl mx-auto bg-rose-50 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
            {/* Barra de etapas removida */}

            <form ref={formRef} onSubmit={handleSubmit} className="relative p-6 sm:p-8">
                {/* Seção 1: Dados do Pet e Tutor */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Dados do Pet e Tutor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 text-center">
                            <h4 className="text-lg font-bold text-gray-800">Dados Pet</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Pet *</label>
                            <input type="text" name="pet_name" value={formData.pet_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                            <select name="pet_sex" value={formData.pet_sex} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione o sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Fêmea">Fêmea</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Peso do Pet</label>
                            <select name="pet_weight" value={formData.pet_weight || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione o peso</option>
                                {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (
                                    <option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Raça</label>
                            <input type="text" name="pet_breed" value={formData.pet_breed} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Idade</label>
                            <input type="text" name="pet_age" value={formData.pet_age} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="md:col-span-2 text-center">
                            <h4 className="text-lg font-bold text-gray-800">Dados Tutor</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                            <input type="text" name="tutor_rg" value={formData.tutor_rg} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Tutor *</label>
                            <input type="text" name="tutor_name" value={formData.tutor_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                            <input type="tel" name="tutor_phone" value={formData.tutor_phone} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" name="tutor_email" value={formData.tutor_email} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                            <input type="text" name="tutor_address" value={formData.tutor_address} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rede Social (Instagram)</label>
                            <input type="text" name="tutor_social_media" value={formData.tutor_social_media || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="@perfil" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Nome</label>
                                <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Telefone</label>
                                <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Relação</label>
                                <input type="text" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção 2: Informações Médicas */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🏥 Informações Médicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Veterinário</label>
                            <input type="text" name="veterinarian" value={formData.veterinarian} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do Veterinário</label>
                            <input type="tel" name="vet_phone" value={formData.vet_phone || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Última vacinação</label>
                            <input type="date" name="last_vaccination_date" value={formData.last_vaccination_date || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={!!formData.is_neutered} onChange={(e) => setFormData(prev => ({...prev, is_neutered: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Castrado</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasPreexistingDisease} onChange={(e) => { setHasPreexistingDisease(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, preexisting_disease: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Doença pré-existente</label>
                        </div>
                        {hasPreexistingDisease && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descreva a doença pré-existente</label>
                                <textarea name="preexisting_disease" value={formData.preexisting_disease || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasBehavior} onChange={(e) => { setHasBehavior(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, behavior: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Comportamento</label>
                        </div>
                        {hasBehavior && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comportamento (descreva)</label>
                                <textarea name="behavior" value={formData.behavior || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasFearsTraumas} onChange={(e) => { setHasFearsTraumas(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, fears_traumas: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Medos/Traumas</label>
                        </div>
                        {hasFearsTraumas && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Medos/Traumas (descreva)</label>
                                <textarea name="fears_traumas" value={formData.fears_traumas || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasWoundsMarks} onChange={(e) => { setHasWoundsMarks(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, wounds_marks: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Feridas/Marcas</label>
                        </div>
                        {hasWoundsMarks && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Feridas/Marcas — marque na foto</label>
                                <textarea name="wounds_marks" value={formData.wounds_marks || ''} onChange={handleInputChange} placeholder="Descreva e marque na foto durante o check-in" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={2} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasAllergies} onChange={(e) => { setHasAllergies(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, allergies: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Alergias</label>
                        </div>
                        {hasAllergies && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Alergias (descreva)</label>
                                <textarea name="allergies" value={formData.allergies || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Seção 3: Alimentação */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🍽️ Alimentação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Marca da Ração</label>
                            <input type="text" name="food_brand" value={formData.food_brand || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade por Refeição</label>
                            <input type="text" name="food_quantity" value={formData.food_quantity || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Frequência de Alimentação</label>
                            <select name="feeding_frequency" value={formData.feeding_frequency || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione a frequência</option>
                                <option value="1x ao dia">1x ao dia</option>
                                <option value="2x ao dia">2x ao dia</option>
                                <option value="3x ao dia">3x ao dia</option>
                                <option value="Livre demanda">Livre demanda</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={(formData.accepts_treats || '') === 'Sim'} onChange={(e) => setFormData(prev => ({...prev, accepts_treats: e.target.checked ? 'Sim' : 'Não'}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Aceita petiscos</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={needsSpecialFoodCare} onChange={(e) => { setNeedsSpecialFoodCare(e.target.checked); if (!e.target.checked) setFormData(prev => ({...prev, special_food_care: null})); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Cuidado especial</label>
                        </div>
                        {needsSpecialFoodCare && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descreva o cuidado especial</label>
                                <textarea name="special_food_care" value={formData.special_food_care || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre Alimentação</label>
                            <textarea name="food_observations" value={formData.food_observations || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                        </div>
                    </div>
                </div>

                {/* Seção 4: Check-in e Check-out */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📅 Datas e Horários</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Check-in *</label>
                            <input type="date" name="check_in_date" value={formData.check_in_date} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Check-in *</label>
                            <select name="check_in_time" value={formData.check_in_time || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2,'0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Check-out *</label>
                            <input type="date" name="check_out_date" value={formData.check_out_date} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Check-out *</label>
                            <select name="check_out_time" value={formData.check_out_time || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2,'0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Seção 5: Serviços Adicionais */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => setIsExtraServicesExpanded(!isExtraServicesExpanded)}
                    >
                        <h3 className="text-xl font-bold text-gray-800">🛁 Serviços Adicionais</h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                                {isExtraServicesExpanded ? 'Ocultar' : 'Mostrar'} opções
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExtraServicesExpanded ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    
                    {isExtraServicesExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="bath" checked={formData.extra_services?.bath || false} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, bath: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Banho</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="transport" checked={formData.extra_services?.transport || false} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, transport: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Transporte</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="vet" checked={formData.extra_services?.vet || false} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, vet: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Veterinário</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="training" checked={formData.extra_services?.training || false} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, training: e.target.checked}}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Adestramento</label>
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Diária (quantidade de dias)</label>
                                    <input type="number" name="daily_rate" value={formData.extra_services.daily_rate} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, daily_rate: e.target.value === '' ? 0 : parseInt(e.target.value)}}))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora Extra (quantidade de horas)</label>
                                    <input type="number" name="extra_hour" value={formData.extra_services.extra_hour} onChange={(e) => setFormData(prev => ({...prev, extra_services: {...prev.extra_services, extra_hour: e.target.value === '' ? 0 : parseInt(e.target.value)}}))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
                                </div>
                                {/* Campo "Total dos Serviços" removido conforme solicitado */}
                            </div>
                        </div>
                    )}
                </div>

                {/* Seção 6: Informações Finais */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📝 Informações Finais</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Informações Adicionais</label>
                            <textarea name="additional_info" value={formData.additional_info} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={4} placeholder="Observações gerais, comportamento do pet, preferências, etc." />
                        </div>
                        
                        <div className="bg-white p-5 rounded-xl border border-pink-100">
                            <h4 className="text-lg font-bold text-pink-700 mb-3 text-center">Resumo do Check-in</h4>
                            {(() => {
                                const ciDate = formData.check_in_date || null;
                                const coDate = formData.check_out_date || null;
                                const ciTime = formData.check_in_time || '';
                                const coTime = formData.check_out_time || '';
                                const { total, nDiarias, holidayDates } = calculateTotal(ciDate, coDate, formData.pet_weight);
                                const pesoLabel = formData.pet_weight ? PET_WEIGHT_OPTIONS[formData.pet_weight as any] : '—';
                                const feriados = holidayDates.map(d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`).join(', ');
                                const extras: string[] = [];
                                if (formData.extra_services?.bath) extras.push('Banho');
                                if (formData.extra_services?.transport) extras.push('Transporte');
                                if (formData.extra_services?.vet) extras.push('Veterinário');
                                if (formData.extra_services?.training) extras.push('Adestramento');
                                return (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-semibold">Pet:</span> {formData.pet_name || '—'}</div>
                                            <div><span className="font-semibold">Peso:</span> {pesoLabel}</div>
                                            <div><span className="font-semibold">Tutor:</span> {formData.tutor_name || '—'}</div>
                                            <div><span className="font-semibold">Telefone:</span> {formData.tutor_phone || '—'}</div>
                                            <div><span className="font-semibold">Check-in:</span> {ciDate ? formatDateToBR(ciDate) : '—'} {ciTime ? `às ${ciTime}` : ''}</div>
                                            <div><span className="font-semibold">Check-out:</span> {coDate ? formatDateToBR(coDate) : '—'} {coTime ? `às ${coTime}` : ''}</div>
                                            <div><span className="font-semibold">Diárias:</span> {nDiarias || 0}</div>
                                            <div><span className="font-semibold">Feriados:</span> {feriados || '—'}</div>
                                        </div>
                                        {extras.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-semibold text-gray-800 mb-1">Serviços Adicionais</h5>
                                                <div className="flex flex-wrap gap-1">
                                                    {extras.map(e => (
                                                        <span key={e} className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-700">{e}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-2 p-3 rounded-lg bg-pink-50 border border-pink-100 text-center">
                                            <p className="text-base font-bold text-pink-700">Total do Serviço: R$ {total.toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="declaration_accepted" checked={formData.declaration_accepted || false} onChange={(e) => setFormData(prev => ({...prev, declaration_accepted: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" required />
                                <label className="text-sm text-gray-700">
                                    Declaro que todas as informações fornecidas são verdadeiras e autorizo o hotel pet a cuidar do meu animal de acordo com as instruções fornecidas. *
                                </label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="photo_authorization" checked={formData.photo_authorization || false} onChange={(e) => setFormData(prev => ({...prev, photo_authorization: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                <label className="text-sm text-gray-700">
                                    Autorizo o uso de fotos do meu pet para divulgação nas redes sociais do estabelecimento.
                                </label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="contract_accepted" checked={formData.contract_accepted || false} onChange={(e) => setFormData(prev => ({...prev, contract_accepted: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                <label className="text-sm text-gray-700">
                                    Concordo e estou de acordo com as cláusulas do <button type="button" onClick={() => setShowContractModal(true)} className="underline text-pink-700 hover:text-pink-800">Contrato de hospedagem da Sandy Pet Hotel</button>.
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assinatura do Tutor *</label>
                                <SignaturePad
                                    value={formData.tutor_signature}
                                    onChange={(dataUrl) => setFormData(prev => ({ ...prev, tutor_signature: dataUrl }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify_between items-center">
                    <button type="button" onClick={onBack} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-5 rounded-lg hover:bg_gray-300 transition-colors">Voltar</button>
                    <div className="flex-grow"></div>
                    <button 
                        type="button" 
                        disabled={
                            isSubmitting || 
                            !formData.declaration_accepted || 
                            !formData.contract_accepted || 
                            !formData.tutor_signature ||
                            !(formData.pet_name && formData.tutor_rg && formData.tutor_name && formData.tutor_phone && formData.tutor_address && formData.check_in_date && formData.check_out_date)
                        } 
                        onClick={() => setShowCheckinWarning(true)}
                        className="w-full md:w-auto bg-green-500 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
                    >
                        {isSubmitting ? 'Salvando...' : 'Solicitar Check-in'}
                    </button>
                </div>
            </form>
            {showCheckinWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-800">Antes de solicitar o check-in</h3>
                        <p className="text-gray-700 mt-2">No dia do check-in, o tutor deve levar:</p>
                        <ul className="mt-3 list-disc list-inside text-gray-700 space-y-1">
                            <li>RG</li>
                            <li>Comprovante de Residência</li>
                            <li>Carteira de Vacinação</li>
                            <li>Ração</li>
                            <li>Guia</li>
                            <li>Coberta</li>
                            <li>Comedouros</li>
                        </ul>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowCheckinWarning(false)} className="bg-gray-200 text-gray-800 font-bold py-2.5 px-5 rounded-lg hover:bg-gray-300 transition-colors">Voltar</button>
                            <button 
                                type="button" 
                                disabled={
                                    isSubmitting || 
                                    !formData.declaration_accepted || 
                                    !formData.contract_accepted || 
                                    !formData.tutor_signature ||
                                    !(formData.pet_name && formData.tutor_rg && formData.tutor_name && formData.tutor_phone && formData.tutor_address && formData.check_in_date && formData.check_out_date)
                                } 
                                onClick={() => formRef.current?.requestSubmit()}
                                className="w-full md:w-auto bg-green-500 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
                            >
                                Solicitar Check-in
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showContractModal && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Contrato de hospedagem da Sandy Pet Hotel</h3>
                            <button type="button" onClick={() => setShowContractModal(false)} className="p-2 rounded-md hover:bg-gray-100">✕</button>
                        </div>
                        <div className="p-4 space-y-3 text-sm text-gray-700">
                            <p><span className="font-semibold">Nome do Pet:</span> {formData.pet_name || '—'}</p>
                            <p><span className="font-semibold">Nome do Cliente (tutor):</span> {formData.tutor_name || '—'}</p>
                            <h4 className="font-semibold mt-2">Cláusula 1</h4>
                            <p>Será de responsabilidade do Hotel Sandys Pet, a alimentação (fornecida pelo tutor), hidratação, guarda e integridade física e mental do hóspede, no tempo de permanência do pet no Hotel.</p>
                            <p>1.1 Será seguida à risca as informações contidas na ficha de Check in/check out do hóspede, acordadas com o tutor.</p>
                            <p>1.2 O tutor receberá acesso às câmeras 24h para a vigilância do seu pet.</p>
                            <h4 className="font-semibold mt-2">Cláusula 2</h4>
                            <p>Acompanhamento do médico(a) veterinário(a), se necessário, os custos serão repassados ao tutor. A não ser que, o veterinário(a) específico do tutor venha atender o hóspede no local.</p>
                            <h4 className="font-semibold mt-2">Cláusula 3</h4>
                            <p>Em caso de óbito do hóspede, por morte natural ou por agravamento de doenças crônicas ou preexistentes, o Hotel não tem responsabilidade nenhuma.</p>
                            <p>3.1 O tutor poderá solicitar necropsia para comprovação da morte, porém as despesas serão por sua conta.</p>
                            <p>3.2 Se comprovada morte por má hospedagem, manejo ou acidente no Hotel enquanto hospedado, o ressarcimento terá o valor de um animal filhote.</p>
                            <h4 className="font-semibold mt-2">Cláusula 4</h4>
                            <p>Será exigida no check-in cópias dos seguintes documentos: RG e Comprovante de residência do tutor, carteira de vacinação do pet, receituário de remédios ou procedimentos e um atestado veterinário da boa saúde do pet.</p>
                            <p>4.1 Não aceitamos pet no cio.</p>
                            <p>4.2 Pet vacinado a menos de 15 dias, antes do check-in (se contrair algum vírus, a responsabilidade será do tutor).</p>
                            <p>4.3 Não aceitamos pets agressivos ou de difícil manejo.</p>
                            <p>4.4 Somente o tutor poderá retirar o pet (a não ser que tenha deixado previamente avisado a recepção do Hotel e colocado no check-in).</p>
                            <h4 className="font-semibold mt-2">Cláusula 5</h4>
                            <p>Pagamento integral no check-in do pet.</p>
                            <p>5.1 No check-out, atente-se aos dias e horários estabelecidos, para que não gerem taxas extras.</p>
                            <p>5.2 Se o tutor retirar o pet antes da data de check-out o valor da diária ou diárias não será devolvido.</p>
                            <p>5.3 Feriados prolongados, o tutor deverá fazer reserva antecipada e deixar 50% pago.</p>
                            <h4 className="font-semibold mt-2">Cláusula 6</h4>
                            <p>Todo o ambiente do Hotel é lavado e higienizado com produtos específicos, 2 a 3 vezes ao dia.</p>
                            <h4 className="font-semibold mt-2">Cláusula 7</h4>
                            <p>Se contratado serviço de banho e tosa, o mesmo será feito apenas no dia da entrega.</p>
                            <p>7.1 Na devolução do pet o tutor deverá examinar o mesmo, pois não aceitaremos reclamações posteriores.</p>
                            <p>7.2 Brinquedos e pertences devem estar com o nome do pet.</p>
                            <h4 className="font-semibold mt-2">Cláusula 8</h4>
                            <p>O pet que não for retirado (e o Hotel não conseguir contato), após 24 horas poderá ser doado, e o tutor responderá criminalmente por abandono de animais.</p>
                            <h4 className="font-semibold mt-2">Cláusula 9</h4>
                            <p>Pendências decorrentes deste contrato serão determinadas pelo Foro Central da Comarca da Capital/SP.</p>
                            <h4 className="font-semibold mt-2">Cláusula 10</h4>
                            <p>Os valores deste contrato poderão ser corrigidos sem aviso prévio.</p>
                            <p>Estando todas as partes em comum acordo e anexado aqui: check list (CHECK IN - CHECK OUT), CÓPIA DOS DOCUMENTOS CLÁUSULA 4.</p>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Fechar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// FIX: Renamed AddDaycareEnrollmentModal to DaycareRegistrationForm and converted it from a modal to a full-page component.
const DaycareRegistrationForm: React.FC<{
    setView?: (view: 'scheduler' | 'login' | 'daycareRegistration') => void;
    onBack?: () => void;
    onSuccess?: (newEnrollment: DaycareRegistration) => void;
    isAdmin?: boolean;
}> = ({ setView, onBack, onSuccess, isAdmin = false }) => {
    const [formData, setFormData] = useState<DaycareRegistration>({
        pet_name: '', pet_breed: '', is_neutered: null, pet_sex: '', pet_age: '', has_sibling_discount: false,
        tutor_name: '', tutor_rg: '', address: '', contact_phone: '', emergency_contact_name: '', vet_phone: '',
        gets_along_with_others: null, last_vaccine: '', last_deworming: '', last_flea_remedy: '',
        has_allergies: null, allergies_description: '', needs_special_care: null, special_care_description: '',
        delivered_items: { items: [], other: '' }, contracted_plan: null, total_price: undefined, payment_date: '',
        status: 'Pendente',
        check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '', attendance_days: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showSubmissionWarning, setShowSubmissionWarning] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const shouldFormat = name === 'contact_phone' || name === 'vet_phone';
        setFormData(prev => ({ ...prev, [name]: shouldFormat ? formatWhatsapp(value) : value }));
    };

    const handleRadioChange = (name: keyof DaycareRegistration, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleBelongingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const newItems = checked ? [...prev.delivered_items.items, value] : prev.delivered_items.items.filter(item => item !== value);
            return { ...prev, delivered_items: { ...prev.delivered_items, items: newItems } };
        });
    };
    const toggleAttendanceDay = (dayIndex: number) => {
        setFormData(prev => {
            const current = prev.attendance_days || [];
            const exists = current.includes(dayIndex);
            const next = exists ? current.filter(d => d !== dayIndex) : [...current, dayIndex];
            return { ...prev, attendance_days: next };
        });
    };
    
    const handleOtherBelongingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, delivered_items: { ...prev.delivered_items, other: value }}));
    }

    useEffect(() => {
        const base = formData.contracted_plan ? (DAYCARE_PLAN_PRICES[formData.contracted_plan] || 0) : 0;
        const discounted = formData.has_sibling_discount ? Number((base * 0.9).toFixed(2)) : base;
        setFormData(prev => (prev.total_price === discounted ? prev : { ...prev, total_price: discounted }));
    }, [formData.contracted_plan, formData.has_sibling_discount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowSubmissionWarning(false);
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                last_vaccine: formData.last_vaccine || null,
                last_deworming: formData.last_deworming || null,
                last_flea_remedy: formData.last_flea_remedy || null,
                total_price: formData.total_price ? parseFloat(String(formData.total_price)) : null,
                payment_date: formData.payment_date || null,
                enrollment_date: formData.enrollment_date || new Date().toISOString().split('T')[0],
            };
            
            
            const { data, error } = await supabase.from('daycare_enrollments').insert(payload).select().single();
            if (error) throw error;
            
            if (isAdmin && onSuccess) {
                onSuccess(data as DaycareRegistration);
            } else {
                setIsSuccess(true);
            }

        } catch (error: any) {
            alert(`Erro ao criar matrícula: ${error.message}`);
            setIsSubmitting(false);
        }
    };
    
    if (isSuccess) {
      return (
        <div className="fixed inset-0 bg-pink-600 bg-opacity-90 flex items-center justify-center z-50 animate-fadeIn p-4">
            <div className="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-full sm:max-w-sm mx-auto">
                <SuccessIcon />
                <h2 className="text-3xl font-bold text-gray-800 mt-2">Solicitação Enviada!</h2>
                <p className="text-gray-600 mt-2">Recebemos seu pedido. Entraremos em contato em breve para os próximos passos.</p>
                <button onClick={() => setView && setView('scheduler')} className="mt-6 bg-pink-600 text-white font-bold py-3.5 px-8 rounded-lg hover:bg-pink-700 transition-colors">OK</button>
            </div>
        </div>
      );
    }

    const renderRadioGroup = (label: string, name: keyof DaycareRegistration, options: { label: string, value: any }[], opts?: { heading?: boolean; labelClassName?: string }) => (
        <div>
            {opts?.heading ? (
                <h3 className={opts.labelClassName || 'text-lg font-semibold text-pink-700 border-b pb-2 mb-2'}>{label}</h3>
            ) : (
                <label className={opts?.labelClassName || 'block text-base font-semibold text-gray-700 mb-1'}>{label}</label>
            )}
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button type="button" key={opt.label} onClick={() => handleRadioChange(name, opt.value)}
                    className={`px-4 py-3.5 rounded-lg border text-sm font-semibold transition-colors ${formData[name as keyof typeof formData] === opt.value ? 'bg-pink-300 text-black border-pink-600' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const formContent = (
        <form onSubmit={handleSubmit} className="bg-rose-50 rounded-2xl shadow-xl w-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Formulário de Matrícula</h2>
            </div>
            <div className="p-6 space-y-8 overflow-y-auto" style={{maxHeight: isAdmin ? '75vh' : '70vh' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Collapsible title="Dados do Pet" className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-base font-semibold text-gray-700">Nome do pet</label><input type="text" name="pet_name" value={formData.pet_name} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-base font-semibold text-gray-700">Raça</label><input type="text" name="pet_breed" value={formData.pet_breed} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-base font-semibold text-gray-700">Idade</label><input type="text" name="pet_age" value={formData.pet_age} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            {renderRadioGroup('Sexo', 'pet_sex', [{label: 'M', value: 'M'}, {label: 'F', value: 'F'}])}
                            {renderRadioGroup('Castrado (a)', 'is_neutered', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                            {isAdmin && (
                              <div>
                                <label className="flex items-center gap-3 text-base font-semibold text-gray-700">
                                  <input type="checkbox" name="has_sibling_discount" checked={formData.has_sibling_discount} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                  Desconto irmão (10%)
                                </label>
                              </div>
                            )}
                        </div>
                    </Collapsible>

                    <Collapsible title="Dados do Tutor" className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-base font-semibold text-gray-700">Tutor</label><input type="text" name="tutor_name" value={formData.tutor_name} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-base font-semibold text-gray-700">RG</label><input type="text" name="tutor_rg" value={formData.tutor_rg} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-700">Endereço</label><input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-base font-semibold text-gray-700">Telefone contato</label><input type="tel" name="contact_phone" value={formData.contact_phone} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div><label className="block text-base font-semibold text-gray-700">Telefone e nome (emergencial)</label><input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} required className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                            <div className="md:col-span-2"><label className="block text-base font-semibold text-gray-700">Telefone do veterinário(a)</label><input type="text" name="vet_phone" value={formData.vet_phone} onChange={handleInputChange} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                        </div>
                    </Collapsible>
                </div>
                <Collapsible title="Saúde e Comportamento" className="space-y-6">
                    {renderRadioGroup('Se dá bem com outros animais', 'gets_along_with_others', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><DatePicker value={formData.last_vaccine} onChange={(value) => setFormData(prev => ({ ...prev, last_vaccine: value }))} label="Última vacina" className="mt-1" /></div>
                        <div><DatePicker value={formData.last_deworming} onChange={(value) => setFormData(prev => ({ ...prev, last_deworming: value }))} label="Último vermífugo" className="mt-1" /></div>
                        <div><DatePicker value={formData.last_flea_remedy} onChange={(value) => setFormData(prev => ({ ...prev, last_flea_remedy: value }))} label="Último remédio de pulgas e carrapatos" className="mt-1" /></div>
                    </div>
                    {renderRadioGroup('Alergia?', 'has_allergies', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                    {formData.has_allergies && (
                        <div><label className="block text-base font-semibold text-gray-700">Descreva a alergia:</label><textarea name="allergies_description" value={formData.allergies_description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                    )}
                    {renderRadioGroup('Cuidados especiais', 'needs_special_care', [{label: 'Sim', value: true}, {label: 'Não', value: false}])}
                    {formData.needs_special_care && (
                        <div><label className="block text-base font-semibold text-gray-700">Descreva o cuidado especial:</label><textarea name="special_care_description" value={formData.special_care_description} onChange={handleInputChange} rows={3} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                    )}
                </Collapsible>
                {/* Belongings */}
                <Collapsible title="Objetos entregues sempre" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-3">
                        {['Bolinha', 'Pelucia', 'Cama', 'Coleira', 'Comedouro'].map(item => (
                           <label key={item} className="flex items-center gap-3 text-gray-700 font-semibold bg-white p-6 sm:p-5 rounded-lg border-2 border-gray-200">
                               <input type="checkbox" value={item} onChange={handleBelongingsChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                               {item}
                           </label>
                        ))}
                    </div>
                    <div><label className="block text-base font-semibold text-gray-700">Outros:</label><input type="text" name="other_belongings" value={formData.delivered_items.other} onChange={handleOtherBelongingsChange} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md"/></div>
                </Collapsible>
                {/* Plan */}
                <Collapsible title="Plano contratado" className="space-y-6">
                    {renderRadioGroup('', 'contracted_plan', [
                        {label: '4 X MÊS', value: '4x_month'}, 
                        {label: '8 X MÊS', value: '8x_month'},
                        {label: '12 X MÊS', value: '12x_month'},
                        {label: '16 X MÊS', value: '16x_month'},
                        {label: '20 X MÊS', value: '20x_month'},
                    ], { heading: false, labelClassName: 'sr-only' })}
                </Collapsible>
                <Collapsible title="Horários e Dias" className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <DatePicker value={formData.check_in_date || ''} onChange={(value) => setFormData(prev => ({ ...prev, check_in_date: value }))} label="Data de Entrada" className="mt-1" />
                        </div>
                        <div>
                            <select name="check_in_time" value={formData.check_in_time || ''} onChange={handleInputChange} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md">
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2,'0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">Horário de entrada (mínimo 07:00)</p>
                        </div>
                        <div>
                            <DatePicker value={formData.check_out_date || ''} onChange={(value) => setFormData(prev => ({ ...prev, check_out_date: value }))} label="Data de Saída" className="mt-1" />
                        </div>
                        <div>
                            <select name="check_out_time" value={formData.check_out_time || ''} onChange={handleInputChange} className="mt-1 block w-full px-5 py-4 bg-gray-50 border border-gray-300 rounded-md">
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2,'0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">Horário de saída (máximo 19:00)</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-base font-semibold text-gray-700 mb-2">Dias da Semana</label>
                        <div className="flex flex-wrap gap-2">
                            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((label, idx) => (
                                <label key={label} className="flex items-center gap-2 px-4 py-3.5 rounded-lg border text-sm font-semibold bg-white text-gray-700 hover:bg-pink-50">
                                    <input type="checkbox" checked={(formData.attendance_days || []).includes(idx)} onChange={() => toggleAttendanceDay(idx)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    {label}
                                </label>
                            ))}
                        </div>
                    </div>
                </Collapsible>
                
                {/* Extra Services */}
                <Collapsible title="Serviços Extras" className="space-y-6 pt-6 border-t border-gray-200 mt-6">
                    <div className="grid grid-cols-1 gap-4">
                        {/* Pernoite */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={formData.extra_services?.pernoite || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            pernoite: e.target.checked,
                                            pernoite_quantity: e.target.checked ? (prev.extra_services?.pernoite_quantity || 1) : undefined,
                                            pernoite_price: e.target.checked ? (prev.extra_services?.pernoite_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Pernoite
                            </label>
                            {formData.extra_services?.pernoite && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade (dias)</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.pernoite_quantity || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    pernoite_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.pernoite_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    pernoite_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Banho & Tosa */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={formData.extra_services?.banho_tosa || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            banho_tosa: e.target.checked,
                                            banho_tosa_quantity: e.target.checked ? (prev.extra_services?.banho_tosa_quantity || 1) : undefined,
                                            banho_tosa_price: e.target.checked ? (prev.extra_services?.banho_tosa_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Banho & Tosa
                            </label>
                            {formData.extra_services?.banho_tosa && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.banho_tosa_quantity || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    banho_tosa_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.banho_tosa_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    banho_tosa_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Só banho */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={formData.extra_services?.so_banho || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            so_banho: e.target.checked,
                                            so_banho_quantity: e.target.checked ? (prev.extra_services?.so_banho_quantity || 1) : undefined,
                                            so_banho_price: e.target.checked ? (prev.extra_services?.so_banho_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Só banho
                            </label>
                            {formData.extra_services?.so_banho && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.so_banho_quantity || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    so_banho_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.so_banho_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    so_banho_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Adestrador */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={formData.extra_services?.adestrador || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            adestrador: e.target.checked,
                                            adestrador_quantity: e.target.checked ? (prev.extra_services?.adestrador_quantity || 1) : undefined,
                                            adestrador_price: e.target.checked ? (prev.extra_services?.adestrador_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Adestrador
                            </label>
                            {formData.extra_services?.adestrador && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade (sessões)</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.adestrador_quantity || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    adestrador_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.adestrador_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    adestrador_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Despesa médica */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={formData.extra_services?.despesa_medica || false}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            despesa_medica: e.target.checked,
                                            despesa_medica_quantity: e.target.checked ? (prev.extra_services?.despesa_medica_quantity || 1) : undefined,
                                            despesa_medica_price: e.target.checked ? (prev.extra_services?.despesa_medica_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Despesa médica
                            </label>
                            {formData.extra_services?.despesa_medica && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.despesa_medica_quantity || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    despesa_medica_quantity: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.despesa_medica_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    despesa_medica_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Dia extra */}
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                            <label className="flex items-center gap-3 text-gray-700 font-semibold mb-3">
                                <input 
                                    type="checkbox" 
                                    checked={(formData.extra_services?.dia_extra || 0) > 0}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        extra_services: {
                                            ...prev.extra_services,
                                            dia_extra: e.target.checked ? 1 : 0,
                                            dia_extra_price: e.target.checked ? (prev.extra_services?.dia_extra_price || 0) : undefined
                                        }
                                    }))}
                                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" 
                                />
                                Dia extra
                            </label>
                            {(formData.extra_services?.dia_extra || 0) > 0 && (
                                <div className="grid grid-cols-2 gap-3 ml-7">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade (dias)</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={formData.extra_services?.dia_extra || 1}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    dia_extra: e.target.value === '' ? 0 : parseInt(e.target.value)
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={formData.extra_services?.dia_extra_price || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                extra_services: {
                                                    ...prev.extra_services,
                                                    dia_extra_price: e.target.value
                                                }
                                            }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Collapsible>
                
                {/* Data de Matrícula temporariamente removida até a coluna ser adicionada ao banco */}
                {/* <div className="space-y-6 pt-6 border-t border-gray-200 mt-6">
                    <h3 className="text-lg font-semibold text-pink-700 border-b pb-2 mb-2">Data de Matrícula</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <DatePicker 
                                value={formData.enrollment_date || ''} 
                                onChange={(value) => setFormData(prev => ({ ...prev, enrollment_date: value }))}
                                label="Data de Matrícula"
                                placeholder="Selecione a data de matrícula"
                                required={true}
                                className="mt-1" 
                            />
                        </div>
                    </div>
                </div> */}

                {/* Resumo & Detalhes Financeiros */}
                <Collapsible title="Resumo & Detalhes Financeiros" className="space-y-6 pt-6 border-t border-gray-200 mt-6">
                    <div className="bg-white p-5 rounded-xl border border-pink-100">
                        <h4 className="text-lg font-bold text-pink-700 mb-3 text-center">Resumo da Matrícula</h4>
                        {(() => {
                            const ciDate = formData.check_in_date || '';
                            const coDate = formData.check_out_date || '';
                            const ciTime = String(formData.check_in_time || '').split(':').slice(0,2).join(':');
                            const coTime = String(formData.check_out_time || '').split(':').slice(0,2).join(':');
                            const diasSemana = (formData.attendance_days || []).map(idx => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][idx]).join(', ');
                            const extras: string[] = [];
                            if (formData.extra_services?.pernoite) extras.push('Pernoite');
                            if (formData.extra_services?.banho_tosa) extras.push('Banho & Tosa');
                            if (formData.extra_services?.so_banho) extras.push('Só Banho');
                            if (formData.extra_services?.adestrador) extras.push('Adestrador');
                            if (formData.extra_services?.despesa_medica) extras.push('Despesa Médica');
                            const diaExtraQty = formData.extra_services?.dia_extra || 0;
                            if (diaExtraQty > 0) extras.push(`${diaExtraQty} dia${diaExtraQty > 1 ? 's' : ''} extra${diaExtraQty > 1 ? 's' : ''}`);
                            return (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div><span className="font-semibold">Pet:</span> {formData.pet_name || '—'}</div>
                                        <div><span className="font-semibold">Tutor:</span> {formData.tutor_name || '—'}</div>
                                        <div><span className="font-semibold">Telefone:</span> {formData.contact_phone || '—'}</div>
                                        <div><span className="font-semibold">Plano:</span> {formData.contracted_plan ? planLabels[formData.contracted_plan] : '—'}</div>
                                        <div><span className="font-semibold">Entrada:</span> {ciDate ? formatDateToBR(ciDate) : '—'} {ciTime ? `às ${ciTime}` : ''}</div>
                                        <div><span className="font-semibold">Saída:</span> {coDate ? formatDateToBR(coDate) : '—'} {coTime ? `às ${coTime}` : ''}</div>
                                        <div className="sm:col-span-2"><span className="font-semibold">Dias da Semana:</span> {diasSemana || '—'}</div>
                                    </div>
                                    {extras.length > 0 && (
                                        <div>
                                            <h5 className="text-sm font-semibold text-gray-800 mb-1">Serviços Adicionais</h5>
                                            <div className="flex flex-wrap gap-1">
                                                {extras.map(e => (
                                                    <span key={e} className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-700">{e}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-2 p-3 rounded-lg bg-pink-50 border border-pink-100 text-center">
                                        <p className="text-base font-bold text-pink-700">Valor Total: {(formData.total_price ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    <div className="text-sm text-gray-700 text-center">Data de Pagamento: Dia 30 de cada mês</div>
                                </div>
                            );
                        })()}
                    </div>
                </Collapsible>
            </div>
            <div className="p-6 bg-white flex justify-between items-center mt-auto rounded-b-2xl">
                <button type="button" onClick={onBack || (() => setView && setView('scheduler'))} className="w-auto bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors">
                    {isAdmin ? 'Cancelar' : 'Voltar'}
                </button>
                <button type="button" disabled={isSubmitting} onClick={(e) => {
                    if (isAdmin) {
                        (e.currentTarget.closest('form') as HTMLFormElement | null)?.requestSubmit();
                    } else {
                        setShowSubmissionWarning(true);
                    }
                }} className="w-auto bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400">
                    {isSubmitting ? 'Enviando...' : (isAdmin ? 'Adicionar Matrícula' : 'Solicitar Matrícula')}
                </button>
            </div>
            {showSubmissionWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-800">Antes de solicitar a matrícula</h3>
                        <p className="text-gray-700 mt-2">No dia do check-in, o tutor deve levar:</p>
                        <ul className="mt-3 list-disc list-inside text-gray-700 space-y-1">
                            <li>RG do tutor</li>
                            <li>Comprovante de residência</li>
                            <li>Carteira de vacinação</li>
                            <li>Atestado de saúde do veterinário responsável</li>
                        </ul>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowSubmissionWarning(false)} className="bg-gray-200 text-gray-800 font-bold py-2.5 px-5 rounded-lg hover:bg-gray-300 transition-colors">Voltar</button>
                            <button type="submit" disabled={isSubmitting} className="bg-pink-600 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-pink-700 transition-colors disabled:bg-gray-400">Solicitar Matrícula</button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );

    if (isAdmin) {
        return formContent;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <header className="text-center mb-6">
                <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="h-20 w-20 mx-auto mb-2"/>
                <h1 className="font-brand text-5xl text-pink-800">Sandy's Pet Shop</h1>
                <p className="text-gray-600 text-lg">Matrícula na Creche</p>
            </header>
            <main className="w-full max-w-3xl">
                {formContent}
            </main>
        </div>
    );
};


// FIX: Define the missing TimeSlotPicker component
const TimeSlotPicker: React.FC<{
    selectedDate: Date;
    selectedService: ServiceType | null;
    appointments: Appointment[];
    onTimeSelect: (time: number) => void;
    selectedTime: number | null;
    workingHours: number[];
    isPetMovel: boolean;
    allowedDays?: number[];
    selectedCondo?: string | null;
    disablePastTimes?: boolean;
  }> = ({ selectedDate, selectedService, appointments, onTimeSelect, selectedTime, workingHours, isPetMovel, allowedDays, selectedCondo, disablePastTimes }) => {
    const [selectedVisualKey, setSelectedVisualKey] = useState<string | null>(null);
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {workingHours.flatMap(hour => {
          return Array.from({ length: MAX_CAPACITY_PER_SLOT }, (_, slotIndex) => {
            const visualKey = `${hour}-${slotIndex}`;
            return (
              <button
                key={visualKey}
                type="button"
                onClick={() => { setSelectedVisualKey(visualKey); onTimeSelect(hour); }}
                className={`px-3 py-2 rounded-md text-center font-medium transition-colors border
                    ${selectedVisualKey === visualKey ? 'bg-pink-600 text-white border-pink-600' : 'bg-white hover:bg-pink-50 border-gray-200'}
                    leading-tight text-sm
                  `}
              >
                {`${hour}:00`}
              </button>
            );
          });
        })}
      </div>
    );
  };

// --- MAIN APP COMPONENT ---
const Scheduler: React.FC<{ setView: (view: 'scheduler' | 'login' | 'daycareRegistration' | 'hotelRegistration') => void }> = ({ setView }) => {
  const [step, setStep] = useState(1);
  const [showWizard, setShowWizard] = useState(false);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [formData, setFormData] = useState({ petName: '', ownerName: '', whatsapp: '', petBreed: '', ownerAddress: '' });
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [serviceStepView, setServiceStepView] = useState<'main' | 'bath_groom' | 'pet_movel' | 'pet_movel_condo' | 'hotel_pet'>('main');
  const [selectedCondo, setSelectedCondo] = useState<string | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<PetWeight | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allowedDays, setAllowedDays] = useState<number[] | undefined>(undefined);
  const [disabledBathGroomDates, setDisabledBathGroomDates] = useState<string[]>([]);
  const [disabledPetMovelDates, setDisabledPetMovelDates] = useState<string[]>([]);
  
  const isVisitService = useMemo(() => 
    selectedService === ServiceType.VISIT_DAYCARE || selectedService === ServiceType.VISIT_HOTEL,
    [selectedService]
  );
  
  const isPetMovel = useMemo(() => serviceStepView === 'pet_movel', [serviceStepView]);
  const reloadAppointments = useCallback(async () => {
    const { data: regularData, error: regularError } = await supabase
      .from('appointments')
      .select('*');
    if (regularError) {
      console.error('Error fetching appointments:', regularError);
    }

    const { data: petMovelData, error: petMovelError } = await supabase
      .from('pet_movel_appointments')
      .select('*');
    if (petMovelError) {
      console.error('Error fetching pet_movel_appointments:', petMovelError);
    }

    const regularAppointments: Appointment[] = (regularData || [])
      .map((rec: any) => {
        const serviceKey = Object.keys(SERVICES).find(key => SERVICES[key as ServiceType].label === rec.service) as ServiceType | undefined;
        if (!serviceKey) return null;
        return {
          id: rec.id,
          petName: rec.pet_name,
          ownerName: rec.owner_name,
          whatsapp: rec.whatsapp,
          service: serviceKey,
          appointmentTime: new Date(rec.appointment_time),
          monthly_client_id: rec.monthly_client_id || undefined,
        };
      })
      .filter(Boolean) as Appointment[];

    const mobileAppointments: Appointment[] = (petMovelData || [])
      .map((rec: any) => {
        const s = String(rec.service || '').toLowerCase();
        const hasBanho = s.includes('banho');
        const hasTosa = s.includes('tosa');
        const isSoTosa = s.includes('só tosa') || s.includes('so tosa') || (hasTosa && !hasBanho);
        let serviceKey: ServiceType;
        if (hasBanho && hasTosa) serviceKey = ServiceType.PET_MOBILE_BATH_AND_GROOMING;
        else if (isSoTosa) serviceKey = ServiceType.PET_MOBILE_GROOMING_ONLY;
        else serviceKey = ServiceType.PET_MOBILE_BATH;
        return {
          id: rec.id,
          petName: rec.pet_name,
          ownerName: rec.owner_name,
          whatsapp: rec.whatsapp,
          service: serviceKey,
          appointmentTime: new Date(rec.appointment_time),
          monthly_client_id: rec.monthly_client_id || undefined,
          condominium: rec.condominium || rec.condo || undefined,
        };
      })
      .filter(Boolean) as Appointment[];

    setAppointments([...regularAppointments, ...mobileAppointments]);
  }, []);

  useEffect(() => { reloadAppointments(); }, [reloadAppointments]);

  const loadDisabledDates = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('disabled_dates').select('*');
      if (error) {
        return;
      }
      const bath = new Set<string>();
      const pet = new Set<string>();
      (data || []).forEach((rec: any) => {
        const date = String(rec.date || rec.day || '').trim();
        if (!date) return;
        const svc = String(rec.service || rec.for_service || 'ALL').toUpperCase();
        if (svc === 'ALL') { bath.add(date); pet.add(date); }
        else if (svc.includes('BATH') || svc.includes('GROOM')) { bath.add(date); }
        else if (svc.includes('PET') || svc.includes('MOVEL') || svc.includes('MÓVEL')) { pet.add(date); }
      });
      setDisabledBathGroomDates(Array.from(bath));
      setDisabledPetMovelDates(Array.from(pet));
    } catch {}
  }, []);

  useEffect(() => { loadDisabledDates(); }, [loadDisabledDates]);
  useEffect(() => {
    try {
      const channel = supabase
        .channel('disabled_dates_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'disabled_dates' }, (_payload) => {
          loadDisabledDates();
        })
        .subscribe();
      return () => {
        try { supabase.removeChannel(channel); } catch {}
      };
    } catch {}
  }, [loadDisabledDates]);

  useEffect(() => {
    let authSub: any = null;
    try {
      if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          reloadAppointments();
        });
        authSub = data;
      }
    } catch (_e) {}
    return () => {
      try { authSub?.subscription?.unsubscribe?.(); } catch (_e) {}
    };
  }, [reloadAppointments]);

    useEffect(() => {
    // This effect handles the calendar day restrictions based on service type.
    if (step === 3) {
      if (serviceStepView === 'bath_groom') {
        // Regular Bath & Grooming is only on Mondays and Tuesdays
        setAllowedDays([1, 2]);
      } else if (serviceStepView === 'pet_movel') {
        // Pet Móvel is now available on all days - no restrictions
        setAllowedDays(undefined);
      } else {
        // No specific restrictions for other services, default will apply (e.g., disable weekends)
        setAllowedDays(undefined);
      }
    }
  }, [step, serviceStepView, selectedCondo]);

  useEffect(() => {
    if (step === 3 && serviceStepView === 'bath_groom' && allowedDays && allowedDays.length > 0) {
      const now = new Date();
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      for (let i = 0; i < 31; i++) {
        const probe = new Date(next);
        probe.setDate(next.getDate() + i);
        const { day } = getSaoPauloTimeParts(probe);
        if (allowedDays.includes(day)) {
          setSelectedDate(probe);
          break;
        }
      }
    }
    if (
      step === 3 &&
      (serviceStepView === 'pet_movel' || serviceStepView === 'pet_movel_condo') &&
      selectedService &&
      [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService) &&
      selectedCondo
    ) {
      const condoDays = (() => {
        switch (selectedCondo) {
          case 'Vitta Parque': return [3];
          case 'Max Haus': return [4];
          case 'Paseo': return [5];
          default: return [];
        }
      })();
      if (condoDays.length > 0) {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() + 1);
        for (let i = 0; i < 60; i++) {
          const probe = new Date(start);
          probe.setDate(start.getDate() + i);
          const { day } = getSaoPauloTimeParts(probe);
          if (condoDays.includes(day)) {
            setSelectedDate(probe);
            break;
          }
        }
      }
    }
  }, [step, serviceStepView, allowedDays, selectedService, selectedCondo]);

  
  useEffect(() => { setSelectedTime(null); }, [selectedDate, selectedService]);
  
  useEffect(() => {
    if (isVisitService) {
        setTotalPrice(0);
        return;
    }
    
    if (!selectedService || !selectedWeight) {
        setTotalPrice(0);
        return;
    }

    let basePrice = 0;
    
    const isRegularService = [ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING].includes(selectedService);
    const isMobileService = [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService);

    if (isRegularService || isMobileService) {
        const prices = SERVICE_PRICES[selectedWeight];
        if (prices) {
            if (selectedService === ServiceType.BATH || selectedService === ServiceType.PET_MOBILE_BATH) {
                basePrice = prices[ServiceType.BATH] ?? 0;
            } else if (selectedService === ServiceType.GROOMING_ONLY || selectedService === ServiceType.PET_MOBILE_GROOMING_ONLY) {
                basePrice = prices[ServiceType.GROOMING_ONLY] ?? 0;
            } else if (selectedService === ServiceType.BATH_AND_GROOMING || selectedService === ServiceType.PET_MOBILE_BATH_AND_GROOMING) {
                basePrice = (prices[ServiceType.BATH] ?? 0) + (prices[ServiceType.GROOMING_ONLY] ?? 0);
            }
        }
    }
    
    let addonsPrice = 0;
    Object.keys(selectedAddons).forEach(addonId => {
        if (selectedAddons[addonId]) {
            const addon = ADDON_SERVICES.find(a => a.id === addonId);
            if (addon) addonsPrice += addon.price;
        }
    });
    setTotalPrice(basePrice + addonsPrice);
  }, [selectedService, selectedWeight, selectedAddons, isVisitService]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'whatsapp' ? formatWhatsapp(value) : value }));
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newWeight = e.target.value as PetWeight;
      setSelectedWeight(newWeight);
      const newAddons = {...selectedAddons};
      ADDON_SERVICES.forEach(addon => {
          if (selectedAddons[addon.id]) {
            const isExcluded = addon.excludesWeight?.includes(newWeight);
            const requiresNotMet = addon.requiresWeight && !addon.requiresWeight.includes(newWeight);
            if(isExcluded || requiresNotMet) newAddons[addon.id] = false;
          }
      });
      setSelectedAddons(newAddons);
  }
  
  const handleAddonToggle = (addonId: string) => {
    const newAddons = { ...selectedAddons };
    newAddons[addonId] = !newAddons[addonId];
    if (addonId === 'patacure1' && newAddons[addonId]) newAddons['patacure2'] = false;
    else if (addonId === 'patacure2' && newAddons[addonId]) newAddons['patacure1'] = false;
    setSelectedAddons(newAddons);
  };

  const changeStep = (nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 300); // Animation duration
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime) return;
    setIsSubmitting(true);
    
    const sp = getSaoPauloTimeParts(selectedDate);
    const ymd = `${String(sp.year)}-${String(sp.month + 1).padStart(2, '0')}-${String(sp.date).padStart(2, '0')}`;
    const isBathGroomService = [ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING].includes(selectedService);
    const isPetMovelService = [ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService);
    if (isBathGroomService && disabledBathGroomDates.includes(ymd)) {
      alert('A data selecionada está indisponível para Banho & Tosa.');
      setIsSubmitting(false);
      return;
    }
    if (isPetMovelService && disabledPetMovelDates.includes(ymd)) {
      alert('A data selecionada está indisponível para Pet Móvel.');
      setIsSubmitting(false);
      return;
    }
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const appointmentTime = toSaoPauloUTC(year, month, day, selectedTime);

    const isPetMovelSubmit = !!selectedCondo;
    const targetTable = isPetMovelSubmit ? 'pet_movel_appointments' : 'appointments';
    
    const basePayload = {
      appointment_time: appointmentTime.toISOString(),
      pet_name: formData.petName,
      pet_breed: formData.petBreed,
      owner_name: formData.ownerName,
      whatsapp: formData.whatsapp,
      service: SERVICES[selectedService].label,
      weight: isVisitService ? 'N/A' : (selectedWeight ? PET_WEIGHT_OPTIONS[selectedWeight] : 'N/A'),
      addons: isVisitService ? [] : ADDON_SERVICES.filter(addon => selectedAddons[addon.id]).map(addon => addon.label),
      price: totalPrice,
      status: 'AGENDADO',
      extra_services: {
        pernoite: { enabled: false, quantity: 0 },
        banho_tosa: { enabled: false, value: 0 },
        so_banho: { enabled: false, value: 0 },
        adestrador: { enabled: false, value: 0 },
        despesa_medica: { enabled: false, value: 0 },
        dias_extras: { enabled: false, quantity: 0 }
      }
    };
    
    const supabasePayload = isPetMovelSubmit
        ? { ...basePayload, owner_address: formData.ownerAddress, condominium: selectedCondo }
        : { ...basePayload, owner_address: formData.ownerAddress };

    try {
        // No conflict checking - all appointments are allowed

        const { data: newDbAppointment, error: supabaseError } = await supabase.from(targetTable).insert([supabasePayload]).select().single();
        if (supabaseError) throw supabaseError;

        try {
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('phone', supabasePayload.whatsapp)
                .limit(1)
                .single();

            if (!existingClient) {
                const { error: clientInsertError } = await supabase
                    .from('clients')
                    .insert({ 
                        name: supabasePayload.owner_name, 
                        phone: supabasePayload.whatsapp 
                    });
                if (clientInsertError) {
                    console.error('Failed to auto-register client:', clientInsertError.message);
                }
            }
        } catch (error) {
            console.error('An error occurred during client auto-registration:', error);
        }
        
        try {
            const webhookUrl = isPetMovelSubmit
                ? 'https://n8n.intelektus.tech/webhook/petMovelAgendado'
                : 'https://n8n.intelektus.tech/webhook/servicoAgendado';
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(supabasePayload),
            });

            if (!response.ok) {
                throw new Error(`Webhook (${webhookUrl.includes('petMovelAgendado') ? 'petMovelAgendado' : 'servicoAgendado'}) failed with status ${response.status}`);
            }
        } catch (webhookError) {
            console.error('Error sending new appointment webhook:', webhookError);
        }

        const newAppointment: Appointment = {
            id: newDbAppointment.id,
            petName: newDbAppointment.pet_name,
            ownerName: newDbAppointment.owner_name,
            whatsapp: newDbAppointment.whatsapp,
            service: selectedService,
            appointmentTime: new Date(newDbAppointment.appointment_time),
            condominium: selectedCondo || undefined,
        };

        setAppointments(prev => [...prev, newAppointment]);
        setIsModalOpen(true);
        setTimeout(() => {
            setIsModalOpen(false);
            setFormData({ petName: '', ownerName: '', whatsapp: '', petBreed: '', ownerAddress: '' });
            setSelectedService(null); setSelectedWeight(null); setSelectedAddons({}); setSelectedTime(null); setTotalPrice(0); setIsSubmitting(false);
            setSelectedCondo(null);
            setServiceStepView('main');
            changeStep(1);
        }, 3000);
    } catch (error: any) {
        console.error("Error submitting appointment:", error);
        let userMessage = 'Não foi possível concluir o agendamento. Tente novamente.';
        alert(userMessage);
        setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.petName && formData.ownerName && formData.whatsapp.length > 13 && formData.petBreed && formData.ownerAddress;
  const isStep2Valid = serviceStepView !== 'main' && selectedService && (isVisitService || selectedWeight);
  const isStep3Valid = selectedTime !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100">
      <header className="text-center mb-6 animate-fadeInUp">
          <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="h-24 w-24 mx-auto mb-4 drop-shadow-lg"/>
          <h1 className="font-brand text-6xl text-pink-800 mb-2">Sandy's Pet Shop</h1>
          <p className="text-gray-600 text-xl font-medium">Agendamento Online</p>
      </header>

      {serviceStepView === 'main' && (
        <section className="w-full max-w-4xl bg-gradient-to-br from-pink-50 via-pink-100 to-rose-100 rounded-3xl shadow-xl border border-pink-200/60 mb-6 p-6 sm:p-8 animate-fadeIn">
          <p className="text-lg sm:text-2xl md:text-3xl font-bold text-pink-700 mb-2 text-center whitespace-nowrap leading-none tracking-tight">🎉 Bem-vindo a Sandy Pet! 🐶💗</p>
          <p className="text-gray-700 text-base sm:text-lg mb-3 text-center">Estamos muito felizes em receber você e seu pet por aqui!</p>
          <p className="text-gray-700 text-base sm:text-lg text-center">Escolha abaixo o serviço ideal para o seu melhor amigo e faça seu agendamento de forma simples e rápida:</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            <button type="button" onClick={() => { setServiceStepView('bath_groom'); setSelectedService(null); changeStep(1); }} className="p-6 rounded-2xl text-center font-semibold transition-colors border-2 flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-gray-800 border-gray-300 w-full min-h-[140px] md:min-h-[160px]">
              <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho & Tosa" className="w-12 h-12 rounded-full object-contain mb-2" />
              <span className="text-lg">Banho & Tosa</span>
              <span className="text-sm text-gray-600">Fixo</span>
            </button>
            
            
            <button type="button" onClick={() => { setServiceStepView('pet_movel_condo'); setSelectedService(null); changeStep(1); }} className="p-6 rounded-2xl text-center font-semibold transition-colors border-2 flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-gray-800 border-gray-300 w-full min-h-[140px] md:min-h-[160px]">
              <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel" className="w-12 h-12 rounded-full object-contain mb-2" />
              <span className="text-lg">Pet Móvel</span>
              <span className="text-sm text-gray-600">Condomínios</span>
            </button>
            
            
            <button type="button" onClick={() => { setSelectedService(null); setView('daycareRegistration'); }} className="p-6 rounded-2xl text-center font-semibold transition-colors border-2 flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-gray-800 border-gray-300 w-full min-h-[140px] md:min-h-[160px]">
              <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet" className="w-12 h-12 rounded-full object-contain mb-2" />
              <span className="text-lg">Creche Pet</span>
            </button>
            
            
            <button type="button" onClick={() => { setSelectedService(null); setView('hotelRegistration'); }} className="p-6 rounded-2xl text-center font-semibold transition-colors border-2 flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-gray-800 border-gray-300 w-full min-h-[140px] md:min-h-[160px]">
              <img src="https://cdn-icons-png.flaticon.com/512/1131/1131938.png" alt="Hotel Pet" className="w-12 h-12 rounded-full object-contain mb-2" />
              <span className="text-lg">Hotel Pet</span>
            </button>
            
            
            <button type="button" onClick={() => { setView('visitSelector'); }} className="p-6 rounded-2xl text-center font-semibold transition-colors border-2 flex flex-col items-center justify-center bg-pink-50 hover:bg-pink-100 text-gray-800 border-gray-300 w-full min-h-[140px] md:min-h-[160px]">
              <img src="https://cdn-icons-png.flaticon.com/512/2196/2196747.png" alt="Visita" className="w-12 h-12 rounded-full object-contain mb-2" />
              <span className="text-lg">Visita</span>
            </button>
            
          </div>
      </section>
      )}

      {serviceStepView !== 'main' && (
      <main className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-pink-100/40 backdrop-blur-sm">
        <div className="px-8 py-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b-2 border-pink-100">
            <div className="flex justify-between items-center relative">
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                    <div className={`h-full bg-pink-600 transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                </div>
                {['Dados', 'Serviços', 'Horário', 'Resumo'].map((name, index) => (
                    <div key={name} className="flex flex-col items-center gap-2 z-10">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${step >= index + 1 ? 'bg-gradient-to-br from-pink-500 to-pink-700 text-white scale-110' : 'bg-white text-gray-400 border-2 border-gray-300'}`}>
                            {step > index + 1 ? '✓' : index + 1}
                        </div>
                        <span className={`hidden sm:block text-xs font-bold ${step === index + 1 ? 'text-pink-700' : step > index + 1 ? 'text-pink-600' : 'text-gray-400'}`}>{name}</span>
                    </div>
                ))}
            </div>
        </div>

        <form onSubmit={handleSubmit} className={`relative p-6 sm:p-8 transition-all duration-300 ${isAnimating ? 'animate-slideOutToLeft' : 'animate-slideInFromRight'}`}>
          {step === 1 && (
            <div className="space-y-7">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 whitespace-nowrap leading-none tracking-tight">Informações do Pet e Dono</h2>
              <div>
                  <label htmlFor="petName" className="block text-base font-semibold text-gray-700">Nome do Pet</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><PawIcon/></span><input type="text" name="petName" id="petName" value={formData.petName} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="petBreed" className="block text-base font-semibold text-gray-700">Raça do Pet</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><BreedIcon/></span><input type="text" name="petBreed" id="petBreed" value={formData.petBreed} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="ownerName" className="block text-base font-semibold text-gray-700">Seu Nome</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><UserIcon/></span><input type="text" name="ownerName" id="ownerName" value={formData.ownerName} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="ownerAddress" className="block text-base font-semibold text-gray-700">Seu Endereço</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><AddressIcon/></span><input type="text" name="ownerAddress" id="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} required className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"/></div>
              </div>
              <div>
                  <label htmlFor="whatsapp" className="block text-base font-semibold text-gray-700">WhatsApp</label>
                  <div className="relative mt-1"><span className="absolute inset-y-0 left-0 flex items-center pl-3"><WhatsAppIcon/></span><input type="tel" name="whatsapp" id="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" maxLength={15} className="block w-full pl-10 pr-5 py-4 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900"/></div>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-6">
                {serviceStepView === 'main' ? (
                    <h2 className="text-3xl font-bold text-gray-800">Escolha os Serviços</h2>
                ) : (
                    <h2 className="text-3xl font-bold text-gray-800">Detalhes do Serviço</h2>
                )}
                
                {serviceStepView === 'main' && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-700 mb-2">1. Selecione a Categoria</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <button type="button" onClick={() => { setServiceStepView('bath_groom'); setSelectedService(null); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[56px] sm:min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">Banho & Tosa</span>
                                <span className="text-xs text-gray-600 mt-1">Fixo</span>
                            </button>
                            <button type="button" onClick={() => { console.log('Clicou em Creche Pet'); setServiceStepView('daycare_options'); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[56px] sm:min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">{SERVICES[ServiceType.VISIT_DAYCARE].label}</span>
                            </button>
                             <button type="button" onClick={() => { console.log('Clicou em Hotel Pet'); setServiceStepView('hotel_options'); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[56px] sm:min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">{SERVICES[ServiceType.VISIT_HOTEL].label}</span>
                            </button>
                            <button type="button" onClick={() => { console.log('Clicou em Pet Móvel'); setServiceStepView('pet_movel_condo'); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[56px] sm:min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">Pet Móvel</span>
                                <span className="text-xs text-gray-600 mt-1">Condomínios</span>
                            </button>
                        </div>
                    </div>
                )}

                {serviceStepView === 'pet_movel_condo' && (
                    <div className="space-y-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">1. Selecione o Condomínio</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {['Vitta Parque', 'Max Haus', 'Paseo'].map(condo => (
                                <button
                                    key={condo}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCondo(condo);
                                        setServiceStepView('pet_movel');
                                    }}
                                    className={`p-5 rounded-2xl text-center font-semibold transition-all border-2 flex items-center justify-center min-h-[56px] sm:min-h-[64px] bg-white hover:bg-pink-50 border-gray-200`}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg">{condo}</span>
                                        <span className="text-xs text-gray-600 mt-1">
                                            {condo === 'Vitta Parque' ? 'Quartas-Feiras' : condo === 'Max Haus' ? 'Quintas-Feiras' : 'Sextas-Feiras'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button type="button" onClick={() => { setServiceStepView('main'); setSelectedCondo(null); setSelectedService(null); changeStep(1); }} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}
                
                {serviceStepView === 'bath_groom' && (
                    <div className="space-y-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">1. Serviço Principal</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<button type="button" onClick={() => setSelectedService(ServiceType.BATH)} className={`p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center h-full ${selectedService === ServiceType.BATH ? 'bg-pink-300 text-black border-pink-600 shadow-lg' : 'bg-white hover:bg-pink-50 border-gray-200'}`}>
                                <span className="text-lg">{SERVICES[ServiceType.BATH].label}</span>
                                <span className="text-xs text-gray-600 mt-1">Tosa Higiênica inclusa</span>
                            </button>
<button type="button" onClick={() => setSelectedService(ServiceType.BATH_AND_GROOMING)} className={`p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center h-full ${selectedService === ServiceType.BATH_AND_GROOMING ? 'bg-pink-300 text-black border-pink-600 shadow-lg' : 'bg-white hover:bg-pink-50 border-gray-200'}`}>
                                <span className="text-lg">{SERVICES[ServiceType.BATH_AND_GROOMING].label}</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => { setServiceStepView('main'); setSelectedCondo(null); setSelectedService(null); changeStep(1); }} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}
                
                {serviceStepView === 'pet_movel' && (
                    <div className="space-y-6">
                        <h3 className="text-md font-semibold text-gray-700 mb-2">1. Serviço Principal (Pet Móvel)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<button type="button" onClick={() => setSelectedService(ServiceType.PET_MOBILE_BATH)} className={`p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center h-full ${selectedService === ServiceType.PET_MOBILE_BATH ? 'bg-pink-300 text-black border-pink-600 shadow-lg' : 'bg-white hover:bg-pink-50 border-gray-200'}`}>
                                <span className="text-lg">Banho</span>
                                <span className="text-xs text-gray-600 mt-1">Tosa Higiênica inclusa</span>
                            </button>
<button type="button" onClick={() => setSelectedService(ServiceType.PET_MOBILE_BATH_AND_GROOMING)} className={`p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center h-full ${selectedService === ServiceType.PET_MOBILE_BATH_AND_GROOMING ? 'bg-pink-300 text-black border-pink-600 shadow-lg' : 'bg-white hover:bg-pink-50 border-gray-200'}`}>
                                <span className="text-lg">Banho & Tosa</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => { setServiceStepView('pet_movel_condo'); setSelectedService(null); }} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}

                {serviceStepView === 'hotel_pet' && (
                    <div className="space-y-6">
                        <div className="bg-pink-50 p-6 sm:p-5 rounded-lg mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Check-list de Hospedagem - Hotel Pet</h3>
                            <p className="text-base text-gray-600 mt-1">Preencha todos os dados do pet e tutor para o check-in</p>
                        </div>
                        <button type="button" onClick={() => { console.log('Clicou em Preencher Formulário de Hotel Pet'); setView('hotelRegistration'); }} className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors">
                            Preencher Formulário de Hotel Pet
                        </button>
                        <button type="button" onClick={() => { setServiceStepView('main'); setSelectedCondo(null); setSelectedService(null); changeStep(1); }} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}

                {serviceStepView === 'daycare_options' && (
                    <div className="space-y-6">
                        <div className="bg-pink-50 p-6 sm:p-5 rounded-lg mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Creche Pet - Selecione uma opção</h3>
                            <p className="text-base text-gray-600 mt-1">Escolha entre agendar uma visita ou fazer a matrícula</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button type="button" onClick={() => { console.log('Clicou em Visita - Creche Pet'); setSelectedService(ServiceType.VISIT_DAYCARE); setView('appointment'); }} className="p-6 rounded-xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[80px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">🏠 Visita</span>
                                <span className="text-sm text-gray-600 mt-1">Agendar visita à creche</span>
                            </button>
                            <button type="button" onClick={() => { console.log('Clicou em Matrícula - Creche Pet'); setView('daycareRegistration'); }} className="p-6 rounded-xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[80px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">📝 Matrícula</span>
                                <span className="text-sm text-gray-600 mt-1">Fazer matrícula na creche</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => { setServiceStepView('main'); setSelectedCondo(null); setSelectedService(null); changeStep(1); }} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}

                {serviceStepView === 'hotel_options' && (
                    <div className="space-y-6">
                        <div className="bg-pink-50 p-6 sm:p-5 rounded-lg mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Hotel Pet - Selecione uma opção</h3>
                            <p className="text-base text-gray-600 mt-1">Escolha entre agendar uma visita ou fazer a matrícula</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button type="button" onClick={() => { console.log('Clicou em Visita - Hotel Pet'); setSelectedService(ServiceType.VISIT_HOTEL); setView('appointment'); }} className="p-6 rounded-xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">🏨 Visita</span>
                            </button>
                            <button type="button" onClick={() => { console.log('Clicou em Matrícula - Hotel Pet'); setView('hotelRegistration'); }} className="p-6 rounded-xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center min-h-[64px] bg-white hover:bg-pink-50 border-gray-200">
                                <span className="text-lg">📝 Matrícula</span>
                            </button>
                        </div>
                        <button type="button" onClick={() => setServiceStepView('main')} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                )}

                {selectedService && !isVisitService && (
                    <>
                        <div>
                            <label htmlFor="petWeight" className="block text-md font-semibold text-gray-700 mb-2 mt-6">2. Peso do Pet</label>
                            <select id="petWeight" value={selectedWeight || ''} onChange={handleWeightChange} required className="block w-full py-3 px-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 text-gray-900">
                                <option value="" disabled>Selecione o peso</option>
                                {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (<option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>))}
                            </select>
                        </div>
                        <div>
                            <h3 className="text-md font-semibold text-gray-700 mb-2 mt-6">3. Serviços Adicionais (Opcional)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                {ADDON_SERVICES.filter(a => a.id !== 'tosa_higienica').map(addon => {
                                    const isDisabled = !selectedWeight || !selectedService || addon.excludesWeight?.includes(selectedWeight!) || (addon.requiresWeight && !addon.requiresWeight.includes(selectedWeight!)) || (addon.requiresService && addon.requiresService !== selectedService);
                                    return (
                                        <label key={addon.id} className={`flex items-center p-6 sm:p-5 rounded-lg border-2 transition-all ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-pink-50'} ${selectedAddons[addon.id] ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}`}>
                                            <input type="checkbox" onChange={() => handleAddonToggle(addon.id)} checked={!!selectedAddons[addon.id]} disabled={isDisabled} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                            <span className="ml-2.5">{addon.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
                
                {selectedService && !isVisitService && selectedWeight && totalPrice > 0 && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold text-gray-700">Preço Total:</span>
                            <span className="text-2xl font-bold text-green-600">R$ {(totalPrice ?? 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                        {Object.keys(selectedAddons).some(key => selectedAddons[key]) && (
                            <div className="mt-2 text-sm text-gray-600">
                                <div>Serviço base: R$ {(totalPrice - Object.keys(selectedAddons).reduce((sum, addonId) => {
                                    if (selectedAddons[addonId]) {
                                        const addon = ADDON_SERVICES.find(a => a.id === addonId);
                                        return sum + (addon?.price || 0);
                                    }
                                    return sum;
                                }, 0)).toFixed(2)}</div>
                                <div>Adicionais: R$ {Object.keys(selectedAddons).reduce((sum, addonId) => {
                                    if (selectedAddons[addonId]) {
                                        const addon = ADDON_SERVICES.find(a => a.id === addonId);
                                        return sum + (addon?.price || 0);
                                    }
                                    return sum;
                                }, 0).toFixed(2)}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-800">Selecione Data e Hora</h2>
              <div>
                <Calendar 
                  selectedDate={selectedDate} 
                  onDateChange={setSelectedDate} 
                  disablePast 
                  disableWeekends={true}
                  allowedDays={(() => {
                    // Para serviços Pet Móvel, definir dias permitidos baseado no condomínio
                    if ([ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService)) {
                      switch (selectedCondo) {
                        case 'Vitta Parque':
                          return [3]; // Quarta-feira (0=domingo, 1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 6=sábado)
                        case 'Max Haus':
                          return [4]; // Quinta-feira
                        case 'Paseo':
                          return [5]; // Sexta-feira
                        default:
                          return []; // Nenhum dia permitido se condomínio não selecionado
                      }
                    }
                    // Para outros serviços, usar allowedDays normal
                    return allowedDays;
                  })()}
                  disabledDates={(() => {
                    if (!selectedService) return [];
                    if ([ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService)) return disabledPetMovelDates;
                    if ([ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING].includes(selectedService)) return disabledBathGroomDates;
                    return [];
                  })()}
                />
              </div>
              <div>
                <h3 className="text-md font-semibold text-gray-700 mb-4 text-center">Horários Disponíveis</h3>
                <TimeSlotPicker
                  selectedDate={selectedDate}
                  selectedService={selectedService}
                  appointments={appointments}
                  onTimeSelect={setSelectedTime}
                  selectedTime={selectedTime}
                  workingHours={isVisitService ? VISIT_WORKING_HOURS : WORKING_HOURS}
                  isPetMovel={!!selectedCondo}
                  allowedDays={(() => {
                    if ([ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_BATH_AND_GROOMING, ServiceType.PET_MOBILE_GROOMING_ONLY].includes(selectedService)) {
                      switch (selectedCondo) {
                        case 'Vitta Parque': return [3];
                        case 'Max Haus': return [4];
                        case 'Paseo': return [5];
                        default: return [];
                      }
                    }
                    return allowedDays;
                  })()}
                  selectedCondo={selectedCondo}
                  disablePastTimes={true}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Resumo do Agendamento</h2>
              <div className="p-6 bg-white rounded-lg space-y-2 text-gray-700 border border-gray-200">
                <p><strong>Pet:</strong> {formData.petName} ({formData.petBreed})</p>
                <p><strong>Responsável:</strong> {formData.ownerName}</p>
                <p><strong>WhatsApp:</strong> {formData.whatsapp}</p>
                <p><strong>Serviço:</strong> {selectedService ? SERVICES[selectedService].label : 'Nenhum'}</p>
                {!isVisitService && <p><strong>Peso:</strong> {selectedWeight ? PET_WEIGHT_OPTIONS[selectedWeight] : 'Nenhum'}</p>}
                {!isVisitService && selectedAddons && Object.keys(selectedAddons).some(k => selectedAddons[k]) && (
                    <p><strong>Adicionais:</strong> {ADDON_SERVICES.filter(a => selectedAddons[a.id]).map(a => a.label).join(', ')}</p>
                )}
                <p><strong>Data:</strong> {selectedDate.toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'})} às {selectedTime}:00</p>
                 <div className="mt-4 pt-4 border-t border-gray-200">
                     <p className="text-2xl font-bold text-gray-900 text-right">Total: R$ {(totalPrice ?? 0).toFixed(2).replace('.', ',')}</p>
                 </div>
              </div>
            </div>
          )}

          <div className="mt-10 flex justify-between items-center gap-4">
            <button type="button" onClick={() => {
                if (step === 1) {
                    setServiceStepView('main');
                    setSelectedService(null);
                } else if (step === 2 && serviceStepView !== 'main') {
                    if (serviceStepView === 'pet_movel') {
                        setServiceStepView('pet_movel_condo');
                    } else {
                        setServiceStepView('main');
                    }
                    setSelectedService(null);
                } else {
                    changeStep(step - 1);
                }
            }} className="w-full md:w-[220px] bg-white border-2 border-gray-300 text-gray-700 font-bold py-4 px-8 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow">
              ← Voltar
            </button>

            {step < 4 && <button type="button" onClick={() => changeStep(step + 1)} disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)} className="w-full md:w-[220px] bg-gradient-to-r from-pink-600 to-pink-700 text-white font-bold py-4 px-8 rounded-xl hover:from-pink-700 hover:to-pink-800 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed">
              Próximo →
            </button>}
            {step === 4 && <button type="submit" disabled={isSubmitting} className="w-full md:w-[220px] bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed">
              {isSubmitting ? 'Agendando...' : '✓ Confirmar Agendamento'}
            </button>}
          </div>
        </form>
      </main>
      )}

      <footer className="text-center mt-8 text-base">
        <button onClick={() => setView('login')} className="text-gray-500 hover:text-pink-600 font-medium transition-colors underline-offset-4 hover:underline">Acesso Administrativo</button>
      </footer>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="text-center bg-white p-10 rounded-3xl shadow-2xl max-w-full sm:max-w-md mx-auto border-4 border-pink-200 animate-scaleIn">
            <SuccessIcon />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-pink-800 bg-clip-text text-transparent mt-4">Agendamento Confirmado!</h2>
            <p className="text-gray-600 mt-4 text-lg">Seu horário foi reservado com sucesso. Obrigado!</p>
            <div className="mt-6 p-4 bg-pink-50 rounded-xl">
              <p className="text-sm text-pink-800 font-medium">Você receberá uma confirmação via WhatsApp em breve</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hotel View Component for managing hotel registrations
    const HotelView: React.FC<{ refreshKey?: number; setShowHotelStatistics?: (show: boolean) => void }> = ({ refreshKey, setShowHotelStatistics }) => {
    const [registrations, setRegistrations] = useState<HotelRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRegistration, setSelectedRegistration] = useState<HotelRegistration | null>(null);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [registrationToDelete, setRegistrationToDelete] = useState<HotelRegistration | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [paymentUpdatingId, setPaymentUpdatingId] = useState<string | null>(null);
    const [registrationToEdit, setRegistrationToEdit] = useState<HotelRegistration | null>(null);
    const [isHotelExtraServicesModalOpen, setIsHotelExtraServicesModalOpen] = useState(false);
    const [hotelRegistrationForExtraServices, setHotelRegistrationForExtraServices] = useState<HotelRegistration | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [registrationToReject, setRegistrationToReject] = useState<HotelRegistration | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');
    const [hotelFilter, setHotelFilter] = useState<'all' | 'in_hotel' | 'approved' | 'analysis' | 'archived'>('all');
    const [showHotelFilterPanel, setShowHotelFilterPanel] = useState(false);
    const [expandedHotelSections, setExpandedHotelSections] = useState<string[]>(['in_hotel','approved','analysis','archived']);
    const [draggingOverHotel, setDraggingOverHotel] = useState<'in_hotel' | 'approved' | 'analysis' | 'archived' | null>(null);
    const [isUploadPhotoModalOpen, setIsUploadPhotoModalOpen] = useState(false);
    const [uploadTargetRegistration, setUploadTargetRegistration] = useState<HotelRegistration | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [selectedPhotoName, setSelectedPhotoName] = useState<string>('');

    const handlePetPhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setUploadError(null);
        const input = (e.currentTarget.elements.namedItem('pet_photo') as HTMLInputElement);
        const file = input?.files?.[0];
        if (!file) { setUploadError('Selecione uma imagem'); return; }
        setIsUploadingPhoto(true);
        try {
            const reg = uploadTargetRegistration as HotelRegistration;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const base = (reg.id || reg.pet_name.replace(/\s+/g,'_'));
            const path = `${base}_${Date.now()}.${ext}`;
            const oldUrl = (reg as any).pet_photo_url as string | undefined;
            if (oldUrl) {
                try {
                    const u = new URL(oldUrl);
                    const prefix = '/storage/v1/object/public/pet_photos/';
                    const idx = u.pathname.indexOf(prefix);
                    if (idx !== -1) {
                        const oldPath = u.pathname.substring(idx + prefix.length);
                        await supabase.storage.from('pet_photos').remove([oldPath]);
                    }
                } catch {}
            }
            const { error: upErr } = await supabase.storage.from('pet_photos').upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('pet_photos').getPublicUrl(path);
            const publicUrl = data.publicUrl;
            const { error: dbErr } = await supabase.from('hotel_registrations').update({ pet_photo_url: publicUrl }).eq('id', getDbId(reg.id)).select().single();
            if (dbErr) throw dbErr;
            setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, pet_photo_url: publicUrl } : r));
            setIsUploadPhotoModalOpen(false);
            setUploadTargetRegistration(null);
        } catch (err: any) {
            setUploadError(err.message || 'Falha ao enviar');
        } finally {
            setIsUploadingPhoto(false);
            setSelectedPhotoName('');
        }
    };

    const getDbId = (id: any) => {
        const s = String(id ?? '');
        return /^\d+$/.test(s) ? Number(s) : id;
    };

    const fetchRegistrations = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('hotel_registrations').select('*').order('created_at', { ascending: false });
            if (error) {
                const cached = localStorage.getItem('cached_hotel_registrations');
                if (cached) setRegistrations(JSON.parse(cached));
            } else {
                const normalized = (data as HotelRegistration[]).map(r => ({ ...r, id: r.id !== undefined && r.id !== null ? String(r.id) : r.id }));
                setRegistrations(normalized);
                try { localStorage.setItem('cached_hotel_registrations', JSON.stringify(normalized || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_hotel_registrations');
            if (cached) setRegistrations(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations, refreshKey]);

    

    const handleToggleCheckIn = async (registration: HotelRegistration) => {
        if ((registration.approval_status || '').toLowerCase() === 'rejeitado') {
            return;
        }
        if (!registration.id) return;
        setUpdatingId(registration.id);
        
        const currentStatus = registration.check_in_status || 'pending';
        let newStatus: 'pending' | 'checked_in' | 'checked_out';
        let updateData: any = {};
        
        if (currentStatus === 'pending') {
            newStatus = 'checked_in';
            updateData = {
                check_in_status: newStatus,
                checked_in_at: new Date().toISOString(),
                status: 'Ativo'
            };
        } else if (currentStatus === 'checked_in') {
            newStatus = 'checked_out';
            updateData = {
                check_in_status: newStatus,
                checked_out_at: new Date().toISOString(),
                status: 'Concluído'
            };
        } else {
            newStatus = 'checked_out';
            updateData = {
                check_in_status: newStatus,
                checked_out_at: registration.checked_out_at || new Date().toISOString(),
                status: 'Concluído'
            };
        }
        
        const { data, error } = await supabase
            .from('hotel_registrations')
            .update(updateData)
            .eq('id', getDbId(registration.id))
            .select()
            .single();
            
        if (error) {
            console.error('Error updating check-in status:', error);
            alert('Erro ao atualizar status de check-in/check-out');
        } else {
            setRegistrations(prev => prev.map(r => 
                r.id === registration.id ? { ...r, ...updateData } : r
            ));
            if (newStatus === 'checked_in') {
                setExpandedHotelSections(prev => prev.includes('in_hotel') ? prev : [...prev, 'in_hotel']);
            }
            if (newStatus === 'checked_out') {
                setExpandedHotelSections(prev => prev.includes('archived') ? prev : [...prev, 'archived']);
            }
        }
        setUpdatingId(null);
    };

    const handleTogglePaymentStatus = async (registration: HotelRegistration) => {
        if (!registration.id) return;
        setPaymentUpdatingId(registration.id);
        const current = (registration.payment_status === 'Pago') ? 'Pago' : 'Pendente';
        const next = current === 'Pago' ? 'Pendente' : 'Pago';
        const { data, error } = await supabase
            .from('hotel_registrations')
            .update({ payment_status: next })
            .eq('id', getDbId(registration.id))
            .select()
            .single();
        if (!error) {
            const updatedId = data && (data as any).id !== undefined ? String((data as any).id) : String(registration.id);
            setRegistrations(prev => prev.map(r => String(r.id) === updatedId ? { ...r, payment_status: next } : r));
        } else {
            alert('Erro ao atualizar status de pagamento');
        }
        setPaymentUpdatingId(null);
    };

    const handleConfirmReject = async () => {
        if (!registrationToReject || !registrationToReject.id) return;
        const reason = rejectReason.trim();
        if (!reason) return;
        const nowIso = new Date().toISOString();
        const { error } = await supabase
            .from('hotel_registrations')
            .update({ approval_status: 'rejected', check_in_status: 'checked_out', checked_out_at: nowIso, status: 'Concluído' })
            .eq('id', registrationToReject.id);
        if (!error) {
            setRegistrations(prev => prev.map(r => r.id === registrationToReject.id ? { ...r, approval_status: 'rejected', check_in_status: 'checked_out', checked_out_at: nowIso, status: 'Concluído' } : r));
            setExpandedHotelSections(prev => prev.includes('archived') ? prev : [...prev, 'archived']);
            const formatPhone = (raw: string) => {
                const digits = (raw || '').replace(/\D/g, '');
                if (digits.startsWith('55')) return digits;
                return `55${digits}`;
            };
            const body = {
                tutor_nome: registrationToReject.tutor_name,
                telefone: formatPhone(registrationToReject.tutor_phone || ''),
                motivo: reason,
            };
            try {
                await fetch('https://n8n.intelektus.tech/webhook/hospedagemCancelada', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            } catch (_) {}
        }
        setRegistrationToReject(null);
        setRejectReason('');
    };

    const handleApprove = async (registration: HotelRegistration) => {
        if (!registration.id) return;
        setApprovingId(registration.id);
        const payload: any = { approval_status: 'approved' };
        if (registration.check_in_status === 'checked_out') {
            payload.check_in_status = 'pending';
            payload.checked_out_at = null;
            payload.status = 'Ativo';
        }
        const { data, error } = await supabase
            .from('hotel_registrations')
            .update(payload)
            .eq('id', getDbId(registration.id))
            .select()
            .single();
        if (!error) {
            if (data && (data as any).id !== undefined) {
                const updatedId = String((data as any).id);
                setRegistrations(prev => prev.map(r => String(r.id) === updatedId ? { ...r, ...payload } : r));
            } else {
                setRegistrations(prev => prev.map(r => r.id === registration.id ? { ...r, ...payload } : r));
            }
            fetchRegistrations();
            setExpandedHotelSections(prev => prev.includes('approved') ? prev : [...prev, 'approved']);
            try { await sendHotelApprovalWebhook({ ...(registration as any), ...payload } as HotelRegistration); } catch {}
        }
        else {
            alert(`Falha ao aprovar hospedagem: ${error.message || 'Erro desconhecido'}`);
            console.error('Erro ao aprovar:', error);
        }
        setApprovingId(null);
    };

    const handleConfirmDelete = async () => {
        if (!registrationToDelete || !registrationToDelete.id) return;
        setIsDeleting(true);
        const { error } = await supabase.from('hotel_registrations').delete().eq('id', registrationToDelete.id);
        if (error) {
            alert('Falha ao excluir o registro.');
        } else {
            setRegistrations(prev => prev.filter(r => r.id !== registrationToDelete.id));
        }
        setIsDeleting(false);
        setRegistrationToDelete(null);
    };

    const handleAddHotelExtraServices = (registration: HotelRegistration) => {
        setHotelRegistrationForExtraServices(registration);
        setIsHotelExtraServicesModalOpen(true);
        setSelectedRegistration(null);
    };

    const handleHotelExtraServicesUpdated = (updatedRegistration: HotelRegistration) => {
        setRegistrations(prev => prev.map(r => 
            r.id === updatedRegistration.id ? updatedRegistration : r
        ));
        setIsHotelExtraServicesModalOpen(false);
        setHotelRegistrationForExtraServices(null);
    };

    const sendHotelApprovalWebhook = async (registration: HotelRegistration) => {
        const invoiceTotal = calculateHotelInvoiceTotal(registration);
        const digits = String(registration.tutor_phone || '').replace(/\D/g, '');
        const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
        const whatsapp_link = withCountry ? `https://wa.me/${withCountry}` : null;
        const payload = {
            id: registration.id,
            created_at: registration.created_at ?? null,
            updated_at: (registration as any).updated_at ?? null,
            registration_date: registration.registration_date ?? null,
            status: registration.status,
            approval_status: registration.approval_status ?? null,
            check_in_status: registration.check_in_status ?? null,
            checked_in_at: registration.checked_in_at ?? null,
            checked_out_at: registration.checked_out_at ?? null,
            pet: {
                name: registration.pet_name,
                breed: registration.pet_breed,
                sex: registration.pet_sex,
                age: registration.pet_age,
                neutered: registration.is_neutered,
                weight: (registration as any).pet_weight ?? null,
                photo_url: registration.pet_photo_url ?? null,
            },
            tutor: {
                name: registration.tutor_name,
                rg: registration.tutor_rg,
                address: registration.tutor_address,
                phone: registration.tutor_phone,
                email: registration.tutor_email,
                social_media: registration.tutor_social_media ?? null,
                whatsapp_link,
            },
            emergency: {
                contact_name: registration.emergency_contact_name,
                contact_phone: registration.emergency_contact_phone,
                contact_relation: registration.emergency_contact_relation,
                vet_phone: registration.vet_phone,
            },
            documents: {
                has_rg_document: registration.has_rg_document,
                has_residence_proof: registration.has_residence_proof,
                has_vaccination_card: registration.has_vaccination_card,
                has_vet_certificate: registration.has_vet_certificate,
                has_flea_tick_remedy: registration.has_flea_tick_remedy,
                flea_tick_remedy_date: registration.flea_tick_remedy_date,
                photo_authorization: registration.photo_authorization,
                retrieve_at_checkout: registration.retrieve_at_checkout,
                declaration_accepted: registration.declaration_accepted,
                tutor_check_in_signature: registration.tutor_check_in_signature,
                tutor_check_out_signature: registration.tutor_check_out_signature,
                tutor_signature: (registration as any).tutor_signature ?? null,
            },
            health: {
                preexisting_disease: registration.preexisting_disease,
                allergies: registration.allergies,
                behavior: registration.behavior,
                fears_traumas: registration.fears_traumas,
                wounds_marks: registration.wounds_marks,
            },
            food: {
                brand: registration.food_brand,
                quantity: registration.food_quantity,
                feeding_frequency: registration.feeding_frequency,
                observations: registration.food_observations,
                accepts_treats: registration.accepts_treats,
                special_food_care: registration.special_food_care,
            },
            schedule: {
                check_in_date: registration.check_in_date,
                check_in_time: registration.check_in_time,
                check_out_date: registration.check_out_date,
                check_out_time: registration.check_out_time,
            },
            services: {
                bath: registration.service_bath,
                transport: registration.service_transport,
                daily_rate: registration.service_daily_rate,
                extra_hour: registration.service_extra_hour,
                vet: registration.service_vet,
                training: registration.service_training,
                extra_services: registration.extra_services ?? null,
            },
            pricing: {
                total_services_price: registration.total_services_price,
                invoice_total: invoiceTotal,
            },
            additional_info: registration.additional_info,
            professional_name: registration.professional_name,
        };
        try {
            await fetch('https://n8n.intelektus.tech/webhook/hospedagemConfirmada', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('Falha ao enviar webhook hospedagemConfirmada', err);
        }
    };

    const sendHotelCheckoutWebhook = async (registration: HotelRegistration) => {
        const invoiceTotal = calculateHotelInvoiceTotal(registration);
        const digits = String(registration.tutor_phone || '').replace(/\D/g, '');
        const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
        const whatsapp_link = withCountry ? `https://wa.me/${withCountry}` : null;
        const payload = {
            id: registration.id,
            created_at: registration.created_at ?? null,
            updated_at: (registration as any).updated_at ?? null,
            registration_date: registration.registration_date ?? null,
            status: 'Concluído',
            approval_status: registration.approval_status ?? null,
            check_in_status: 'checked_out',
            checked_in_at: registration.checked_in_at ?? null,
            checked_out_at: new Date().toISOString(),
            pet: {
                name: registration.pet_name,
                breed: registration.pet_breed,
                sex: registration.pet_sex,
                age: registration.pet_age,
                neutered: registration.is_neutered,
                weight: (registration as any).pet_weight ?? null,
                photo_url: registration.pet_photo_url ?? null,
            },
            tutor: {
                name: registration.tutor_name,
                rg: registration.tutor_rg,
                address: registration.tutor_address,
                phone: registration.tutor_phone,
                email: registration.tutor_email,
                social_media: registration.tutor_social_media ?? null,
                whatsapp_link,
            },
            emergency: {
                contact_name: registration.emergency_contact_name,
                contact_phone: registration.emergency_contact_phone,
                contact_relation: registration.emergency_contact_relation,
                vet_phone: registration.vet_phone,
            },
            documents: {
                has_rg_document: registration.has_rg_document,
                has_residence_proof: registration.has_residence_proof,
                has_vaccination_card: registration.has_vaccination_card,
                has_vet_certificate: registration.has_vet_certificate,
                has_flea_tick_remedy: registration.has_flea_tick_remedy,
                flea_tick_remedy_date: registration.flea_tick_remedy_date,
                photo_authorization: registration.photo_authorization,
                retrieve_at_checkout: registration.retrieve_at_checkout,
                declaration_accepted: registration.declaration_accepted,
                tutor_check_in_signature: registration.tutor_check_in_signature,
                tutor_check_out_signature: registration.tutor_check_out_signature,
                tutor_signature: (registration as any).tutor_signature ?? null,
            },
            health: {
                preexisting_disease: registration.preexisting_disease,
                allergies: registration.allergies,
                behavior: registration.behavior,
                fears_traumas: registration.fears_traumas,
                wounds_marks: registration.wounds_marks,
            },
            food: {
                brand: registration.food_brand,
                quantity: registration.food_quantity,
                feeding_frequency: registration.feeding_frequency,
                observations: registration.food_observations,
                accepts_treats: registration.accepts_treats,
                special_food_care: registration.special_food_care,
            },
            schedule: {
                check_in_date: registration.check_in_date,
                check_in_time: registration.check_in_time,
                check_out_date: registration.check_out_date,
                check_out_time: registration.check_out_time,
            },
            services: {
                bath: registration.service_bath,
                transport: registration.service_transport,
                daily_rate: registration.service_daily_rate,
                extra_hour: registration.service_extra_hour,
                vet: registration.service_vet,
                training: registration.service_training,
                extra_services: registration.extra_services ?? null,
            },
            pricing: {
                total_services_price: registration.total_services_price,
                invoice_total: invoiceTotal,
            },
            additional_info: registration.additional_info,
            professional_name: registration.professional_name,
        };
        try {
            await fetch('https://n8n.intelektus.tech/webhook/cobrancaHotelPet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('Falha ao enviar webhook cobrancaHotelPet', err);
        }
    };

        const handleRemoveExtraChip = async (registration: HotelRegistration, key: 'pernoite' | 'banho_tosa' | 'so_banho' | 'adestrador' | 'despesa_medica' | 'dias_extras') => {
            if (!registration.extra_services) return;
            const updatedExtras = { ...registration.extra_services } as any;
            if (key === 'dias_extras') {
                const current = updatedExtras.dias_extras || { quantity: 0, value: 0 };
                updatedExtras.dias_extras = { ...current, quantity: 0 };
            } else {
                const current = updatedExtras[key] || { enabled: false, value: 0 };
                updatedExtras[key] = { ...current, enabled: false };
            }
            const { data, error } = await supabase
                .from('hotel_registrations')
                .update({ extra_services: updatedExtras })
                .eq('id', getDbId(registration.id))
                .select()
                .single();
            if (!error) {
                setRegistrations(prev => prev.map(r => r.id === registration.id ? { ...r, extra_services: updatedExtras } : r));
            }
        };

    const filteredRegistrations = registrations.filter(reg => {
        const pet = (reg.pet_name || '').toLowerCase();
        const tutor = (reg.tutor_name || '').toLowerCase();
        const term = (searchTerm || '').toLowerCase();
        return pet.includes(term) || tutor.includes(term);
    });

    const currentInHotel = filteredRegistrations.filter(reg => reg.check_in_status === 'checked_in');
    const archived: HotelRegistration[] = filteredRegistrations.filter(reg => (reg.check_in_status === 'checked_out') || (reg.status === 'Concluído'));
    
    const normalizeApproval = (s: any): 'approved' | 'pending' | 'rejected' => {
        const v = String(s ?? '').trim().toLowerCase();
        if (v === 'approved' || v === 'aprovado') return 'approved';
        if (v === 'rejected' || v === 'rejeitado') return 'rejected';
        return 'pending';
    };

    const approved = filteredRegistrations
        .filter(reg => normalizeApproval(reg.approval_status) === 'approved')
        .filter(reg => reg.check_in_status !== 'checked_in' && reg.check_in_status !== 'checked_out' && reg.status !== 'Concluído');
    
    const analysis = filteredRegistrations
        .filter(reg => reg.check_in_status !== 'checked_in' && reg.check_in_status !== 'checked_out' && reg.status !== 'Concluído')
        .filter(reg => normalizeApproval(reg.approval_status) !== 'approved');

    const handleHotelDragStart = (e: React.DragEvent<HTMLDivElement>, registration: HotelRegistration, source: 'analysis' | 'approved' | 'in_hotel' | 'archived') => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ id: registration.id, source }));
    };

    const handleHotelDragOver = (e: React.DragEvent<HTMLDivElement>, target: 'analysis' | 'approved' | 'in_hotel' | 'archived') => {
        e.preventDefault();
        setDraggingOverHotel(target);
    };

    const handleHotelDragLeave = () => setDraggingOverHotel(null);

    const handleHotelDrop = async (e: React.DragEvent<HTMLDivElement>, target: 'analysis' | 'approved' | 'in_hotel' | 'archived') => {
        e.preventDefault();
        setDraggingOverHotel(null);
        const draggedDataRaw = e.dataTransfer.getData('application/json');
        if (!draggedDataRaw) return;
        const draggedData = JSON.parse(draggedDataRaw);
        const { id, source } = draggedData as { id: string, source: 'analysis' | 'approved' | 'in_hotel' | 'archived' };
        if (!id || source === target) return;
        const registration = registrations.find(r => String(r.id) === String(id));
        if (!registration) return;
        let payload: any = {};
        if (target === 'approved') {
            payload = { approval_status: 'approved' };
            if (source === 'archived') payload = { ...payload, check_in_status: 'pending', checked_out_at: null, status: 'Ativo' };
            if (source === 'in_hotel') payload = { ...payload, check_in_status: 'pending', checked_in_at: null, status: 'Ativo' };
        } else if (target === 'in_hotel') {
            payload = { check_in_status: 'checked_in', checked_in_at: new Date().toISOString(), status: 'Ativo' };
            if ((registration.approval_status || '').toLowerCase() !== 'approved') payload = { ...payload, approval_status: 'approved' };
        } else if (target === 'archived') {
            payload = { check_in_status: 'checked_out', checked_out_at: new Date().toISOString(), status: 'Concluído' };
        } else if (target === 'analysis') {
            payload = { approval_status: 'pending', check_in_status: 'pending', checked_in_at: null, checked_out_at: null, status: 'Ativo' };
        }
        const { data, error } = await supabase
            .from('hotel_registrations')
            .update(payload)
            .eq('id', getDbId(registration.id))
            .select()
            .single();
        if (!error) {
            const updatedId = data && (data as any).id !== undefined ? String((data as any).id) : String(registration.id);
            setRegistrations(prev => prev.map(r => String(r.id) === updatedId ? { ...r, ...payload } : r));
            setTimeout(() => {
                fetchRegistrations();
            }, 100);
            setExpandedHotelSections(prev => prev.includes(target) ? prev : [...prev, target]);
            if (target === 'approved') { try { await sendHotelApprovalWebhook({ ...(registration as any), ...payload } as HotelRegistration); } catch {} }
        } else {
            alert(`Falha ao mover hospedagem: ${error.message || 'Erro desconhecido'}`);
            console.error('Erro ao mover hospedagem:', error);
        }
    };

    const toggleHotelSection = (sectionId: 'in_hotel' | 'approved' | 'analysis' | 'archived') => {
        setExpandedHotelSections(prev => prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]);
    };

    const HotelAccordionSection: React.FC<{ title: string; items: HotelRegistration[]; sectionId: 'in_hotel' | 'approved' | 'analysis' | 'archived'; }>
        = ({ title, items, sectionId }) => {
        const isExpanded = expandedHotelSections.includes(sectionId);
        return (
            <div className={`relative z-0 bg-white rounded-2xl shadow-sm ${draggingOverHotel === sectionId ? 'ring-2 ring-pink-400 ring-offset-2' : ''}`} onDragOver={(e) => handleHotelDragOver(e, sectionId)} onDrop={(e) => handleHotelDrop(e, sectionId)} onDragLeave={handleHotelDragLeave}>
                <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => toggleHotelSection(sectionId)}>
                    <div className="flex items-center gap-3">
                        <ChevronRightIcon className={`h-8 w-8 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{items.length}</span>
                    </div>
                    <button className="text-xs text-pink-600 hover:underline" onClick={(e) => { e.stopPropagation(); toggleHotelSection(sectionId); }}>{isExpanded ? 'Recolher' : 'Expandir'}</button>
                </div>
                {isExpanded && (
                    <div className="p-4 pt-0">
                        {items.length > 0 ? (
                            <div className="overflow-x-auto -mx-4">
                                <div className="flex gap-4 pb-2 snap-x snap-mandatory">
                                    {items.map(reg => (
                                        <div key={reg.id} draggable onDragStart={(e) => handleHotelDragStart(e, reg, sectionId)} className="shrink-0 w-screen sm:w-[420px] lg:w-[460px] snap-center">
                                            <HotelRegistrationCard registration={reg} onAddExtraServices={handleAddHotelExtraServices} showCheckActions={sectionId==='approved'} inHotel={sectionId==='in_hotel'} onChangePhoto={(r) => { setUploadTargetRegistration(r); setIsUploadPhotoModalOpen(true); }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">Sem itens nesta sessão</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner /></div>;
    }

    if (isAddFormOpen) {
        return <HotelRegistrationForm setView={() => setIsAddFormOpen(false)} onSuccess={() => { fetchRegistrations(); setIsAddFormOpen(false); }} />;
    }

    const HotelRegistrationCard: React.FC<{ 
        registration: HotelRegistration;
        onAddExtraServices: (registration: HotelRegistration) => void;
        showCheckActions?: boolean;
        inHotel?: boolean;
        onChangePhoto?: (registration: HotelRegistration) => void;
    }> = ({ registration, onAddExtraServices, showCheckActions = false, inHotel = false, onChangePhoto }) => {
        const invoiceTotal = calculateHotelInvoiceTotal(registration);
        const currentCheckInStatus = registration.check_in_status || 'pending';
        const isUpdating = updatingId === registration.id;
        const isApproving = approvingId === registration.id;
        const [pendingChip, setPendingChip] = useState<string | null>(null);
        const apRawHeader = (registration.approval_status ?? 'pending');
        const apNormHeader = (typeof apRawHeader === 'string' ? apRawHeader.trim() : 'pending').toLowerCase();
        const isAnalysisHeader = (registration.check_in_status !== 'checked_in' && registration.check_in_status !== 'checked_out' && registration.status !== 'Concluído' && apNormHeader !== 'approved');
        
        const getCheckInButtonStyle = () => {
            if (currentCheckInStatus === 'pending') {
                return 'bg-green-500 hover:bg-green-600 text-white';
            } else if (currentCheckInStatus === 'checked_in') {
                return 'bg-red-500 hover:bg-red-600 text-white';
            } else {
                return 'bg-gray-500 hover:bg-gray-600 text-white';
            }
        };
        
        const getCheckInButtonText = () => {
            if (isUpdating) return 'Atualizando...';
            if (currentCheckInStatus === 'pending') return 'Check-in';
            if (currentCheckInStatus === 'checked_in') return 'Check-out';
            return 'Arquivar';
        };
        
        const getStatusBadge = () => {
            if (currentCheckInStatus === 'checked_in') {
                return { bg: 'bg-green-100', text: 'text-green-800', label: 'Check-in Ativo' };
            } else if (currentCheckInStatus === 'checked_out') {
                return { bg: 'bg-red-100', text: 'text-red-800', label: 'Check-out Realizado' };
            } else {
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Aguardando Check-in' };
            }
        };
        
        const statusBadge = getStatusBadge();
        const buildWhatsAppLink = (phone: string) => {
            const digits = String(phone || '').replace(/\D/g, '');
            const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
            return withCountry ? `https://wa.me/${withCountry}` : '#';
        };
        
        return (
            <div className="bg-white rounded-2xl shadow-sm p-5 min-h-[360px] hover:shadow-md transition-shadow border border-gray-200">
                <div className="rounded-xl mb-3 p-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={registration.pet_photo_url || "https://cdn-icons-png.flaticon.com/512/3009/3009489.png"} alt="Pet" className="w-12 h-12 rounded-full object-cover cursor-pointer" onClick={() => onChangePhoto && onChangePhoto(registration)} />
                        <div>
                            <h3 className="text-lg font-bold leading-none">{registration.pet_name}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs opacity-90">Valor Total</p>
                        <p className="text-lg font-extrabold">R$ {invoiceTotal.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-2">
                        {!isAnalysisHeader && (
                            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate ${statusBadge.bg} ${statusBadge.text}`}>{statusBadge.label}</span>
                        )}
                        {(() => {
                            const apRaw = (registration.approval_status ?? 'pending');
                            const apNorm = (typeof apRaw === 'string' ? apRaw.trim() : 'pending').toLowerCase();
                            const map: Record<string, { bg: string; text: string; label: string }> = {
                                'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em Análise' },
                                'approved': { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovado' },
                                'rejected': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitado' },
                                'pendente': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Em Análise' },
                                'aprovado': { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovado' },
                                'rejeitado': { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitado' },
                            };
                            if (currentCheckInStatus === 'checked_in') {
                                return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate bg-green-100 text-green-800`}>Hospedagem Ativa</span>;
                            }
                            if (currentCheckInStatus === 'checked_out' || (registration.status || '') === 'Concluído') {
                                return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate bg-red-100 text-red-800`}>Arquivado</span>;
                            }
                            const b = map[apNorm] ?? map['pendente'];
                            return <span className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate ${b.bg} ${b.text}`}>{b.label}</span>;
                        })()}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-gray-500">Status do pagamento</span>
                        {(() => {
                            const current = (registration.payment_status === 'Pago') ? 'Pago' : 'Pendente';
                            const cls = current === 'Pago'
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
                            return (
                                <button
                                    onClick={() => handleTogglePaymentStatus(registration)}
                                    disabled={paymentUpdatingId === registration.id}
                                    className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate border ${cls}`}
                                    title={current === 'Pago' ? 'Marcar como pendente' : 'Marcar como pago'}
                                >
                                    {paymentUpdatingId === registration.id ? 'Atualizando...' : current}
                                </button>
                            );
                        })()}
                    </div>
                </div>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-gray-600">
                        <UserIcon />
                        <span>{registration.tutor_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                        <WhatsAppIcon />
                        <a href={buildWhatsAppLink(registration.tutor_phone)} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">{registration.tutor_phone}</a>
                    </div>
                    {registration.check_in_date && (
                        <div className="flex items-center gap-3 text-gray-600">
                            <img src="https://cdn-icons-png.flaticon.com/512/9576/9576046.png" alt="Check-in Icon" className="h-7 w-7" />
                            <span>
                                Check-in: {formatDateToBR(registration.check_in_date)} {String(registration.check_in_time ?? '').split(':').slice(0,2).join(':')}
                            </span>
                        </div>
                    )}
                    {registration.check_out_date && (
                        <div className="flex items-center gap-3 text-gray-600">
                            <img src="https://cdn-icons-png.flaticon.com/512/9576/9576053.png" alt="Check-out Icon" className="h-7 w-7" />
                            <span>
                                Check-out: {formatDateToBR(registration.check_out_date)} {String(registration.check_out_time ?? '').split(':').slice(0,2).join(':')}
                            </span>
                        </div>
                    )}
                    
                {registration.extra_services && (
                    <div className="pt-2">
                        <div className="flex flex-wrap gap-2">
                            {registration.extra_services.pernoite?.enabled && (
                                <button onClick={() => pendingChip==='pernoite' ? handleRemoveExtraChip(registration, 'pernoite') : setPendingChip('pernoite')} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>Pernoite</span>{pendingChip==='pernoite' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                            {registration.extra_services.banho_tosa?.enabled && (
                                <button onClick={() => pendingChip==='banho_tosa' ? handleRemoveExtraChip(registration, 'banho_tosa') : setPendingChip('banho_tosa')} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>Banho & Tosa</span>{pendingChip==='banho_tosa' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                            {registration.extra_services.so_banho?.enabled && (
                                <button onClick={() => pendingChip==='so_banho' ? handleRemoveExtraChip(registration, 'so_banho') : setPendingChip('so_banho')} className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>Só banho</span>{pendingChip==='so_banho' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                            {registration.extra_services.adestrador?.enabled && (
                                <button onClick={() => pendingChip==='adestrador' ? handleRemoveExtraChip(registration, 'adestrador') : setPendingChip('adestrador')} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>Adestrador</span>{pendingChip==='adestrador' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                            {registration.extra_services.despesa_medica?.enabled && (
                                <button onClick={() => pendingChip==='despesa_medica' ? handleRemoveExtraChip(registration, 'despesa_medica') : setPendingChip('despesa_medica')} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>Despesa médica</span>{pendingChip==='despesa_medica' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                            {registration.extra_services.dias_extras?.quantity > 0 && (
                                <button onClick={() => pendingChip==='dias_extras' ? handleRemoveExtraChip(registration, 'dias_extras') : setPendingChip('dias_extras')} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full cursor-pointer hover:opacity-80 flex items-center gap-1">
                                    <span>{registration.extra_services.dias_extras.quantity} dia{registration.extra_services.dias_extras.quantity > 1 ? 's' : ''} extra{registration.extra_services.dias_extras.quantity > 1 ? 's' : ''}</span>{pendingChip==='dias_extras' && <CloseIcon className="w-3 h-3" />}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mt-4">
                    {(() => {
                        const apRaw = (registration.approval_status ?? 'pending');
                        const apNorm = (typeof apRaw === 'string' ? apRaw.trim() : 'pending').toLowerCase();
                        const isAnalysis = (registration.check_in_status !== 'checked_in' && registration.check_in_status !== 'checked_out' && registration.status !== 'Concluído' && apNorm !== 'approved');
                        if (isAnalysis) {
                            return (
                                <>
                                    <button
                                        onClick={() => handleApprove(registration)}
                                        disabled={isApproving}
                                        className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors text-xs font-medium flex items-center gap-1.5 justify-center"
                                    >
                                        {isApproving ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>) : (<><CheckCircleOutlineIcon className="w-4 h-4" /><span>Aprovar</span></>)}
                                    </button>
                                    <button
                                        onClick={() => { setRegistrationToReject(registration); setRejectReason(''); }}
                                        className="w-full bg-red-100 text-red-700 py-1.5 px-2 rounded-md hover:bg-red-200 transition-colors text-xs font-medium flex items-center gap-1.5 justify-center"
                                    >
                                        <XCircleOutlineIcon className="w-4 h-4" /><span>Rejeitar</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedRegistration(registration)}
                                        className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                                    >
                                        <EyeOutlineIcon className="w-4 h-4" /><span>Visualizar</span>
                                    </button>
                                    <button
                                        onClick={() => setRegistrationToEdit(registration)}
                                        className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                                    >
                                        <PencilOutlineIcon className="w-4 h-4" /><span>Editar</span>
                                    </button>
                                </>
                            );
                        }
                        if (inHotel) {
                            return (
                                <>
                                    <button 
                                        onClick={async () => { await handleToggleCheckIn(registration); await sendHotelCheckoutWebhook(registration); }}
                                        disabled={isUpdating}
                                        className={`w-full py-1.5 px-2 rounded-md transition-colors ${getCheckInButtonStyle()} disabled:opacity-50 flex items-center justify-center gap-1.5 text-center whitespace-nowrap leading-none text-[11px] font-medium`}
                                    >
                                        {isUpdating ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>) : (<><CheckCircleOutlineIcon className="w-4 h-4" /><span>Check-out</span></>)}
                                    </button>
                                    <button 
                                        onClick={() => setSelectedRegistration(registration)}
                                        className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                    >
                                        <EyeOutlineIcon className="w-4 h-4" /><span>Visualizar</span>
                                    </button>
                                    <button
                                        onClick={() => setRegistrationToEdit(registration)}
                                        className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                    >
                                        <PencilOutlineIcon className="w-4 h-4" /><span>Editar</span>
                                    </button>
                                    <button
                                        onClick={() => onAddExtraServices(registration)}
                                        className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                        title="Adicionar Serviços Extras"
                                    >
                                        <PlusOutlineIcon className="w-4 h-4" /><span>Extras</span>
                                    </button>
                                    <button
                                        onClick={() => setRegistrationToDelete(registration)}
                                        className="w-full bg-red-50 text-red-600 py-1.5 px-2 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                    >
                                        <TrashOutlineIcon className="w-4 h-4" /><span>Excluir</span>
                                    </button>
                                </>
                            );
                        }
                        return (
                            <>
                                {showCheckActions && (
                                    <button 
                                        onClick={() => handleToggleCheckIn(registration)}
                                        disabled={isUpdating}
                                        className={`w-full py-1.5 px-2 rounded-md transition-colors ${getCheckInButtonStyle()} disabled:opacity-50 flex items-center justify-center gap-1.5 text-center whitespace-nowrap leading-none text-[11px] font-medium`}
                                    >
                                        {isUpdating ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>) : (<><CheckCircleOutlineIcon className="w-4 h-4" /><span>Check-in</span></>)}
                                    </button>
                                )}
                                {!showCheckActions && (
                                    <button
                                        onClick={() => handleApprove(registration)}
                                        disabled={isApproving}
                                        className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                    >
                                        {isApproving ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>) : (<><CheckCircleOutlineIcon className="w-4 h-4" /><span>Aprovar</span></>)}
                                    </button>
                                )}
                                <button 
                                    onClick={() => setSelectedRegistration(registration)}
                                    className="w-full bg-gray-100 text-gray-700 py-1.5 px-2 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                >
                                    <EyeOutlineIcon className="w-4 h-4" /><span>Visualizar</span>
                                </button>
                                <button
                                    onClick={() => setRegistrationToEdit(registration)}
                                    className="w-full bg-blue-100 text-blue-700 py-1.5 px-2 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                >
                                    <PencilOutlineIcon className="w-4 h-4" /><span>Editar</span>
                                </button>
                                <button
                                    onClick={() => onAddExtraServices(registration)}
                                    className="w-full bg-green-100 text-green-700 py-1.5 px-2 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                    title="Adicionar Serviços Extras"
                                >
                                    <PlusOutlineIcon className="w-4 h-4" /><span>Extras</span>
                                </button>
                                <button
                                    onClick={() => setRegistrationToDelete(registration)}
                                    className="w-full bg-red-50 text-red-600 py-1.5 px-2 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-center whitespace-nowrap text-xs font-medium"
                                >
                                    <TrashOutlineIcon className="w-4 h-4" /><span>Excluir</span>
                                </button>
                            </>
                        );
                    })()}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Hotel Pet</h2>
                        <p className="text-sm text-gray-600 text-center">Clientes Hotel Pet</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <button
                            onClick={() => setIsAddFormOpen(true)}
                            title="Novo Check-in"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold py-3 sm:py-2.5 px-4 rounded-lg hover:bg-pink-700 transition-colors"
                        >
                            <img alt="Adicionar Agendamento" className="h-6 w-6" src="https://i.imgur.com/ZimMFxY.png" />
                        </button>
                        <button
                            onClick={() => setShowHotelFilterPanel(prev => !prev)}
                            title="Filtros"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-gray-100 text-gray-700 font-semibold h-11 px-5 text-base rounded-lg hover:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <img alt="Filtros" className="h-6 w-6" src="https://cdn-icons-png.flaticon.com/512/9702/9702724.png" />
                        </button>
                        <button
                            onClick={() => setShowHotelStatistics?.(true)}
                            title="Estatísticas"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <ChartBarIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <input
                        type="text"
                        placeholder="Buscar por nome do pet ou tutor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                </div>

                {showHotelFilterPanel && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex flex-wrap gap-1.5">
                            <button onClick={() => setHotelFilter('all')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${hotelFilter==='all' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'}`}>Todos</button>
                            <button onClick={() => setHotelFilter('in_hotel')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${hotelFilter==='in_hotel' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'}`}>Pets no Hotel agora</button>
                            <button onClick={() => setHotelFilter('approved')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${hotelFilter==='approved' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'}`}>Hospedagens Aprovadas</button>
                            <button onClick={() => setHotelFilter('analysis')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${hotelFilter==='analysis' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'}`}>Hospedagens em Análise</button>
                            <button onClick={() => setHotelFilter('archived')} className={`px-2.5 py-1.5 rounded-md text-xs font-semibold ${hotelFilter==='archived' ? 'bg-pink-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:border-pink-400'}`}>Arquivados</button>
                        </div>
                    </div>
                )}
            </div>

            {filteredRegistrations.length > 0 ? (
                <div className="space-y-6">
                    {(hotelFilter === 'all' || hotelFilter === 'in_hotel') && (
                        <HotelAccordionSection title="Pets no Hotel agora" items={currentInHotel} sectionId="in_hotel" />
                    )}
                    {(hotelFilter === 'all' || hotelFilter === 'approved') && (
                        <HotelAccordionSection title="Hospedagens Aprovadas" items={approved} sectionId="approved" />
                    )}
                    {(hotelFilter === 'all' || hotelFilter === 'analysis') && (
                        <HotelAccordionSection title="Hospedagens em Análise" items={analysis} sectionId="analysis" />
                    )}
                    {(hotelFilter === 'all' || hotelFilter === 'archived') && (
                        <HotelAccordionSection title="Arquivados" items={archived} sectionId="archived" />
                    )}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-2xl">
                    <p className="text-gray-500 text-lg">Nenhum pet cadastrado no Hotel Pet</p>
                </div>
            )}

            {registrationToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-full sm:max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Exclusão</h3>
                        <p className="text-gray-600 mb-6">
                            Tem certeza que deseja excluir o registro de <strong>{registrationToDelete.pet_name}</strong>?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setRegistrationToDelete(null)}
                                className="px-3 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-semibold text-sm disabled:opacity-50"
                            >
                                {isDeleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {registrationToReject && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-full sm:max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Rejeitar Hospedagem</h3>
                        <p className="text-gray-600 mb-4">Informe o motivo da rejeição para <strong>{registrationToReject.pet_name}</strong>:</p>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500" rows={4} placeholder="Descreva o motivo"></textarea>
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => { setRegistrationToReject(null); setRejectReason(''); }} className="px-3 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors font-medium text-sm">Cancelar</button>
                            <button onClick={handleConfirmReject} disabled={!rejectReason.trim()} className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-semibold text-sm disabled:opacity-50">Confirmar Rejeição</button>
                        </div>
                    </div>
                </div>
            )}

            {registrationToEdit && (
                <EditHotelRegistrationModal
                    registration={registrationToEdit}
                    onClose={() => setRegistrationToEdit(null)}
                    onRegistrationUpdated={(updated) => {
                        setRegistrations(prev => prev.map(r => r.id === updated.id ? updated : r));
                        setRegistrationToEdit(null);
                    }}
                />
            )}

            {isHotelExtraServicesModalOpen && hotelRegistrationForExtraServices && (
                <ExtraServicesModal
                    isOpen={isHotelExtraServicesModalOpen}
                    onClose={() => {
                        setIsHotelExtraServicesModalOpen(false);
                        setHotelRegistrationForExtraServices(null);
                    }}
                    onSuccess={handleHotelExtraServicesUpdated}
                    data={hotelRegistrationForExtraServices}
                    type="hotel"
                    title="Serviços Extras - Hotel Pet"
                />
            )}

            {selectedRegistration && (
                <ViewHotelRegistrationModal
                    registration={selectedRegistration}
                    onClose={() => setSelectedRegistration(null)}
                    onAddExtraServices={(reg) => handleAddHotelExtraServices(reg)}
                    onChangePhoto={(reg) => { setUploadTargetRegistration(reg); setIsUploadPhotoModalOpen(true); }}
                />
            )}

            {isUploadPhotoModalOpen && uploadTargetRegistration && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Trocar foto do pet</h3>
                        <form onSubmit={handlePetPhotoUpload}>
                            <input id="pet_photo_input" type="file" name="pet_photo" accept="image/*" className="sr-only" onChange={(e) => setSelectedPhotoName(e.target.files?.[0]?.name || '')} />
                            <div className="flex items-center gap-3 mb-4">
                                <label htmlFor="pet_photo_input" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer">Escolher arquivo</label>
                                <span className="text-sm text-gray-600">{selectedPhotoName || 'Nenhum arquivo selecionado'}</span>
                            </div>
                            {uploadError && <p className="text-red-600 text-sm mb-2">{uploadError}</p>}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setIsUploadPhotoModalOpen(false); setUploadTargetRegistration(null); setSelectedPhotoName(''); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancelar</button>
                                <button type="submit" disabled={isUploadingPhoto} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50">{isUploadingPhoto ? 'Enviando...' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Edit Hotel Registration Modal Component
const EditHotelRegistrationModal: React.FC<{
    registration: HotelRegistration;
    onClose: () => void;
    onRegistrationUpdated: (updated: HotelRegistration) => void;
}> = ({ registration, onClose, onRegistrationUpdated }) => {
    const [formData, setFormData] = useState<HotelRegistration>({ ...registration });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);



    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checkbox = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
        } else {
            const shouldFormat = name === 'tutor_phone' || name === 'emergency_contact_phone' || name === 'vet_phone';
            setFormData(prev => ({ ...prev, [name]: shouldFormat ? formatWhatsapp(value) : value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const updatePayload = { ...formData };
        delete updatePayload.id;
        delete updatePayload.created_at;
        delete updatePayload.updated_at;

        const { data, error } = await supabase
            .from('hotel_registrations')
            .update(updatePayload)
            .eq('id', registration.id!)
            .select()
            .single();

        if (error) {
            console.error('Error updating registration:', error);
            alert('Erro ao atualizar o registro. Por favor, tente novamente.');
            setIsSubmitting(false);
        } else {
            onRegistrationUpdated(data as HotelRegistration);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-bold text-white">Editar Registro - {formData.pet_name}</h2>
                        <button 
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="space-y-6">
                        {/* Pet Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Informações do Pet</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Nome do Pet *</label>
                                    <input
                                        type="text"
                                        name="pet_name"
                                        value={formData.pet_name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Raça</label>
                                    <input
                                        type="text"
                                        name="pet_breed"
                                        value={formData.pet_breed}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Idade</label>
                                    <input
                                        type="text"
                                        name="pet_age"
                                        value={formData.pet_age}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Sexo</label>
                                    <select
                                        name="pet_sex"
                                        value={formData.pet_sex || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione</option>
                                        <option value="Macho">Macho</option>
                                        <option value="Fêmea">Fêmea</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Castrado?</label>
                                    <select
                                        name="is_neutered"
                                        value={formData.is_neutered === null ? '' : formData.is_neutered.toString()}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_neutered: e.target.value === '' ? null : e.target.value === 'true' }))}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    >
                                        <option value="">Não informado</option>
                                        <option value="true">Sim</option>
                                        <option value="false">Não</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Peso do Pet</label>
                                    <select
                                        name="pet_weight"
                                        value={formData.pet_weight || ''}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    >
                                        <option value="">Selecione o peso</option>
                                        {(Object.keys(PET_WEIGHT_OPTIONS) as (keyof typeof PET_WEIGHT_OPTIONS)[]).map(key => (
                                            <option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tutor Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Informações do Tutor</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Nome do Tutor *</label>
                                    <input type="text" name="tutor_name" value={formData.tutor_name} onChange={handleInputChange} required className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Telefone *</label>
                                    <input type="text" name="tutor_phone" value={formData.tutor_phone} onChange={handleInputChange} required className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Email</label>
                                    <input type="email" name="tutor_email" value={formData.tutor_email} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">RG</label>
                                    <input type="text" name="tutor_rg" value={formData.tutor_rg} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Endereço</label>
                                    <input type="text" name="tutor_address" value={formData.tutor_address} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Rede Social (Instagram)</label>
                                    <input type="text" name="tutor_social_media" value={formData.tutor_social_media || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" placeholder="@perfil" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Contato Emergência - Nome</label>
                                    <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Contato Emergência - Telefone</label>
                                    <input type="text" name="emergency_contact_phone" value={formData.emergency_contact_phone || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Contato Emergência - Relação</label>
                                    <input type="text" name="emergency_contact_relation" value={formData.emergency_contact_relation || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                            </div>
                        </div>

                        {/* Health Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Informações de Saúde</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Doenças Pré-existentes</label>
                                    <textarea
                                        name="preexisting_disease"
                                        value={formData.preexisting_disease || ''}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Alergias</label>
                                    <textarea
                                        name="allergies"
                                        value={formData.allergies || ''}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Comportamento</label>
                                    <textarea
                                        name="behavior"
                                        value={formData.behavior || ''}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Medos ou Traumas</label>
                                    <textarea
                                        name="fears_traumas"
                                        value={formData.fears_traumas || ''}
                                        onChange={handleInputChange}
                                        rows={2}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Feridas/Marcas</label>
                                    <textarea name="wounds_marks" value={formData.wounds_marks || ''} onChange={handleInputChange} rows={2} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Última vacinação</label>
                                    <input type="date" name="last_vaccination_date" value={formData.last_vaccination_date || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Remédio de pulgas/carrapatos (data)</label>
                                    <input type="date" name="flea_tick_remedy_date" value={formData.flea_tick_remedy_date || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                                <label className="flex items-center gap-3"><input type="checkbox" name="has_flea_tick_remedy" checked={!!formData.has_flea_tick_remedy} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Tem remédio de pulgas/carrapatos</span></label>
                            </div>
                        </div>

                        {/* Food Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Alimentação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Marca da Ração</label>
                                    <input
                                        type="text"
                                        name="food_brand"
                                        value={formData.food_brand}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Quantidade</label>
                                    <input
                                        type="text"
                                        name="food_quantity"
                                        value={formData.food_quantity}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Frequência</label>
                                    <input
                                        type="text"
                                        name="feeding_frequency"
                                        value={formData.feeding_frequency}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Aceita Petiscos?</label>
                                    <input
                                        type="text"
                                        name="accepts_treats"
                                        value={formData.accepts_treats}
                                        onChange={handleInputChange}
                                        className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-base font-semibold text-gray-700 mb-1">Cuidado especial</label>
                                    <textarea name="special_food_care" value={formData.special_food_care || ''} onChange={handleInputChange} rows={2} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Veterinário</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Nome do Veterinário</label><input type="text" name="veterinarian" value={formData.veterinarian || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" /></div>
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Telefone do Veterinário</label><input type="text" name="vet_phone" value={formData.vet_phone || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" /></div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Datas e Autorizações</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Data de Check-in</label><input type="date" name="check_in_date" value={formData.check_in_date || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" /></div>
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Horário de Check-in</label>
                                    <select name="check_in_time" value={formData.check_in_time || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent">
                                        <option value="">Selecione...</option>
                                        {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                            const h = 7 + Math.floor(i / 2);
                                            const m = i % 2 ? '30' : '00';
                                            const t = `${String(h).padStart(2,'0')}:${m}`;
                                            return (<option key={t} value={t}>{t}</option>);
                                        })}
                                    </select>
                                </div>
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Data de Check-out</label><input type="date" name="check_out_date" value={formData.check_out_date || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" /></div>
                                <div><label className="block text-base font-semibold text-gray-700 mb-1">Horário de Check-out</label>
                                    <select name="check_out_time" value={formData.check_out_time || ''} onChange={handleInputChange} className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent">
                                        <option value="">Selecione...</option>
                                        {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                            const h = 7 + Math.floor(i / 2);
                                            const m = i % 2 ? '30' : '00';
                                            const t = `${String(h).padStart(2,'0')}:${m}`;
                                            return (<option key={t} value={t}>{t}</option>);
                                        })}
                                    </select>
                                </div>
                                <label className="flex items-center gap-3"><input type="checkbox" name="photo_authorization" checked={!!formData.photo_authorization} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Autoriza uso de fotos do pet</span></label>
                                <label className="flex items-center gap-3"><input type="checkbox" name="retrieve_at_checkout" checked={!!formData.retrieve_at_checkout} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Retirar no check-out</span></label>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Documentos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center gap-3"><input type="checkbox" name="has_rg_document" checked={!!formData.has_rg_document} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">RG do tutor</span></label>
                                <label className="flex items-center gap-3"><input type="checkbox" name="has_residence_proof" checked={!!formData.has_residence_proof} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Comprovante de residência</span></label>
                                <label className="flex items-center gap-3"><input type="checkbox" name="has_vaccination_card" checked={!!formData.has_vaccination_card} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Carteira de vacinação</span></label>
                                <label className="flex items-center gap-3"><input type="checkbox" name="has_vet_certificate" checked={!!formData.has_vet_certificate} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /><span className="text-sm">Atestado veterinário</span></label>
                            </div>
                        </div>

                        {/* Services */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Serviços Adicionais</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="service_bath"
                                        checked={formData.service_bath}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <span className="text-sm">Banho</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="service_transport"
                                        checked={formData.service_transport}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <span className="text-sm">Transporte</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="service_vet"
                                        checked={formData.service_vet}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <span className="text-sm">Veterinário</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        name="service_training"
                                        checked={formData.service_training}
                                        onChange={handleInputChange}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <span className="text-sm">Adestramento</span>
                                </label>
                            </div>
                            <div className="mt-4">
                                <label className="block text-base font-semibold text-gray-700 mb-1">Valor Total dos Serviços (R$)</label>
                                <input
                                    type="number"
                                    name="total_services_price"
                                    value={formData.total_services_price || ''}
                                    onChange={(e) => handleInputChange({
                                        target: {
                                            name: 'total_services_price',
                                            value: e.target.value === '' ? 0 : parseFloat(e.target.value)
                                        }
                                    } as React.ChangeEvent<HTMLInputElement>)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="w-full md:w-1/3 px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Digite o valor total dos serviços em reais.
                                </p>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Informações Adicionais</h3>
                            <textarea
                                name="additional_info"
                                value={formData.additional_info}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                placeholder="Observações importantes sobre o pet..."
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-4 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3.5 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
                {showContractModal && createPortal(
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h3 className="text-xl font-bold text-gray-800">Contrato de hospedagem da Sandy Pet Hotel</h3>
                                <button type="button" onClick={() => setShowContractModal(false)} className="p-2 rounded-md hover:bg-gray-100">✕</button>
                            </div>
                            <div className="p-4 space-y-3 text-sm text-gray-700">
                                <p><span className="font-semibold">Nome do Pet:</span> {formData.pet_name || '—'}</p>
                                <p><span className="font-semibold">Nome do Cliente (tutor):</span> {formData.tutor_name || '—'}</p>
                                <h4 className="font-semibold mt-2">Cláusula 1</h4>
                                <p>Será de responsabilidade do Hotel Sandys Pet, a alimentação (fornecida pelo tutor), hidratação, guarda e integridade física e mental do hóspede, no tempo de permanência do pet no Hotel.</p>
                                <p>1.1 Será seguida à risca as informações contidas na ficha de Check in/check out do hóspede, acordadas com o tutor.</p>
                                <p>1.2 O tutor receberá acesso às câmeras 24h para a vigilância do seu pet.</p>
                                <h4 className="font-semibold mt-2">Cláusula 2</h4>
                                <p>Acompanhamento do médico(a) veterinário(a), se necessário, os custos serão repassados ao tutor. A não ser que, o veterinário(a) específico do tutor venha atender o hóspede no local.</p>
                                <h4 className="font-semibold mt-2">Cláusula 3</h4>
                                <p>Em caso de óbito do hóspede, por morte natural ou por agravamento de doenças crônicas ou preexistentes, o Hotel não tem responsabilidade nenhuma.</p>
                                <p>3.1 O tutor poderá solicitar necropsia para comprovação da morte, porém as despesas serão por sua conta.</p>
                                <p>3.2 Se comprovada morte por má hospedagem, manejo ou acidente no Hotel enquanto hospedado, o ressarcimento terá o valor de um animal filhote.</p>
                                <h4 className="font-semibold mt-2">Cláusula 4</h4>
                                <p>Será exigida no check-in cópias dos seguintes documentos: RG e Comprovante de residência do tutor, carteira de vacinação do pet, receituário de remédios ou procedimentos e um atestado veterinário da boa saúde do pet.</p>
                                <p>4.1 Não aceitamos pet no cio.</p>
                                <p>4.2 Pet vacinado a menos de 15 dias, antes do check-in (se contrair algum vírus, a responsabilidade será do tutor).</p>
                                <p>4.3 Não aceitamos pets agressivos ou de difícil manejo.</p>
                                <p>4.4 Somente o tutor poderá retirar o pet (a não ser que tenha deixado previamente avisado a recepção do Hotel e colocado no check-in).</p>
                                <h4 className="font-semibold mt-2">Cláusula 5</h4>
                                <p>Pagamento integral no check-in do pet.</p>
                                <p>5.1 No check-out, atente-se aos dias e horários estabelecidos, para que não gerem taxas extras.</p>
                                <p>5.2 Se o tutor retirar o pet antes da data de check-out o valor da diária ou diárias não será devolvido.</p>
                                <p>5.3 Feriados prolongados, o tutor deverá fazer reserva antecipada e deixar 50% pago.</p>
                                <h4 className="font-semibold mt-2">Cláusula 6</h4>
                                <p>Todo o ambiente do Hotel é lavado e higienizado com produtos específicos, 2 a 3 vezes ao dia.</p>
                                <h4 className="font-semibold mt-2">Cláusula 7</h4>
                                <p>Se contratado serviço de banho e tosa, o mesmo será feito apenas no dia da entrega.</p>
                                <p>7.1 Na devolução do pet o tutor deverá examinar o mesmo, pois não aceitaremos reclamações posteriores.</p>
                                <p>7.2 Brinquedos e pertences devem estar com o nome do pet.</p>
                                <h4 className="font-semibold mt-2">Cláusula 8</h4>
                                <p>O pet que não for retirado (e o Hotel não conseguir contato), após 24 horas poderá ser doado, e o tutor responderá criminalmente por abandono de animais.</p>
                                <h4 className="font-semibold mt-2">Cláusula 9</h4>
                                <p>Pendências decorrentes deste contrato serão determinadas pelo Foro Central da Comarca da Capital/SP.</p>
                                <h4 className="font-semibold mt-2">Cláusula 10</h4>
                                <p>Os valores deste contrato poderão ser corrigidos sem aviso prévio.</p>
                                <p>Estando todas as partes em comum acordo e anexado aqui: check list (CHECK IN - CHECK OUT), CÓPIA DOS DOCUMENTOS CLÁUSULA 4.</p>
                            </div>
                            <div className="p-4 border-t flex justify-end">
                                <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Fechar</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

// FIX: Add the missing DaycareView component to manage daycare enrollments.
const DaycareView: React.FC<{ refreshKey?: number; setShowDaycareStatistics?: (show: boolean) => void }> = ({ refreshKey, setShowDaycareStatistics }) => {
    const [enrollments, setEnrollments] = useState<DaycareRegistration[]>([]);
    const [petsInDaycareNow, setPetsInDaycareNow] = useState<DaycareRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnrollment, setSelectedEnrollment] = useState<DaycareRegistration | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [enrollmentToDelete, setEnrollmentToDelete] = useState<DaycareRegistration | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [draggingOver, setDraggingOver] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<string[]>(['inDaycare', 'approved', 'pending']);
    const [isExtraServicesModalOpen, setIsExtraServicesModalOpen] = useState(false);
    const [enrollmentForExtraServices, setEnrollmentForExtraServices] = useState<DaycareRegistration | null>(null);
    const [isUploadDaycarePhotoModalOpen, setIsUploadDaycarePhotoModalOpen] = useState(false);
    const [uploadTargetDaycareEnrollment, setUploadTargetDaycareEnrollment] = useState<DaycareRegistration | null>(null);
    const [isUploadingDaycarePhoto, setIsUploadingDaycarePhoto] = useState(false);
    const [daycareUploadError, setDaycareUploadError] = useState<string | null>(null);
    const [selectedDaycarePhotoName, setSelectedDaycarePhotoName] = useState<string>('');
    const [diaryFor, setDiaryFor] = useState<DaycareRegistration | null>(null);
    const [diaryDate, setDiaryDate] = useState<string>(() => new Date().toISOString().slice(0,10));
    const [daycarePaymentUpdatingId, setDaycarePaymentUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        if (isUploadDaycarePhotoModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isUploadDaycarePhotoModalOpen]);


    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('daycare_enrollments').select('*').order('created_at', { ascending: false });
            if (error) {
                const cached = localStorage.getItem('cached_daycare_enrollments_all');
                if (cached) setEnrollments(JSON.parse(cached));
            } else {
                setEnrollments(data as DaycareRegistration[]);
                try { localStorage.setItem('cached_daycare_enrollments_all', JSON.stringify(data || [])); } catch {}
            }
        } catch (_) {
            const cached = localStorage.getItem('cached_daycare_enrollments_all');
            if (cached) setEnrollments(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments, refreshKey]);
    
    const handleUpdateStatus = async (id: string, status: 'Pendente' | 'Aprovado' | 'Rejeitado') => {
        setIsUpdatingStatus(true);
        const { data, error } = await supabase.from('daycare_enrollments').update({ status }).eq('id', id).select().single();
        if (error) {
            alert('Falha ao atualizar o status.');
        } else {
            setEnrollments(prev => prev.map(e => e.id === id ? data as DaycareRegistration : e));
            setSelectedEnrollment(data as DaycareRegistration);
            if (status === 'Aprovado') {
                try {
                    await sendDaycareApprovalWebhook(data as DaycareRegistration);
                } catch {}
            }
        }
        setIsUpdatingStatus(false);
    };

    const handleToggleDaycarePaymentStatus = async (enrollment: DaycareRegistration) => {
        if (!enrollment.id) return;
        setDaycarePaymentUpdatingId(String(enrollment.id));
        const current = (enrollment.payment_status === 'Pago') ? 'Pago' : 'Pendente';
        const next = current === 'Pago' ? 'Pendente' : 'Pago';
        const { data, error } = await supabase
            .from('daycare_enrollments')
            .update({ payment_status: next })
            .eq('id', enrollment.id)
            .select()
            .single();
        if (!error) {
            const updatedId = data && (data as any).id !== undefined ? String((data as any).id) : String(enrollment.id);
            setEnrollments(prev => prev.map(r => String(r.id) === updatedId ? { ...r, payment_status: next } : r));
        } else {
            alert('Erro ao atualizar status de pagamento');
        }
        setDaycarePaymentUpdatingId(null);
    };

    const handleConfirmDelete = async () => {
        if (!enrollmentToDelete || !enrollmentToDelete.id) return;
        setIsDeleting(true);
        const { error } = await supabase.from('daycare_enrollments').delete().eq('id', enrollmentToDelete.id);
        if (error) {
            alert('Falha ao excluir a matrícula.');
        } else {
            setEnrollments(prev => prev.filter(e => e.id !== enrollmentToDelete.id));
        }
        setIsDeleting(false);
        setEnrollmentToDelete(null);
    };
    
    const handleEnrollmentUpdated = (updated: DaycareRegistration) => {
        setEnrollments(prev => prev.map(e => e.id === updated.id ? updated : e));
        setIsEditModalOpen(false);
        setSelectedEnrollment(null);
    };

    const handleEnrollmentAdded = (added: DaycareRegistration) => {
        setEnrollments(prev => [added, ...prev]);
        setIsAddFormOpen(false);
    }

    const handleAddExtraServices = (enrollment: DaycareRegistration) => {
        setEnrollmentForExtraServices(enrollment);
        setIsExtraServicesModalOpen(true);
        setIsDetailsModalOpen(false);
    };

    const handleExtraServicesUpdated = (updated: DaycareRegistration) => {
        setEnrollments(prev => prev.map(e => e.id === updated.id ? updated : e));
        setIsExtraServicesModalOpen(false);
        setEnrollmentForExtraServices(null);
    };

    const sendDaycareApprovalWebhook = async (enrollment: DaycareRegistration) => {
        const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const planLabels: Record<string, string> = {
            '4x_month': '4x no Mês', '8x_month': '8x no Mês', '12x_month': '12x no Mês', '16x_month': '16x no Mês', '20x_month': '20x no Mês',
            '2x_week': '2x por Semana', '3x_week': '3x por Semana', '4x_week': '4x por Semana', '5x_week': '5x por Semana',
        };
        const invoiceTotal = calculateDaycareInvoiceTotal(enrollment);
        const payload = {
            id: enrollment.id,
            status: enrollment.status,
            approved_at: new Date().toISOString(),
            pet: {
                name: enrollment.pet_name,
                breed: (enrollment as any).pet_breed ?? null,
                age: (enrollment as any).pet_age ?? null,
                sex: (enrollment as any).pet_sex ?? null,
                neutered: (enrollment as any).is_neutered ?? null,
                photo_url: (enrollment as any).pet_photo_url ?? null,
            },
            tutor: {
                name: (enrollment as any).tutor_name ?? null,
                phone: (enrollment as any).contact_phone ?? null,
                address: (enrollment as any).address ?? null,
                whatsapp_link: (function(phone: string | undefined){
                    const digits = String(phone || '').replace(/\D/g, '');
                    const withCountry = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : '';
                    return withCountry ? `https://wa.me/${withCountry}` : null;
                })((enrollment as any).contact_phone)
            },
            enrollment: {
                created_at: (enrollment as any).created_at ?? null,
                contracted_plan_code: (enrollment as any).contracted_plan ?? null,
                contracted_plan_label: (enrollment as any).contracted_plan ? planLabels[(enrollment as any).contracted_plan] : null,
                attendance_days: Array.isArray((enrollment as any).attendance_days) 
                    ? ((enrollment as any).attendance_days as any[]).map((idx: number) => dayNames[idx]) 
                    : null
            },
            schedule: {
                check_in_date: (enrollment as any).check_in_date ?? null,
                check_in_time: (enrollment as any).check_in_time ?? null,
                check_out_date: (enrollment as any).check_out_date ?? null,
                check_out_time: (enrollment as any).check_out_time ?? null,
            },
            payment: {
                payment_date: (enrollment as any).payment_date ?? null,
            },
            extra_services: (enrollment as any).extra_services ?? null,
            invoice_total: invoiceTotal,
        };
        try {
            await fetch('https://n8n.intelektus.tech/webhook/aprovacaoCreche', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('Falha ao enviar webhook aprovacaoCreche', err);
        }
    };

    const handleDaycarePetPhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDaycareUploadError(null);
        const input = (e.currentTarget.elements.namedItem('daycare_pet_photo') as HTMLInputElement);
        const file = input?.files?.[0];
        if (!file) { setDaycareUploadError('Selecione uma imagem'); return; }
        setIsUploadingDaycarePhoto(true);
        try {
            const enr = uploadTargetDaycareEnrollment as DaycareRegistration;
            const ext = (file.name.split('.')?.pop() || 'jpg').toLowerCase();
            const base = (enr.id || enr.pet_name.replace(/\s+/g,'_'));
            const path = `${base}_${Date.now()}.${ext}`;
            const oldUrl = (enr as any).pet_photo_url as string | undefined;
            if (oldUrl) {
                try {
                    const u = new URL(oldUrl);
                    const prefix = '/storage/v1/object/public/daycare_pet_photos/';
                    const idx = u.pathname.indexOf(prefix);
                    if (idx !== -1) {
                        const oldPath = u.pathname.substring(idx + prefix.length);
                        await supabase.storage.from('daycare_pet_photos').remove([oldPath]);
                    }
                } catch {}
            }
            const { error: upErr } = await supabase.storage.from('daycare_pet_photos').upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('daycare_pet_photos').getPublicUrl(path);
            const publicUrl = data.publicUrl;
            const { data: updated, error: dbErr } = await supabase.from('daycare_enrollments').update({ pet_photo_url: publicUrl }).eq('id', enr.id as string).select().single();
            if (dbErr) throw dbErr;
            setEnrollments(prev => prev.map(e => e.id === enr.id ? (updated as DaycareRegistration) : e));
            setIsUploadDaycarePhotoModalOpen(false);
            setUploadTargetDaycareEnrollment(null);
        } catch (err: any) {
            setDaycareUploadError(err.message || 'Falha ao enviar');
        } finally {
            setIsUploadingDaycarePhoto(false);
            setSelectedDaycarePhotoName('');
        }
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, enrollment: DaycareRegistration, source: 'pending' | 'approved' | 'inDaycare') => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ id: enrollment.id, source }));
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, target: string) => {
        e.preventDefault();
        setDraggingOver(target);
    };
    
    const handleDragLeave = () => setDraggingOver(null);

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, target: 'pending' | 'approved' | 'inDaycare') => {
        e.preventDefault();
        setDraggingOver(null);
        const draggedData = JSON.parse(e.dataTransfer.getData('application/json'));
        const { id, source } = draggedData;

        if (source === target) return;

        const enrollmentToMove = [...enrollments, ...petsInDaycareNow].find(en => en.id === id);
        if (!enrollmentToMove) return;

        if (source === 'pending' && target === 'approved') {
            setIsUpdatingStatus(true);
            const { data, error } = await supabase.from('daycare_enrollments').update({ status: 'Aprovado' }).eq('id', id).select().single();
            setIsUpdatingStatus(false);
            if (error) {
                alert('Falha ao aprovar matrícula.');
            } else {
                setEnrollments(prev => prev.map(en => en.id === id ? data as DaycareRegistration : en));
                try { await sendDaycareApprovalWebhook(data as DaycareRegistration); } catch {}
            }
        } else if (source === 'approved' && target === 'inDaycare') {
            setPetsInDaycareNow(prev => [...prev, enrollmentToMove]);
        } else if (source === 'inDaycare' && target === 'approved') {
            setPetsInDaycareNow(prev => prev.filter(en => en.id !== id));
        }
    };
    
    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => 
            prev.includes(sectionId) 
                ? prev.filter(id => id !== sectionId) 
                : [...prev, sectionId]
        );
    };

    const categorizedEnrollments = useMemo(() => {
        const pending = enrollments.filter(e => e.status === 'Pendente');
        const inDaycareIds = new Set(petsInDaycareNow.map(p => p.id));
        const approved = enrollments.filter(e => e.status === 'Aprovado' && !inDaycareIds.has(e.id));
        return { pending, approved };
    }, [enrollments, petsInDaycareNow]);

    const openDiary = (enrollment: DaycareRegistration) => {
        setDiaryFor(enrollment);
        try { window.history.pushState({ v: 'daycareDiary', id: enrollment.id }, '', `/admin/daycare/diario/${enrollment.id}`); } catch {}
    };
    const closeDiary = () => {
        setDiaryFor(null);
        try { window.history.pushState({ v: 'daycare' }, '', `/admin/daycare`); } catch {}
    };
    useEffect(() => {
        const handlePop = () => {
            const path = window.location.pathname;
            const m = path.match(/\/admin\/daycare\/diario\/(.+)$/);
            if (m) {
                const id = m[1];
                const found = [...enrollments, ...petsInDaycareNow].find(e => String(e.id) === id);
                if (found) setDiaryFor(found);
            } else if (path.startsWith('/admin/daycare')) {
                setDiaryFor(null);
            }
        };
        handlePop();
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [enrollments, petsInDaycareNow]);
    
    const AccordionSection: React.FC<{
        title: string;
        enrollments: DaycareRegistration[];
        sectionId: 'pending' | 'approved' | 'inDaycare';
        variant?: 'default' | 'online';
    }> = ({ title, enrollments, sectionId, variant = 'default' }) => {
        const isExpanded = expandedSections.includes(sectionId);
        const count = enrollments.length;
        
        const headerClasses = variant === 'online'
            ? 'bg-green-50 hover:bg-green-100'
            : 'bg-gray-50 hover:bg-gray-100';
            
        const titleClasses = variant === 'online'
            ? 'text-green-800'
            : 'text-pink-700';

        return (
            <div className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${draggingOver === sectionId ? 'ring-2 ring-pink-400 ring-offset-2' : ''}`}>
                <button 
                    onClick={() => toggleSection(sectionId)} 
                    className={`w-full text-left p-4 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-pink-300 transition-colors ${headerClasses}`}
                >
                    <h3 className={`text-lg font-bold flex items-center gap-4 ${titleClasses}`}>
                        {variant === 'online' && (
                           <span className="relative flex h-3 w-3">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                           </span>
                        )}
                        {`${title} (${count})`}
                    </h3>
                    <ChevronRightIcon className={`h-8 w-8 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isExpanded && (
                    <div
                        onDragOver={(e) => handleDragOver(e, sectionId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, sectionId)}
                        className="p-4 min-h-[100px] animate-fadeIn"
                    >
                        {count > 0 ? (
                            <div className="overflow-x-auto -mx-4">
                                <div className="flex gap-4 pb-2 snap-x snap-mandatory">
                                    {enrollments.map(enrollment => (
                                        <div key={enrollment.id} className="shrink-0 w-screen sm:w-[420px] lg:w-[460px] snap-center">
                                            <DaycareEnrollmentCard
                                                enrollment={enrollment}
                                                sectionId={sectionId}
                                                isDraggable={true}
                                                onDragStart={(e) => handleDragStart(e, enrollment, sectionId)}
                                                onClick={() => { setSelectedEnrollment(enrollment); setIsDetailsModalOpen(true); }}
                                                onEdit={() => { setSelectedEnrollment(enrollment); setIsEditModalOpen(true); }}
                                                onDelete={() => setEnrollmentToDelete(enrollment)}
                                                onAddExtraServices={handleAddExtraServices}
                                                onChangePhoto={(enr) => { setUploadTargetDaycareEnrollment(enr); setIsUploadDaycarePhotoModalOpen(true); }}
                                                onOpenDiary={openDiary}
                                                onApprove={(enr) => handleUpdateStatus(enr.id!, 'Aprovado')}
                                                onTogglePaymentStatus={handleToggleDaycarePaymentStatus}
                                                paymentUpdatingId={daycarePaymentUpdatingId}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-6 sm:py-8"><p>Nenhuma matrícula aqui.</p></div>
                        )}
                    </div>
                )}
            </div>
        );
    };
    
    if (diaryFor) {
        return <DaycareDiaryPage enrollment={diaryFor} date={diaryDate} onDateChange={setDiaryDate} onBack={closeDiary} />
    }
    if (isAddFormOpen) {
        return <DaycareRegistrationForm isAdmin onBack={() => setIsAddFormOpen(false)} onSuccess={handleEnrollmentAdded} />
    }
    
    return (
        <div className="animate-fadeIn">
            {isUploadDaycarePhotoModalOpen && uploadTargetDaycareEnrollment && (
                createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl backdrop-brightness-50 backdrop-saturate-0" aria-hidden="true"></div>
                        <div role="dialog" aria-modal="true" className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Trocar foto do pet (Creche)</h3>
                            <form onSubmit={handleDaycarePetPhotoUpload}>
                                <input id="daycare_pet_photo_input" type="file" name="daycare_pet_photo" accept="image/*" className="sr-only" onChange={(e) => setSelectedDaycarePhotoName(e.target.files?.[0]?.name || '')} />
                                <div className="flex items-center gap-3 mb-4">
                                    <button type="button" onClick={() => document.getElementById('daycare_pet_photo_input')?.click()} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Escolher arquivo</button>
                                    <span className="text-sm text-gray-600">{selectedDaycarePhotoName || 'Nenhum arquivo selecionado'}</span>
                                </div>
                                {daycareUploadError && <div className="text-red-600 text-sm mb-3">{daycareUploadError}</div>}
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setIsUploadDaycarePhotoModalOpen(false); setUploadTargetDaycareEnrollment(null); setSelectedDaycarePhotoName(''); setDaycareUploadError(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancelar</button>
                                    <button type="submit" disabled={isUploadingDaycarePhoto} className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50">{isUploadingDaycarePhoto ? 'Enviando...' : 'Salvar'}</button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            )}
            {isDetailsModalOpen && selectedEnrollment && (
                <DaycareEnrollmentDetailsModal
                    enrollment={selectedEnrollment}
                    onClose={() => { setIsDetailsModalOpen(false); setSelectedEnrollment(null); }}
                    onUpdateStatus={handleUpdateStatus}
                    isUpdating={isUpdatingStatus}
                    onAddExtraServices={() => handleAddExtraServices(selectedEnrollment)}
                />
            )}
            {isEditModalOpen && selectedEnrollment && (
                <EditDaycareEnrollmentModal
                    enrollment={selectedEnrollment}
                    onClose={() => { setIsEditModalOpen(false); setSelectedEnrollment(null); }}
                    onUpdated={handleEnrollmentUpdated}
                />
            )}
            {isExtraServicesModalOpen && enrollmentForExtraServices && (
                <ExtraServicesModal
                    isOpen={isExtraServicesModalOpen}
                    onClose={() => { setIsExtraServicesModalOpen(false); setEnrollmentForExtraServices(null); }}
                    onSuccess={handleExtraServicesUpdated}
                    data={enrollmentForExtraServices}
                    type="daycare"
                    title="Serviços Extras - Creche"
                />
            )}
             {enrollmentToDelete && (
                <ConfirmationModal
                    isOpen={!!enrollmentToDelete}
                    onClose={() => setEnrollmentToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Confirmar Exclusão"
                    message={`Tem certeza que deseja excluir a matrícula para ${enrollmentToDelete.pet_name}?`}
                    confirmText="Excluir"
                    variant="danger"
                    isLoading={isDeleting}
                />
            )}
            
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-4xl font-bold text-pink-600 text-center" style={{fontFamily: 'Lobster Two, cursive'}}>Creche Pet</h2>
                        <p className="text-sm text-gray-600 text-center">Clientes Creche Pet</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <Button size="lg" title="Nova Matrícula" aria-label="Nova Matrícula" className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center" onClick={() => setIsAddFormOpen(true)}>
                            <UserPlusIcon />
                        </Button>
                        <button
                            onClick={() => setShowDaycareStatistics?.(true)}
                            title="Estatísticas"
                            className="flex-1 sm:flex-shrink-0 inline-flex items-center justify-center bg-pink-600 text-white font-semibold h-11 px-5 text-base rounded-lg hover:bg-pink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none"
                        >
                            <ChartBarIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
            {loading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
                <div className="space-y-6">
                    <AccordionSection title="Pets na Creche agora" enrollments={petsInDaycareNow} sectionId="inDaycare" variant="online" />
                    <AccordionSection title="Matrículas aprovadas" enrollments={categorizedEnrollments.approved} sectionId="approved" />
                    <AccordionSection title="Matrículas para aprovação" enrollments={categorizedEnrollments.pending} sectionId="pending" />
                </div>
            )}
        </div>
    );
};

// FIX: Destructure the 'onLogout' prop to make it available within the component. This resolves 'Cannot find name' errors.
const AdminDashboard: React.FC<{ 
    onLogout: () => void;
    isScheduleOpen: boolean;
    setIsScheduleOpen: (open: boolean) => void;
    onAddObservation: (appointment: AdminAppointment) => void;
    appointments: AdminAppointment[];
    setAppointments: React.Dispatch<React.SetStateAction<AdminAppointment[]>>;
    onOpenActionMenu: (appointment: AdminAppointment, event: React.MouseEvent) => void;
    onDeleteObservation: (appointment: AdminAppointment) => void;
}> = ({ onLogout, isScheduleOpen, setIsScheduleOpen, onAddObservation, appointments, setAppointments, onOpenActionMenu, onDeleteObservation }) => {
    const [activeView, setActiveView] = useState('appointments');
    const [dataKey, setDataKey] = useState(Date.now()); // Used to force re-fetches
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const openMobileMenu = () => {
        setShowMobileMenu(true);
        setIsDrawerVisible(true);
        requestAnimationFrame(() => setIsDrawerOpen(true));
    };
    const closeMobileMenu = () => {
        setIsDrawerOpen(false);
        setIsDrawerVisible(false);
        setShowMobileMenu(false);
    };
    const [showDaycareStatistics, setShowDaycareStatistics] = useState(false);
    const [showHotelStatistics, setShowHotelStatistics] = useState(false);

    const adminTitleFull = "Sandy's Pet Admin";
    const [adminTitle, setAdminTitle] = useState('');
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setAdminTitle(adminTitleFull.slice(0, i + 1));
            i++;
            if (i >= adminTitleFull.length) {
                clearInterval(timer);
            }
        }, 45);
        return () => clearInterval(timer);
    }, []);

    const handleDataChanged = () => setDataKey(Date.now());
    const handleAddMonthlyClient = () => setActiveView('addMonthlyClient');

    // Reload combined appointments when dataKey changes (e.g., after creating mensalista)
    useEffect(() => {
        const loadAllAdminAppointments = async () => {
            try {
                const { data: bathAppointments, error: bathError } = await supabase
                    .from('appointments')
                    .select('*');
                if (bathError) console.warn('Erro ao buscar appointments (Banho & Tosa):', bathError);

                const { data: petMovelAppointments, error: petMovelError } = await supabase
                    .from('pet_movel_appointments')
                    .select('*');
                if (petMovelError) console.warn('Erro ao buscar pet_movel_appointments:', petMovelError);

                // Remover duplicados por mensalista e mesmo minuto de appointment_time, mantendo o mais antigo
                const dedupeMonthlyByMinute = async (srcA: any[] | null | undefined, srcB: any[] | null | undefined) => {
                    const all: { id: string; table: 'appointments' | 'pet_movel_appointments'; monthly_client_id?: string; appointment_time: string; created_at?: string; raw: any }[] = [];
                    for (const r of (srcA || [])) {
                        all.push({ id: r.id, table: 'appointments', monthly_client_id: r.monthly_client_id, appointment_time: r.appointment_time, created_at: r.created_at, raw: r });
                    }
                    for (const r of (srcB || [])) {
                        all.push({ id: r.id, table: 'pet_movel_appointments', monthly_client_id: r.monthly_client_id, appointment_time: r.appointment_time, created_at: r.created_at, raw: r });
                    }

                    const groups = new Map<string, typeof all>();
                    for (const r of all) {
                        if (!r.monthly_client_id) continue;
                        const t = new Date(r.appointment_time);
                        const key = `${r.monthly_client_id}|${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,'0')}-${String(t.getUTCDate()).padStart(2,'0')} ${String(t.getUTCHours()).padStart(2,'0')}:${String(t.getUTCMinutes()).padStart(2,'0')}`;
                        const g = groups.get(key) || [] as any[];
                        g.push(r);
                        groups.set(key, g);
                    }

                    const toDeleteByTable: Record<'appointments' | 'pet_movel_appointments', string[]> = { appointments: [], pet_movel_appointments: [] };
                    const keptSet = new Set<string>();
                    for (const [, list] of groups.entries()) {
                        if (list.length > 1) {
                            list.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                            const keep = list[0];
                            keptSet.add(`${keep.table}:${keep.id}`);
                            for (let i = 1; i < list.length; i++) {
                                toDeleteByTable[list[i].table].push(list[i].id);
                            }
                        } else {
                            keptSet.add(`${list[0].table}:${list[0].id}`);
                        }
                    }

                    if (toDeleteByTable.appointments.length) {
                        await supabase.from('appointments').delete().in('id', toDeleteByTable.appointments);
                    }
                    if (toDeleteByTable.pet_movel_appointments.length) {
                        await supabase.from('pet_movel_appointments').delete().in('id', toDeleteByTable.pet_movel_appointments);
                    }

                    // Keep all non-mensalista records untouched; only filter duplicates for mensalistas
                    const filteredA = (srcA || []).filter(r => r?.monthly_client_id ? keptSet.has(`appointments:${r.id}`) : true);
                    const filteredB = (srcB || []).filter(r => r?.monthly_client_id ? keptSet.has(`pet_movel_appointments:${r.id}`) : true);
                    return { filteredA, filteredB };
                };

                const normalize = (arr: any[] | null | undefined): AdminAppointment[] => {
                    if (!arr) return [];
                    return arr.map((rec: any) => ({
                        id: rec.id,
                        appointment_time: rec.appointment_time,
                        pet_name: rec.pet_name,
                        pet_breed: rec.pet_breed ?? undefined,
                        owner_name: rec.owner_name ?? rec.client_name ?? '',
                        owner_address: rec.owner_address ?? rec.address ?? undefined,
                        whatsapp: rec.whatsapp ?? rec.phone ?? '',
                        service: rec.service,
                        weight: rec.weight,
                        addons: rec.addons ?? [],
                        price: rec.price ?? 0,
                        status: rec.status,
                        monthly_client_id: rec.monthly_client_id ?? undefined,
                        condominium: rec.condominium ?? rec.condo ?? undefined,
                        extra_services: rec.extra_services ?? undefined,
                        observation: rec.observation ?? rec.notes ?? undefined,
                    }));
                };

                const { filteredA, filteredB } = await dedupeMonthlyByMinute(bathAppointments, petMovelAppointments);
                const combined = [
                    ...normalize(filteredA),
                    ...normalize(filteredB),
                ].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());

                setAppointments(combined);
            } catch (err) {
                console.warn('Falha ao recarregar agendamentos após alteração de dados:', err);
}
        };

        loadAllAdminAppointments();
    }, [dataKey]);
    
    const menuItems = [
        { id: 'appointments', label: 'Banho & Tosa', icon: <BathTosaIcon/> },
        { id: 'petMovel', label: 'Pet Móvel', icon: <PetMovelIcon/> },
        { id: 'daycare', label: 'Creche', icon: <DaycareIcon/> },
        { id: 'hotel', label: 'Hotel Pet', icon: <HotelIcon/> },
        { id: 'clients', label: 'Clientes', icon: <ClientsMenuIcon/> },
        { id: 'monthlyClients', label: 'Mensalistas', icon: <MonthlyIcon/> },
    ];
    
    // Renderiza a view ativa baseada no estado activeView
    const renderActiveView = () => {
        switch (activeView) {
                case 'appointments': return <AppointmentsView key={dataKey} refreshKey={dataKey} onAddObservation={onAddObservation} appointments={appointments} setAppointments={setAppointments} onOpenActionMenu={onOpenActionMenu} onDeleteObservation={onDeleteObservation} />;
            case 'petMovel': return <PetMovelView key={dataKey} refreshKey={dataKey} />;
            case 'daycare': return <DaycareView key={dataKey} refreshKey={dataKey} setShowDaycareStatistics={setShowDaycareStatistics} />;
            case 'hotel': return <HotelView key={dataKey} refreshKey={dataKey} setShowHotelStatistics={setShowHotelStatistics} />;
            case 'clients': return <ClientsView key={dataKey} refreshKey={dataKey} />;
            case 'monthlyClients': return <MonthlyClientsView onAddClient={handleAddMonthlyClient} onDataChanged={handleDataChanged} />;
            case 'addMonthlyClient': return <AddMonthlyClientView onBack={() => setActiveView('monthlyClients')} onSuccess={() => { handleDataChanged(); setActiveView('monthlyClients'); }}/>;
                default: return <AppointmentsView key={dataKey} refreshKey={dataKey} onAddObservation={onAddObservation} appointments={appointments} setAppointments={setAppointments} onOpenActionMenu={onOpenActionMenu} onDeleteObservation={onDeleteObservation} />;
        }
    };

    const NavMenu = () => (
        <Menu ariaLabel="Navegação administrativa">
            {menuItems.map(item => (
                <MenuItem
                    key={item.id}
                    active={activeView === item.id}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => { setActiveView(item.id); closeMobileMenu(); }}
                />
            ))}
        </Menu>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-pink-50/20 to-gray-100">
            <header className="bg-white border-b-2 border-pink-100 shadow-lg fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-white/95">
                <div className="w-full px-2">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-4">
                             <img src="https://i.imgur.com/M3Gt3OA.png" alt="Logo" className="h-12 w-12 drop-shadow-md"/>
                            <div>
                                <div className="font-brand text-pink-800 leading-none whitespace-nowrap text-[clamp(1.25rem,7vw,2.25rem)] hidden md:block">{adminTitle}</div>
                            </div>
                            <div className="flex-1 flex items-center justify-end pr-6 md:hidden">
                                <div className="font-brand text-pink-800 leading-none whitespace-nowrap text-[clamp(1rem,6vw,1.5rem)]">{adminTitle}</div>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3">
                            <button 
                                onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow ${
                                    isScheduleOpen 
                                        ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                                        : 'text-red-700 bg-red-50 hover:bg-red-100'
                                }`}
                            >
                                {isScheduleOpen ? <LockOpenIcon /> : <LockClosedIcon />}
                                {isScheduleOpen ? 'Fechar Agenda' : 'Abrir Agenda'}
                            </button>
                            <NotificationBell />
                            <button onClick={onLogout} className="flex items-center gap-3 text-base font-semibold text-gray-600 hover:text-pink-600 bg-gray-50 hover:bg-pink-50 px-5 py-3 rounded-xl transition-all shadow-sm hover:shadow">
                                <LogoutIcon/> Sair
                            </button>
                        </div>
                        <div className="md:hidden flex items-center gap-2">
                            <NotificationBell />
                            {!showMobileMenu && (
                                <button onClick={openMobileMenu} className="p-3 rounded-xl text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors" aria-label="Menu">
                                    <MenuIcon />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {isDrawerVisible && (
                <div 
                    className={`fixed inset-0 z-[9998] md:hidden bg-gray-800/50 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={closeMobileMenu}
                ></div>
            )}

            {isDrawerVisible && (
                <div className={`fixed left-0 top-0 h-full w-[72vw] max-w-[18rem] sm:max-w-[20rem] bg-white shadow-2xl z-[9999] md:hidden p-4 rounded-r-2xl transform transition-transform duration-300 ease-out ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col overflow-y-hidden`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-bold text-pink-600" style={{fontFamily: 'Lobster Two, cursive'}}>Menu</h3>
                        <button onClick={closeMobileMenu} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Fechar menu">
                            <CloseIcon className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <NavMenu />
                    </div>
                    <div className="mt-3 space-y-3 pt-3 border-t border-gray-100 shrink-0">
                        <button 
                            onClick={() => { setIsScheduleOpen(!isScheduleOpen); closeMobileMenu(); }}
                            className={`w-full flex items-center gap-3 text-sm font-semibold px-3 py-2 rounded-lg transition-all ${
                                isScheduleOpen 
                                    ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                                    : 'text-red-700 bg-red-50 hover:bg-red-100'
                            }`}
                        >
                            {isScheduleOpen ? <LockOpenIcon /> : <LockClosedIcon />}
                            {isScheduleOpen ? 'Fechar Agenda' : 'Abrir Agenda'}
                        </button>
                        <button onClick={() => { onLogout(); closeMobileMenu(); }} className="w-full flex items-center gap-4 text-base font-semibold text-gray-600 hover:text-pink-600 transition-colors p-2 rounded-lg hover:bg-gray-100">
                            <LogoutIcon/> Sair
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full px-2 sm:px-3 md:px-4 pt-24 pb-4">
                <div className="flex flex-col md:flex-row gap-8">
                    <aside className={`
                        md:w-64 flex-shrink-0
                        md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:bg-transparent md:p-0 md:z-10
                        hidden md:block
                    `}>
                        <NavMenu />
                        <div className="mt-6 md:hidden space-y-3">
                            <button 
                                onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                                className={`w-full flex items-center gap-3 text-sm font-semibold px-3 py-2 rounded-lg transition-all ${
                                    isScheduleOpen 
                                        ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                                        : 'text-red-700 bg-red-50 hover:bg-red-100'
                                }`}
                            >
                                {isScheduleOpen ? <LockOpenIcon /> : <LockClosedIcon />}
                                {isScheduleOpen ? 'Fechar Agenda' : 'Abrir Agenda'}
                            </button>
                            <button onClick={onLogout} className="w-full flex items-center gap-4 text-base font-semibold text-gray-600 hover:text-pink-600 transition-colors p-2 rounded-lg hover:bg-gray-100">
                                <LogoutIcon/> Sair
                            </button>
                        </div>
                    </aside>
                    <main className="flex-1">
                        {renderActiveView()}
                    </main>
                </div>
            </div>
            {showDaycareStatistics && (
                <DaycareStatisticsModal 
                    isOpen={showDaycareStatistics} 
                    onClose={() => setShowDaycareStatistics(false)} 
                />
            )}
            {showHotelStatistics && (
                <HotelStatisticsModal 
                    isOpen={showHotelStatistics} 
                    onClose={() => setShowHotelStatistics(false)} 
                />
            )}
        </div>
    );
};

// Componente para exibir quando a agenda está fechada
const ScheduleClosedPage: React.FC<{ setView: (view: string) => void }> = ({ setView }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-100 flex items-center justify-center px-4 relative">
            {/* Botão de login discreto - canto superior direito */}
            <button
                onClick={() => setView('login')}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200 opacity-50 hover:opacity-100"
                title="Acesso Administrativo"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </button>

            <div className="max-w-md w-full text-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-pink-100">
                    {/* Logo */}
                    <div className="mb-6">
                        <img 
                            src="https://i.imgur.com/M3Gt3OA.png" 
                            alt="Sandy's Pet Shop" 
                            className="h-20 w-20 mx-auto drop-shadow-lg"
                        />
                    </div>
                    
                    {/* Título */}
                    <h1 className="font-brand text-3xl text-pink-800 mb-2">
                        Sandy's Pet Shop
                    </h1>
                    
                    {/* Ícone de agenda fechada */}
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                            <LockClosedIcon />
                        </div>
                    </div>
                    
                    {/* Mensagem principal */}
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Agenda Temporariamente Fechada
                    </h2>
                    
                    {/* Mensagem educada */}
                    <p className="text-gray-600 leading-relaxed mb-6">
                        Olá! Nossa agenda está temporariamente fechada para novos agendamentos. 
                        Estamos organizando nossos serviços para melhor atendê-los.
                    </p>
                    
                    <p className="text-gray-600 leading-relaxed mb-8">
                        Por favor, tente novamente em alguns instantes ou entre em contato 
                        conosco através dos nossos canais de atendimento.
                    </p>
                    
                    {/* Informações de contato */}
                    <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                        <p className="text-sm text-pink-800 font-medium mb-2">
                            💬 Entre em contato conosco:
                        </p>
                        <p className="text-sm text-pink-700">
                            WhatsApp, Instagram ou telefone
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const publicDiaryMatch = path.match(/^\/diario\/([^/]+)$/);
    const [publicDiaryEnrollment, setPublicDiaryEnrollment] = useState<DaycareRegistration | null>(null);
    const [publicDiaryLoading, setPublicDiaryLoading] = useState(false);
    const [publicDiaryDate, setPublicDiaryDate] = useState<string>(() => {
        try { const p = new URLSearchParams(window.location.search); return p.get('date') || new Date().toISOString().slice(0,10); } catch { return new Date().toISOString().slice(0,10); }
    });
    useEffect(() => {
        if (publicDiaryMatch) {
            const id = publicDiaryMatch[1];
            let cancelled = false;
            const load = async () => {
                setPublicDiaryLoading(true);
                try {
                    const { data, error } = await supabase.from('daycare_enrollments').select('*').eq('id', id).single();
                    if (!cancelled && data) setPublicDiaryEnrollment(data as DaycareRegistration);
                } catch {}
                setPublicDiaryLoading(false);
            };
            load();
            return () => { cancelled = true; };
        }
    }, [publicDiaryMatch?.[1]]);
    const [isObservationModalOpen, setObservationModalOpen] = useState(false);
    const [selectedAppointmentForObservation, setSelectedAppointmentForObservation] = useState<AdminAppointment | null>(null);
    const [observationText, setObservationText] = useState('');
    const [appointments, setAppointments] = useState<AdminAppointment[]>([]);

    // Hooks de carregamento serão posicionados após a autenticação

    const [actionMenu, setActionMenu] = useState<{
        isOpen: boolean;
        appointmentId: string | null;
        position: { top: number; left: number };
    }>({
        isOpen: false,
        appointmentId: null,
        position: { top: 0, left: 0 },
    });

    const handleOpenActionMenu = (appointment: AdminAppointment, _event: React.MouseEvent) => {
        setActionMenu({
            isOpen: true,
            appointmentId: appointment.id,
            position: { top: 0, left: 0 }, // posição não utilizada no modal
        });
    };

    const handleCloseActionMenu = () => {
        setActionMenu({ isOpen: false, appointmentId: null, position: { top: 0, left: 0 } });
    };

    // Extra Services (Appointment) - Global modal handlers
    const [isAppointmentExtraServicesModalOpen, setIsAppointmentExtraServicesModalOpen] = useState(false);
    const [appointmentForExtraServices, setAppointmentForExtraServices] = useState<AdminAppointment | null>(null);

    const handleOpenExtraServicesModal = (appointment: AdminAppointment) => {
        setAppointmentForExtraServices(appointment);
        setIsAppointmentExtraServicesModalOpen(true);
        
    };

    const handleCloseExtraServicesModal = () => {
        setAppointmentForExtraServices(null);
        setIsAppointmentExtraServicesModalOpen(false);
    };

    const handleAppointmentExtraServicesSuccess = (updatedAppointment: AdminAppointment) => {
        setAppointments(prev => prev.map(app => app.id === updatedAppointment.id ? updatedAppointment : app));
        handleCloseExtraServicesModal();
    };

    // Handlers for Observation Modal
    const handleOpenObservationModal = (appointment: AdminAppointment) => {
        setSelectedAppointmentForObservation(appointment);
        setObservationText(appointment.observation || '');
        setObservationModalOpen(true);
        handleCloseActionMenu(); 
    };

    

    const handleCloseObservationModal = () => {
        setObservationModalOpen(false);
        setSelectedAppointmentForObservation(null);
    };

    const handleSaveObservation = async (observation: string) => {
        if (!selectedAppointmentForObservation) return;

        const { data, error } = await supabase
            .from('appointments')
            .update({ observation: observation })
            .eq('id', selectedAppointmentForObservation.id)
            .select();

        if (error) {
            console.error('Error updating observation:', error);
        } else if (data) {
            setAppointments(prev =>
                prev.map(appt =>
                    appt.id === selectedAppointmentForObservation.id
                        ? { ...appt, observation: observation }
                        : appt
                )
            );
            handleCloseObservationModal();
        }
    };
    const [view, setView] = useState<'scheduler' | 'login' | 'admin' | 'daycareRegistration' | 'hotelRegistration' | 'visitSelector' | 'visitAppointment'>('scheduler');
    const [visitServiceType, setVisitServiceType] = useState<'Creche Pet' | 'Hotel Pet' | null>(null);
    
    // Debug: Log mudanças de view
    const setViewWithLog = (newView: 'scheduler' | 'login' | 'admin' | 'daycareRegistration' | 'hotelRegistration' | 'visitSelector' | 'visitAppointment') => {
        console.log('Mudando view de', view, 'para', newView);
        setView(newView);
    };
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(false);
    
    // Estado para controlar se a agenda está aberta - com persistência no localStorage
    const [isScheduleOpen, setIsScheduleOpen] = useState(() => {
        try {
            const saved = localStorage.getItem('sandyPetShop_scheduleOpen');
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.warn('Erro ao ler estado da agenda do localStorage:', error);
            return true;
        }
    });

    // iPhone-like swipe-back gesture (from left edge)
    useEffect(() => {
        let startX = 0;
        let startY = 0;
        let tracking = false;

        const EDGE_THRESHOLD = 24; // px from left edge
        const SWIPE_DISTANCE = 60; // minimal horizontal delta
        const VERTICAL_TOLERANCE = 40; // ignore large vertical drags

        const onTouchStart = (e: TouchEvent) => {
            if (!e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            // Only start tracking if touch begins near the left edge
            if (t.clientX <= EDGE_THRESHOLD) {
                startX = t.clientX;
                startY = t.clientY;
                tracking = true;
            } else {
                tracking = false;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!tracking || !e.touches || e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - startX;
            const dy = Math.abs(t.clientY - startY);
            if (dx > SWIPE_DISTANCE && dy < VERTICAL_TOLERANCE) {
                // Trigger back navigation once and stop tracking
                tracking = false;
                // Prioridade: voltar para tela inicial ou retroceder passo
                if (view !== 'scheduler') {
                    setViewWithLog('scheduler');
                    return;
                }
                // Caso já esteja na tela inicial, não faz nada
            }
        };

        const onTouchEnd = () => {
            tracking = false;
        };

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [view]);

    useEffect(() => {
        let isMounted = true;
        
        const checkAuth = async () => {
            try {
                // Verificar se o supabase está disponível
                if (!supabase || !supabase.auth) {
                    console.warn('Supabase não está disponível, continuando sem autenticação');
                    if (isMounted) {
                        setIsAuthenticated(false);
                        setLoadingAuth(false);
                    }
                    return;
                }
                
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    setIsAuthenticated(!!session);
                    if (!!session) {
                        setViewWithLog('admin');
                    }
                }
            } catch (error) {
                console.warn('Auth check failed, continuing without authentication:', error);
                if (isMounted) {
                    setIsAuthenticated(false);
                }
            } finally {
                if (isMounted) {
                    setLoadingAuth(false);
                }
            }
        };
        
        checkAuth();
        
        // Setup auth listener com proteção adicional
        let authListener: any = null;
        try {
            if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
                const { data } = supabase.auth.onAuthStateChange((_event, session) => {
                    if (isMounted) {
                        setIsAuthenticated(!!session);
                    if (!session) {
                        setViewWithLog('scheduler');
                    }
                    }
                });
                authListener = data;
            }
        } catch (error) {
            console.warn('Auth listener setup failed:', error);
        }

        return () => {
            isMounted = false;
            if (authListener && authListener.subscription) {
                try {
                    authListener.subscription.unsubscribe();
                } catch (error) {
                    console.warn('Error unsubscribing auth listener:', error);
                }
            }
        };
    }, []);

    // useEffect para persistir o estado da agenda no localStorage
    useEffect(() => {
        try {
            localStorage.setItem('sandyPetShop_scheduleOpen', JSON.stringify(isScheduleOpen));
        } catch (error) {
            console.warn('Erro ao salvar estado da agenda no localStorage:', error);
        }
    }, [isScheduleOpen]);

    // Ao autenticar, carregar agendamentos de Banho & Tosa, Pet Móvel e Mensalistas
    useEffect(() => {
        if (!isAuthenticated) return;
        let cancelled = false;

        const loadAllAdminAppointments = async () => {
            try {
                const { data: bathAppointments, error: bathError } = await supabase
                    .from('appointments')
                    .select('*');
                if (bathError) console.warn('Erro ao buscar appointments (Banho & Tosa):', bathError);

                const { data: petMovelAppointments, error: petMovelError } = await supabase
                    .from('pet_movel_appointments')
                    .select('*');
                if (petMovelError) console.warn('Erro ao buscar pet_movel_appointments:', petMovelError);

                const normalize = (arr: any[] | null | undefined): AdminAppointment[] => {
                    if (!arr) return [];
                    return arr.map((rec: any) => ({
                        id: rec.id,
                        appointment_time: rec.appointment_time,
                        pet_name: rec.pet_name,
                        pet_breed: rec.pet_breed ?? undefined,
                        // Fallbacks para registros de Pet Móvel com nomenclatura diferente
                        owner_name: rec.owner_name ?? rec.client_name ?? '',
                        owner_address: rec.owner_address ?? rec.address ?? undefined,
                        whatsapp: rec.whatsapp ?? rec.phone ?? '',
                        service: rec.service,
                        weight: rec.weight,
                        addons: rec.addons ?? [],
                        price: rec.price ?? 0,
                        status: rec.status,
                        monthly_client_id: rec.monthly_client_id ?? undefined,
                        condominium: rec.condominium ?? rec.condo ?? undefined,
                        extra_services: rec.extra_services ?? undefined,
                        observation: rec.observation ?? rec.notes ?? undefined,
                    }));
                };

                const combined = [
                    ...normalize(bathAppointments),
                    ...normalize(petMovelAppointments),
                ].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());

                if (!cancelled) setAppointments(combined);
            } catch (err) {
                console.warn('Falha ao carregar agendamentos:', err);
            }
        };

        loadAllAdminAppointments();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated]);

    if (publicDiaryMatch) {
        if (publicDiaryLoading && !publicDiaryEnrollment) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><LoadingSpinner /></div>;
        if (!publicDiaryEnrollment) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-600">Diário não encontrado.</p></div>;
        return <PublicDiaryPage enrollment={publicDiaryEnrollment} date={publicDiaryDate} onDateChange={setPublicDiaryDate} />;
    }
    if (loadingAuth) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100"><LoadingSpinner /></div>;
    }
    
    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.warn('Logout failed:', error);
        }
        setIsAuthenticated(false);
        setViewWithLog('scheduler');
    };
    
    if (isAuthenticated) {
        return (
            <>
                <AdminDashboard 
                    onLogout={handleLogout} 
                    isScheduleOpen={isScheduleOpen}
                    setIsScheduleOpen={setIsScheduleOpen}
                    onAddObservation={handleOpenObservationModal}
                    appointments={appointments}
                    setAppointments={setAppointments}
                    handleOpenExtraServicesModal={handleOpenExtraServicesModal}
                    onOpenActionMenu={handleOpenActionMenu}
                    onDeleteObservation={async (appointment: AdminAppointment) => {
                        try {
                            const [appointmentsResult, petMovelResult] = await Promise.all([
                                supabase.from('appointments').update({ observation: null }).eq('id', appointment.id),
                                supabase.from('pet_movel_appointments').update({ observation: null }).eq('id', appointment.id)
                            ]);
                            const hasError = appointmentsResult.error && petMovelResult.error;
                            if (hasError) {
                                console.error('Erro ao remover observação em appointments:', appointmentsResult.error);
                                console.error('Erro ao remover observação em pet_movel_appointments:', petMovelResult.error);
                                alert('Falha ao remover a observação.');
                            } else {
                                setAppointments(prev => prev.map(app => app.id === appointment.id ? { ...app, observation: undefined } : app));
                            }
                        } catch (err) {
                            console.error('Erro inesperado ao remover observação:', err);
                            alert('Erro inesperado ao remover a observação.');
                        }
                    }}
                />

                {isObservationModalOpen && selectedAppointmentForObservation && (
                    <ObservationModal
                        isOpen={isObservationModalOpen}
                        onClose={handleCloseObservationModal}
                        onSave={handleSaveObservation}
                        initialObservation={selectedAppointmentForObservation.observation || ''}
                    />
                )}
                <ActionChooserModal 
                    isOpen={actionMenu.isOpen}
                    onClose={handleCloseActionMenu}
                    onAddObservation={() => {
                        const appt = appointments.find(a => a.id === actionMenu.appointmentId);
                        if (appt) handleOpenObservationModal(appt);
                    }}
                    onAddExtraServices={() => {
                        const appt = appointments.find(a => a.id === actionMenu.appointmentId);
                        if (appt) handleOpenExtraServicesModal(appt);
                    }}
                />
                {isAppointmentExtraServicesModalOpen && appointmentForExtraServices && (
                    <ExtraServicesModal
                        isOpen={isAppointmentExtraServicesModalOpen}
                        onClose={handleCloseExtraServicesModal}
                        onSuccess={handleAppointmentExtraServicesSuccess}
                        data={appointmentForExtraServices}
                        type="appointment"
                        title="Serviços Extras - Agendamento"
                    />
                )}
            </>
        );
    }

    if (view === 'login') {
        return <AdminLogin onLoginSuccess={() => { setIsAuthenticated(true); setViewWithLog('admin'); }} />;
    }
    
    if (view === 'daycareRegistration') {
        return <DaycareRegistrationForm setView={setViewWithLog} />;
    }

    if (view === 'hotelRegistration') {
        return <HotelRegistrationForm setView={setViewWithLog} />;
    }

    if (view === 'visitSelector') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pink-50 via-white to-rose-50">
                <div className="text-center mb-8">
                    <img src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop" className="h-20 w-20 mx-auto mb-2"/>
                    <h1 className="font-brand text-4xl text-pink-800">Sandy's Pet Shop</h1>
                    <p className="text-gray-600 text-lg">Agendamento de Visita</p>
                </div>
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-pink-100">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Escolha o local da visita</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button type="button" onClick={() => { setVisitServiceType('Creche Pet'); setViewWithLog('visitAppointment'); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center bg-white hover:bg-pink-50 border-gray-200">
                            <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet" className="w-12 h-12 rounded-full object-contain mb-2" />
                            <span className="text-lg">Creche Pet</span>
                        </button>
                        <button type="button" onClick={() => { setVisitServiceType('Hotel Pet'); setViewWithLog('visitAppointment'); }} className="p-5 rounded-2xl text-center font-semibold transition-all border-2 flex flex-col items-center justify-center bg-white hover:bg-pink-50 border-gray-200">
                            <img src="https://cdn-icons-png.flaticon.com/512/1131/1131938.png" alt="Hotel Pet" className="w-12 h-12 rounded-full object-contain mb-2" />
                            <span className="text-lg">Hotel Pet</span>
                        </button>
                    </div>
                    
                    <div className="mt-6 text-center">
                        <button type="button" onClick={() => setViewWithLog('scheduler')} className="text-sm text-pink-600 hover:underline">← Voltar</button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'visitAppointment') {
        return <VisitAppointmentForm serviceLabel={visitServiceType || 'Visita'} onBack={() => setViewWithLog('visitSelector')} onDone={() => setViewWithLog('scheduler')} />;
    }

    if (!isScheduleOpen) {
        return <ScheduleClosedPage setView={setViewWithLog} />;
    }

    return <Scheduler setView={setViewWithLog} />;
};

// Observation Modal Component
const ObservationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (observation: string) => void;
    initialObservation: string;
}> = ({ isOpen, onClose, onSave, initialObservation }) => {
    const [observation, setObservation] = useState(initialObservation);

    useEffect(() => {
        setObservation(initialObservation);
    }, [initialObservation]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(observation);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scaleIn">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">Adicionar/Editar Observação</h2>
                </div>
                <div className="p-6">
                    <textarea
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        placeholder="Digite a observação aqui..."
                    />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
const VisitAppointmentForm: React.FC<{ serviceLabel: string; onBack: () => void; onDone: () => void }> = ({ serviceLabel, onBack, onDone }) => {
    const [petName, setPetName] = useState('');
    const [petBreed, setPetBreed] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [ownerAddress, setOwnerAddress] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || time === '' || !petName || !ownerName || !whatsapp) return;
        setIsSubmitting(true);
        const d = new Date(date);
        const appt = toSaoPauloUTC(d.getFullYear(), d.getMonth(), d.getDate(), Number(time));
        const payload = {
            appointment_time: appt.toISOString(),
            pet_name: petName,
            pet_breed: petBreed || null,
            owner_name: ownerName,
            whatsapp,
            service: serviceLabel,
            weight: 'N/A',
            price: 0,
            status: 'AGENDADO',
            owner_address: ownerAddress || null,
        };
        const { error } = await supabase.from('appointments').insert([payload]);
        setIsSubmitting(false);
        if (!error) setIsSuccess(true);
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-pink-600 bg-opacity-90 flex items-center justify_center z-50 animate-fadeIn p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-full sm:max-w-sm mx-auto">
                    <SuccessIcon />
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">Visita Agendada!</h2>
                    <p className="text-gray-600 mt-2">Recebemos sua solicitação de visita. Entraremos em contato em breve.</p>
                    <button onClick={onDone} className="mt-6 bg-pink-600 text-white font-bold py-3.5 px-8 rounded-lg hover:bg-pink-700 transition-colors">OK</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pink-50 via-white to-rose-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-pink-100">
                <div className="p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800 text-center">Agendar Visita — {serviceLabel}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><label className="block text-sm font-semibold text-gray-700">Nome do Pet</label><input value={petName} onChange={e => setPetName(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md" required/></div>
                    <div><label className="block text-sm font-semibold text-gray-700">Raça</label><input value={petBreed} onChange={e => setPetBreed(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md"/></div>
                    <div><label className="block text-sm font-semibold text-gray-700">Nome do Tutor</label><input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md" required/></div>
                    <div><label className="block text-sm font-semibold text-gray-700">WhatsApp</label><input value={whatsapp} onChange={e => setWhatsapp(formatWhatsapp(e.target.value))} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md" placeholder="(XX) XXXXX-XXXX" maxLength={15} required/></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-semibold text-gray-700">Endereço</label><input value={ownerAddress} onChange={e => setOwnerAddress(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md"/></div>
                    <div><label className="block text_sm font-semibold text-gray-700">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md" required/></div>
                    <div><label className="block text-sm font-semibold text-gray-700">Horário</label><select value={time} onChange={e => setTime(Number(e.target.value))} className="mt-1 block w-full p-3 bg-gray-50 border rounded-md" required><option value="" disabled>Selecione</option>{VISIT_WORKING_HOURS.map(h => (<option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>))}</select></div>
                    <div className="sm:col-span-2 flex justify-between items-center pt-2">
                        <button type="button" onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">← Voltar</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-gray-400">Agendar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const DaycareDiaryPage: React.FC<{ enrollment: DaycareRegistration; date: string; onDateChange: (d: string) => void; onBack: () => void }> = ({ enrollment, date, onDateChange, onBack }) => {
    const [mood, setMood] = useState<'Animado'|'Normal'|'Sonolento'|'Agitado'|null>(null);
    const [behavior, setBehavior] = useState<number>(3);
    const [social, setSocial] = useState<{ outros:boolean; descanso:boolean; quieto:boolean}>({outros:false,descanso:false,quieto:false});
    const [feeding, setFeeding] = useState<'Comeu tudo'|'Comeu pouco'|'Não comeu'|null>(null);
    const [logs, setLogs] = useState<{ time:string; type:'Xixi'|'Cocô'}[]>([]);
    const [obs, setObs] = useState<string>('');
    const [media, setMedia] = useState<File[]>([]);
    const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const socialOptions = [
        'Interagiu bem com os atendentes',
        'Fez novos amigos',
        'Mostrou timidez',
        'Teve dificuldade em interagir',
        'Brincou apenas com um pet específico',
        'Mostrou empolgação ao chegar',
        'Precisou de tempo para se adaptar',
        'Ficou mais observador',
        'Mostrou sinais de ansiedade',
        'Participou de atividades em grupo',
        'Preferiu brincar sozinho',
        'Se mostrou protetor',
        'Se aproximou de outros pets espontaneamente',
        'Se manteve tranquilo perto de outros pets',
        'Teve pequenos desentendimentos',
        'Interagiu de forma carinhosa',
        'Teve muita energia durante as interações',
    ];
    const [socialNotes, setSocialNotes] = useState<string[]>([]);
    const emotionalOptions = [
        'Estressado',
        'Ansioso',
        'Carente',
        'Relaxado',
        'Tranquilo com barulhos',
        'Procurou atenção',
    ];
    const [emotionalNotes, setEmotionalNotes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
    const [sendingShare, setSendingShare] = useState(false);
    const [shareSent, setShareSent] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [hasEntry, setHasEntry] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const addLog = (type:'Xixi'|'Cocô') => {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2,'0');
        const mm = String(now.getMinutes()).padStart(2,'0');
        setLogs(prev => [...prev, { time: `${hh}:${mm}`, type }]);
    };
    const removeLog = (index: number) => {
        setLogs(prev => prev.filter((_, i) => i !== index));
    };
    const handleAddMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = Array.from(e.target.files || []);
        setMedia(prev => [...prev, ...f]);
    };
    const removeSelectedMedia = (index: number) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };
    useEffect(() => {
        const urls = media.map(file => URL.createObjectURL(file));
        setMediaPreviews(urls);
        return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
    }, [media]);
    useEffect(() => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        if (!date) onDateChange(todayStr);
    }, []);
    const moods: {label:'Animado'|'Normal'|'Sonolento'|'Agitado'; color:string; icon:string}[] = [
        {label:'Animado', color:'bg-green-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172006.png'},
        {label:'Normal', color:'bg-yellow-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172069.png'},
        {label:'Sonolento', color:'bg-blue-100', icon:'https://cdn-icons-png.flaticon.com/512/13761/13761607.png'},
        {label:'Agitado', color:'bg-red-100', icon:'https://cdn-icons-png.flaticon.com/512/2171/2171936.png'},
    ];
    const copyShareLink = async () => {
        const url = `${window.location.origin}/diario/${enrollment.id}?date=${date}`;
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch {}
    };
    const sendDiaryWebhook = async () => {
        if (!hasEntry) return;
        setSendingShare(true);
        setShareSent(false);
        try {
            const webhookUrl = 'https://n8n.intelektus.tech/webhook/diarioCrechePet';
            const diaryLink = `${window.location.origin}/diario/${enrollment.id}?date=${date}`;
            try { await navigator.clipboard.writeText(diaryLink); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch {}
            const payload = {
                type: 'daycare_diary_shared',
                diary_link: diaryLink,
                enrollment: {
                    id: enrollment.id,
                    pet_name: enrollment.pet_name,
                    pet_breed: enrollment.pet_breed,
                    pet_age: enrollment.pet_age,
                    pet_sex: enrollment.pet_sex,
                    is_neutered: enrollment.is_neutered,
                    pet_photo_url: enrollment.pet_photo_url,
                    gets_along_with_others: (enrollment as any).gets_along_with_others,
                    has_allergies: (enrollment as any).has_allergies,
                    allergies_description: (enrollment as any).allergies_description,
                    needs_special_care: (enrollment as any).needs_special_care,
                    special_care_description: (enrollment as any).special_care_description,
                    contracted_plan: enrollment.contracted_plan,
                    attendance_days: (enrollment as any).attendance_days,
                    tutor_name: enrollment.tutor_name,
                    contact_phone: (enrollment as any).contact_phone,
                    tutor_email: (enrollment as any).tutor_email,
                    address: (enrollment as any).address,
                },
                diary: {
                    date,
                    mood,
                    behavior,
                    social_outros: social.outros,
                    social_descanso: social.descanso,
                    social_quieto: social.quieto,
                    social_notes: socialNotes,
                    emotional_notes: emotionalNotes,
                    feeding,
                    needs_logs: logs,
                    obs,
                    media_urls: existingMediaUrls,
                },
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                    keepalive: true,
                });
                clearTimeout(timeoutId);
                if (!res.ok) throw new Error(String(res.status));
                setShareSent(true);
            } catch {
                const ok = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(webhookUrl, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
                if (ok) setShareSent(true);
            }
        } finally {
            setSendingShare(false);
        }
    };
    const formatDateBR = (s: string) => {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    };
    const formatPlanBR = (plan: string | null | undefined) => {
        const s = String(plan || '').toLowerCase();
        const m = s.match(/^(\d+)x_(week|month)$/);
        if (m) {
            const n = m[1];
            const period = m[2] === 'week' ? 'semana' : 'mês';
            return `${n}x por ${period}`;
        }
        return s.replace('_',' ');
    };
    const behaviorLabel = (n: number) => {
        switch (n) {
            case 1: return 'Anjinho';
            case 2: return 'Arteirinho às vezes';
            case 3: return 'Travesso na medida';
            case 4: return 'Aprontador frequente';
            case 5: return 'Travessura máxima';
            default: return '';
        }
    };
    const moodOptions: {label:'Animado'|'Normal'|'Sonolento'|'Agitado'; color:string; icon:string}[] = [
        {label:'Animado', color:'bg-green-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172006.png'},
        {label:'Normal', color:'bg-yellow-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172069.png'},
        {label:'Sonolento', color:'bg-blue-100', icon:'https://cdn-icons-png.flaticon.com/512/13761/13761607.png'},
        {label:'Agitado', color:'bg-red-100', icon:'https://cdn-icons-png.flaticon.com/512/2171/2171936.png'},
    ];
    const feedingOptionCards: {label:'Comeu tudo'|'Comeu pouco'|'Não comeu'; bg:string; ring:string; emoji:string}[] = [
        {label:'Comeu tudo', bg:'bg-green-50', ring:'ring-green-400', emoji:'🍲'},
        {label:'Comeu pouco', bg:'bg-yellow-50', ring:'ring-yellow-400', emoji:'🥣'},
        {label:'Não comeu', bg:'bg-red-50', ring:'ring-red-400', emoji:'🚫'},
    ];
    useEffect(() => {
        (async () => {
            try {
                setLoadError(null);
                const { data, error } = await supabase
                    .from('daycare_diary_entries')
                    .select('*')
                    .eq('enrollment_id', enrollment.id)
                    .eq('date', date)
                    .maybeSingle();
                if (error) { setLoadError(error.message); return; }
                if (data) {
                    setHasEntry(true);
                    setMood((data.mood as any) ?? null);
                    setBehavior(data.behavior ?? 3);
                    setSocial({ outros: !!data.social_outros, descanso: !!data.social_descanso, quieto: !!data.social_quieto });
                    setFeeding((data.feeding as any) ?? null);
                    setLogs(Array.isArray(data.needs_logs) ? data.needs_logs : []);
                    setObs(data.obs || '');
                    setExistingMediaUrls(Array.isArray(data.media_urls) ? data.media_urls : []);
                    setSocialNotes(Array.isArray((data as any).social_notes) ? (data as any).social_notes : []);
                    setEmotionalNotes(Array.isArray((data as any).emotional_notes) ? (data as any).emotional_notes : []);
                } else {
                    setHasEntry(false);
                    setMood(null); setBehavior(3); setSocial({outros:false,descanso:false,quieto:false}); setFeeding(null); setLogs([]); setObs('');
                    setExistingMediaUrls([]);
                    setSocialNotes([]);
                    setEmotionalNotes([]);
                }
            } catch {}
        })();
    }, [enrollment.id, date]);
    const uploadMedia = async (): Promise<string[]> => {
        const uploaded: string[] = [];
        if (!media.length) return uploaded;
        const bucket = supabase.storage.from('daycare_pet_photos');
        for (const file of media) {
            const ext = file.name.split('.').pop() || 'bin';
            const name = (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())) + '.' + ext;
            const path = `${enrollment.id}/${date}/${name}`;
            const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
            if (!error) {
                const { data } = bucket.getPublicUrl(path);
                if (data?.publicUrl) uploaded.push(data.publicUrl);
            }
        }
        return uploaded;
    };
    const saveDiary = async () => {
        setSaving(true);
        const newUrls = await uploadMedia();
        const payload: any = {
            enrollment_id: enrollment.id,
            date,
            mood,
            behavior,
            social_outros: social.outros,
            social_descanso: social.descanso,
            social_quieto: social.quieto,
            feeding,
            needs_logs: logs,
            obs,
            media_urls: [...existingMediaUrls, ...newUrls],
            social_notes: socialNotes,
            emotional_notes: emotionalNotes,
        };
        const { error } = await supabase.from('daycare_diary_entries').upsert(payload, { onConflict: 'enrollment_id,date' });
        setSaving(false);
        if (error) {
            alert('Erro ao salvar diário: ' + error.message);
        } else {
            setExistingMediaUrls(payload.media_urls || []);
            setMedia([]);
            setHasEntry(true);
            setConfirmOpen(true);
        }
    };
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-white p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Voltar</button>
                    <h2 className="font-brand text-3xl font-bold text-pink-800 flex-1 text-center">Diário do Pet</h2>
                    <div className="flex items-center gap-2">
                        {hasEntry && (
                            <>
                                <button onClick={sendDiaryWebhook} disabled={sendingShare} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60">{sendingShare ? 'Enviando...' : 'Compartilhar'}</button>
                                {shareSent && <span className="text-xs text-gray-700">Enviado!</span>}
                            </>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                    <img src={enrollment.pet_photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} alt={enrollment.pet_name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="flex-1">
                        <p className="text-xl font-bold text-gray-900">{enrollment.pet_name}</p>
                        <p className="text-sm text-gray-600">{enrollment.tutor_name}</p>
                        <p className="text-xs text-gray-500">Plano: {formatPlanBR(enrollment.contracted_plan)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={()=>{ const di = document.getElementById('diary_date_input') as any; try { di?.showPicker ? di.showPicker() : di?.focus(); } catch {} }} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-2">
                            {formatDateBR(date)}
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </button>
                        <input id="diary_date_input" type="date" value={date} onChange={(e)=>onDateChange(e.target.value)} className="sr-only" />
                    </div>
                </div>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Humor do Pet</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {moods.map(m => (
                            <button key={m.label} onClick={()=>setMood(m.label)} className={`flex flex-col items-center gap-2 p-3 rounded-xl ${m.color} ${mood===m.label?'ring-2 ring-purple-500':''}`}>
                                <img src={m.icon} alt={m.label} className="w-8 h-8" />
                                <span className="text-sm font-medium text-gray-800">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Comportamento</h3>
                    <div className="px-2">
                        <div className="flex justify-between mb-2 px-1">
                            {[1,2,3,4,5].map(n => (
                                <button key={n} type="button" onClick={()=>setBehavior(n)} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${behavior===n?'bg-purple-600 text-white':'bg-gray-200 text-gray-700'} transition-colors`}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        <input type="range" min={1} max={5} list="behaviorTicks" value={behavior} onChange={(e)=>setBehavior(Number(e.target.value))} className="w-full" />
                        <div className="text-sm text-purple-700 font-medium text-center mt-1">{behaviorLabel(behavior)}</div>
                        <datalist id="behaviorTicks">
                            <option value="1" />
                            <option value="2" />
                            <option value="3" />
                            <option value="4" />
                            <option value="5" />
                        </datalist>
                    </div>
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Socialização</h3>
                    <div className="overflow-x-auto">
                        <div className="flex gap-3 min-w-max px-1">
                            <label className="flex items-center gap-2 shrink-0"><input type="checkbox" checked={social.outros} onChange={(e)=>setSocial(s=>({...s,outros:e.target.checked}))} /><span>Brincou com outros pets</span></label>
                            <label className="flex items-center gap-2 shrink-0"><input type="checkbox" checked={social.descanso} onChange={(e)=>setSocial(s=>({...s,descanso:e.target.checked}))} /><span>Precisou de descanso</span></label>
                            <label className="flex items-center gap-2 shrink-0"><input type="checkbox" checked={social.quieto} onChange={(e)=>setSocial(s=>({...s,quieto:e.target.checked}))} /><span>Ficou mais quieto</span></label>
                            {socialOptions.map(opt => (
                                <label key={opt} className="flex items-center gap-2 shrink-0">
                                    <input type="checkbox" checked={socialNotes.includes(opt)} onChange={(e)=> setSocialNotes(prev=> e.target.checked ? [...prev, opt] : prev.filter(x=>x!==opt))} />
                                    <span>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Bem-estar emocional</h3>
                    <div className="overflow-x-auto">
                        <div className="flex gap-3 min-w-max px-1">
                            {emotionalOptions.map(opt => (
                                <label key={opt} className="flex items-center gap-2 shrink-0">
                                    <input type="checkbox" checked={emotionalNotes.includes(opt)} onChange={(e)=> setEmotionalNotes(prev=> e.target.checked ? [...prev, opt] : prev.filter(x=>x!==opt))} />
                                    <span>{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="bg-white rounded-2xl shadow p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Alimentação</h3>
                        <div className="grid grid-cols-3 gap-3 px-2 py-2 overflow-x-auto">
                            {feedingOptionCards.map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={()=>setFeeding(opt.label)}
                                    className={`w-11/12 mx-auto min-w-0 p-1 rounded-xl border border-gray-200 ${opt.bg} ${feeding===opt.label?`ring-2 ${opt.ring} shadow-md`:'hover:shadow'} transition`}
                                    aria-pressed={feeding===opt.label}
                                >
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center text-xl">
                                            <span>{opt.emoji}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-gray-800 text-center">{opt.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="bg-white rounded-2xl shadow p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Necessidades</h3>
                        <div className="flex gap-2 mb-3">
                            <button onClick={()=>addLog('Xixi')} className="px-3 py-2 bg-green-600 text-white rounded-lg">Registrar xixi</button>
                            <button onClick={()=>addLog('Cocô')} className="px-3 py-2 bg-green-600 text-white rounded-lg">Registrar cocô</button>
                        </div>
                        <div className="space-y-1 text-sm text-gray-700">
                            {logs.map((l,i)=>(
                                <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <span>{l.time} - {l.type}</span>
                                    <button type="button" onClick={() => removeLog(i)} className="text-red-500 hover:text-red-700">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path d="M6 6l12 12M6 18L18 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {logs.length===0 && <div className="text-gray-500">Sem registros</div>}
                        </div>
                    </section>
                </div>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Observações gerais</h3>
                    <textarea value={obs} onChange={(e)=>setObs(e.target.value)} placeholder="Digite observações gerais aqui..." className="w-full p-3 rounded-xl border border-gray-300" rows={3} />
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Mídias do dia</h3>
                    <div className="rounded-2xl bg-gray-100 p-3">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {(() => {
                                const items: {src?: string; type: 'image'|'video'}[] = [];
                                existingMediaUrls.forEach(u => {
                                    const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(u);
                                    const isVid = /\.(mp4|webm|ogg)$/i.test(u);
                                    if (isImg) items.push({ src: u, type: 'image' });
                                    else if (isVid) items.push({ src: u, type: 'video' });
                                    else items.push({ src: u, type: 'image' });
                                });
                                media.forEach((f, i) => {
                                    const preview = mediaPreviews[i];
                                    const isImg = (f.type || '').startsWith('image/');
                                    const isVid = (f.type || '').startsWith('video/');
                                    if (isImg) items.push({ src: preview, type: 'image' });
                                    else if (isVid) items.push({ src: preview, type: 'video' });
                                    else items.push({ src: preview, type: 'image' });
                                });
                                const tiles = Array.from({ length: 4 }, (_, idx) => items[idx] || null);
                                return (
                                    <>
                                        {tiles.map((item, i) => (
                                            <div key={`tile-${i}`} className="relative h-20 rounded-xl bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {item ? (
                                                    item.type === 'image' ? (
                                                        <img src={item.src} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <video src={item.src} className="w-full h-full object-cover" />
                                                    )
                                                ) : (
                                                    <div className="text-gray-500 flex items-center justify-center w-full h-full">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3 1a1 1 0 00-1 1v9h16V8a1 1 0 00-1-1H5zm7 2a3 3 0 110 6 3 3 0 010-6z"/></svg>
                                                    </div>
                                                )}
                                                <button type="button" onClick={()=>document.getElementById('diary_media_input')?.click()} className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-green-500 text-white text-base flex items-center justify-center">+</button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={()=>document.getElementById('diary_media_input')?.click()} className="h-20 rounded-xl border-2 border-green-500 bg-white flex items-center justify-center">
                                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-green-700 font-semibold">
                                                <CameraAddIcon className="w-6 h-6 text-green-600" />
                                                <span className="text-center">Adicionar Mídia</span>
                                            </div>
                                        </button>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <input id="diary_media_input" type="file" accept="image/*,video/*" multiple className="sr-only" onChange={handleAddMedia} />
                </section>
                {!hasEntry && (
                    <div className="flex justify-center">
                        <button onClick={saveDiary} disabled={saving} className="px-6 py-3 bg-green-600 text-white rounded-2xl font-semibold hover:bg-green-700 disabled:opacity-60">
                            {saving ? 'Salvando...' : 'Salvar registro'}
                        </button>
                    </div>
                )}
            {confirmOpen && (
            <div className="fixed inset-0 z-50">
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative min-h-screen">
                    <div className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <button onClick={()=>setConfirmOpen(false)} className="p-1 rounded hover:bg-white/10" aria-label="Voltar">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <span className="font-semibold">Confirmação de Registro</span>
                        </div>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>
                    </div>
                    <div className="max-w-md mx-auto mt-10 px-4">
                        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            <p className="text-lg font-semibold text-gray-800 mb-6">Registro Salvo com Sucesso!</p>
                            <button onClick={()=>setConfirmOpen(false)} className="px-6 py-2.5 bg-green-600 text-white rounded-full font-medium hover:bg-green-700">Voltar ao Diário</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
            </div>
        </div>
    );
};

const PublicDiaryPage: React.FC<{ enrollment: DaycareRegistration; date: string; onDateChange: (d: string) => void }> = ({ enrollment, date, onDateChange }) => {
    const [entry, setEntry] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const formatDateBR = (s: string) => {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    };
    const formatPlanBR = (plan: string | null | undefined) => {
        const s = String(plan || '').toLowerCase();
        const m = s.match(/^(\d+)x_(week|month)$/);
        if (m) {
            const n = m[1];
            const period = m[2] === 'week' ? 'semana' : 'mês';
            return `${n}x por ${period}`;
        }
        return s.replace('_',' ');
    };
    const behaviorLabel = (n: number) => {
        switch (n) {
            case 1: return 'Anjinho';
            case 2: return 'Arteirinho às vezes';
            case 3: return 'Travesso na medida';
            case 4: return 'Aprontador frequente';
            case 5: return 'Travessura máxima';
            default: return '';
        }
    };
    const moodOptions: {label:'Animado'|'Normal'|'Sonolento'|'Agitado'; color:string; icon:string}[] = [
        {label:'Animado', color:'bg-green-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172006.png'},
        {label:'Normal', color:'bg-yellow-100', icon:'https://cdn-icons-png.flaticon.com/512/2172/2172069.png'},
        {label:'Sonolento', color:'bg-blue-100', icon:'https://cdn-icons-png.flaticon.com/512/13761/13761607.png'},
        {label:'Agitado', color:'bg-red-100', icon:'https://cdn-icons-png.flaticon.com/512/2171/2171936.png'},
    ];
    useEffect(() => {
        (async () => {
            setLoading(true);
            const { data } = await supabase
                .from('daycare_diary_entries')
                .select('*')
                .eq('enrollment_id', enrollment.id)
                .eq('date', date)
                .maybeSingle();
            setEntry(data || null);
            setLoading(false);
        })();
    }, [enrollment.id, date]);
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-white p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-brand text-3xl font-bold text-pink-800 flex-1 text-center">Diário do Pet</h2>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{formatDateBR(date)}</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-3">
                    <img src={enrollment.pet_photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} alt={enrollment.pet_name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="flex-1">
                        <p className="text-xl font-bold text-gray-900">{enrollment.pet_name}</p>
                        <p className="text-sm text-gray-600">{enrollment.tutor_name}</p>
                        <p className="text-xs text-gray-500">Plano: {formatPlanBR(enrollment.contracted_plan)}</p>
                    </div>
                </div>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Humor do Pet</h3>
                    {typeof entry?.mood === 'string' ? (
                        (() => {
                            const m = moodOptions.find(x => x.label === entry!.mood);
                            return m ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 justify-center justify-items-center">
                                    <div className={`flex flex-col items-center gap-2 p-3 rounded-xl ${m.color}`}>
                                        <img src={m.icon} alt={m.label} className="w-8 h-8" />
                                        <span className="text-sm font-medium text-gray-800">{m.label}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-600">Sem registros</p>
                            );
                        })()
                    ) : (
                        <p className="text-gray-600">Sem registros</p>
                    )}
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Comportamento</h3>
                    <p className="text-gray-600">{typeof entry?.behavior === 'number' ? behaviorLabel(entry.behavior) : 'Sem registros'}</p>
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Socialização</h3>
                    {!entry ? (<p className="text-gray-600">Sem registros</p>) : (
                        <ul className="text-gray-700 text-sm space-y-1">
                            {entry.social_outros && <li>Brincou com outros pets</li>}
                            {entry.social_descanso && <li>Precisou de descanso</li>}
                            {entry.social_quieto && <li>Ficou mais quieto</li>}
                            {(entry.social_notes || []).map((t:string, i:number)=>(<li key={i}>{t}</li>))}
                            {!entry.social_outros && !entry.social_descanso && !entry.social_quieto && !((entry.social_notes||[]).length) && <li>Sem registros</li>}
                        </ul>
                    )}
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Bem-estar emocional</h3>
                    {entry?.emotional_notes?.length ? (
                        <ul className="text-gray-700 text-sm space-y-1">
                            {entry.emotional_notes.map((t:string,i:number)=>(<li key={i}>{t}</li>))}
                        </ul>
                    ) : (<p className="text-gray-600">Sem registros</p>)}
                </section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <section className="bg-white rounded-2xl shadow p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Alimentação</h3>
                        <p className="text-gray-600">{entry?.feeding || 'Sem registros'}</p>
                    </section>
                    <section className="bg-white rounded-2xl shadow p-4">
                        <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Necessidades</h3>
                        {entry?.needs_logs?.length ? (
                            <div className="space-y-1 text-sm text-gray-700">
                                {entry.needs_logs.map((l:any,i:number)=>(<div key={i} className="flex justify-between bg-gray-50 p-2 rounded"><span>{l.time} - {l.type}</span></div>))}
                            </div>
                        ) : (<p className="text-gray-600">Sem registros</p>)}
                    </section>
                </div>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Observações gerais</h3>
                    <p className="text-gray-600">{entry?.obs || 'Sem registros'}</p>
                </section>
                <section className="bg-white rounded-2xl shadow p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-3 py-2">Mídias do dia</h3>
                    {entry?.media_urls?.length ? (
                        <div className="flex flex-wrap gap-3 justify-center">
                            {entry.media_urls.map((u:string,i:number)=>{
                                const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(u);
                                const isVid = /\.(mp4|webm|ogg)$/i.test(u);
                                return (
                                    <a key={i} href={u} target="_blank" className="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                                        {isImg ? (<img src={u} alt={`Midia ${i+1}`} className="w-full h-full object-cover" />) : isVid ? (<video src={u} className="w-full h-full object-cover" />) : (<span className="text-xs text-gray-600">Midia {i+1}</span>)}
                                    </a>
                                );
                            })}
                        </div>
                    ) : (<p className="text-gray-600">Sem registros</p>)}
                </section>
            </div>
        </div>
    );
};
