import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
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
  AlertCircle
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

const defaultExpenses: any[] = [];

const FinancialDashboardView: React.FC = () => {
  // Estados para Filtros Globais
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Estados de Abas Secundárias (Visão Geral vs Gastos)
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'expenses'>('overview');

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
      const banhoRes = await supabase.from('agendamento_banhotosa').select('price, appointment_time, status');
      const apptRes = await supabase.from('appointments').select('price, appointment_time, status, service');
      const pmRes = await supabase.from('pet_movel_appointments').select('price, appointment_time, status');
      const daycareRes = await supabase.from('daycare_enrollments').select('total_price, enrollment_date, status, payment_status');
      const hotelRes = await supabase.from('hotel_registrations').select('total_services_price, check_in_date, check_out_date, status, payment_status');

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
      return up === 'CONCLUIDO' || up === 'CONCLUIDO' || up === 'COMPLETED' || up === 'DONE' || up === 'FINALIZADO';
    };

    const realBanhoTosaConcluido = dbData.banhoTosa
      .filter(d => isConcluido(d.status))
      .map(d => ({
        price: Number(d.price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date()
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

    // MÊS – soma dos concluídos do mês e ano selecionados
    const banhoTosaMes = realBanhoTosaConcluido
      .filter(d => d.date.getMonth() === currentMonth && d.date.getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.price, 0);

    // ANUAL – soma dos concluídos do ano selecionado
    const banhoTosaAnual = realBanhoTosaConcluido
      .filter(d => d.date.getFullYear() === currentYear)
      .reduce((sum, d) => sum + d.price, 0);

    // CHART BANHO & TOSA – usa dados reais mês a mês; fallback para seed quando zerado
    const chartBanhoTosa = Array.from({ length: 12 }, (_, m) => {
      const real = realBanhoTosaConcluido
        .filter(d => d.date.getMonth() === m && d.date.getFullYear() === currentYear)
        .reduce((sum, d) => sum + d.price, 0);
      return real > 0 ? real : getSeedValue('banho_tosa', m, currentYear, 42);
    });

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
      .filter(d => d.date.getFullYear() === currentYear - 1)
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
      percentAno
    };
    // ──────────────────────────────────────────────────────────────────────────

    const realPetMovel = [
      ...dbData.petMovel.map(d => ({
        price: Number(d.price || d.total_price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        status: d.status
      })),
      ...dbData.appointments.filter(d => {
        const s = String(d.service || '').toUpperCase();
        const isServiceMobile = s.includes('MÓVEL') || s.includes('MOVEL') || s.includes('MOBILE') || s.includes('PET_MOBILE');
        const condo = String(d.condominium || '').trim();
        const isCondoMobile = condo && condo !== 'Nenhum Condomínio' && condo !== 'UNDEFINED' && condo !== 'NULL';
        return isServiceMobile || isCondoMobile;
      }).map(d => ({
        price: Number(d.price || 0),
        date: d.appointment_time ? new Date(d.appointment_time) : new Date(),
        status: d.status
      }))
    ];

    const realPetMovelConcluido = realPetMovel.filter(d => isConcluido(d.status));

// Calculations for Pet Móvel (similar to Banho & Tosa)
const petMovelHoje = realPetMovelConcluido
  .filter(d => {
    const ds = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
    return ds === hojeStr;
  })
  .reduce((sum, d) => sum + d.price, 0);

const petMovelOntem = realPetMovelConcluido
  .filter(d => {
    const ds = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
    return ds === ontemStr;
  })
  .reduce((sum, d) => sum + d.price, 0);

const petMovelSemana = realPetMovelConcluido
  .filter(d => d.date >= inicioDaSemana && d.date <= fimDaSemana)
  .reduce((sum, d) => sum + d.price, 0);
// Debug: log week range and total for Pet Móvel
console.log('Pet Móvel semana:', inicioDaSemana.toISOString().slice(0,10), '→', fimDaSemana.toISOString().slice(0,10), 'valor =', petMovelSemana);

const petMovelSemanaAnterior = realPetMovelConcluido
  .filter(d => d.date >= inicioSemanaAnterior && d.date <= fimSemanaAnterior)
  .reduce((sum, d) => sum + d.price, 0);

const petMovelMes = realPetMovelConcluido
  .filter(d => d.date.getMonth() === currentMonth && d.date.getFullYear() === currentYear)
  .reduce((sum, d) => sum + d.price, 0);

const petMovelAnual = realPetMovelConcluido
  .filter(d => d.date.getFullYear() === currentYear)
  .reduce((sum, d) => sum + d.price, 0);

const petMovelAnoAnterior = realPetMovelConcluido
  .filter(d => d.date.getFullYear() === currentYear - 1)
  .reduce((sum, d) => sum + d.price, 0);

const realCreche = dbData.daycare.map(d => ({
      price: Number(d.total_price || 0),
      date: d.enrollment_date ? new Date(d.enrollment_date) : new Date(),
      status: d.status,
      paid: d.payment_status === 'Pago' || d.payment_status === 'Concluído'
    }));

    const realHotel = dbData.hotel.map(d => ({
      price: Number(d.total_services_price || 0),
      date: d.check_in_date ? new Date(d.check_in_date) : new Date(),
      status: d.status,
      paid: d.payment_status === 'Pago' || d.payment_status === 'Concluído'
    }));

    const getMonthlyChartData = (serviceKey: string, realData: { price: number; date: Date }[], seedBase: number) => {
      const data: number[] = [];
      for (let m = 0; m < 12; m++) {
        const dbMonthSum = realData
          .filter(d => d.date.getMonth() === m && d.date.getFullYear() === currentYear)
          .reduce((sum, d) => sum + d.price, 0);

        if (dbMonthSum > 0) {
          data.push(dbMonthSum);
        } else {
          data.push(getSeedValue(serviceKey, m, currentYear, seedBase));
        }
      }
      return data;
    };

    const chartPetMovel = getMonthlyChartData('pet_movel', realPetMovel, 78);
    const chartCreche = getMonthlyChartData('creche', realCreche, 99);
    const chartHotel = getMonthlyChartData('hotel', realHotel, 12);

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

    let metricsPetMovel = getServiceMetrics(chartPetMovel, selectedMonth);
metricsPetMovel = {
  ...metricsPetMovel,
  today: petMovelHoje,
  week: petMovelSemana,
  month: petMovelMes,
  year: petMovelAnual,
  percentHoje: percentPetHoje,
  percentSemana: percentPetSemana,
  percentMes: percentPetMes,
  percentAno: percentPetAno
};
    const metricsCreche = getServiceMetrics(chartCreche, selectedMonth);
    const metricsHotel = getServiceMetrics(chartHotel, selectedMonth);

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

    const seedDay = (selectedMonth * 7 + selectedYear) % 28 + 1;
    const maiorDiaFaturamento = `${seedDay} de ${months[selectedMonth]}`;
    const projection = totalMonth * 1.08;

    const operationalTimeline = (() => {
      const times = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30', '17:30'];
      const timeline: { time: string; banhoVal: number; movelVal: number; banhoClient: string; movelClient: string; isCompleted: boolean }[] = [];
      const namesA = ['Bella (Yorkshire)', 'Thor (Golden)', 'Mel (Poodle)', 'Amora (Spitz)', 'Luke (Shih Tzu)', 'Pipoca (Pug)', 'Max (Bulldog)'];
      const namesB = ['Fred (Beagle)', 'Nina (Maltês)', 'Zeus (Rottweiler)', 'Gaia (Border)', 'Bidu (Schnauzer)', 'Chico (Dachshund)', 'Luna (Lhasa)'];

      times.forEach((t, i) => {
        const banhoVal = Math.round(90 + (i * 12) % 60);
        const movelVal = Math.round(120 + (i * 18) % 80);
        timeline.push({
          time: t,
          banhoVal,
          movelVal,
          banhoClient: namesA[i % namesA.length],
          movelClient: namesB[i % namesB.length],
          isCompleted: i < 5
        });
      });
      return timeline;
    })();

    const dailyAccumulated = operationalTimeline.map((item, index) => {
      const sum = operationalTimeline.slice(0, index + 1).reduce((tot, current) => tot + current.banhoVal + current.movelVal, 0);
      return {
        time: item.time,
        amount: sum
      };
    });

    return {
      banhotosa: metricsBanhoTosa,
      petmovel: metricsPetMovel,
      creche: metricsCreche,
      hotel: metricsHotel,
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
          hotel: shareHotel
        },
        topService,
        serviceLucrativo,
        ticketMedium,
        totalAppointmentsCount,
        maiorDiaFaturamento,
        projection
      },
      timeline: {
        operational: operationalTimeline,
        accumulated: dailyAccumulated
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

    // Saldo Líquido e Lucro Estimado (Somando Hotel Pet no Faturamento da Visão Geral)
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
        if (m === selectedMonth) {
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
  }, [expenses, consolidatedMetrics]);

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
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r="3.5" 
                fill="#ffffff" 
                stroke={color} 
                strokeWidth="2.5"
                className="transition-all duration-300 hover:scale-150 hover:stroke-[3.5px] transform-gpu origin-center cursor-pointer"
              />
              <g className="opacity-0 pointer-events-none group-hover/dot:opacity-100 transition-opacity duration-300">
                <rect x={pt.x - 35} y={pt.y - 30} width="70" height="22" rx="6" fill="#1f2937" className="shadow-md" />
                <text x={pt.x} y={pt.y - 16} fill="#ffffff" fontSize="8.5" fontWeight="bold" textAnchor="middle">
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

  // Gráfico de Evolução Geral de Faturamento (Visão Geral)
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

    const maxVal = Math.max(...totalData) * 1.1 || 10000;
    const minVal = Math.min(...totalData) * 0.9 || 0;

    const points = totalData.map((val, i) => {
      const x = (i * (width - 60)) / 11 + 30;
      const y = height - ((val - minVal) * (height - 40)) / (maxVal - minVal) - 20;
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

    const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

    return (
      <div className="relative group w-full h-[220px] backdrop-blur-md bg-white/20 rounded-3xl p-5 border border-pink-100/30 shadow-xl overflow-hidden">
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

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px] overflow-visible">
          <defs>
            <linearGradient id="grad-evolucao" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#db2777" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          <line x1="30" y1={height - 10} x2={width - 30} y2={height - 10} stroke="rgba(219,39,119,0.08)" strokeDasharray="3,3" />
          <line x1="30" y1={height / 2} x2={width - 30} y2={height / 2} stroke="rgba(219,39,119,0.08)" strokeDasharray="3,3" />
          <line x1="30" y1="20" x2={width - 30} y2="20" stroke="rgba(219,39,119,0.08)" strokeDasharray="3,3" />

          <path d={areaPathD} fill="url(#grad-evolucao)" />
          <path d={pathD} fill="none" stroke="#db2777" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer group/ev">
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r="4.5" 
                fill="#ffffff" 
                stroke="#db2777" 
                strokeWidth="3.5"
                className="transition-all duration-300 hover:scale-150 hover:stroke-[4.5px] transform-gpu origin-center cursor-pointer shadow-md"
              />
              <g className="opacity-0 pointer-events-none group-hover/ev:opacity-100 transition-opacity duration-300">
                <rect x={pt.x - 50} y={pt.y - 32} width="100" height="24" rx="8" fill="#030712" className="shadow-2xl" />
                <text x={pt.x} y={pt.y - 16} fill="#ffffff" fontSize="9.5" fontWeight="black" textAnchor="middle">
                  R$ {pt.val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            </g>
          ))}
        </svg>

        <div className="flex justify-between text-[10px] font-black text-gray-400 mt-2 px-6">
          {months.map(m => <span key={m}>{m.substring(0, 3)}</span>)}
        </div>
      </div>
    );
  };

  // Gráfico Donut para Distribuição Financeira (Faturamento)
  const renderDonutChart = () => {
    const shares = consolidatedMetrics.summary.share;
    const data = [
      { name: 'Banho & Tosa', value: shares.banhotosa, color: '#ec4899' },
      { name: 'Pet Móvel', value: shares.petmovel, color: '#06b6d4' },
      { name: 'Creche Pet', value: shares.creche, color: '#8b5cf6' },
      { name: 'Hotel Pet', value: shares.hotel, color: '#f59e0b' }
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
              const [startX, startY] = getCoordinatesForPercent(startPercent);
              const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
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
                  title={`${slice.name}: ${slice.value.toFixed(1)}%`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 m-auto w-20 h-20 bg-white/95 rounded-full border border-pink-100/50 shadow-inner flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Total</span>
            <span className="text-xs font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.summary.monthTotal} decimals={0} /></span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 w-full">
          {data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/40 p-2.5 rounded-2xl border border-gray-100 hover:bg-white/80 transition-colors shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full block border border-white" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-black text-gray-700">{item.name}</span>
              </div>
              <span className="text-xs font-black text-gray-600">{item.value.toFixed(1)}%</span>
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
              const [startX, startY] = getCoordinatesForPercent(startPercent);
              const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
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
                  title={`${slice.name}: ${slice.value.toFixed(1)}%`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 m-auto w-20 h-20 bg-white/95 rounded-full border border-pink-100/50 shadow-inner flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Gastos</span>
            <span className="text-xs font-black text-red-500">R$ <AnimatedCounter value={expensesMetrics.total} decimals={0} /></span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 w-full">
          {data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/40 p-2.5 rounded-2xl border border-gray-100 hover:bg-white/80 transition-colors shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full block border border-white" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-black text-gray-700">{item.name}</span>
              </div>
              <span className="text-xs font-black text-red-500">R$ {item.amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({item.value.toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Evolução Mensal dos Gastos (Gráfico de Área SVG)
  const renderExpensesEvolucaoChart = () => {
    const width = 800;
    const height = 180;
    const data = expensesMetrics.chartEvolucao;

    const maxVal = Math.max(...data) * 1.1 || 5000;
    const minVal = Math.min(...data) * 0.9 || 0;

    const points = data.map((val, i) => {
      const x = (i * (width - 60)) / 11 + 30;
      const y = height - ((val - minVal) * (height - 40)) / (maxVal - minVal) - 20;
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

    const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;

    return (
      <div className="relative group w-full h-[220px] backdrop-blur-md bg-white/20 rounded-3xl p-5 border border-pink-100/30 shadow-xl overflow-hidden">
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

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[140px] overflow-visible">
          <defs>
            <linearGradient id="grad-evolucao-gastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="30" y1={height - 10} x2={width - 30} y2={height - 10} stroke="rgba(239,68,68,0.08)" strokeDasharray="3,3" />
          <line x1="30" y1={height / 2} x2={width - 30} y2={height / 2} stroke="rgba(239,68,68,0.08)" strokeDasharray="3,3" />
          <line x1="30" y1="20" x2={width - 30} y2="20" stroke="rgba(239,68,68,0.08)" strokeDasharray="3,3" />

          <path d={areaPathD} fill="url(#grad-evolucao-gastos)" />
          <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer group/ev">
              <circle 
                cx={pt.x} 
                cy={pt.y} 
                r="4.5" 
                fill="#ffffff" 
                stroke="#ef4444" 
                strokeWidth="3.5"
                className="transition-all duration-300 hover:scale-150 hover:stroke-[4.5px] transform-gpu origin-center cursor-pointer shadow-md"
              />
              <g className="opacity-0 pointer-events-none group-hover/ev:opacity-100 transition-opacity duration-300">
                <rect x={pt.x - 50} y={pt.y - 32} width="100" height="24" rx="8" fill="#030712" className="shadow-2xl" />
                <text x={pt.x} y={pt.y - 16} fill="#ffffff" fontSize="9.5" fontWeight="black" textAnchor="middle">
                  R$ {pt.val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </text>
              </g>
            </g>
          ))}
        </svg>

        <div className="flex justify-between text-[10px] font-black text-gray-400 mt-2 px-6">
          {months.map(m => <span key={m}>{m.substring(0, 3)}</span>)}
        </div>
      </div>
    );
  };

  // Renderizador da Timeline Operacional
  const renderOperationalTimeline = () => {
    return (
      <div className="space-y-4">
        {consolidatedMetrics.timeline.operational.map((item, idx) => (
          <div key={idx} className="relative flex gap-4">
            {idx < consolidatedMetrics.timeline.operational.length - 1 && (
              <div className="absolute left-[17px] top-[30px] bottom-0 w-0.5 border-l border-dashed border-pink-300"></div>
            )}
            
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
              item.isCompleted 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-pink-50 text-pink-500 border border-pink-100'
            }`}>
              {item.time}
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/60 p-3 rounded-2xl border border-pink-50/50 hover:bg-white transition-all shadow-sm">
              <div className="flex justify-between items-center border-b md:border-b-0 md:border-r border-gray-100 pb-2 md:pb-0 md:pr-4">
                <div>
                  <span className="text-[10px] font-black text-pink-500 uppercase tracking-wider block">Banho & Tosa</span>
                  <span className="text-xs font-black text-gray-800">{item.banhoClient}</span>
                </div>
                <span className="text-xs font-black text-gray-600">R$ {item.banhoVal}</span>
              </div>

              <div className="flex justify-between items-center md:pl-2">
                <div>
                  <span className="text-[10px] font-black text-cyan-500 uppercase tracking-wider block">Pet Móvel</span>
                  <span className="text-xs font-black text-gray-800">{item.movelClient}</span>
                </div>
                <span className="text-xs font-black text-gray-600">R$ {item.movelVal}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-1 sm:px-2 md:px-4">
      {/* CABEÇALHO INTELIGENTE DO ADMINISTRADOR */}
      <div className="relative z-[100] bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl animate-fadeIn">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-gradient-to-br from-pink-100 to-cyan-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-extrabold text-pink-600 flex items-center justify-center md:justify-start gap-2" style={{ fontFamily: '"Lobster Two", cursive' }}>
              <DollarSign className="w-9 h-9 animate-bounce text-pink-500" />
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
      <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-pink-100/50 w-full max-w-[400px] shadow-sm animate-fadeIn">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'overview'
              ? 'bg-pink-500 text-white shadow-md'
              : 'text-gray-600 hover:text-pink-600'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeSubTab === 'expenses'
              ? 'bg-pink-500 text-white shadow-md'
              : 'text-gray-600 hover:text-pink-600'
          }`}
        >
          <Layers className="w-4 h-4" />
          Gastos
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
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    consolidatedMetrics.banhotosa.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {consolidatedMetrics.banhotosa.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.banhotosa.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-pink-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                      Hoje
                      <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.banhotosa.percentHoje >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.banhotosa.percentHoje >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.banhotosa.percentHoje).toFixed(1)}% </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.today} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                      Semana
                      <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.banhotosa.percentSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.banhotosa.percentSemana >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.banhotosa.percentSemana).toFixed(1)}% </span>
                    </span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.week} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-100/50 p-3 rounded-2xl border border-pink-200/50">
                    <span className="text-[10px] text-pink-500 font-extrabold flex items-center uppercase mb-1">
                      Mês
                      <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.banhotosa.percentMes >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.banhotosa.percentMes >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.banhotosa.percentMes).toFixed(1)}% </span>
                    </span>
                    <span className="text-base font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.month} decimals={0} /></span>
                  </div>
                  <div className="bg-pink-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                      Anual
                      <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.banhotosa.percentAno >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.banhotosa.percentAno >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.banhotosa.percentAno).toFixed(1)}% </span>
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
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    consolidatedMetrics.petmovel.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {consolidatedMetrics.petmovel.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.petmovel.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
<div className="bg-cyan-50/40 p-3 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                        Hoje
                        <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.petmovel.percentHoje >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.petmovel.percentHoje >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.petmovel.percentHoje).toFixed(1)}% </span>
                      </span>
                      <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.today} decimals={0} /></span>
                    </div>
<div className="bg-cyan-50/40 p-3 rounded-2xl">
                     <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                       Semana
                       <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.petmovel.percentSemana >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.petmovel.percentSemana >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.petmovel.percentSemana).toFixed(1)}% </span>
                     </span>
                     <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.week} decimals={0} /></span>
                   </div>
