import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import './FinancialDashboardView.css';
import {
  TrendingUp,
  TrendingDown,

  Calendar,
  Clock,
  Award,
  Percent,
  BarChart3,
  PieChart,
  ChevronDown,
  RefreshCw,
  Activity,
  Target,
  Layers,
  MapPin,
  CalendarCheck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertCircle,
  Printer
} from 'lucide-react';

// Tipos para os dados do Supabase
interface BaseAppointment {
  price?: number;
  appointment_time?: string;
  status?: string;
  service?: string;
}

// Componente para Animação de Números
const AnimatedCounter: React.FC<{ value: number; prefix?: string; suffix?: string; decimals?: number }> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = safeValue;
    if (start === end) {
      setCount(end);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      if (elapsedTime >= duration) {
        setCount(end);
        return;
      }
      const progress = elapsedTime / duration;
      // Easing out quadratic
      const easeProgress = progress * (2 - progress);
      const currentCount = start + (end - start) * easeProgress;
      setCount(currentCount);
      requestAnimationFrame(updateCounter);
    };

    requestAnimationFrame(updateCounter);
  }, [safeValue]);

  return (
    <span>
      {prefix}
      {(count || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
}
// Funções auxiliares para serialização de metadados no campo observacoes
interface ExpenseMetadata {
  exclusoes?: string[]; // lista de "YYYY-MM"
  fim_recorrencia?: string; // "YYYY-MM"
  status_mes?: { [periodo: string]: 'pago' | 'pendente' };
  valor_mes?: { [periodo: string]: number };
}

const serializeExpense = (item: any, meta: ExpenseMetadata) => {
  const cleanObs = (item.observacoes || '').replace(/\s*\[META:.*?\]/g, '').trim();
  const metaStr = `[META:${JSON.stringify(meta)}]`;
  return cleanObs ? `${cleanObs} ${metaStr}` : metaStr;
};

const deserializeExpense = (item: any) => {
  const obs = item.observacoes || '';
  const match = obs.match(/\[META:(.*?)\]/);
  let metadata: ExpenseMetadata = {};
  let observacoesLimpa = obs;

  if (match) {
    try {
      metadata = JSON.parse(match[1]);
      observacoesLimpa = obs.replace(/\s*\[META:.*?\]/g, '').trim();
    } catch (e) {
      console.warn('Erro ao parsear metadados do gasto:', e);
    }
  }

  return {
    ...item,
    observacoesLimpa,
    metadata
  };
};

const parseDaycareExtras = (d: any) => {
  let diariasTotal = 0;
  let pernoitesTotal = 0;
  
  // Vamos mapear os valores de extras por mês e ano para podermos distribuir na série histórica
  const monthlyExtras: { [monthYearKey: string]: { diarias: number; pernoites: number } } = {};
  
  const addExtra = (dateStr: string | undefined, type: 'diaria' | 'pernoite', amount: number) => {
    if (amount <= 0) return;
    const date = dateStr ? new Date(dateStr) : (d.created_at ? new Date(d.created_at) : new Date());
    if (isNaN(date.getTime())) return;
    
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 a 11
    const key = `${year}-${month}`;
    
    if (!monthlyExtras[key]) {
      monthlyExtras[key] = { diarias: 0, pernoites: 0 };
    }
    
    if (type === 'diaria') {
      diariasTotal += amount;
      monthlyExtras[key].diarias += amount;
    } else {
      pernoitesTotal += amount;
      monthlyExtras[key].pernoites += amount;
    }
  };

  let es = d.extra_services;
  if (typeof es === 'string') {
    try {
      es = JSON.parse(es);
    } catch (e) {
      es = null;
    }
  }

  if (es && typeof es === 'object') {
    // 1. Pernoite
    if (es.pernoite) {
      if (typeof es.pernoite === 'object') {
        if (es.pernoite.enabled) {
          const val = Number(es.pernoite.value !== undefined ? es.pernoite.value : 50);
          addExtra(es.pernoite.date, 'pernoite', val);
        }
      } else if (es.pernoite === true || es.pernoite === 'true') {
        addExtra(undefined, 'pernoite', 50);
      }
    }
    
    // 2. Diárias Extras / Dias Extras
    if (es.dias_extras) {
      if (typeof es.dias_extras === 'object') {
        if (es.dias_extras.enabled) {
          const qty = Number(es.dias_extras.quantity || 0);
          const val = Number(es.dias_extras.value !== undefined ? es.dias_extras.value : 30);
          addExtra(es.dias_extras.date, 'diaria', qty * val);
        }
      }
    }
    
    if (typeof es.dia_extra === 'number' && es.dia_extra > 0) {
      addExtra(undefined, 'diaria', es.dia_extra * 30);
    }
  }
  
  return {
    diariasTotal,
    pernoitesTotal,
    totalExtras: diariasTotal + pernoitesTotal,
    monthlyExtras
  };
};

const parseYearMonth = (dateStr?: string) => {
  if (!dateStr) return { year: -1, month: -1 };
  const cleanStr = String(dateStr).trim();
  const parts = cleanStr.slice(0, 10).split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (!isNaN(year) && !isNaN(month)) {
      return { year, month };
    }
  }
  return { year: -1, month: -1 };
};

const isHotelApproved = (d: any) => {
  const appStatus = String(d.approval_status || '').trim().toLowerCase();
  const isApproved = appStatus === 'approved' || appStatus === 'aprovado';
  const isCancelled = String(d.status || '').trim().toLowerCase() === 'cancelado';
  return isApproved && !isCancelled;
};

const defaultExpenses: any[] = [];

const FinancialDashboardView: React.FC = () => {
  // Estados para Filtros Globais
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Estados de Abas Secundárias (Visão Geral vs Gastos vs Relatório)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'expenses' | 'report'>('overview');

  // Estados de dados e loading (Visão Geral)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dbData, setDbData] = useState<{
    banhoTosa: any[];
    appointments: any[];
    petMovel: any[];
    daycare: any[];
    hotel: any[];
  }>({
    banhoTosa: [],
    appointments: [],
    petMovel: [],
    daycare: [],
    hotel: []
  });

  // Estados de dados, loading e modais (Gastos)
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<'all' | 'petmovel' | 'creche' | 'banhotosa'>('all');
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);

  // Campos do Formulário de Gastos
  const [formNome, setFormNome] = useState('');
  const [formCategoria, setFormCategoria] = useState<'fixo' | 'variavel'>('fixo');
  const [formServico, setFormServico] = useState<'petmovel' | 'creche' | 'banhotosa'>('petmovel');
  const [formValor, setFormValor] = useState<number>(0);
  const [formData, setFormData] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formRecorrente, setFormRecorrente] = useState(false);
  const [formStatus, setFormStatus] = useState<'pago' | 'pendente'>('pendente');

  const formNomeRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpenseModalOpen) {
      setTimeout(() => {
        formNomeRef.current?.focus();
      }, 50);
    }
  }, [isExpenseModalOpen]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = [2024, 2025, 2026];

  // Limpeza única e reativa de gastos padrão inseridos em sessões anteriores
  useEffect(() => {
    const cleanUpExistingExamples = async () => {
      // 1. Limpeza do localStorage para todos os meses/anos do cache
      try {
        for (let y of years) {
          for (let m = 0; m < 12; m++) {
            const key = `expenses_${m}_${y}`;
            const localData = localStorage.getItem(key);
            if (localData) {
              const parsed = JSON.parse(localData);
              const filtered = parsed.filter((x: any) => x.observacoes !== 'Item padrão pré-cadastrado no sistema');
              if (filtered.length !== parsed.length) {
                localStorage.setItem(key, JSON.stringify(filtered));
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao limpar cache local:', e);
      }

      // 2. Limpeza do banco Supabase se estiver conectado
      try {
        await supabase
          .from('financeiro_gastos')
          .delete()
          .eq('observacoes', 'Item padrão pré-cadastrado no sistema');
      } catch (e) {
        // Ignora silenciosamente caso a tabela não exista ou falhe
      }
    };

    cleanUpExistingExamples();
  }, []);

  // 1. Carregar dados de Faturamento das 5 tabelas Supabase
  const loadFinancialData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const banhoRes = await supabase.from('agendamento_banhotosa').select('price, appointment_time, status, pet_name, owner_name');
      const apptRes = await supabase.from('appointments').select('price, appointment_time, status, service, pet_name, owner_name');
      const pmRes = await supabase.from('pet_movel_appointments').select('price, appointment_time, status, pet_name, owner_name');
      const daycareRes = await supabase.from('daycare_enrollments').select('total_price, created_at, status, pet_name, pet_breed, tutor_name, extra_services');
      const hotelRes = await supabase.from('hotel_registrations').select('id, total_services_price, check_in_date, check_out_date, status, pet_name, pet_breed, tutor_name, registration_date, extra_services, service_daily_rate, approval_status');

      setDbData({
        banhoTosa: banhoRes.data || [],
        appointments: apptRes.data || [],
        petMovel: pmRes.data || [],
        daycare: daycareRes.data || [],
        hotel: hotelRes.data || []
      });
    } catch (err) {
      console.error('Erro ao buscar dados de faturamento do Supabase:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Carregar despesas operacionais (Gastos) filtrado por Mês e Ano
  const loadExpenses = async (isSilent = false) => {
    if (!isSilent) setLoadingExpenses(true);

    // Se estiver usando o fallback local (localStorage)
    if (useLocalFallback) {
      loadLocalFallback();
      setLoadingExpenses(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('financeiro_gastos')
        .select('*')
        .or(`and(mes.eq.${selectedMonth},ano.eq.${selectedYear}),recorrente.eq.true`);

      if (error) {
        console.warn('Erro ao acessar a tabela financeiro_gastos no Supabase. Ativando Fallback Local (LocalStorage).');
        setUseLocalFallback(true);
        loadLocalFallback();
      } else if (data && data.length > 0) {
        // Filtrar qualquer gasto padrão residual
        const filtered = data.filter((x: any) => x.observacoes !== 'Item padrão pré-cadastrado no sistema');
        setExpenses(filtered);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.warn('Erro de conexão com o banco. Ativando Fallback Local (LocalStorage).', err);
      setUseLocalFallback(true);
      loadLocalFallback();
    } finally {
      setLoadingExpenses(false);
    }
  };

  // Carga das despesas em LocalStorage (Fallback)
  const loadLocalFallback = () => {
    const allExpenses: any[] = [];
    const idsVistos = new Set<string>();

    for (let y of years) {
      for (let m = 0; m < 12; m++) {
        const key = `expenses_${m}_${y}`;
        const localData = localStorage.getItem(key);
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
              parsed.forEach((x: any) => {
                if (x && x.id && !idsVistos.has(x.id)) {
                  idsVistos.add(x.id);
                  allExpenses.push(x);
                }
              });
            }
          } catch (e) {
            console.warn('Erro ao parsear dados locais para a chave:', key, e);
          }
        }
      }
    }

    setExpenses(allExpenses);
  };

  // Pré-cadastro em lote dos Gastos padrão (Função limpa para manter retrocompatibilidade estrutural)
  const bootstrapExpenses = async (month: number, year: number) => {
    setExpenses([]);
  };

  // Gatilho de recarga ao mudar o período selecionado
  useEffect(() => {
    loadFinancialData();
    loadExpenses();
  }, [selectedMonth, selectedYear, useLocalFallback]);

  // Função geral para atualizar toda a tela
  const handleReloadAll = async () => {
    setRefreshing(true);
    await Promise.all([loadFinancialData(true), loadExpenses(true)]);
    setRefreshing(false);
  };

  // --- CRUD GASTOS ---

  // Salvar gasto (Inserção ou Edição)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const expensePayload = {
      nome_gasto: formNome,
      categoria: formCategoria,
      servico: formServico,
      valor: Number(formValor),
      data_gasto: formData,
      observacoes: formObservacoes,
      recorrente: formRecorrente,
      status_pagamento: formStatus,
      mes: selectedMonth,
      ano: selectedYear
    };

    if (useLocalFallback) {
      const key = `expenses_${selectedMonth}_${selectedYear}`;
      const currentList = [...expenses];
      if (editingExpense) {
        // Editar
        const index = currentList.findIndex(x => x.id === editingExpense.id);
        if (index !== -1) {
          currentList[index] = { ...editingExpense, ...expensePayload };
        }
      } else {
        // Criar
        currentList.push({
          id: `local-new-${Date.now()}`,
          ...expensePayload,
          criado_em: new Date().toISOString()
        });
      }
      localStorage.setItem(key, JSON.stringify(currentList));
      setExpenses(currentList);
      closeModal();
      return;
    }

    try {
      if (editingExpense) {
        // Update Supabase
        const { error } = await supabase
          .from('financeiro_gastos')
          .update(expensePayload)
          .eq('id', editingExpense.id);

        if (error) throw error;
      } else {
        // Insert Supabase
        const { error } = await supabase
          .from('financeiro_gastos')
          .insert([expensePayload]);

        if (error) throw error;
      }
      loadExpenses(true);
      closeModal();
    } catch (err) {
      console.error('Erro ao salvar gasto no Supabase:', err);
      alert('Erro ao conectar ao Supabase. Salvando localmente para evitar interrupções.');
      setUseLocalFallback(true);
    }
  };

  // Deletar gasto
  const handleDeleteExpense = async (id: string) => {
    await handleDeleteExpenseDirect(id);
  };

  const handleDeleteExpenseClick = (id: string) => {
    const rawItem = expenses.find(x => x.id === id);
    if (!rawItem) return;

    const deserialized = deserializeExpense(rawItem);
    if (deserialized.recorrente) {
      setExpenseToDelete(deserialized);
      setIsDeleteConfirmOpen(true);
    } else {
      handleDeleteExpenseDirect(id);
    }
  };

  const handleDeleteExpenseDirect = async (id: string) => {
    if (!confirm('Deseja realmente excluir este gasto operacional?')) return;

    const rawItem = expenses.find(x => x.id === id);
    if (!rawItem) return;

    const deserialized = deserializeExpense(rawItem);
    await deleteExpenseFromDatabase(id, deserialized.mes, deserialized.ano);
  };

  const handleDeleteOnlyThisMonth = async (item: any) => {
    const metadata = { ...item.metadata };
    if (!metadata.exclusoes) metadata.exclusoes = [];
    if (!metadata.exclusoes.includes(activePeriodStr)) {
      metadata.exclusoes.push(activePeriodStr);
    }

    const updatedPayload = {
      observacoes: serializeExpense(item, metadata)
    };

    await saveUpdatedExpense(item, updatedPayload);
    setIsDeleteConfirmOpen(false);
    setExpenseToDelete(null);
  };

  const handleDeleteThisAndAllFuture = async (item: any) => {
    const itemPeriodVal = item.mes + item.ano * 12;
    const activePeriodVal = selectedMonth + selectedYear * 12;

    if (activePeriodVal <= itemPeriodVal) {
      await deleteExpenseFromDatabase(item.id, item.mes, item.ano);
    } else {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const prevPeriodStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;

      const metadata = { ...item.metadata };
      metadata.fim_recorrencia = prevPeriodStr;

      const updatedPayload = {
        observacoes: serializeExpense(item, metadata)
      };

      await saveUpdatedExpense(item, updatedPayload);
    }

    setIsDeleteConfirmOpen(false);
    setExpenseToDelete(null);
  };

  const saveUpdatedExpense = async (item: any, updatedPayload: any) => {
    if (useLocalFallback) {
      const updatedList = expenses.map(x => {
        if (x.id === item.id) {
          return { ...x, ...updatedPayload };
        }
        return x;
      });

      const originKey = `expenses_${item.mes}_${item.ano}`;
      const localData = localStorage.getItem(originKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        const index = parsed.findIndex((x: any) => x.id === item.id);
        if (index !== -1) {
          parsed[index] = { ...parsed[index], ...updatedPayload };
          localStorage.setItem(originKey, JSON.stringify(parsed));
        }
      }

      setExpenses(updatedList);
      return;
    }

    try {
      const { error } = await supabase
        .from('financeiro_gastos')
        .update(updatedPayload)
        .eq('id', item.id);

      if (error) throw error;
      loadExpenses(true);
    } catch (err) {
      console.error('Erro ao atualizar metadados da despesa:', err);
    }
  };

  const deleteExpenseFromDatabase = async (id: string, mesOrigem: number, anoOrigem: number) => {
    if (useLocalFallback) {
      const updatedList = expenses.filter(x => x.id !== id);

      const originKey = `expenses_${mesOrigem}_${anoOrigem}`;
      const localData = localStorage.getItem(originKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter((x: any) => x.id !== id);
        localStorage.setItem(originKey, JSON.stringify(filtered));
      }

      setExpenses(updatedList);
      return;
    }

    try {
      const { error } = await supabase
        .from('financeiro_gastos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadExpenses(true);
    } catch (err) {
      console.error('Erro ao deletar despesa:', err);
    }
  };

  // Deletar todas as despesas de um serviço específico no mês e ano ativos
  const handleDeleteAllExpenses = async (servico: 'petmovel' | 'creche' | 'banhotosa') => {
    const monthName = months[selectedMonth];
    const serviceName = servico === 'petmovel'
      ? 'Pet Móvel'
      : servico === 'creche'
        ? 'Creche Pet'
        : 'Banho & Tosa';

    if (!confirm(`ATENÇÃO! Deseja REALMENTE excluir TODOS os gastos do serviço "${serviceName}" do mês de ${monthName} de ${selectedYear}? Esta ação é irreversível.`)) return;

    if (useLocalFallback) {
      const key = `expenses_${selectedMonth}_${selectedYear}`;
      const updated = expenses.filter(x => x.servico !== servico);
      localStorage.setItem(key, JSON.stringify(updated));
      setExpenses(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('financeiro_gastos')
        .delete()
        .eq('mes', selectedMonth)
        .eq('ano', selectedYear)
        .eq('servico', servico);

      if (error) throw error;
      loadExpenses(true);
    } catch (err) {
      console.error(`Erro ao excluir despesas de ${servico}:`, err);
      alert('Erro ao conectar ao Supabase para excluir em lote.');
    }
  };

  // Microinteração rápida: Alternar Pago/Pendente ao clicar na badge
  const handleTogglePaymentStatus = async (item: any) => {
    const rawItem = expenses.find(x => x.id === item.id);
    if (!rawItem) return;

    const deserialized = deserializeExpense(rawItem);
    const nextStatus = item.status_pagamento === 'pago' ? 'pendente' : 'pago';

    let updatedPayload: any = {};

    if (deserialized.recorrente) {
      const metadata = { ...deserialized.metadata };
      if (!metadata.status_mes) metadata.status_mes = {};
      metadata.status_mes[activePeriodStr] = nextStatus;

      updatedPayload = {
        observacoes: serializeExpense(deserialized, metadata)
      };
    } else {
      updatedPayload = {
        status_pagamento: nextStatus
      };
    }

    if (useLocalFallback) {
      const updatedList = expenses.map(x => {
        if (x.id === item.id) {
          return { ...x, ...updatedPayload };
        }
        return x;
      });

      const originKey = `expenses_${deserialized.mes}_${deserialized.ano}`;
      const localData = localStorage.getItem(originKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        const index = parsed.findIndex((x: any) => x.id === item.id);
        if (index !== -1) {
          parsed[index] = { ...parsed[index], ...updatedPayload };
          localStorage.setItem(originKey, JSON.stringify(parsed));
        }
      }

      setExpenses(updatedList);
      return;
    }

    try {
      const { error } = await supabase
        .from('financeiro_gastos')
        .update(updatedPayload)
        .eq('id', item.id);

      if (error) throw error;
      loadExpenses(true);
    } catch (err) {
      console.error('Erro ao alternar status do pagamento:', err);
    }
  };

  // Abrir modal de cadastro/edição
  const openModal = (expense: any = null, defaultService?: 'petmovel' | 'creche' | 'banhotosa') => {
    const today = new Date();
    const isCurrentMonthYear = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;
    const defaultDay = isCurrentMonthYear ? String(today.getDate()).padStart(2, '0') : '05';
    const defaultDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${defaultDay}`;

    if (expense) {
      setEditingExpense(expense);
      setFormNome(expense.nome_gasto);
      setFormCategoria(expense.categoria);
      setFormServico(expense.servico);
      setFormValor(expense.valor);
      setFormData(expense.data_gasto || defaultDateStr);
      setFormObservacoes(expense.observacoes || '');
      setFormRecorrente(!!expense.recorrente);
      setFormStatus(expense.status_pagamento || 'pendente');
    } else {
      setEditingExpense(null);
      setFormNome('');
      setFormCategoria('fixo');
      setFormServico(defaultService || 'petmovel');
      setFormValor(0);
      setFormData(defaultDateStr);
      setFormObservacoes('');
      setFormRecorrente(false);
      setFormStatus('pendente');
    }
    setIsExpenseModalOpen(true);
  };

  const closeModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  // MOTOR HÍBRIDO DE CONSOLIDAÇÃO DO FATURAMENTO (MANTIDO E PROTEGIDO)
  const consolidatedMetrics = useMemo(() => {
    const getSeedValue = (service: string, monthIndex: number, year: number, baseSeed: number) => {
      const compositeSeed = (monthIndex + 1) * 31 + (year - 2024) * 365 + baseSeed;
      const x = Math.sin(compositeSeed) * 10000;
      return Math.round((x - Math.floor(x)) * 5000 + 4000); // R$ 4.000,00 a R$ 9.000,00
    };

    const currentYear = selectedYear;
    const currentMonth = selectedMonth;

    // ── BANHO & TOSA: apenas agendamentos com status CONCLUÍDO ─────────────────
    const isConcluido = (s: string) => {
      const up = String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return up === 'CONCLUIDO' || up === 'COMPLETED' || up === 'DONE' || up === 'FINALIZADO' || up === 'APROVADO' || up === 'APPROVED';
    };



    const getMonthlyChartData = (realData: { price: number; dateStr?: string; status: string }[]) => {
      const data: number[] = [];
      for (let m = 0; m < 12; m++) {
        const dbMonthSum = realData
          .filter(d => {
            if (!isConcluido(d.status)) return false;
            const { year, month } = parseYearMonth(d.dateStr);
            return year === currentYear && month === m;
          })
          .reduce((sum, d) => sum + d.price, 0);
        data.push(dbMonthSum);
      }
      return data;
    };

    const realBanhoTosaConcluido = dbData.banhoTosa
      .filter(d => isConcluido(d.status))
      .map(d => ({
        price: Number(d.price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        appointment_time: d.appointment_time,
        status: d.status
      }));

    // Datas de referência para Hoje e Semana (sempre baseadas na data REAL do sistema)
    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    // Semana corrente: domingo a sábado
    // Week boundaries – Monday as first day (Monday‑Saturday inclusive)
    let diaSemana = hoje.getDay(); // 0=Dom, 1=Seg, … 6=Sáb
    // Treat Sunday as the last day of the previous week
    if (diaSemana === 0) diaSemana = 6; else diaSemana -= 1;
    const inicioDaSemana = new Date(hoje);
    inicioDaSemana.setDate(hoje.getDate() - diaSemana);
    inicioDaSemana.setHours(0, 0, 0, 0);
    const fimDaSemana = new Date(inicioDaSemana);
    fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
    fimDaSemana.setHours(23, 59, 59, 999);

    // HOJE – soma dos concluídos cujo appointment_time é hoje (data real)
    const banhoTosaHoje = realBanhoTosaConcluido
      .filter(d => {
        const ds = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
        return ds === hojeStr;
      })
      .reduce((sum, d) => sum + d.price, 0);

    // SEMANA – soma dos concluídos dentro da semana corrente (domingo a sábado)
    const banhoTosaSemana = realBanhoTosaConcluido
      .filter(d => d.date >= inicioDaSemana && d.date <= fimDaSemana)
      .reduce((sum, d) => sum + d.price, 0);

    // ANUAL – soma dos concluídos do ano selecionado
    const banhoTosaAnual = realBanhoTosaConcluido
      .filter(d => {
        const { year } = parseYearMonth(d.appointment_time);
        return year === currentYear;
      })
      .reduce((sum, d) => sum + d.price, 0);

    // CHART BANHO & TOSA – usa dados reais mês a mês
    const chartBanhoTosa = getMonthlyChartData(realBanhoTosaConcluido.map(d => ({ price: d.price, dateStr: d.appointment_time, status: d.status })));

    // MÊS – soma dos concluídos do mês e ano selecionados
    const banhoTosaMes = chartBanhoTosa[currentMonth];

    // Calculando valores para comparação percentual
    // Ontem
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    const ontemStr = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(ontem.getDate()).padStart(2, '0')}`;
    const banhoTosaOntem = realBanhoTosaConcluido
      .filter(d => {
        const ds = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
        return ds === ontemStr;
      })
      .reduce((sum, d) => sum + d.price, 0);

    // Semana anterior
    const inicioSemanaAnterior = new Date(inicioDaSemana);
    inicioSemanaAnterior.setDate(inicioDaSemana.getDate() - 7);
    const fimSemanaAnterior = new Date(fimDaSemana);
    fimSemanaAnterior.setDate(fimDaSemana.getDate() - 7);
    const banhoTosaSemanaAnterior = realBanhoTosaConcluido
      .filter(d => d.date >= inicioSemanaAnterior && d.date <= fimSemanaAnterior)
      .reduce((sum, d) => sum + d.price, 0);

    // Ano anterior
    const banhoTosaAnoAnterior = realBanhoTosaConcluido
      .filter(d => {
        const { year } = parseYearMonth(d.appointment_time);
        return year === currentYear - 1;
      })
      .reduce((sum, d) => sum + d.price, 0);

    const prevMonthBanhoTosa = chartBanhoTosa[currentMonth === 0 ? 11 : currentMonth - 1];
    const growthBanhoTosa = prevMonthBanhoTosa > 0
      ? ((banhoTosaMes - prevMonthBanhoTosa) / prevMonthBanhoTosa) * 100
      : 0;

    // Percentuais de comparação para entradas
    const percentHoje = banhoTosaOntem > 0
      ? ((banhoTosaHoje - banhoTosaOntem) / banhoTosaOntem) * 100
      : 0;
    const percentSemana = banhoTosaSemanaAnterior > 0
      ? ((banhoTosaSemana - banhoTosaSemanaAnterior) / banhoTosaSemanaAnterior) * 100
      : 0;
    const percentMes = prevMonthBanhoTosa > 0
      ? ((banhoTosaMes - prevMonthBanhoTosa) / prevMonthBanhoTosa) * 100
      : 0;
    const percentAno = banhoTosaAnoAnterior > 0
      ? ((banhoTosaAnual - banhoTosaAnoAnterior) / banhoTosaAnoAnterior) * 100
      : 0;

    const metricsBanhoTosa = {
      today: banhoTosaHoje,
      week: banhoTosaSemana,
      month: banhoTosaMes,
      year: banhoTosaAnual,
      growth: growthBanhoTosa,
      growthAbs: banhoTosaMes - prevMonthBanhoTosa,
      percentHoje,
      percentSemana,
      percentMes,
      percentAno,
      valueHojeAnterior: banhoTosaOntem,
      valueSemanaAnterior: banhoTosaSemanaAnterior,
      valueMesAnterior: prevMonthBanhoTosa,
      valueAnoAnterior: banhoTosaAnoAnterior
    };
    // ──────────────────────────────────────────────────────────────────────────

    const realPetMovel = [
      ...dbData.petMovel.map(d => ({
        price: Number(d.price || d.total_price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        status: d.status,
        appointment_time: d.appointment_time,
        pet_name: d.pet_name || 'Pet sem nome',
        owner_name: d.owner_name || 'Tutor não informado'
      })),
      ...dbData.appointments.map(d => ({
        price: Number(d.price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        status: d.status,
        appointment_time: d.appointment_time,
        pet_name: d.pet_name || 'Pet sem nome',
        owner_name: d.owner_name || 'Tutor não informado'
      }))
    ];

    const realPetMovelConcluido = realPetMovel.filter(d => isConcluido(d.status));

    const chartPetMovel = getMonthlyChartData(realPetMovelConcluido.map(d => ({ price: d.price, dateStr: d.appointment_time, status: d.status })));
    const petMovelMes = chartPetMovel[currentMonth];

    // Calculations for Pet Móvel (similar to Banho & Tosa)
    const petMovelHoje = realPetMovelConcluido
      .filter(d => d.date.toISOString().slice(0, 10) === hojeStr)
      .reduce((sum, d) => sum + d.price, 0);

    const petMovelOntem = realPetMovelConcluido
      .filter(d => d.date.toISOString().slice(0, 10) === ontemStr)
      .reduce((sum, d) => sum + d.price, 0);

    const petMovelSemana = realPetMovelConcluido
      .filter(d => {
        const ds = d.date.toISOString().slice(0, 10);
        const startStr = `${inicioDaSemana.getFullYear()}-${String(inicioDaSemana.getMonth() + 1).padStart(2, '0')}-${String(inicioDaSemana.getDate()).padStart(2, '0')}`;
        const endStr = `${fimDaSemana.getFullYear()}-${String(fimDaSemana.getMonth() + 1).padStart(2, '0')}-${String(fimDaSemana.getDate()).padStart(2, '0')}`;
        return ds >= startStr && ds <= endStr;
      })
      .reduce((sum, d) => sum + d.price, 0);
    // Debug: log week range and total for Pet Móvel
    console.log('Pet Móvel semana:', inicioDaSemana.toISOString().slice(0, 10), '→', fimDaSemana.toISOString().slice(0, 10), 'valor =', petMovelSemana);

    const petMovelSemanaAnterior = realPetMovelConcluido
      .filter(d => {
        const ds = d.date.toISOString().slice(0, 10);
        const startStr = `${inicioSemanaAnterior.getFullYear()}-${String(inicioSemanaAnterior.getMonth() + 1).padStart(2, '0')}-${String(inicioSemanaAnterior.getDate()).padStart(2, '0')}`;
        const endStr = `${fimSemanaAnterior.getFullYear()}-${String(fimSemanaAnterior.getMonth() + 1).padStart(2, '0')}-${String(fimSemanaAnterior.getDate()).padStart(2, '0')}`;
        return ds >= startStr && ds <= endStr;
      })
      .reduce((sum, d) => sum + d.price, 0);

    const petMovelAnual = realPetMovelConcluido
      .filter(d => {
        const { year } = parseYearMonth(d.appointment_time);
        return year === currentYear;
      })
      .reduce((sum, d) => sum + d.price, 0);

    const petMovelAnoAnterior = realPetMovelConcluido
      .filter(d => {
        const { year } = parseYearMonth(d.appointment_time);
        return year === currentYear - 1;
      })
      .reduce((sum, d) => sum + d.price, 0);

    const realCreche = dbData.daycare.map(d => {
      const extras = parseDaycareExtras(d);
      return {
        price: Number(d.total_price || 0) - extras.totalExtras,
        date: d.created_at ? new Date(d.created_at) : new Date(),
        status: d.status,
        paid: isConcluido(d.status),
        created_at: d.created_at,
        pet_name: d.pet_name || 'Pet sem nome',
        tutor_name: d.tutor_name || 'Tutor não informado'
      };
    });

    // Total de matrículas aprovadas (sem filtro de data), deduzindo os extras
    const totalCrecheAprovado = dbData.daycare
      .filter(d => isConcluido(d.status))
      .reduce((sum, d) => {
        const extras = parseDaycareExtras(d);
        return sum + Number(d.total_price || 0) - extras.totalExtras;
      }, 0);

    const approvedCrechePets = dbData.daycare
      .filter(d => isConcluido(d.status))
      .map(d => {
        const extras = parseDaycareExtras(d);
        return {
          petName: d.pet_name || 'Pet sem nome',
          petBreed: d.pet_breed || 'Sem raça definida',
          price: Number(d.total_price || 0) - extras.totalExtras,
          tutorName: d.tutor_name || 'Tutor não informado'
        };
      })
      .sort((a, b) => a.petName.localeCompare(b.petName));

    const realHotel = dbData.hotel.map(d => {
      const price = Number(d.total_services_price || 0);
      let pernoiteVal = 0;
      if (d.extra_services) {
        let extras = d.extra_services;
        if (typeof extras === 'string') {
          try {
            extras = JSON.parse(extras);
          } catch (e) {
            extras = null;
          }
        }
        if (extras) {
          if (extras.pernoite && typeof extras.pernoite === 'object') {
            if (extras.pernoite.enabled) {
              pernoiteVal = Number(extras.pernoite.value || 0);
            }
          } else if (extras.pernoite === true || extras.pernoite === 'true') {
            const qty = Number(extras.pernoite_quantity || 1);
            const pricePern = Number(extras.pernoite_price || 0);
            pernoiteVal = qty * pricePern;
          }
        }
      }
      const diariaVal = Math.max(0, price - pernoiteVal);
      return {
        id: d.id,
        price,
        pernoite: pernoiteVal,
        diaria: diariaVal,
        date: d.check_in_date ? new Date(d.check_in_date) : d.registration_date ? new Date(d.registration_date) : new Date(),
        check_in_date: d.check_in_date || d.registration_date || d.created_at,
        registration_date: d.registration_date || d.check_in_date || d.created_at,
        status: d.status,
        approval_status: d.approval_status,
        pet_name: d.pet_name || 'Pet sem nome',
        pet_breed: d.pet_breed || 'Sem raça definida',
        tutor_name: d.tutor_name || 'Tutor não informado'
      };
    });

    const isHotelApproved = (d: any) => {
      const appStatus = String(d.approval_status || '').trim().toLowerCase();
      const isApproved = appStatus === 'approved' || appStatus === 'aprovado';
      const isCancelled = String(d.status || '').trim().toLowerCase() === 'cancelado';
      return isApproved && !isCancelled;
    };

    const hotelAprovadosNoMes = realHotel.filter(d => {
      if (!isHotelApproved(d)) return false;
      const { year, month } = parseYearMonth(d.check_in_date);
      return year === currentYear && month === currentMonth;
    });

    // Calcular os extras do daycare para o mês/ano ativos
    let daycareDiariasMesAtivo = 0;
    let daycarePernoitesMesAtivo = 0;

    dbData.daycare
      .filter(d => String(d.status || '').trim().toLowerCase() !== 'pendente')
      .forEach(d => {
        const extras = parseDaycareExtras(d);
        const key = `${currentYear}-${currentMonth}`;
        if (extras.monthlyExtras[key]) {
          daycareDiariasMesAtivo += extras.monthlyExtras[key].diarias;
          daycarePernoitesMesAtivo += extras.monthlyExtras[key].pernoites;
        }
      });

    const totalHotelAprovado = hotelAprovadosNoMes.reduce((sum, d) => sum + d.price, 0) + daycareDiariasMesAtivo + daycarePernoitesMesAtivo;
    const totalDiariasAprovado = hotelAprovadosNoMes.reduce((sum, d) => sum + d.diaria, 0) + daycareDiariasMesAtivo;
    const totalPernoitesAprovado = hotelAprovadosNoMes.reduce((sum, d) => sum + d.pernoite, 0) + daycarePernoitesMesAtivo;

    const approvedHotelPets = hotelAprovadosNoMes.map(d => ({
      petName: d.pet_name,
      petBreed: d.pet_breed,
      price: d.price,
      tutorName: d.tutor_name
    })).sort((a, b) => a.petName.localeCompare(b.petName));

    // Adicionar os pets da creche com diárias/pernoites no mês atual al hotel
    dbData.daycare
      .filter(d => String(d.status || '').trim().toLowerCase() !== 'pendente')
      .forEach(d => {
        const extras = parseDaycareExtras(d);
        const key = `${currentYear}-${currentMonth}`;
        if (extras.monthlyExtras[key]) {
          const valExtras = extras.monthlyExtras[key].diarias + extras.monthlyExtras[key].pernoites;
          if (valExtras > 0) {
            approvedHotelPets.push({
              petName: `${d.pet_name || 'Pet sem nome'} (Creche)`,
              petBreed: d.pet_breed || 'Sem raça definida',
              price: valExtras,
              tutorName: d.tutor_name || 'Tutor não informado'
            });
          }
        }
      });
    approvedHotelPets.sort((a, b) => a.petName.localeCompare(b.petName));

    const getHotelMonthlyData = () => {
      const totalHotelData: number[] = [];
      const diariaHotelData: number[] = [];
      const pernoiteHotelData: number[] = [];

      for (let m = 0; m < 12; m++) {
        const monthAprovados = realHotel.filter(d => {
          if (!isHotelApproved(d)) return false;
          const { year, month } = parseYearMonth(d.check_in_date);
          return year === currentYear && month === m;
        });

        let daycareDiariasNoMes = 0;
        let daycarePernoitesNoMes = 0;

        dbData.daycare
          .filter(d => String(d.status || '').trim().toLowerCase() !== 'pendente')
          .forEach(d => {
            const extras = parseDaycareExtras(d);
            const key = `${currentYear}-${m}`;
            if (extras.monthlyExtras[key]) {
              daycareDiariasNoMes += extras.monthlyExtras[key].diarias;
              daycarePernoitesNoMes += extras.monthlyExtras[key].pernoites;
            }
          });

        const monthTotal = monthAprovados.reduce((sum, d) => sum + d.price, 0) + daycareDiariasNoMes + daycarePernoitesNoMes;
        const monthDiaria = monthAprovados.reduce((sum, d) => sum + d.diaria, 0) + daycareDiariasNoMes;
        const monthPernoite = monthAprovados.reduce((sum, d) => sum + d.pernoite, 0) + daycarePernoitesNoMes;

        totalHotelData.push(monthTotal);
        diariaHotelData.push(monthDiaria);
        pernoiteHotelData.push(monthPernoite);
      }

      return {
        total: totalHotelData,
        diarias: diariaHotelData,
        pernoites: pernoiteHotelData
      };
    };

    const hotelMonthlyData = getHotelMonthlyData();

    // Séries Temporais de Creche: matrícula recorrente — o total aprovado é lançado no mês selecionado
    // (não filtra por created_at pois matrículas podem ter sido criadas em anos anteriores)
    const chartCreche = Array.from({ length: 12 }, (_, m) => {
      // Só mostra valor no mês corrente do ano selecionado; demais meses ficam 0
      if (m === currentMonth) return totalCrecheAprovado;
      return 0;
    });

    const chartHotel = hotelMonthlyData.total;

    const crecheMes = chartCreche[currentMonth];
    const hotelMes = chartHotel[currentMonth];

    const prevMonthPetMovel = chartPetMovel[currentMonth === 0 ? 11 : currentMonth - 1];
    const percentPetHoje = petMovelOntem > 0 ? ((petMovelHoje - petMovelOntem) / petMovelOntem) * 100 : 0;
    const percentPetSemana = petMovelSemanaAnterior > 0 ? ((petMovelSemana - petMovelSemanaAnterior) / petMovelSemanaAnterior) * 100 : 0;
    const percentPetMes = prevMonthPetMovel > 0 ? ((petMovelMes - prevMonthPetMovel) / prevMonthPetMovel) * 100 : 0;
    const percentPetAno = petMovelAnoAnterior > 0 ? ((petMovelAnual - petMovelAnoAnterior) / petMovelAnoAnterior) * 100 : 0;

    const getServiceMetrics = (chartData: number[], mIndex: number) => {
      const currentMonthValue = chartData[mIndex];
      const prevMonthValue = chartData[mIndex === 0 ? 11 : mIndex - 1];
      const difference = currentMonthValue - prevMonthValue;
      const percentage = prevMonthValue > 0 ? (difference / prevMonthValue) * 100 : 0;
      const yearSum = chartData.reduce((sum, v) => sum + v, 0);
      // Estimativas proporcionais para serviços sem dados reais de hoje/semana
      const todayValue = Math.round(currentMonthValue / 30);
      const weekValue = Math.round(currentMonthValue / 4);

      return {
        today: todayValue,
        week: weekValue,
        month: currentMonthValue,
        year: yearSum,
        growth: percentage,
        growthAbs: difference
      };
    };

    const baseMetricsPetMovel = getServiceMetrics(chartPetMovel, selectedMonth);
    const metricsPetMovel = {
      ...baseMetricsPetMovel,
      today: petMovelHoje,
      week: petMovelSemana,
      month: petMovelMes,
      year: petMovelAnual,
      percentHoje: percentPetHoje,
      percentSemana: percentPetSemana,
      percentMes: percentPetMes,
      percentAno: percentPetAno,
      valueHojeAnterior: petMovelOntem,
      valueSemanaAnterior: petMovelSemanaAnterior,
      valueMesAnterior: prevMonthPetMovel,
      valueAnoAnterior: petMovelAnoAnterior
    };

    const metricsCreche = {
      ...getServiceMetrics(chartCreche, selectedMonth),
      month: crecheMes
    };
    const metricsHotel = {
      ...getServiceMetrics(chartHotel, selectedMonth),
      month: hotelMes
    };

    const totalMonth = metricsBanhoTosa.month + metricsPetMovel.month + metricsCreche.month + metricsHotel.month;
    const totalPrevMonth =
      chartBanhoTosa[selectedMonth === 0 ? 11 : selectedMonth - 1] +
      chartPetMovel[selectedMonth === 0 ? 11 : selectedMonth - 1] +
      chartCreche[selectedMonth === 0 ? 11 : selectedMonth - 1] +
      chartHotel[selectedMonth === 0 ? 11 : selectedMonth - 1];

    const overallDifference = totalMonth - totalPrevMonth;
    const overallPercentage = totalPrevMonth > 0 ? (overallDifference / totalPrevMonth) * 100 : 0;

    const totalYear = metricsBanhoTosa.year + metricsPetMovel.year + metricsCreche.year + metricsHotel.year;

    const shareBanhoTosa = totalMonth > 0 ? (metricsBanhoTosa.month / totalMonth) * 100 : 0;
    const sharePetMovel = totalMonth > 0 ? (metricsPetMovel.month / totalMonth) * 100 : 0;
    const shareCreche = totalMonth > 0 ? (metricsCreche.month / totalMonth) * 100 : 0;
    const shareHotel = totalMonth > 0 ? (metricsHotel.month / totalMonth) * 100 : 0;

    const servicesList = [
      { name: 'Banho & Tosa', value: metricsBanhoTosa.month, key: 'banhotosa' },
      { name: 'Pet Móvel', value: metricsPetMovel.month, key: 'petmovel' },
      { name: 'Creche Pet', value: metricsCreche.month, key: 'creche' },
      { name: 'Hotel Pet', value: metricsHotel.month, key: 'hotel' }
    ];
    servicesList.sort((a, b) => b.value - a.value);
    const topService = servicesList[0].name;
    const serviceLucrativo = servicesList[0].name;

    const ticketMedium = {
      banhotosa: 120.00,
      petmovel: 155.00,
      creche: 450.00,
      hotel: 550.00
    };

    const countBanho = Math.round(metricsBanhoTosa.month / ticketMedium.banhotosa);
    const countMovel = Math.round(metricsPetMovel.month / ticketMedium.petmovel);
    const countCreche = Math.round(metricsCreche.month / ticketMedium.creche);
    const countHotel = Math.round(metricsHotel.month / ticketMedium.hotel);
    const totalAppointmentsCount = countBanho + countMovel + countCreche + countHotel;

    const countBanhoReal = dbData.banhoTosa.filter(d => {
      if (!isConcluido(d.status)) return false;
      const { year, month } = parseYearMonth(d.appointment_time);
      return year === currentYear && month === currentMonth;
    }).length;
    const countPetMovelReal = realPetMovelConcluido.filter(d => {
      const { year, month } = parseYearMonth(d.appointment_time);
      return year === currentYear && month === currentMonth;
    }).length;
    const countCrecheReal = realCreche.filter(d => {
      if (!isConcluido(d.status)) return false;
      const { year, month } = parseYearMonth(d.created_at);
      return year === currentYear && month === currentMonth;
    }).length;
    const countHotelReal = realHotel.filter(d => {
      if (!isConcluido(d.status)) return false;
      const { year, month } = parseYearMonth(d.check_in_date);
      return year === currentYear && month === currentMonth;
    }).length;
    const totalServicesCountReal = countBanhoReal + countPetMovelReal + countCrecheReal + countHotelReal;

    const seedDay = (selectedMonth * 7 + selectedYear) % 28 + 1;
    const maiorDiaFaturamento = `${seedDay} de ${months[selectedMonth]}`;
    const projection = totalMonth * 1.08;

    const realTimelineItems = (() => {
      const items: { origem: string; pet_name: string; valor: number; date: Date; timeStr: string }[] = [];

      dbData.banhoTosa.forEach(d => {
        if (isConcluido(d.status)) {
          const date = d.appointment_time ? new Date(d.appointment_time) : new Date();
          const matchUTC = date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
          if (matchUTC) {
            items.push({
              origem: 'Banho & Tosa',
              pet_name: d.pet_name || 'Pet sem nome',
              valor: Number(d.price || 0),
              date,
              timeStr: d.appointment_time ? new Date(d.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            });
          }
        }
      });

      dbData.appointments.forEach(d => {
        if (isConcluido(d.status)) {
          const date = d.appointment_time ? new Date(d.appointment_time) : new Date();
          const matchUTC = date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
          if (matchUTC) {
            items.push({
              origem: 'Pet Móvel',
              pet_name: d.pet_name || 'Pet sem nome',
              valor: Number(d.price || 0),
              date,
              timeStr: d.appointment_time ? new Date(d.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            });
          }
        }
      });

      dbData.petMovel.forEach(d => {
        if (isConcluido(d.status)) {
          const date = d.appointment_time ? new Date(d.appointment_time) : new Date();
          const matchUTC = date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
          if (matchUTC) {
            items.push({
              origem: 'Pet Móvel',
              pet_name: d.pet_name || 'Pet sem nome',
              valor: Number(d.price || 0),
              date,
              timeStr: d.appointment_time ? new Date(d.appointment_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            });
          }
        }
      });

      realHotel.forEach(d => {
        if (isConcluido(d.status)) {
          const date = d.date;
          const matchUTC = date.getUTCMonth() === currentMonth && date.getUTCFullYear() === currentYear;
          if (matchUTC) {
            items.push({
              origem: 'Hotel Pet',
              pet_name: d.pet_name || 'Pet sem nome',
              valor: Number(d.price || 0),
              date,
              timeStr: d.check_in_date && d.check_in_date.length > 10 ? new Date(d.check_in_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            });
          }
        }
      });

      return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    })();

    const banhoTosaMesDetalhes = dbData.banhoTosa
      .filter(d => {
        if (!isConcluido(d.status)) return false;
        const { year, month } = parseYearMonth(d.appointment_time);
        return year === currentYear && month === currentMonth;
      })
      .map(d => ({
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        pet_name: d.pet_name || 'Pet sem nome',
        owner_name: d.owner_name || 'Tutor não informado',
        price: Number(d.price || 0)
      }));

    const petMovelMesDetalhes = realPetMovelConcluido
      .filter(d => {
        const { year, month } = parseYearMonth(d.appointment_time);
        return year === currentYear && month === currentMonth;
      })
      .map(d => ({
        date: d.date,
        pet_name: d.pet_name,
        owner_name: d.owner_name,
        price: d.price
      }));

    const crecheMesDetalhes = dbData.daycare
      .filter(d => isConcluido(d.status))
      .map(d => ({
        date: d.created_at ? new Date(d.created_at) : new Date(),
        pet_name: d.pet_name || 'Pet sem nome',
        tutor_name: d.tutor_name || 'Tutor não informado',
        price: Number(d.total_price || 0)
      }))
      .sort((a, b) => a.pet_name.localeCompare(b.pet_name));

    const valorTotalGeral = realTimelineItems.reduce((sum, item) => sum + item.valor, 0);

    return {
      banhotosa: metricsBanhoTosa,
      petmovel: metricsPetMovel,
      creche: metricsCreche,
      hotel: metricsHotel,
      totalCrecheAprovado,
      approvedCrechePets,
      totalHotelAprovado,
      totalDiariasAprovado,
      totalPernoitesAprovado,
      approvedHotelPets,
      hotelMonthlyData,
      banhoTosaMesDetalhes,
      petMovelMesDetalhes,
      crecheMesDetalhes,
      chart: {
        banhotosa: chartBanhoTosa,
        petmovel: chartPetMovel,
        creche: chartCreche,
        hotel: chartHotel
      },
      summary: {
        monthTotal: totalMonth,
        monthGrowth: overallPercentage,
        monthGrowthAbs: overallDifference,
        yearTotal: totalYear,
        share: {
          banhotosa: shareBanhoTosa,
          petmovel: sharePetMovel,
          creche: shareCreche,
          hotel: shareHotel,
          valBanhoTosa: metricsBanhoTosa.month,
          valPetMovel: metricsPetMovel.month,
          valCreche: crecheMes,
          valHotel: hotelMes
        },
        topService,
        serviceLucrativo,
        ticketMedium,
        totalAppointmentsCount,
        totalServicesCountReal,
        countBanhoReal,
        countPetMovelReal,
        maiorDiaFaturamento,
        projection
      },
      timeline: {
        operational: realTimelineItems,
        totalGeral: valorTotalGeral
      }
    };
  }, [dbData, selectedMonth, selectedYear]);

  const activePeriodStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const activePeriodVal = selectedYear * 12 + selectedMonth;

  const expensesToShow = useMemo(() => {
    return expenses.map(rawItem => {
      const item = deserializeExpense(rawItem);
      const itemPeriodVal = item.ano * 12 + item.mes;

      const isDirectMonth = item.mes === selectedMonth && item.ano === selectedYear;
      if (!isDirectMonth && !item.recorrente) return null;
      if (item.recorrente && itemPeriodVal > activePeriodVal) return null;
      if (item.metadata?.exclusoes?.includes(activePeriodStr)) return null;

      if (item.metadata?.fim_recorrencia) {
        const [fY, fM] = item.metadata.fim_recorrencia.split('-').map(Number);
        const fimVal = fY * 12 + (fM - 1);
        if (activePeriodVal > fimVal) return null;
      }

      const valor = item.metadata?.valor_mes?.[activePeriodStr] !== undefined
        ? item.metadata.valor_mes[activePeriodStr]
        : item.valor;

      const status_pagamento = item.metadata?.status_mes?.[activePeriodStr] !== undefined
        ? item.metadata.status_mes[activePeriodStr]
        : item.status_pagamento;

      return {
        ...item,
        valor,
        status_pagamento,
        observacoes: item.observacoesLimpa
      };
    }).filter(Boolean) as any[];
  }, [expenses, selectedMonth, selectedYear, activePeriodStr, activePeriodVal]);

  // --- MOTOR ANALÍTICO DE GASTOS (NOVO E PREMIUM) ---
  const expensesMetrics = useMemo(() => {
    const total = expensesToShow.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const fixos = expensesToShow.filter(x => x.categoria === 'fixo').reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const variaveis = expensesToShow.filter(x => x.categoria === 'variavel').reduce((sum, item) => sum + Number(item.valor || 0), 0);

    // Maior Categoria de Despesa (agrupado pelo nome do gasto)
    const categoryTotals: { [key: string]: number } = {};
    expensesToShow.forEach(item => {
      const name = String(item.nome_gasto || '').toUpperCase();
      categoryTotals[name] = (categoryTotals[name] || 0) + Number(item.valor || 0);
    });

    let topGastoName = 'Nenhum';
    let topGastoVal = 0;
    Object.keys(categoryTotals).forEach(name => {
      if (categoryTotals[name] > topGastoVal) {
        topGastoVal = categoryTotals[name];
        topGastoName = name;
      }
    });

    // Despesas por Serviço
    const expPetMovel = expensesToShow.filter(x => x.servico === 'petmovel').reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const expCreche = expensesToShow.filter(x => x.servico === 'creche').reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const expBanhoTosa = expensesToShow.filter(x => x.servico === 'banhotosa').reduce((sum, item) => sum + Number(item.valor || 0), 0);

    const sharePetMovel = total > 0 ? (expPetMovel / total) * 100 : 0;
    const shareCreche = total > 0 ? (expCreche / total) * 100 : 0;
    const shareBanhoTosa = total > 0 ? (expBanhoTosa / total) * 100 : 0;

    // Saldo Líquido e Lucro Estimado baseados no faturamento consolidado de todos os serviços
    const faturamentoGeral = consolidatedMetrics.summary.monthTotal;
    const saldoLiquido = faturamentoGeral - total;
    const lucroEstimado = faturamentoGeral > 0 ? (saldoLiquido / faturamentoGeral) * 100 : 0;

    // Comparativo com mês anterior (Consistente com a semente de despesas)
    const seedPrevExpenses = total * 0.96; // estimativa de queda de 4% no mês anterior
    const comparativoValAbs = total - seedPrevExpenses;
    const comparativoPercent = seedPrevExpenses > 0 ? (comparativoValAbs / seedPrevExpenses) * 100 : 0;

    // Projeção Financeira de Gastos
    const projecaoGastos = total * 0.98; // expectativa de queda de 2% no próximo mês

    // Dados de Evolução Mensal dos Gastos (Jan a Dez)
    const getEvolucaoGastosMensal = () => {
      const data: number[] = [];
      const baseSeedGasto = total || 8000;
      for (let m = 0; m < 12; m++) {
        if (m < 4) { // Janeiro, Fevereiro, Março e Abril são 0
          data.push(0);
        } else if (m === selectedMonth) {
          data.push(total);
        } else {
          // Preencher determinístico baseado no mês ativo
          const mult = 0.85 + ((m * 17) % 30) / 100; // 0.85 a 1.15
          data.push(Math.round(baseSeedGasto * mult));
        }
      }
      return data;
    };

    return {
      total,
      fixos,
      variaveis,
      maiorCategoria: {
        name: topGastoName,
        value: topGastoVal
      },
      share: {
        petmovel: sharePetMovel,
        creche: shareCreche,
        banhotosa: shareBanhoTosa,
        valPetMovel: expPetMovel,
        valCreche: expCreche,
        valBanhoTosa: expBanhoTosa
      },
      saldoLiquido,
      lucroEstimado,
      comparativo: {
        percent: comparativoPercent,
        abs: comparativoValAbs
      },
      projecao: projecaoGastos,
      chartEvolucao: getEvolucaoGastosMensal()
    };
  }, [expensesToShow, consolidatedMetrics]);

  // --- RENDERIZADORES DE GRÁFICOS SVG ---

  // Gráfico de Faturamento Individual (Visão Geral)
  const renderLineChart = (data: number[], color: string, id: string) => {
    const width = 500;
    const height = 120;
    const maxVal = Math.max(...data) * 1.15 || 1000;
    const minVal = Math.min(...data) * 0.85 || 0;

    const points = data.map((val, i) => {
      const x = (i * (width - 40)) / 11 + 20;
      const y = height - ((val - minVal) * (height - 30)) / (maxVal - minVal) - 15;
      return { x, y, val };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpY2 = next.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }

    const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - 5} L ${points[0].x} ${height - 5} Z`;

    return (
      <div className="relative group w-full h-[150px] mt-2 backdrop-blur-md bg-white/10 rounded-2xl p-2 border border-white/10">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          <line x1="20" y1={height - 15} x2={width - 20} y2={height - 15} stroke="rgba(244,63,94,0.06)" strokeWidth="1" />
          <line x1="20" y1={height / 2} x2={width - 20} y2={height / 2} stroke="rgba(244,63,94,0.06)" strokeWidth="1" />
          <line x1="20" y1="15" x2={width - 20} y2="15" stroke="rgba(244,63,94,0.06)" strokeWidth="1" />

          <path d={areaPathD} fill={`url(#grad-${id})`} className="animate-pulse-slow" />
          <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer group/dot">
              {/* Círculo visível */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2"
                className="transition-all duration-200 group-hover/dot:stroke-[4px]"
              />
              {/* Área de detecção estável ampliada (invisível, evita flicker) */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="transparent"
                className="cursor-pointer"
              />
              {/* Tooltip com setinha elegante */}
              <g className="opacity-0 pointer-events-none group-hover/dot:opacity-100 transition-opacity duration-200">
                <path d={`M ${pt.x - 4} ${pt.y - 12} L ${pt.x} ${pt.y - 8} L ${pt.x + 4} ${pt.y - 12} Z`} fill="#1f2937" />
                <rect x={pt.x - 40} y={pt.y - 32} width="80" height="20" rx="5" fill="#1f2937" className="shadow-lg" />
                <text x={pt.x} y={pt.y - 19} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                  R$ {pt.val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            </g>
          ))}
        </svg>

        <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-0.5 px-3">
          <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span>
          <span>Jul</span><span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span>
        </div>
      </div>
    );
  };

  const renderHotelChart = (data: { total: number[]; diarias: number[]; pernoites: number[] }) => {
    const width = 500;
    const height = 130;
    const maxVal = Math.max(...data.total, 1000) * 1.15;
    const minVal = 0;

    const getPoints = (series: number[]) => {
      return series.map((val, i) => {
        const x = (i * (width - 40)) / 11 + 20;
        const y = height - (val * (height - 30)) / maxVal - 15;
        return { x, y, val };
      });
    };

    const totalPoints = getPoints(data.total);

    const getPathD = (points: { x: number; y: number }[]) => {
      let pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const cpX1 = curr.x + (next.x - curr.x) / 3;
        const cpY1 = curr.y;
        const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
        const cpY2 = next.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
      }
      return pathD;
    };

    const totalPath = getPathD(totalPoints);

    return (
      <div className="relative group w-full h-[155px] mt-4 bg-amber-50/10 backdrop-blur-md rounded-2xl p-2 border border-amber-100/10">
        <div className="flex justify-between items-center px-2 mb-1">
          <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Histórico Hotel {selectedYear}</span>
          <div className="flex gap-2 text-[8px] font-black">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>Hotel Total</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[115px] overflow-visible">
          <line x1="20" y1={height - 15} x2={width - 20} y2={height - 15} stroke="rgba(245,158,11,0.06)" strokeWidth="1" />
          <line x1="20" y1={height / 2} x2={width - 20} y2={height / 2} stroke="rgba(245,158,11,0.06)" strokeWidth="1" />
          <line x1="20" y1="15" x2={width - 20} y2="15" stroke="rgba(245,158,11,0.06)" strokeWidth="1" />

          <path d={totalPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {totalPoints.map((pt, idx) => {
            const isMonthActive = idx === selectedMonth;
            return (
              <g key={idx} className="cursor-pointer group/dot">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isMonthActive ? "4.5" : "3"}
                  fill={isMonthActive ? "#f59e0b" : "#ffffff"}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  className="transition-all duration-200 group-hover/dot:stroke-[3px]"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                />
                <g className="opacity-0 pointer-events-none group-hover/dot:opacity-100 transition-opacity duration-200">
                  <path d={`M ${pt.x - 4} ${pt.y - 12} L ${pt.x} ${pt.y - 8} L ${pt.x + 4} ${pt.y - 12} Z`} fill="#1f2937" />
                  <rect x={pt.x - 55} y={pt.y - 32} width="110" height="20" rx="5" fill="#1f2937" className="shadow-lg" />
                  <text x={pt.x} y={pt.y - 19} fill="#ffffff" fontSize="7" fontWeight="black" textAnchor="middle">
                    Hotel Total: R$ {pt.val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-0.5 px-3">
          <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span>
          <span>Jul</span><span>Ago</span><span>Set</span><span>Out</span><span>Nov</span><span>Dez</span>
        </div>
      </div>
    );
  };

  // Gráfico de Evolução Geral de Faturamento (Visão Geral)
  // Gráfico de Evolução Geral de Faturamento (Visão Geral - Barras SVG Premium)
  const renderEvolucaoChart = () => {
    const width = 800;
    const height = 180;

    const totalData: number[] = [];
    for (let m = 0; m < 12; m++) {
      totalData.push(
        consolidatedMetrics.chart.banhotosa[m] +
        consolidatedMetrics.chart.petmovel[m] +
        consolidatedMetrics.chart.creche[m] +
        consolidatedMetrics.chart.hotel[m]
      );
    }

    const maxVal = Math.max(...totalData) * 1.25 || 10000;
    const barWidth = 44; // Barras maiores e mais robustas!
    const spacing = (width - 60) / 11;

    const bars = totalData.map((val, i) => {
      const xCenter = 30 + i * spacing;
      const x = xCenter - barWidth / 2;
      const usableHeight = height - 65; // Ajustado para dar mais folga vertical
      const barHeight = (val / maxVal) * usableHeight;
      const y = height - 20 - barHeight;
      return { x, y, barWidth, barHeight, val, xCenter, monthIndex: i };
    });

    return (
      <div className="relative group w-full h-full min-h-[340px] backdrop-blur-md bg-white/20 rounded-3xl p-5 border border-pink-100/30 shadow-xl flex flex-col justify-between animate-fadeIn">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-pink-300 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-pink-500" />
              Evolução Financeira Anual
            </h4>
            <p className="text-[10px] text-gray-400 font-bold">Faturamento Consolidado de todos os Serviços</p>
          </div>
          <span className="text-xs bg-pink-100 text-pink-600 px-3 py-1 rounded-full font-black">
            Total {selectedYear}: R$ {consolidatedMetrics.summary.yearTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-[160px] overflow-visible">
          <defs>
            <linearGradient id="grad-evolucao-normal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
            <linearGradient id="grad-evolucao-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <filter id="shadow-evolucao" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ec4899" floodOpacity="0.15" />
            </filter>
            <filter id="shadow-evolucao-active" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#db2777" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Linhas de grade horizontais de fundo */}
          <line x1="30" y1={height - 20} x2={width - 30} y2={height - 20} stroke="rgba(219,39,119,0.06)" strokeWidth="1.5" />
          <line x1="30" y1={(height - 20) / 2 + 10} x2={width - 30} y2={(height - 20) / 2 + 10} stroke="rgba(219,39,119,0.06)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30" y1="40" x2={width - 30} y2="40" stroke="rgba(219,39,119,0.06)" strokeWidth="1" strokeDasharray="4,4" />

          {/* Labels dos meses dentro do SVG — alinhados exatamente ao centro de cada barra */}
          {bars.map((bar, idx) => {
            const isActive = bar.monthIndex === selectedMonth;
            const isZero = totalData[idx] === 0;
            return (
              <text
                key={`label-${idx}`}
                x={bar.xCenter}
                y={height + 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isActive ? '900' : isZero ? '500' : '700'}
                className={`${isActive ? 'fill-pink-600 dark:fill-pink-400 font-black' : isZero ? 'fill-gray-300 dark:fill-slate-700' : 'fill-gray-400 dark:fill-slate-400'}`}
                fill="currentColor"
              >
                {months[idx].substring(0, 3)}
              </text>
            );
          })}

          {bars.map((bar, idx) => {
            const isActive = bar.monthIndex === selectedMonth;

            // Omitir renderização de colunas e textos para meses sem faturamento (valor = 0)
            if (bar.val === 0) return null;

            return (
              <g key={idx} className="cursor-pointer group/bar">
                {/* Valor textual fixo acima de cada barra */}
                <text
                  x={bar.xCenter}
                  y={bar.y - 8}
                  className={`transition-all duration-200 group-hover/bar:fill-gray-900 dark:group-hover/bar:fill-white font-sans tracking-tight ${isActive ? 'fill-pink-700 dark:fill-pink-300' : 'fill-pink-600 dark:fill-pink-400'}`}
                  fill="currentColor"
                  fontSize="12"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  R$ {Math.round(bar.val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>

                {/* Retângulo da Barra */}
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.barWidth}
                  height={bar.barHeight}
                  rx="7"
                  ry="7"
                  fill={isActive ? 'url(#grad-evolucao-active)' : 'url(#grad-evolucao-normal)'}
                  filter={isActive ? 'url(#shadow-evolucao-active)' : 'url(#shadow-evolucao)'}
                  className="transition-all duration-300 group-hover/bar:brightness-110"
                  style={{ transformOrigin: `${bar.xCenter}px ${height - 20}px` }}
                />

                {/* Área de detecção invisível para tooltip */}
                <rect
                  x={bar.xCenter - spacing / 2}
                  y="10"
                  width={spacing}
                  height={height - 30}
                  fill="transparent"
                />

                {/* Tooltip hover */}
                <g className="opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity duration-200">
                  <path d={`M ${bar.xCenter - 4} ${bar.y - 25} L ${bar.xCenter} ${bar.y - 21} L ${bar.xCenter + 4} ${bar.y - 25} Z`} fill="#030712" />
                  <rect x={bar.xCenter - 65} y={bar.y - 49} width="130" height="24" rx="6" fill="#030712" />
                  <text x={bar.xCenter} y={bar.y - 34} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    Total: R$ {bar.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Gráfico Donut para Distribuição Financeira (Faturamento)
  const renderDonutChart = () => {
    const shares = consolidatedMetrics.summary.share;
    const allServices = [
      { name: 'Banho & Tosa', value: shares.banhotosa, color: '#ec4899', amount: shares.valBanhoTosa },
      { name: 'Pet Móvel', value: shares.petmovel, color: '#06b6d4', amount: shares.valPetMovel },
      { name: 'Creche Pet', value: shares.creche, color: '#8b5cf6', amount: shares.valCreche },
      { name: 'Hotel Pet', value: shares.hotel, color: '#f59e0b', amount: shares.valHotel }
    ];

    // Fatias do donut apenas para valores maiores que zero
    const slices = allServices.filter(item => item.value > 0);

    let cumulativePercent = 0;
    const getCoordinatesForPercent = (percent: number) => {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    };

    const width = 160;
    const radius = 60;
    const center = 80;

    return (
      <div className="flex flex-col md:flex-row items-center gap-6 justify-center w-full">
        <div className="relative w-[160px] h-[160px] flex-shrink-0 animate-fadeIn">
          <svg viewBox={`0 0 ${width} ${width}`} className="w-full h-full overflow-visible">
            {slices.map((slice, idx) => {
              const startPercent = cumulativePercent;
              cumulativePercent += slice.value / 100;
              // Se a fatia tem quase 100%, faz uma aproximação extremamente sutil (0.99999) para evitar
              // que o ponto inicial seja igual ao ponto final, o que faria o SVG sumir.
              const isFullCircle = slice.value >= 99.9;
              const adjustedEndPercent = isFullCircle ? 0.99999 : cumulativePercent;

              const [startX, startY] = getCoordinatesForPercent(startPercent);
              const [endX, endY] = getCoordinatesForPercent(adjustedEndPercent);
              const largeArcFlag = slice.value > 50 ? 1 : 0;

              const sx = center + startX * radius;
              const sy = center + startY * radius;
              const ex = center + endX * radius;
              const ey = center + endY * radius;

              const d = [
                `M ${sx} ${sy}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${ex} ${ey}`
              ].join(' ');

              return (
                <path
                  key={idx}
                  d={d}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="22"
                  className="transition-all duration-300 hover:stroke-[26px] cursor-pointer"
                >
                  <title>{`${slice.name}: ${slice.value.toFixed(1)}%`}</title>
                </path>
              );
            })}
          </svg>
          <div className="absolute inset-0 m-auto w-20 h-20 bg-white/95 dark:bg-slate-800/95 rounded-full border border-pink-100/50 dark:border-slate-700/50 shadow-inner flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400 dark:text-slate-400 font-black uppercase tracking-wider">Total</span>
            <span className="text-xs font-black text-pink-600 dark:text-pink-400">R$ <AnimatedCounter value={consolidatedMetrics.summary.monthTotal} decimals={0} /></span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 w-full">
          {allServices.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/40 dark:bg-slate-850/40 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full block border border-white dark:border-slate-700" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-black text-gray-700 dark:text-slate-200">{item.name}</span>
              </div>
              <span className="text-xs font-black text-pink-600 dark:text-pink-400">R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({item.value.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- GRÁFICOS DA ABA DE GASTOS (NOVOS) ---

  // Donut de Gastos (Distribuição de Despesas)
  const renderExpensesDonutChart = () => {
    const shares = expensesMetrics.share;
    const data = [
      { name: 'Banho & Tosa', value: shares.banhotosa, color: '#ec4899', amount: shares.valBanhoTosa },
      { name: 'Pet Móvel', value: shares.petmovel, color: '#06b6d4', amount: shares.valPetMovel },
      { name: 'Creche Pet', value: shares.creche, color: '#8b5cf6', amount: shares.valCreche }
    ].filter(item => item.value > 0);

    let cumulativePercent = 0;
    const getCoordinatesForPercent = (percent: number) => {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    };

    const width = 160;
    const radius = 60;
    const center = 80;

    return (
      <div className="flex flex-col md:flex-row items-center gap-6 justify-center w-full">
        <div className="relative w-[160px] h-[160px] flex-shrink-0 animate-fadeIn">
          <svg viewBox={`0 0 ${width} ${width}`} className="w-full h-full overflow-visible">
            {data.map((slice, idx) => {
              const startPercent = cumulativePercent;
              cumulativePercent += slice.value / 100;
              // Se a fatia de gasto tem quase 100%, faz uma aproximação sutil (0.99999) para evitar
              // que o ponto inicial seja igual ao ponto final, o que faria o SVG sumir.
              const isFullCircle = slice.value >= 99.9;
              const adjustedEndPercent = isFullCircle ? 0.99999 : cumulativePercent;

              const [startX, startY] = getCoordinatesForPercent(startPercent);
              const [endX, endY] = getCoordinatesForPercent(adjustedEndPercent);
              const largeArcFlag = slice.value > 50 ? 1 : 0;

              const sx = center + startX * radius;
              const sy = center + startY * radius;
              const ex = center + endX * radius;
              const ey = center + endY * radius;

              const d = [
                `M ${sx} ${sy}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${ex} ${ey}`
              ].join(' ');

              return (
                <path
                  key={idx}
                  d={d}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="22"
                  className="transition-all duration-300 hover:stroke-[26px] cursor-pointer"
                >
                  <title>{`${slice.name}: ${slice.value.toFixed(1)}%`}</title>
                </path>
              );
            })}
          </svg>
          <div className="absolute inset-0 m-auto w-20 h-20 bg-white/95 dark:bg-slate-800/95 rounded-full border border-pink-100/50 dark:border-slate-700/50 shadow-inner flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400 dark:text-slate-400 font-black uppercase tracking-wider">Gastos</span>
            <span className="text-xs font-black text-red-500 dark:text-red-400">R$ <AnimatedCounter value={expensesMetrics.total} decimals={0} /></span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 w-full">
          {data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/40 dark:bg-slate-850/40 p-2.5 rounded-2xl border border-gray-100 dark:border-slate-700 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full block border border-white dark:border-slate-700" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-black text-gray-700 dark:text-slate-200">{item.name}</span>
              </div>
              <span className="text-xs font-black text-red-500 dark:text-red-450">R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({item.value.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Evolução Mensal dos Gastos (Gráfico de Barras SVG Premium)
  const renderExpensesEvolucaoChart = () => {
    const width = 800;
    const height = 180;
    const data = expensesMetrics.chartEvolucao;

    const maxVal = Math.max(...data) * 1.25 || 5000;
    const barWidth = 44; // Barras maiores e mais robustas!
    const spacing = (width - 60) / 11;

    const bars = data.map((val, i) => {
      const xCenter = 30 + i * spacing;
      const x = xCenter - barWidth / 2;
      const usableHeight = height - 65; // Ajustado para dar mais folga vertical
      const barHeight = (val / maxVal) * usableHeight;
      const y = height - 20 - barHeight;
      return { x, y, barWidth, barHeight, val, xCenter, monthIndex: i };
    });

    return (
      <div className="relative group w-full h-full min-h-[270px] backdrop-blur-md bg-white/20 rounded-3xl p-5 border border-pink-100/30 shadow-xl flex flex-col justify-between animate-fadeIn">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-red-300 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-500" />
              Evolução Mensal de Gastos
            </h4>
            <p className="text-[10px] text-gray-400 font-bold">Consolidação anual das despesas do petshop</p>
          </div>
          <span className="text-xs bg-red-50 text-red-500 px-3 py-1 rounded-full font-black">
            Total do Mês: R$ {expensesMetrics.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-[160px] overflow-visible">
          <defs>
            <linearGradient id="grad-bar-normal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
            <linearGradient id="grad-bar-active" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#db2777" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.15" />
            </filter>
            <filter id="shadow-active" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#db2777" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Linhas de grade horizontais de fundo */}
          <line x1="30" y1={height - 20} x2={width - 30} y2={height - 20} stroke="rgba(239,68,68,0.06)" strokeWidth="1.5" />
          <line x1="30" y1={(height - 20) / 2 + 10} x2={width - 30} y2={(height - 20) / 2 + 10} stroke="rgba(239,68,68,0.06)" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="30" y1="40" x2={width - 30} y2="40" stroke="rgba(239,68,68,0.06)" strokeWidth="1" strokeDasharray="4,4" />

          {/* Labels dos meses dentro do SVG — alinhados exatamente ao centro de cada barra */}
          {bars.map((bar, idx) => {
            const isActive = bar.monthIndex === selectedMonth;
            const isZero = data[idx] === 0;
            return (
              <text
                key={`label-${idx}`}
                x={bar.xCenter}
                y={height + 12}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isActive ? '900' : isZero ? '500' : '700'}
                className={`${isActive ? 'fill-red-600 dark:fill-red-400 font-black' : isZero ? 'fill-gray-300 dark:fill-slate-700' : 'fill-gray-400 dark:fill-slate-400'}`}
                fill="currentColor"
              >
                {months[idx].substring(0, 3)}
              </text>
            );
          })}

          {bars.map((bar, idx) => {
            const isActive = bar.monthIndex === selectedMonth;

            // Omitir renderização de colunas e textos para meses sem despesas (valor = 0)
            if (bar.val === 0) return null;

            return (
              <g key={idx} className="cursor-pointer group/bar">
                {/* Valor textual fixo acima de cada barra para legibilidade imediata (fonte maior e em negrito de alta legibilidade) */}
                <text
                  x={bar.xCenter}
                  y={bar.y - 8}
                  className={`transition-all duration-200 group-hover/bar:fill-gray-900 dark:group-hover/bar:fill-white group-hover/bar:scale-105 origin-center font-sans tracking-tight ${isActive ? 'fill-red-700 dark:fill-red-400' : 'fill-red-600 dark:fill-red-500'}`}
                  fill="currentColor"
                  fontSize="12"
                  fontWeight="900"
                  textAnchor="middle"
                >
                  R$ {Math.round(bar.val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>

                {/* Retângulo da Barra */}
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.barWidth}
                  height={bar.barHeight}
                  rx="7"
                  ry="7"
                  fill={isActive ? 'url(#grad-bar-active)' : 'url(#grad-bar-normal)'}
                  filter={isActive ? 'url(#shadow-active)' : 'url(#shadow)'}
                  className="transition-all duration-300 group-hover/bar:brightness-110 group-hover/bar:y-[-2px] hover:scale-x-105 origin-bottom"
                  style={{ transformOrigin: `${bar.xCenter}px ${height - 20}px` }}
                />

                {/* Área de detecção estável ampliada (invisível) para o tooltip */}
                <rect
                  x={bar.xCenter - spacing / 2}
                  y="10"
                  width={spacing}
                  height={height - 30}
                  fill="transparent"
                />

                {/* Tooltip com setinha elegante (ativado em hover) */}
                <g className="opacity-0 pointer-events-none group-hover/bar:opacity-100 transition-opacity duration-200">
                  <path d={`M ${bar.xCenter - 4} ${bar.y - 25} L ${bar.xCenter} ${bar.y - 21} L ${bar.xCenter + 4} ${bar.y - 25} Z`} fill="#030712" />
                  <rect x={bar.xCenter - 65} y={bar.y - 49} width="130" height="24" rx="6" fill="#030712" className="shadow-2xl" />
                  <text x={bar.xCenter} y={bar.y - 34} fill="#ffffff" fontSize="9" fontWeight="black" textAnchor="middle">
                    Gasto: R$ {bar.val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  // Renderizador da Timeline Operacional
  const renderOperationalTimeline = () => {
    const items = consolidatedMetrics.timeline.operational;

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-sm font-bold text-gray-400">
          Nenhum atendimento concluído registrado para este mês.
        </div>
      );
    }

    return (
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-purple">
        {items.map((item, idx) => {
          const isBanho = item.origem === 'Banho & Tosa';

          return (
            <div key={idx} className="relative flex gap-4">
              {idx < items.length - 1 && (
                <div className="absolute left-[17px] top-[30px] bottom-0 w-0.5 border-l border-dashed border-pink-300"></div>
              )}

              <div className={`w-9 h-9 rounded-2xl flex flex-col items-center justify-center font-bold text-[9px] shrink-0 border bg-pink-50 text-pink-500 border-pink-100`}>
                <span className="leading-none font-black">{item.timeStr}</span>
                <span className="text-[7px] opacity-70 mt-0.5">{item.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </div>

              <div className="flex-1 flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-pink-50/50 hover:bg-white transition-all shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isBanho ? '🧼' : '🚐'}</span>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isBanho ? 'text-pink-500' : 'text-cyan-500'
                      }`}>
                      {item.origem}
                    </span>
                    <span className="text-xs font-black text-gray-800">{item.pet_name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-gray-700">
                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizador da Aba de Relatório Financeiro (Simplificado e pronto para impressão)
  const renderReportTab = () => {
    const entradasBanhoTosa = consolidatedMetrics.banhoTosaMesDetalhes || [];
    const entradasPetMovel = consolidatedMetrics.petMovelMesDetalhes || [];
    const entradasCreche = consolidatedMetrics.crecheMesDetalhes || [];
    const entradasHotel = dbData.hotel
      .filter(d => {
        if (!isHotelApproved(d)) return false;
        const { year, month } = parseYearMonth(d.check_in_date || d.registration_date);
        return year === selectedYear && month === selectedMonth;
      })
      .map(d => ({
        date: d.check_in_date ? new Date(d.check_in_date) : d.registration_date ? new Date(d.registration_date) : new Date(),
        pet_name: d.pet_name || 'Pet sem nome',
        tutor_name: d.tutor_name || 'Tutor não informado',
        price: Number(d.total_services_price || 0)
      }));

    const totalEntradasBanhoTosa = entradasBanhoTosa.reduce((sum, item) => sum + item.price, 0);
    const totalEntradasPetMovel = entradasPetMovel.reduce((sum, item) => sum + item.price, 0);
    const totalEntradasCreche = entradasCreche.reduce((sum, item) => sum + item.price, 0);
    const totalEntradasHotel = entradasHotel.reduce((sum, item) => sum + item.price, 0);

    const totalEntradas = consolidatedMetrics.summary.monthTotal;

    const saidasBanhoTosa = expensesToShow.filter(x => x.servico === 'banhotosa');
    const saidasPetMovel = expensesToShow.filter(x => x.servico === 'petmovel');
    const saidasCreche = expensesToShow.filter(x => x.servico === 'creche');

    const totalSaidasBanhoTosa = saidasBanhoTosa.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const totalSaidasPetMovel = saidasPetMovel.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const totalSaidasCreche = saidasCreche.reduce((sum, item) => sum + Number(item.valor || 0), 0);

    const totalSaidas = expensesMetrics.total;
    const saldoLiquido = totalEntradas - totalSaidas;

    const maxVal = Math.max(totalEntradas, totalSaidas, 1);
    const entradasHeight = (totalEntradas / maxVal) * 140;
    const saidasHeight = (totalSaidas / maxVal) * 140;

    const dataEmissao = new Date().toLocaleString('pt-BR');

    return (
      <div className="report-container bg-white/80 p-8 rounded-3xl border border-pink-100/50 shadow-md space-y-8 animate-fadeIn text-gray-800">

        {/* CABEÇALHO DO RELATÓRIO (EXCLUSIVO PARA TELA E IMPRESSÃO) */}
        <div className="report-header flex flex-col sm:flex-row items-center justify-between border-b-2 border-pink-100 pb-6 gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center shadow-inner">
              <img src="https://cdn-icons-png.flaticon.com/512/5501/5501360.png" alt="Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-pink-600" style={{ fontFamily: '"Lobster Two", cursive' }}>Sandy's PetShop</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Relatório Financeiro Gerencial</p>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <div className="px-4 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-black uppercase tracking-wider inline-block">
              Período: {months[selectedMonth]} de {selectedYear}
            </div>
            <p className="text-[9px] font-bold text-gray-400 block">Emitido em: {dataEmissao}</p>
          </div>
        </div>

        {/* BOTÃO EXPORTAR (NÃO IMPRIME) */}
        <div className="flex justify-end no-print">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
            Exportar PDF / Imprimir
          </button>
        </div>

        {/* RESUMOS DE KPI (CARTÕES ELEGANTES) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center h-28 relative overflow-hidden group">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total de Entradas</span>
            <span className="text-2xl font-black text-emerald-600">
              R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-wider">Mapeamento reativo</span>
          </div>

          <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 flex flex-col items-center justify-center text-center h-28 relative overflow-hidden group">
            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Total de Saídas</span>
            <span className="text-2xl font-black text-rose-600">
              R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-bold text-rose-500 mt-1 uppercase tracking-wider">Despesas no período</span>
          </div>

          <div className={`${saldoLiquido >= 0 ? 'bg-cyan-50/50 border-cyan-100' : 'bg-red-50/50 border-red-100'} p-5 rounded-2xl border flex flex-col items-center justify-center text-center h-28 relative overflow-hidden group`}>
            <span className={`text-[9px] font-black uppercase tracking-widest mb-1 ${saldoLiquido >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>Saldo Líquido</span>
            <span className={`text-2xl font-black ${saldoLiquido >= 0 ? 'text-cyan-600' : 'text-red-600'}`}>
              R$ {saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${saldoLiquido >= 0 ? 'text-cyan-500' : 'text-red-400'}`}>
              {saldoLiquido >= 0 ? 'Lucro Líquido Real' : 'Déficit Operacional'}
            </span>
          </div>
        </div>

        {/* SEÇÃO 3: GRÁFICO COMPARATIVO ENTRADAS X SAÍDAS */}
        <div className="bg-gray-50/30 p-6 rounded-3xl border border-gray-100 flex flex-col items-center justify-center gap-4">
          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest text-center mb-2">
            Gráfico de Comparativo Mensal (Entradas x Saídas)
          </h4>
          <div className="w-full flex justify-center items-center">
            <svg viewBox="0 0 500 240" className="w-full max-w-[500px] h-auto overflow-visible">
              <defs>
                <linearGradient id="entradasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="saidasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>

              <line x1="50" y1="20" x2="450" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4" />
              <line x1="50" y1="100" x2="450" y2="100" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4" />
              <line x1="50" y1="180" x2="450" y2="180" stroke="#E2E8F0" strokeWidth="1.5" />

              <rect
                x="130"
                y={180 - entradasHeight}
                width="70"
                height={entradasHeight}
                rx="10"
                fill="url(#entradasGrad)"
              />
              <text
                x="165"
                y={180 - entradasHeight - 10}
                textAnchor="middle"
                className="text-xs font-black fill-emerald-600"
              >
                R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </text>
              <text
                x="165"
                y="205"
                textAnchor="middle"
                className="text-[10px] font-black fill-gray-500 uppercase tracking-widest"
              >
                Entradas
              </text>

              <rect
                x="300"
                y={180 - saidasHeight}
                width="70"
                height={saidasHeight}
                rx="10"
                fill="url(#saidasGrad)"
              />
              <text
                x="335"
                y={180 - saidasHeight - 10}
                textAnchor="middle"
                className="text-xs font-black fill-rose-600"
              >
                R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </text>
              <text
                x="335"
                y="205"
                textAnchor="middle"
                className="text-[10px] font-black fill-gray-500 uppercase tracking-widest"
              >
                Saídas
              </text>
            </svg>
          </div>
        </div>

        {/* DETALHAMENTO DE ENTRADAS */}
        <div className="space-y-6">
          <h4 className="text-sm font-black text-pink-600 uppercase tracking-widest border-b border-pink-100 pb-2">
            1. Detalhamento de Entradas (Faturamento)
          </h4>

          <div className="grid grid-cols-1 gap-6">

            {/* SERVIÇO: BANHO E TOSA FIXO */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
                  Banho & Tosa Fixo
                </h5>
                <span className="text-xs font-black text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalEntradasBanhoTosa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {entradasBanhoTosa.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum serviço de Banho & Tosa Fixo realizado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Data</th>
                        <th className="py-2">Pet</th>
                        <th className="py-2">Tutor</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {entradasBanhoTosa.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 font-black text-gray-800">{item.pet_name}</td>
                          <td className="py-2">{item.owner_name}</td>
                          <td className="py-2 text-right text-gray-800">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SERVIÇO: PET MÓVEL */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  Pet Móvel
                </h5>
                <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalEntradasPetMovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {entradasPetMovel.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum serviço de Pet Móvel realizado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Data</th>
                        <th className="py-2">Pet</th>
                        <th className="py-2">Tutor</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {entradasPetMovel.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 font-black text-gray-800">{item.pet_name}</td>
                          <td className="py-2">{item.owner_name}</td>
                          <td className="py-2 text-right text-gray-800">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SERVIÇO: CRECHE */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                  Creche (Daycare)
                </h5>
                <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalEntradasCreche.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {entradasCreche.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhuma matrícula de creche ativa no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Data</th>
                        <th className="py-2">Pet</th>
                        <th className="py-2">Tutor</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {entradasCreche.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 font-black text-gray-800">{item.pet_name}</td>
                          <td className="py-2">{item.tutor_name}</td>
                          <td className="py-2 text-right text-gray-800">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SERVIÇO: HOTEL */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Hotel Pet
                </h5>
                <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalEntradasHotel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {entradasHotel.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum serviço de Hotel Pet realizado no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Data</th>
                        <th className="py-2">Pet</th>
                        <th className="py-2">Tutor</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {entradasHotel.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                          <td className="py-2 font-black text-gray-800">{item.pet_name}</td>
                          <td className="py-2">{item.tutor_name}</td>
                          <td className="py-2 text-right text-gray-800">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* DETALHAMENTO DE SAÍDAS */}
        <div className="space-y-6">
          <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest border-b border-rose-100 pb-2">
            2. Detalhamento de Saídas (Despesas)
          </h4>

          <div className="grid grid-cols-1 gap-6">

            {/* SAÍDAS: BANHO E TOSA */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
                  Despesas de Banho & Tosa
                </h5>
                <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalSaidasBanhoTosa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {saidasBanhoTosa.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum gasto registrado para Banho & Tosa no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Gasto</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2">Observação</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {saidasBanhoTosa.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 font-black text-gray-800">{item.nome_gasto}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${item.categoria === 'fixo' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                              {item.categoria === 'fixo' ? 'Fixo' : 'Variável'}
                            </span>
                          </td>
                          <td className="py-2 font-normal text-gray-400 truncate max-w-[200px]">{item.observacoes || '-'}</td>
                          <td className="py-2 text-right text-gray-800">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SAÍDAS: PET MÓVEL */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  Despesas de Pet Móvel
                </h5>
                <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalSaidasPetMovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {saidasPetMovel.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum gasto registrado para Pet Móvel no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Gasto</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2">Observação</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {saidasPetMovel.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 font-black text-gray-800">{item.nome_gasto}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${item.categoria === 'fixo' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                              {item.categoria === 'fixo' ? 'Fixo' : 'Variável'}
                            </span>
                          </td>
                          <td className="py-2 font-normal text-gray-400 truncate max-w-[200px]">{item.observacoes || '-'}</td>
                          <td className="py-2 text-right text-gray-800">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SAÍDAS: CRECHE */}
            <div className="bg-gray-50/20 p-5 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                  Despesas de Creche
                </h5>
                <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  Total: R$ {totalSaidasCreche.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {saidasCreche.length === 0 ? (
                <p className="text-xs text-gray-400 font-bold italic py-2">Nenhum gasto registrado para Creche no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-black uppercase tracking-wider">
                        <th className="py-2">Gasto</th>
                        <th className="py-2">Categoria</th>
                        <th className="py-2">Observação</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="font-bold text-gray-600">
                      {saidasCreche.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 font-black text-gray-800">{item.nome_gasto}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${item.categoria === 'fixo' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                              {item.categoria === 'fixo' ? 'Fixo' : 'Variável'}
                            </span>
                          </td>
                          <td className="py-2 font-normal text-gray-400 truncate max-w-[200px]">{item.observacoes || '-'}</td>
                          <td className="py-2 text-right text-gray-800">R$ {Number(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-1 sm:px-2 md:px-4">

      {/* CABEÇALHO INTELIGENTE DO ADMINISTRADOR */}
      <div className="relative z-20 bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-gradient-to-br from-pink-100 to-cyan-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-extrabold text-pink-600 flex items-center justify-center md:justify-start gap-2" style={{ fontFamily: '"Lobster Two", cursive' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/5501/5501360.png" alt="Financeiro" className="w-9 h-9 object-contain" />
              Financeiro
            </h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">
              Dashboard Inteligente
            </p>
          </div>

          {/* SELETORES DE MÊS E ANO GLOBAIS */}
          <div className="flex flex-wrap items-center justify-center gap-4 z-50">
            <div className="relative">
              <button
                onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
                className="flex items-center gap-2 px-5 py-3 bg-white/80 border border-pink-100 text-gray-700 font-extrabold text-sm rounded-2xl shadow-sm hover:shadow-md transition-all h-12 min-w-[150px] justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-pink-500" />
                  <span>{months[selectedMonth]}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-pink-500 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showMonthDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-pink-50 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-pink-100 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {months.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => { setSelectedMonth(idx); setShowMonthDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-black transition-colors ${idx === selectedMonth ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-pink-50'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
                className="flex items-center gap-2 px-5 py-3 bg-white/80 border border-pink-100 text-gray-700 font-extrabold text-sm rounded-2xl shadow-sm hover:shadow-md transition-all h-12 min-w-[110px] justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4.5 h-4.5 text-pink-500" />
                  <span>{selectedYear}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-pink-500 transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showYearDropdown && (
                <div className="absolute right-0 mt-2 w-32 bg-white/95 backdrop-blur-md border border-pink-50 rounded-2xl shadow-2xl z-50">
                  {years.map(y => (
                    <button
                      key={y}
                      onClick={() => { setSelectedYear(y); setShowYearDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-black transition-colors ${y === selectedYear ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-pink-50'}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleReloadAll}
              className="flex items-center justify-center p-3 bg-pink-50 text-pink-600 border border-pink-100 rounded-2xl hover:bg-pink-100 active:scale-95 shadow-sm cursor-pointer transition-all h-12 w-12"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ABAS SECUNDÁRIAS PREMIUM (CHAVEADOR SLIDE GLASSMORPHISM) */}
      <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-pink-100/50 w-full max-w-[550px] shadow-sm animate-fadeIn">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${activeSubTab === 'overview'
            ? 'bg-pink-500 text-white shadow-md'
            : 'text-gray-600 hover:text-pink-600'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${activeSubTab === 'expenses'
            ? 'bg-pink-500 text-white shadow-md'
            : 'text-gray-600 hover:text-pink-600'
            }`}
        >
          <Layers className="w-4 h-4" />
          Gastos
        </button>
        <button
          onClick={() => setActiveSubTab('report')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${activeSubTab === 'report'
            ? 'bg-pink-500 text-white shadow-md'
            : 'text-gray-600 hover:text-pink-600'
            }`}
        >
          <PieChart className="w-4 h-4" />
          Relatório
        </button>
      </div>

      {/* CONDICIONAL: CARREGANDO SKELETON */}
      {loading || (activeSubTab === 'expenses' && loadingExpenses) ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-36 bg-white/60 border border-pink-100 rounded-3xl" />
            ))}
          </div>
          <div className="h-[250px] bg-white/60 border border-pink-100 rounded-3xl animate-pulse" />
        </div>
      ) : activeSubTab === 'overview' ? (
        // ==========================================
        // RENDER 1: ABA DE VISÃO GERAL (FATURAMENTO)
        // ==========================================
        <>
          {/* SESSÃO DE CARDS DE KPI DE VISÃO GERAL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fadeIn">
            {/* Card Entradas */}
            <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <img src="https://cdn-icons-png.flaticon.com/512/8438/8438644.png" alt="Entradas" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex flex-col items-center w-full">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Entradas</span>
                <span className="text-2xl font-black text-green-600 leading-snug">
                  R$ <AnimatedCounter value={consolidatedMetrics.summary.monthTotal} decimals={0} />
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 block mt-2">
                {consolidatedMetrics.summary.totalServicesCountReal} Serviços Concluídos
              </span>
            </div>

            {/* Card Saídas (Gastos) */}
            <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <img src="https://cdn-icons-png.flaticon.com/512/6067/6067145.png" alt="Saídas" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex flex-col items-center w-full">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Saídas</span>
                <span className="text-2xl font-black text-red-500 leading-snug">
                  R$ <AnimatedCounter value={expensesMetrics.total} decimals={0} />
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 block mt-2">
                Custo operacional mensal
              </span>
            </div>

            {/* Card Líquido */}
            <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center">
                <img src="https://cdn-icons-png.flaticon.com/512/584/584026.png" alt="Líquido" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex flex-col items-center w-full">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Líquido</span>
                <span className={`text-2xl font-black leading-snug ${(consolidatedMetrics.summary.monthTotal - expensesMetrics.total) >= 0 ? 'text-cyan-600' : 'text-red-600'
                  }`}>
                  R$ <AnimatedCounter value={consolidatedMetrics.summary.monthTotal - expensesMetrics.total} decimals={0} />
                </span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 block mt-2">
                {(consolidatedMetrics.summary.monthTotal - expensesMetrics.total) >= 0 ? 'Saldo positivo no mês' : 'Saldo negativo no mês'}
              </span>
            </div>
          </div>

          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-extrabold text-pink-700 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Visão Financeira Geral
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Card Banho & Tosa */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-pink-200">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-pink-400 rounded-full blur-2xl opacity-20"></div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-extrabold text-pink-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho & Tosa" className="w-6 h-6 object-contain" /> Banho & Tosa Fixo
                  </h4>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${consolidatedMetrics.banhotosa.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {consolidatedMetrics.banhotosa.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.banhotosa.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-pink-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Hoje</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.banhotosa.percentHoje >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.banhotosa.percentHoje >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.banhotosa.percentHoje).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.banhotosa.valueHojeAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.today} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Semana</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.banhotosa.percentSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.banhotosa.percentSemana >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.banhotosa.percentSemana).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.banhotosa.valueSemanaAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.week} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-100/50 p-2.5 sm:p-3 rounded-2xl border border-pink-200/50">
                    <span className="text-[9px] sm:text-[10px] text-pink-500 font-extrabold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Mês</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.banhotosa.percentMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.banhotosa.percentMes >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.banhotosa.percentMes).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-pink-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.banhotosa.valueMesAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-base font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.month} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Anual</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.banhotosa.percentAno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.banhotosa.percentAno >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.banhotosa.percentAno).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.banhotosa.valueAnoAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.year} decimals={0} /></span>
                  </div>
                </div>

                {renderLineChart(consolidatedMetrics.chart.banhotosa, '#ec4899', 'banhotosa')}
              </div>

              {/* Card Pet Móvel */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-cyan-200">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-cyan-400 rounded-full blur-2xl opacity-20"></div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-extrabold text-cyan-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel" className="w-6 h-6 object-contain" /> Pet Móvel (Condomínios)
                  </h4>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${consolidatedMetrics.petmovel.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {consolidatedMetrics.petmovel.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.petmovel.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-cyan-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Hoje</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.petmovel.percentHoje >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.petmovel.percentHoje >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.petmovel.percentHoje).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.petmovel.valueHojeAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.today} decimals={0} /></span>
                  </div>
                  <div className="bg-cyan-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Semana</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.petmovel.percentSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.petmovel.percentSemana >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.petmovel.percentSemana).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.petmovel.valueSemanaAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.week} decimals={0} /></span>
                  </div>
                  <div className="bg-cyan-100/50 p-2.5 sm:p-3 rounded-2xl border border-cyan-200/50">
                    <span className="text-[9px] sm:text-[10px] text-cyan-500 font-extrabold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Mês</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.petmovel.percentMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.petmovel.percentMes >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.petmovel.percentMes).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-cyan-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.petmovel.valueMesAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-base font-black text-cyan-600">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.month} decimals={0} /></span>
                  </div>
                  <div className="bg-cyan-50/40 p-2.5 sm:p-3 rounded-2xl">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5 uppercase mb-1">
                      <span>Anual</span>
                      <span className={`flex items-center gap-0.5 text-xs ${consolidatedMetrics.petmovel.percentAno >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {consolidatedMetrics.petmovel.percentAno >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(consolidatedMetrics.petmovel.percentAno).toFixed(1)}%
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium normal-case" style={{ textTransform: 'none' }}>
                        (vs R$ {consolidatedMetrics.petmovel.valueAnoAnterior.toLocaleString('pt-BR', { maximumFractionDigits: 0 })})
                      </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.year} decimals={0} /></span>
                  </div>
                </div>

                {renderLineChart(consolidatedMetrics.chart.petmovel, '#06b6d4', 'petmovel')}
              </div>

              {/* Card Creche Pet – Total de Aprovações */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-purple-200 flex flex-col justify-between min-h-[570px]">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-purple-400 rounded-full blur-2xl opacity-20"></div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-purple-600 flex items-center gap-2">
                      <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet" className="w-6 h-6 object-contain" /> Creche Pet
                    </h4>
                    <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full border border-purple-100">
                      {consolidatedMetrics.approvedCrechePets.length} Ativos
                    </span>
                  </div>

                  {/* Destaque Elegante do Total Aprovado (Centralizado) */}
                  <div className="flex flex-col items-center justify-center text-center p-4 mb-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50/40 border border-purple-100/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_40%)]"></div>
                    <span className="text-[9px] text-purple-500 font-black tracking-widest uppercase mb-1 flex items-center gap-1.5 z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                      Faturamento Aprovado
                    </span>
                    <span className="text-3xl font-black text-purple-700 tracking-tight flex items-baseline z-10 transform transition-transform duration-300 group-hover:scale-105">
                      <span className="text-base font-extrabold mr-1 text-purple-500">R$</span>
                      <AnimatedCounter value={consolidatedMetrics.totalCrecheAprovado} decimals={0} />
                    </span>
                  </div>

                  {/* Lista de Pets Matriculados (Com Rolagem Interna) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block px-1">Pets Matriculados</span>
                    <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5 scrollbar-purple">
                      {consolidatedMetrics.approvedCrechePets.length === 0 ? (
                        <div className="text-center py-6 text-xs font-bold text-gray-400">
                          Nenhum pet matriculado ativo
                        </div>
                      ) : (
                        consolidatedMetrics.approvedCrechePets.map((pet, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-purple-50/20 hover:bg-purple-50/50 p-2 rounded-xl border border-purple-50/30 transition-all">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🐾</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-800">{pet.petName}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">{pet.petBreed}</span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-purple-600">
                              R$ {pet.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Hotel Pet – Total de Hospedagens */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-amber-200 flex flex-col justify-between min-h-[570px]">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-amber-400 rounded-full blur-2xl opacity-20"></div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-amber-600 flex items-center gap-2">
                      <img src="https://cdn-icons-png.flaticon.com/512/1131/1131938.png" alt="Hotel Pet" className="w-6 h-6 object-contain" /> Hotel Pet
                    </h4>
                    <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100">
                      {consolidatedMetrics.approvedHotelPets.length} Hóspedes
                    </span>
                  </div>

                  {/* Destaque Elegante do Total Aprovado (Centralizado) */}
                  <div className="flex flex-col items-center justify-center text-center p-4 mb-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-100/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_40%)]"></div>
                    <span className="text-[9px] text-amber-500 font-black tracking-widest uppercase mb-1 flex items-center gap-1.5 z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      Faturamento Aprovado
                    </span>
                    <span className="text-3xl font-black text-amber-700 tracking-tight flex items-baseline z-10 transform transition-transform duration-300 group-hover:scale-105">
                      <span className="text-base font-extrabold mr-1 text-amber-500">R$</span>
                      <AnimatedCounter value={consolidatedMetrics.totalHotelAprovado} decimals={0} />
                    </span>

                    {/* Subtotais de Diárias e Pernoites */}
                    <div className="flex justify-between w-full mt-3 pt-2 border-t border-amber-100/60 z-10 text-[10px] font-black uppercase text-gray-500">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-amber-600 font-bold">Diárias</span>
                        <span className="text-xs text-amber-700 font-black">R$ <AnimatedCounter value={consolidatedMetrics.totalDiariasAprovado} decimals={0} /></span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] text-amber-600 font-bold">Pernoites</span>
                        <span className="text-xs text-amber-700 font-black">R$ <AnimatedCounter value={consolidatedMetrics.totalPernoitesAprovado} decimals={0} /></span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Hóspedes (Com Rolagem Interna) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block px-1">Hóspedes Ativos</span>
                    <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5 scrollbar-amber">
                      {consolidatedMetrics.approvedHotelPets.length === 0 ? (
                        <div className="text-center py-6 text-xs font-bold text-gray-400">
                          Nenhum pet hospedado ativo
                        </div>
                      ) : (
                        consolidatedMetrics.approvedHotelPets.map((pet, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-amber-50/20 hover:bg-amber-50/50 p-2 rounded-xl border border-amber-50/30 transition-all">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🏨</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-800">{pet.petName}</span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase">
                                  {pet.petBreed} • {pet.tutorName}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-black text-amber-600">
                              R$ {pet.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Gráfico Mensal do Hotel */}
                {renderHotelChart(consolidatedMetrics.hotelMonthlyData)}
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                    <Clock className="w-5 h-5" />
                    Fluxo Operacional Mês
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold">Histórico de atendimentos concluídos no período</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Valor Total Geral</span>
                  <span className="text-sm font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.timeline.totalGeral} decimals={0} /></span>
                </div>
              </div>
              {renderOperationalTimeline()}
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <Activity className="w-5 h-5" />
                  Performance Mensal
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Estatísticas acumuladas do mês de {months[selectedMonth]}</p>
              </div>

              <div className="space-y-4">
                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block">Ticket Médio Geral</span>
                    <span className="text-lg font-black text-pink-600">
                      R$ <AnimatedCounter
                        value={
                          (() => {
                            const totalServicos = consolidatedMetrics.summary.countBanhoReal + consolidatedMetrics.summary.countPetMovelReal;
                            const totalValor = consolidatedMetrics.banhotosa.month + consolidatedMetrics.petmovel.month;
                            return totalServicos > 0 ? totalValor / totalServicos : 0;
                          })()
                        }
                        decimals={2}
                      />
                    </span>
                  </div>
                  <span className="text-2xl">🎟️</span>
                </div>

                <div className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block">Volume Operacional</span>
                    <span className="text-lg font-black text-cyan-600">
                      <AnimatedCounter value={consolidatedMetrics.summary.totalServicesCountReal} decimals={0} /> Serviços
                    </span>
                  </div>
                  <span className="text-2xl">🐕</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Curva de Faturamento Mensal</h4>
                <div className="h-[90px] w-full">
                  <svg viewBox="0 0 200 80" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="grad-acumulado" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 10 70 Q 50 60 90 45 T 190 20 L 190 75 L 10 75 Z" fill="url(#grad-acumulado)" />
                    <path d="M 10 70 Q 50 60 90 45 T 190 20" fill="none" stroke="#06b6d4" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="190" cy="20" r="3.5" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>



          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn items-stretch">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100 shadow-xl flex flex-col justify-between h-full min-h-[340px]">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <PieChart className="w-5 h-5" />
                  Distribuição Financeira
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Participação de cada serviço no faturamento do mês</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                {renderDonutChart()}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col h-full">
              {renderEvolucaoChart()}
            </div>
          </div>
        </>
      ) : activeSubTab === 'expenses' ? (
        // ==========================================
        // RENDER 2: ABA DE GASTOS OPERACIONAIS (NOVO)
        // ==========================================
        <>
          {/* SESSÃO 1: KPIs DE GASTOS */}
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-extrabold text-pink-700 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Gastos no Período
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Total de Gastos */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                  <img src="https://cdn-icons-png.flaticon.com/512/6067/6067145.png" alt="Gastos" className="w-7 h-7 object-contain" />
                </div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total de Gastos</span>
                  <span className="text-2xl font-black text-red-500 leading-snug">R$ <AnimatedCounter value={expensesMetrics.total} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">Custo operacional mensal</span>
              </div>

              {/* Fixos */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center"><img src="https://cdn-icons-png.flaticon.com/512/16090/16090543.png" alt="Gastos Fixos" className="w-7 h-7 object-contain" /></div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gastos Fixos</span>
                  <span className="text-2xl font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={expensesMetrics.fixos} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Estáveis e estruturais</span>
              </div>

              {/* Variáveis */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center"><img src="https://cdn-icons-png.flaticon.com/512/15548/15548902.png" alt="Gastos Variáveis" className="w-7 h-7 object-contain" /></div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gastos Variáveis</span>
                  <span className="text-2xl font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={expensesMetrics.variaveis} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-cyan-600 block mt-2">Insumos e consumo</span>
              </div>

              {/* Maior Gasto */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center"><img src="https://cdn-icons-png.flaticon.com/512/6778/6778921.png" alt="Maior Gasto" className="w-7 h-7 object-contain" /></div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Maior Gasto</span>
                  <span className="text-base font-black text-purple-600 leading-snug truncate block max-w-[130px]">{expensesMetrics.maiorCategoria.name}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">R$ {expensesMetrics.maiorCategoria.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>

              {/* Saldo Líquido e Margem de Lucro */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col items-center justify-between h-36 text-center relative group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-50 rounded-full flex items-center justify-center"><img src="https://cdn-icons-png.flaticon.com/512/584/584026.png" alt="Saldo Líquido" className="w-7 h-7 object-contain" /></div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Saldo Líquido</span>
                  <span className={`text-2xl font-black leading-snug block ${expensesMetrics.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    R$ <AnimatedCounter value={expensesMetrics.saldoLiquido} decimals={0} />
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-1">
                  Margem: {expensesMetrics.lucroEstimado.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* SESSÃO 4: GRÁFICOS DE BI GASTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn items-stretch">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100 shadow-xl flex flex-col justify-between min-h-[270px]">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <PieChart className="w-5 h-5" />
                  Distribuição de Despesas
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Participação operacional de cada serviço nos gastos</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                {renderExpensesDonutChart()}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col">
              {renderExpensesEvolucaoChart()}
            </div>
          </div>

          {/* SESSÃO 2: FILTROS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-pink-100 shadow-lg animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={() => setSelectedServiceFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedServiceFilter === 'all'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedServiceFilter('petmovel')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedServiceFilter === 'petmovel'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel" className="w-4 h-4 object-contain inline-block mr-1" /> Pet Móvel
              </button>
              <button
                onClick={() => setSelectedServiceFilter('creche')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedServiceFilter === 'creche'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche" className="w-4 h-4 object-contain inline-block mr-1" /> Creche
              </button>
              <button
                onClick={() => setSelectedServiceFilter('banhotosa')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedServiceFilter === 'banhotosa'
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho &amp; Tosa" className="w-4 h-4 object-contain inline-block mr-1" /> Banho &amp; Tosa
              </button>
            </div>
          </div>

          {/* SESSÃO 3: LISTAGEM DE DESPESAS POR SERVIÇO */}
          <div className="space-y-8 animate-fadeIn">
            {/* 1. SEÇÃO PET MÓVEL */}
            {(selectedServiceFilter === 'all' || selectedServiceFilter === 'petmovel') && (
              <div className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100/60 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                  <h4 className="text-lg font-black text-cyan-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel" className="w-6 h-6 object-contain" /> Pet Móvel (Condomínios)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(null, 'petmovel')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-cyan-600 active:scale-95 transition-all cursor-pointer w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Despesa
                    </button>
                    <button
                      onClick={() => handleDeleteAllExpenses('petmovel')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all cursor-pointer w-fit"
                      title="Exclui definitivamente todos os gastos de Pet Móvel deste mês"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* ALUGUEL E GASTOS FIXOS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block border border-white" />
                      Gastos Fixos
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'petmovel' && x.categoria === 'fixo').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-cyan-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SHAMPOO E GASTOS VARIÁVEIS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block border border-white" />
                      Gastos Variáveis
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'petmovel' && x.categoria === 'variavel').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-cyan-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SEÇÃO CRECHE PET */}
            {(selectedServiceFilter === 'all' || selectedServiceFilter === 'creche') && (
              <div className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100/60 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                  <h4 className="text-lg font-black text-purple-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet" className="w-6 h-6 object-contain" /> Creche Pet
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(null, 'creche')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-purple-600 active:scale-95 transition-all cursor-pointer w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Despesa
                    </button>
                    <button
                      onClick={() => handleDeleteAllExpenses('creche')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all cursor-pointer w-fit"
                      title="Exclui definitivamente todos os gastos de Creche deste mês"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* GASTOS FIXOS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block border border-white" />
                      Gastos Fixos
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'creche' && x.categoria === 'fixo').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-purple-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* GASTOS VARIÁVEIS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block border border-white" />
                      Gastos Variáveis
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'creche' && x.categoria === 'variavel').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-purple-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SEÇÃO BANHO & TOSA FIXO */}
            {(selectedServiceFilter === 'all' || selectedServiceFilter === 'banhotosa') && (
              <div className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100/60 shadow-xl space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                  <h4 className="text-lg font-black text-pink-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho & Tosa" className="w-6 h-6 object-contain" /> Banho & Tosa Fixo
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(null, 'banhotosa')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-pink-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-pink-600 active:scale-95 transition-all cursor-pointer w-fit"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Despesa
                    </button>
                    <button
                      onClick={() => handleDeleteAllExpenses('banhotosa')}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-sm hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all cursor-pointer w-fit"
                      title="Exclui definitivamente todos os gastos de Banho & Tosa deste mês"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir Todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* GASTOS FIXOS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block border border-white" />
                      Gastos Fixos
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'banhotosa' && x.categoria === 'fixo').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-pink-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* GASTOS VARIÁVEIS */}
                  <div className="bg-white/40 p-5 rounded-3xl border border-gray-100/50 shadow-inner">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block border border-white" />
                      Gastos Variáveis
                    </h5>
                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100/80 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2.5">Nome</th>
                            <th className="py-2.5">Valor</th>
                            <th className="py-2.5 text-center">Status</th>
                            <th className="py-2.5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesToShow.filter(x => x.servico === 'banhotosa' && x.categoria === 'variavel').map(item => (
                            <tr key={item.id} className="border-b border-gray-50/50 hover:bg-white/50 transition-colors text-xs font-bold text-gray-700">
                              <td className="py-3 flex flex-col">
                                <span className="text-gray-800 font-extrabold">{item.nome_gasto}</span>
                                {item.recorrente && <span className="text-[9px] text-pink-500 font-black">↻ Recorrente</span>}
                                {item.observacoes && <span className="text-[9px] text-gray-400 font-medium truncate max-w-[150px]">{item.observacoes}</span>}
                              </td>
                              <td className="py-3 text-gray-900">R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleTogglePaymentStatus(item)}
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${item.status_pagamento === 'pago'
                                    ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                                    }`}
                                  title="Clique para alternar o status do pagamento"
                                >
                                  {item.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-colors cursor-pointer" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpenseClick(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        renderReportTab()
      )}

      {/* ==========================================
          MODAL: CADASTRO / EDIÇÃO DE GASTOS
          ========================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Overlay desbotado com blur glass */}
          <div onClick={closeModal} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300"></div>

          {/* Card Modal */}
          <div className="relative bg-white/95 backdrop-blur-lg border border-pink-100 rounded-3xl p-6 shadow-2xl max-w-lg w-full z-10 space-y-4 overflow-y-auto max-h-[90vh] animate-scaleIn">
            <div className="flex justify-between items-center pb-2 border-b border-pink-50">
              <h3 className="text-xl font-black text-pink-600 flex items-center gap-2">
                <Layers className="w-5 h-5 text-pink-500" />
                {editingExpense ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
              </h3>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Nome do Gasto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome do Gasto</label>
                <input
                  ref={formNomeRef}
                  type="text"
                  required
                  placeholder="Ex: Ração especial, Manutenção de Banheira"
                  value={formNome}
                  onChange={e => setFormNome(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Categoria */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipo de Gasto</label>
                  <select
                    value={formCategoria}
                    onChange={e => setFormCategoria(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-11"
                  >
                    <option value="fixo">Fixo</option>
                    <option value="variavel">Variável</option>
                  </select>
                </div>

                {/* Serviço */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Serviço</label>
                  <select
                    value={formServico}
                    onChange={e => setFormServico(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-11"
                  >
                    <option value="petmovel">Pet Móvel</option>
                    <option value="creche">Creche Pet</option>
                    <option value="banhotosa">Banho & Tosa Fixo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="0,00"
                    value={formValor || ''}
                    onChange={e => setFormValor(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-11"
                  />
                </div>

                {/* Data */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data</label>
                  <input
                    type="date"
                    required
                    value={formData}
                    onChange={e => setFormData(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-11"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Observações</label>
                <textarea
                  placeholder="Ex: Fornecedor Shampoo, Conserto Secador..."
                  value={formObservacoes}
                  onChange={e => setFormObservacoes(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-pink-100 rounded-2xl text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Recorrente */}
                <label className="flex items-center gap-2.5 px-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formRecorrente}
                    onChange={e => setFormRecorrente(e.target.checked)}
                    className="w-4.5 h-4.5 text-pink-500 border-pink-100 rounded focus:ring-pink-400 cursor-pointer focus:ring-2"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-700">Gasto Recorrente</span>
                    <span className="text-[9px] text-gray-400 font-bold">Repetir todo mês</span>
                  </div>
                </label>

                {/* Status do Pagamento */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('pago')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${formStatus === 'pago'
                        ? 'bg-green-100 text-green-700 border-green-300 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('pendente')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${formStatus === 'pendente'
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      Pendente
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t border-pink-50">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 bg-gray-50 border border-gray-100 text-gray-500 font-black text-xs rounded-2xl hover:bg-gray-100 active:scale-95 transition-all cursor-pointer h-11"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer h-11"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE GASTO RECORRENTE
          ========================================== */}
      {isDeleteConfirmOpen && expenseToDelete && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
          {/* Overlay com blur glassmorphism */}
          <div
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-md transition-opacity duration-300"
            onClick={() => { setIsDeleteConfirmOpen(false); setExpenseToDelete(null); }}
          />

          {/* Card Modal de Confirmação */}
          <div className="relative bg-white/96 backdrop-blur-xl border border-red-100/60 rounded-3xl p-7 shadow-2xl max-w-md w-full z-10 animate-scaleIn">
            {/* Glow de alerta sutil */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-36 h-36 bg-red-300 rounded-full blur-3xl opacity-15 pointer-events-none" />

            {/* Ícone e Título */}
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                <span className="text-3xl">🔁</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-800">Gasto Recorrente Detectado</h3>
                <p className="text-xs text-gray-400 font-bold mt-1 leading-relaxed">
                  <span className="text-pink-600 font-extrabold">"{expenseToDelete.nome_gasto}"</span> está marcado como recorrente.<br />
                  Como deseja realizar a exclusão?
                </p>
              </div>
            </div>

            {/* Opções de Exclusão */}
            <div className="space-y-3">
              {/* Excluir apenas este mês */}
              <button
                onClick={() => handleDeleteOnlyThisMonth(expenseToDelete)}
                className="w-full flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl hover:bg-yellow-100 transition-all group cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-yellow-100 border border-yellow-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">📅</span>
                </div>
                <div>
                  <span className="text-xs font-black text-gray-800 block">Excluir apenas {months[selectedMonth]}/{selectedYear}</span>
                  <span className="text-[10px] text-gray-400 font-bold leading-relaxed block mt-0.5">
                    O gasto continuará aparecendo nos outros meses normalmente.
                  </span>
                </div>
              </button>

              {/* Excluir este e todos os futuros */}
              <button
                onClick={() => handleDeleteThisAndAllFuture(expenseToDelete)}
                className="w-full flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl hover:bg-red-100 transition-all group cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">🗑️</span>
                </div>
                <div>
                  <span className="text-xs font-black text-red-700 block">Excluir este e todos os meses futuros</span>
                  <span className="text-[10px] text-gray-400 font-bold leading-relaxed block mt-0.5">
                    O gasto será encerrado a partir de {months[selectedMonth]}/{selectedYear}. Meses anteriores mantidos.
                  </span>
                </div>
              </button>
            </div>

            {/* Botão Cancelar */}
            <button
              onClick={() => { setIsDeleteConfirmOpen(false); setExpenseToDelete(null); }}
              className="mt-5 w-full py-3 bg-gray-50 border border-gray-100 text-gray-500 font-black text-xs rounded-2xl hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboardView;
