
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import FiscalFeedbackModal from './FiscalFeedbackModal';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  AlertCircle,
  Send,
  Trash2
} from 'lucide-react';

interface FiscalNote {
  id: string;
  created_at: string;
  status: string;
  nfe_url_pdf: string | null;
  focus_nfe_reference: string;
  reference_id: string;
  error_message: string | null;
  raw_response: any;
  hydrated_pet_name?: string;
  hydrated_tutor_name?: string;
  hydrated_phone?: string;
  hydrated_price?: number;
}

const FiscalNotesView: React.FC = () => {
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'authorized' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [sentItems, setSentItems] = useState<Record<string, boolean>>({});
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [consultingIds, setConsultingIds] = useState<Record<string, boolean>>({});
  const [noteToDelete, setNoteToDelete] = useState<FiscalNote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fiscalFeedback, setFiscalFeedback] = useState<{
      isOpen: boolean;
      type: 'success' | 'processing' | 'error' | 'warning';
      title: string;
      message: string;
      pdfUrl?: string;
  } | null>(null);

  const handleDeleteNote = async () => {
    if (!noteToDelete || deletingId) return;
    setDeletingId(noteToDelete.id);
    try {
      const { error } = await supabase
        .from('fiscal_notes')
        .delete()
        .eq('id', noteToDelete.id);
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setNoteToDelete(null);
    } catch (err: any) {
      console.error('Erro ao excluir nota:', err);
      setFiscalFeedback({
        isOpen: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: `Não foi possível excluir a nota: ${err.message || 'Erro desconhecido'}`
      });
      setNoteToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  const handleConsultNote = async (note: FiscalNote) => {
      if (consultingIds[note.id]) return;
      setConsultingIds(prev => ({ ...prev, [note.id]: true }));

      try {
          const { data, error } = await supabase.functions.invoke('focus-nfe', {
              body: { 
                  action: 'consult',
                  focus_nfe_reference: note.focus_nfe_reference
              }
          });

          if (error) throw error;

          if (data.success) {
              const newStatus = data.status;
              const newPdfUrl = data.pdf_url;
              
              // Atualizar a lista local de notas
              setNotes(prev => prev.map(n => n.id === note.id ? { 
                  ...n, 
                  status: newStatus || n.status,
                  nfe_url_pdf: newPdfUrl || n.nfe_url_pdf,
                  raw_response: data.data || n.raw_response
              } : n));

              if (newStatus === 'autorizado') {
                  setFiscalFeedback({
                      isOpen: true,
                      type: 'success',
                      title: 'Nota Autorizada!',
                      message: `A NFS-e para a referência "${note.focus_nfe_reference.split('-').slice(0,2).join('-')}" foi autorizada com sucesso pela prefeitura!`,
                      pdfUrl: newPdfUrl
                  });
              } else if (newStatus === 'erro_autorizacao' || newStatus === 'negado') {
                  const errorMsg = data.data?.erros?.[0]?.mensagem || data.data?.mensagem || 'Erro de validação ou processamento.';
                  setFiscalFeedback({
                      isOpen: true,
                      type: 'error',
                      title: 'Erro na Autorização',
                      message: `A FocusNFe retornou que a nota falhou com o status: "${newStatus}". Detalhes: ${errorMsg}`
                  });
              } else {
                  setFiscalFeedback({
                      isOpen: true,
                      type: 'processing',
                      title: 'Ainda em Processamento',
                      message: `A NFS-e continua no status "${newStatus}". Por favor, aguarde alguns instantes e consulte novamente.`
                  });
              }
          } else {
              const errorMsg = data.error || 'Erro na consulta';
              setFiscalFeedback({
                  isOpen: true,
                  type: 'error',
                  title: 'Falha na Consulta',
                  message: `Ocorreu um erro ao consultar o status da nota: ${errorMsg}`
              });
          }
      } catch (err: any) {
          console.error('Erro ao consultar nota:', err);
          setFiscalFeedback({
              isOpen: true,
              type: 'error',
              title: 'Erro de Conectividade',
              message: `Falha na requisição da consulta: ${err.message || 'Erro indefinido'}`
          });
      } finally {
          setConsultingIds(prev => ({ ...prev, [note.id]: false }));
      }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data: notesData, error } = await supabase
        .from('fiscal_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const rawNotes = notesData || [];
      
      // Lógica de Hidratação para buscar nomes reais e contatos
      try {
        const [daycareRes, monthlyRes, apptRes, petMovelRes, hotelRes, banhoRes] = await Promise.all([
          supabase.from('daycare_enrollments').select('id, pet_name, tutor_name, contact_phone, total_price'),
          supabase.from('monthly_clients').select('id, pet_name, owner_name, whatsapp, price'),
          supabase.from('appointments').select('id, pet_name, owner_name, whatsapp, price'),
          supabase.from('pet_movel_appointments').select('id, pet_name, owner_name, whatsapp, price'),
          supabase.from('hotel_registrations').select('id, pet_name, tutor_name, tutor_phone, total_services_price'),
          supabase.from('agendamento_banhotosa').select('id, pet_name, owner_name, whatsapp, price')
        ]);
        
        const allRecords: { id: string, pet: string, tutor: string, phone: string, price: number }[] = [
          ...(daycareRes.data?.map(d => ({ id: d.id, pet: d.pet_name, tutor: d.tutor_name, phone: d.contact_phone, price: Number(d.total_price || 0) })) || []),
          ...(monthlyRes.data?.map(m => ({ id: m.id, pet: m.pet_name, tutor: m.owner_name, phone: m.whatsapp, price: Number(m.price || 0) })) || []),
          ...(apptRes.data?.map(a => ({ id: a.id, pet: a.pet_name, tutor: a.owner_name, phone: a.whatsapp, price: Number(a.price || 0) })) || []),
          ...(petMovelRes.data?.map(p => ({ id: p.id, pet: p.pet_name, tutor: p.owner_name, phone: p.whatsapp, price: Number(p.price || 0) })) || []),
          ...(hotelRes.data?.map(h => ({ id: h.id, pet: h.pet_name, tutor: h.tutor_name, phone: h.tutor_phone, price: Number(h.total_services_price || 0) })) || []),
          ...(banhoRes.data?.map(b => ({ id: b.id, pet: b.pet_name, tutor: b.owner_name, phone: b.whatsapp, price: Number(b.price || 0) })) || [])
        ];
        
        const hydrated = rawNotes.map(note => {
          const rawRef = note.reference_id || note.focus_nfe_reference || '';
          const cleanId = (rawRef.includes('-') && (rawRef.startsWith('daycare') || rawRef.startsWith('monthly') || rawRef.startsWith('appointment') || rawRef.startsWith('hotel')))
            ? rawRef.split('-').slice(1).join('-')
            : rawRef;
            
          const match = allRecords.find(r => 
            r.id === cleanId || 
            (cleanId.length > 5 && r.id.startsWith(cleanId)) ||
            (r.id.length > 5 && cleanId.startsWith(r.id))
          );
 
          if (match) {
            return {
              ...note,
              hydrated_pet_name: match.pet,
              hydrated_tutor_name: match.tutor,
              hydrated_phone: match.phone,
              hydrated_price: match.price
            };
          }
          return note;
        });
        
        setNotes(hydrated);
      } catch (hydrationErr) {
        console.error('Erro na hidratação:', hydrationErr);
        setNotes(rawNotes);
      }
    } catch (err) {
      console.error('Erro ao buscar notas fiscais:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWebhook = async (note: FiscalNote) => {
    if (sendingIds[note.id] || sentItems[note.id]) return;

    setSendingIds(prev => ({ ...prev, [note.id]: true }));

    try {
      const payload = {
        url_nota: note.nfe_url_pdf,
        nome_cliente: note.hydrated_tutor_name || note.raw_response?.nome_tomador || 'Cliente',
        telefone_cliente: note.hydrated_phone || ''
      };

      const response = await fetch('https://n8n.intelektus.tech/webhook/notaFiscal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSentItems(prev => ({ ...prev, [note.id]: true }));
      } else {
        throw new Error('Falha ao enviar webhook');
      }
    } catch (err) {
      console.error('Erro ao enviar webhook:', err);
      alert('Erro ao enviar a nota fiscal. Tente novamente.');
    } finally {
      setSendingIds(prev => ({ ...prev, [note.id]: false }));
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'authorized' && note.status === 'autorizado') ||
      (filter === 'error' && note.status === 'erro_autorizacao');
    
    const rawPetName = note.hydrated_pet_name ||
                       note.raw_response?.pet_name || 
                       note.raw_response?.descricao_servico?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                       note.raw_response?.discriminacao?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim();
    
    // Fallback: tentar extrair do nome do tomador se estiver no formato "Pet (Tutor)"
    const tomadorName = note.hydrated_tutor_name || 
                       note.raw_response?.tutor_real_name || 
                       note.raw_response?.nome_tomador || 
                       note.raw_response?.razao_social_tomador || 
                       '';
                       
    const extractedPetFromTomador = !rawPetName && tomadorName.includes('(') ? tomadorName.split('(')[0].trim() : null;
    
    const petName = rawPetName || extractedPetFromTomador || '';
    const tutorName = note.hydrated_tutor_name || 
                     note.raw_response?.tutor_real_name || 
                     (tomadorName.includes('(') ? tomadorName.match(/\(([^)]+)\)/)?.[1] : tomadorName) || 
                     'Consumidor';
    
    const customerName = `${petName} ${tutorName}`;
    const matchesSearch = customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.focus_nfe_reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'autorizado':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 size={14} /> Autorizada
          </span>
        );
      case 'erro_autorizacao':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <XCircle size={14} /> Erro
          </span>
        );
      case 'processando_autorizacao':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
            <Clock size={14} /> Processando
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Estilo Mensalistas */}
      <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br from-pink-50 to-purple-50 rounded-full blur-2xl opacity-70 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left mx-auto md:mx-0">
            <div>
              <h2 className="text-4xl font-bold text-pink-600" style={{ fontFamily: '"Lobster Two", cursive' }}>
                Notas Fiscais
              </h2>
              <p className="text-[11px] sm:text-sm text-gray-600 font-medium">Histórico de emissões e status legal</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Botão Atualizar */}
            <button 
              onClick={fetchNotes}
              className="flex items-center gap-2 px-6 py-2.5 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-all font-bold text-sm border border-pink-100 shadow-sm h-11"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Busca Integrada */}
        <div className="mt-6 relative z-10">
          <input
            type="text"
            placeholder="Buscar por pet, tutor ou referência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white shadow-sm transition-all"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filtros Fora do Cabeçalho */}
      <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-w-md mx-auto md:mx-0">
        <button 
          onClick={() => setFilter('all')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilter('authorized')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'authorized' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Autorizadas
        </button>
        <button 
          onClick={() => setFilter('error')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === 'error' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Erros
        </button>
      </div>

      {/* Lista de Notas */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            <p className="text-gray-500 font-medium animate-pulse">Carregando notas fiscais...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <FileText size={32} />
            </div>
            <p className="text-gray-400 font-bold">Nenhuma nota fiscal encontrada.</p>
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="group relative bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 border-l-4 hover:border-l-pink-500 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderLeftColor: note.status === 'autorizado' ? '#22c55e' : (note.status === 'erro_autorizacao' ? '#ef4444' : '#e5e7eb') }}
            >
              {/* Botão de excluir discreto */}
              <button
                onClick={() => setNoteToDelete(note)}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Excluir nota fiscal"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${note.status === 'autorizado' ? 'bg-green-50 text-green-600' : (note.status === 'erro_autorizacao' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400')}`}>
                  <FileText size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-black text-gray-800 uppercase tracking-tight truncate">
                    {note.hydrated_pet_name ||
                     note.raw_response?.pet_name || 
                     note.raw_response?.descricao_servico?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                     note.raw_response?.discriminacao?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                     (note.raw_response?.nome_tomador?.includes('(') ? note.raw_response.nome_tomador.split('(')[0].trim() : null) ||
                     note.raw_response?.descricao_servico ||
                     (note.focus_nfe_reference.startsWith('daycare') ? 'Creche Pet' : 
                      note.focus_nfe_reference.startsWith('monthly_client') ? 'Mensalista' : 'Serviço')}
                    <span className="ml-2 text-sm font-bold text-gray-400 normal-case">
                      ({note.hydrated_tutor_name ||
                        note.raw_response?.tutor_real_name || 
                        (note.raw_response?.nome_tomador?.includes('(') ? note.raw_response.nome_tomador.match(/\(([^)]+)\)/)?.[1] : note.raw_response?.nome_tomador) || 
                        note.raw_response?.razao_social_tomador || 
                        'Consumidor'})
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-400">
                    <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md">
                      {note.focus_nfe_reference.startsWith('daycare') ? 'Creche Pet' : 
                       note.focus_nfe_reference.startsWith('monthly_client') ? 'Mensalista' : 'Agendamento'}
                    </span>
                    <span className="opacity-30">•</span>
                    <span>{new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="opacity-30">•</span>
                    <span>{new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                      REF: {note.focus_nfe_reference.split('-').slice(0, 2).join('-')}
                    </span>
                    {note.raw_response?.nome_tomador && (
                      <span className="text-[10px] text-gray-400">
                        Tutor: {note.raw_response.nome_tomador}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Valor do Serviço</p>
                  <p className="text-lg font-black text-pink-600">
                    R$ {Number(note.hydrated_price || note.raw_response?.valor_servico || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto justify-end">
                  {note.status !== 'autorizado' && (
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {getStatusBadge(note.status)}
                      <button
                        onClick={() => handleConsultNote(note)}
                        disabled={consultingIds[note.id]}
                        className={`flex items-center gap-1 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-all shadow-sm border border-pink-100 ${consultingIds[note.id] ? 'opacity-50 cursor-wait' : ''}`}
                        title="Consultar status atualizado na FocusNFe"
                      >
                        <RefreshCw size={12} className={consultingIds[note.id] ? 'animate-spin' : ''} />
                        <span>{consultingIds[note.id] ? 'Consultando...' : 'Atualizar'}</span>
                      </button>
                    </div>
                  )}
                  {note.status === 'autorizado' && note.nfe_url_pdf && (
                    <div className="flex items-center gap-2">
                      <a 
                        href={note.nfe_url_pdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 shadow-md hover:shadow-pink-200/50 transition-all font-bold text-sm whitespace-nowrap"
                      >
                        Ver PDF <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => handleSendWebhook(note)}
                        disabled={sendingIds[note.id] || sentItems[note.id]}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-md transition-all font-bold text-sm whitespace-nowrap ${
                          sentItems[note.id] 
                            ? 'bg-green-500 text-white shadow-green-200/50 cursor-default' 
                            : 'bg-pink-600 text-white hover:bg-pink-700 shadow-pink-200/50'
                        } ${sendingIds[note.id] ? 'opacity-70 cursor-wait' : ''}`}
                      >
                        {sendingIds[note.id] ? (
                          <>
                            Enviando... <RefreshCw size={14} className="animate-spin" />
                          </>
                        ) : sentItems[note.id] ? (
                          <>
                            Enviado <CheckCircle2 size={14} />
                          </>
                        ) : (
                          <>
                            Enviar <Send size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {note.status === 'erro_autorizacao' && (
                    <button 
                      onClick={() => alert(`Erro da FocusNFe: ${JSON.stringify(note.raw_response?.erros || note.error_message)}`)}
                      className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase hover:underline"
                    >
                      <AlertCircle size={12} /> Ver Detalhes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {fiscalFeedback && fiscalFeedback.isOpen && (
        <FiscalFeedbackModal
          isOpen={fiscalFeedback.isOpen}
          onClose={() => setFiscalFeedback(prev => prev ? { ...prev, isOpen: false } : null)}
          type={fiscalFeedback.type}
          title={fiscalFeedback.title}
          message={fiscalFeedback.message}
          pdfUrl={fiscalFeedback.pdfUrl}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center gap-5 animate-[fadeInScale_0.2s_ease]">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
              <Trash2 size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-gray-800 mb-2">Excluir Nota Fiscal?</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                A nota de <span className="font-bold text-gray-700">{noteToDelete.hydrated_pet_name || noteToDelete.raw_response?.pet_name || 'este registro'}</span> será
                removida permanentemente do sistema. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setNoteToDelete(null)}
                disabled={!!deletingId}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteNote}
                disabled={!!deletingId}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
              >
                {deletingId ? (
                  <><RefreshCw size={16} className="animate-spin" /> Excluindo...</>
                ) : (
                  <><Trash2 size={16} /> Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalNotesView;