<div className="bg-cyan-100/50 p-3 rounded-2xl border border-cyan-200/50">
                     <span className="text-[10px] text-cyan-500 font-extrabold flex items-center uppercase mb-1">
                       Mês
                       <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.petmovel.percentMes >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.petmovel.percentMes >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.petmovel.percentMes).toFixed(1)}% </span>
                     </span>
                     <span className="text-base font-black text-cyan-600">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.month} decimals={0} /></span>
                   </div>
<div className="bg-cyan-50/40 p-3 rounded-2xl">
                     <span className="text-[10px] text-gray-400 font-bold flex items-center uppercase mb-1">
                       Anual
                       <span className={`flex items-center gap-0.5 ml-1 text-xs ${consolidatedMetrics.petmovel.percentAno >= 0 ? 'text-green-600' : 'text-red-600'}`}> {consolidatedMetrics.petmovel.percentAno >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {Math.abs(consolidatedMetrics.petmovel.percentAno).toFixed(1)}% </span>
                     </span>
                     <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.petmovel.year} decimals={0} /></span>
                   </div>
                </div>

                {renderLineChart(consolidatedMetrics.chart.petmovel, '#06b6d4', 'petmovel')}
              </div>

              {/* Card Creche Pet */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-purple-200">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-purple-400 rounded-full blur-2xl opacity-20"></div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-extrabold text-purple-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche Pet" className="w-6 h-6 object-contain" /> Creche Pet
                  </h4>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    consolidatedMetrics.creche.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {consolidatedMetrics.creche.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.creche.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-purple-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Hoje</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.creche.today} decimals={0} /></span>
                  </div>
                  <div className="bg-purple-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Semana</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.creche.week} decimals={0} /></span>
                  </div>
                  <div className="bg-purple-100/50 p-3 rounded-2xl border border-purple-200/50">
                    <span className="text-[10px] text-purple-500 font-extrabold block uppercase mb-1">Mês</span>
                    <span className="text-base font-black text-purple-600">R$ <AnimatedCounter value={consolidatedMetrics.creche.month} decimals={0} /></span>
                  </div>
                  <div className="bg-purple-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Anual</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.creche.year} decimals={0} /></span>
                  </div>
                </div>

                {renderLineChart(consolidatedMetrics.chart.creche, '#8b5cf6', 'creche')}
              </div>

              {/* Card Hotel Pet */}
              <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 border border-pink-100/60 shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-amber-200">
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-20 h-20 bg-amber-400 rounded-full blur-2xl opacity-20"></div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-extrabold text-amber-600 flex items-center gap-2">
                    <img src="https://cdn-icons-png.flaticon.com/512/1131/1131938.png" alt="Hotel Pet" className="w-6 h-6 object-contain" /> Hotel Pet
                  </h4>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    consolidatedMetrics.hotel.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {consolidatedMetrics.hotel.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{consolidatedMetrics.hotel.growth.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div className="bg-amber-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Hoje</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.hotel.today} decimals={0} /></span>
                  </div>
                  <div className="bg-amber-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Semana</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.hotel.week} decimals={0} /></span>
                  </div>
                  <div className="bg-amber-100/50 p-3 rounded-2xl border border-amber-200/50">
                    <span className="text-[10px] text-amber-500 font-extrabold block uppercase mb-1">Mês</span>
                    <span className="text-base font-black text-amber-600">R$ <AnimatedCounter value={consolidatedMetrics.hotel.month} decimals={0} /></span>
                  </div>
                  <div className="bg-amber-50/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Anual</span>
                    <span className="text-sm font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.hotel.year} decimals={0} /></span>
                  </div>
                </div>

                {renderLineChart(consolidatedMetrics.chart.hotel, '#f59e0b', 'hotel')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                    <Clock className="w-5 h-5" />
                    Fluxo Operacional Diário (Hoje)
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold">Timeline por horário de atendimentos realizados</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Receita Acumulada</span>
                  <span className="text-sm font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.timeline.accumulated[consolidatedMetrics.timeline.accumulated.length - 1].amount} decimals={0} /></span>
                </div>
              </div>
              {renderOperationalTimeline()}
            </div>

            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-pink-100 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <Activity className="w-5 h-5" />
                  Performance Diária
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Estatísticas acumuladas das últimas 24h</p>
              </div>

              <div className="space-y-4">
                <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest block">Ticket Médio Geral</span>
                    <span className="text-lg font-black text-pink-600">R$ 218,75</span>
                  </div>
                  <span className="text-2xl">🎟️</span>
                </div>

                <div className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block">Volume Operacional</span>
                    <span className="text-lg font-black text-cyan-600">14 Atendimentos</span>
                  </div>
                  <span className="text-2xl">🐕</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Curva de Faturamento Diário</h4>
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

          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-extrabold text-pink-700 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Cards de Análise Executiva
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">💰</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Serviço mais Lucrativo</span>
                  <span className="text-base font-black text-gray-800 leading-snug">{consolidatedMetrics.summary.serviceLucrativo}</span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Destaque do mês</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🔥</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Maior Dia Faturamento</span>
                  <span className="text-base font-black text-gray-800 leading-snug">{consolidatedMetrics.summary.maiorDiaFaturamento}</span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Pico de faturamento</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🎫</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ticket Médio Creche</span>
                  <span className="text-lg font-black text-purple-600 leading-snug">R$ {consolidatedMetrics.summary.ticketMedium.creche}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">Maior ticket recorrente</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🐾</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Atendimentos no Mês</span>
                  <span className="text-2xl font-black text-gray-800 leading-snug"><AnimatedCounter value={consolidatedMetrics.summary.totalAppointmentsCount} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Volume operacional</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">📈</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Acumulado {selectedYear}</span>
                  <span className="text-base font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={consolidatedMetrics.summary.yearTotal} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Resultado consolidado</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">⚖️</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Vs. Mês Anterior</span>
                  <span className={`text-base font-black leading-snug ${consolidatedMetrics.summary.monthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {consolidatedMetrics.summary.monthGrowth >= 0 ? '+' : ''}{consolidatedMetrics.summary.monthGrowth.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">
                  R$ {Math.abs(consolidatedMetrics.summary.monthGrowthAbs).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} {consolidatedMetrics.summary.monthGrowthAbs >= 0 ? 'a mais' : 'a menos'}
                </span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">📅</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Média Diária</span>
                  <span className="text-lg font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={consolidatedMetrics.summary.monthTotal / 30} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Média real do período</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🔮</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Projeção Próximo Mês</span>
                  <span className="text-base font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={consolidatedMetrics.summary.projection} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Crescimento de 8% est.</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🥧</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fatia de Maior Peso</span>
                  <span className="text-base font-black text-cyan-600 leading-snug">Pet Móvel ({consolidatedMetrics.summary.share.petmovel.toFixed(0)}%)</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">Alta demanda domiciliar</span>
              </div>

              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-lg">🏆</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Top Serviço Geral</span>
                  <span className="text-base font-black text-gray-800 leading-snug">{consolidatedMetrics.summary.topService}</span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Campeão em faturamento</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100 shadow-xl space-y-4">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <PieChart className="w-5 h-5" />
                  Distribuição Financeira
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Participação de cada serviço no faturamento do mês</p>
              </div>
              {renderDonutChart()}
            </div>

            <div className="lg:col-span-2">
              {renderEvolucaoChart()}
            </div>
          </div>
        </>
      ) : (
        // ==========================================
        // RENDER 2: ABA DE GASTOS OPERACIONAIS (NOVO)
        // ==========================================
        <>
          {/* SESSÃO 1: KPIs DE GASTOS */}
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-extrabold text-pink-700 flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Resultado dos Gastos no Período
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Total de Gastos */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-lg">💸</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total de Gastos</span>
                  <span className="text-2xl font-black text-red-500 leading-snug">R$ <AnimatedCounter value={expensesMetrics.total} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">Custo operacional mensal</span>
              </div>

              {/* Fixos */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-lg">🔒</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gastos Fixos</span>
                  <span className="text-lg font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={expensesMetrics.fixos} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 block mt-2">Estáveis e estruturais</span>
              </div>

              {/* Variáveis */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-cyan-50 rounded-full flex items-center justify-center text-lg">⚡</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Gastos Variáveis</span>
                  <span className="text-lg font-black text-gray-800 leading-snug">R$ <AnimatedCounter value={expensesMetrics.variaveis} decimals={0} /></span>
                </div>
                <span className="text-[10px] font-bold text-cyan-600 block mt-2">Insumos e consumo</span>
              </div>

              {/* Maior Categoria */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-lg">🔺</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Maior Categoria</span>
                  <span className="text-base font-black text-purple-600 leading-snug truncate block max-w-[130px]">{expensesMetrics.maiorCategoria.name}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-2">R$ {expensesMetrics.maiorCategoria.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
              </div>

              {/* Saldo Líquido e Margem de Lucro */}
              <div className="bg-white/80 p-5 rounded-3xl border border-pink-100/50 shadow-md flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-lg">⚖️</div>
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Saldo Líquido</span>
                  <span className={`text-lg font-black leading-none block ${expensesMetrics.saldoLiquido >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    R$ <AnimatedCounter value={expensesMetrics.saldoLiquido} decimals={0} />
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 block mt-1">Margem: {expensesMetrics.lucroEstimado.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* SESSÃO 2: FILTROS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-4 rounded-3xl border border-pink-100 shadow-lg animate-fadeIn">
            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={() => setSelectedServiceFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedServiceFilter === 'all'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedServiceFilter('petmovel')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedServiceFilter === 'petmovel'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/10754/10754045.png" alt="Pet Móvel" className="w-4 h-4 object-contain inline-block mr-1" /> Pet Móvel
              </button>
              <button
                onClick={() => setSelectedServiceFilter('creche')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedServiceFilter === 'creche'
                    ? 'bg-pink-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                }`}
              >
                <img src="https://cdn-icons-png.flaticon.com/512/11201/11201086.png" alt="Creche" className="w-4 h-4 object-contain inline-block mr-1" /> Creche
              </button>
              <button
                onClick={() => setSelectedServiceFilter('banhotosa')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedServiceFilter === 'banhotosa'
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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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
                {/* CARD DE MÉTRICAS DE ENTRADAS - Semelhante à Visão Geral */}
                <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-5 border border-pink-100/60 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-pink-600 flex items-center gap-2">
                      <img src="https://cdn-icons-png.flaticon.com/512/14969/14969909.png" alt="Banho & Tosa" className="w-5 h-5 object-contain" /> Entradas Banho & Tosa
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-pink-50/40 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Hoje</span>
                        {consolidatedMetrics.banhotosa.percentHoje !== 0 && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${consolidatedMetrics.banhotosa.percentHoje >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {consolidatedMetrics.banhotosa.percentHoje >= 0 ? '+' : ''}{consolidatedMetrics.banhotosa.percentHoje.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.today} decimals={0} /></span>
                    </div>
                    <div className="bg-pink-50/40 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Semana</span>
                        {consolidatedMetrics.banhotosa.percentSemana !== 0 && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${consolidatedMetrics.banhotosa.percentSemana >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {consolidatedMetrics.banhotosa.percentSemana >= 0 ? '+' : ''}{consolidatedMetrics.banhotosa.percentSemana.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.week} decimals={0} /></span>
                    </div>
                    <div className="bg-pink-100/50 p-2.5 rounded-xl border border-pink-200/50">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-pink-500 font-extrabold uppercase">Mês</span>
                        {consolidatedMetrics.banhotosa.percentMes !== 0 && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${consolidatedMetrics.banhotosa.percentMes >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {consolidatedMetrics.banhotosa.percentMes >= 0 ? '+' : ''}{consolidatedMetrics.banhotosa.percentMes.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black text-pink-600">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.month} decimals={0} /></span>
                    </div>
                    <div className="bg-pink-50/40 p-2.5 rounded-xl">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Anual</span>
                        {consolidatedMetrics.banhotosa.percentAno !== 0 && (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${consolidatedMetrics.banhotosa.percentAno >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {consolidatedMetrics.banhotosa.percentAno >= 0 ? '+' : ''}{consolidatedMetrics.banhotosa.percentAno.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-gray-800">R$ <AnimatedCounter value={consolidatedMetrics.banhotosa.year} decimals={0} /></span>
                    </div>
                  </div>
                </div>

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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                    item.status_pagamento === 'pago'
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

          {/* SESSÃO 4: GRÁFICOS DE BI GASTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            <div className="bg-white/70 backdrop-blur-md rounded-[2.25rem] p-6 border border-pink-100 shadow-xl space-y-4">
              <div>
                <h3 className="text-lg font-black text-pink-700 flex items-center gap-1.5">
                  <PieChart className="w-5 h-5" />
                  Distribuição de Despesas
                </h3>
                <p className="text-[10px] text-gray-400 font-bold">Participação operacional de cada serviço nos gastos</p>
              </div>
              {renderExpensesDonutChart()}
            </div>

            <div className="lg:col-span-2">
              {renderExpensesEvolucaoChart()}
            </div>
          </div>
        </>
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
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        formStatus === 'pago'
                          ? 'bg-green-100 text-green-700 border-green-300 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('pendente')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                        formStatus === 'pendente'
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
                  <span className="text-pink-600 font-extrabold">"{expenseToDelete.nome_gasto}"</span> está marcado como recorrente.<br/>
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
