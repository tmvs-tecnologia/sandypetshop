
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface FiscalNote {
  id: string;
  created_at: string;
  status: string;
  nfe_url_pdf: string | null;
  focus_nfe_reference: string;
  error_message: string | null;
  raw_response: any;
}

const FiscalNotesView: React.FC = () => {
  const [notes, setNotes] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'authorized' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fiscal_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Erro ao buscar notas fiscais:', err);
    } finally {
      setLoading(false);
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
    
    const rawPetName = note.raw_response?.pet_name || 
                       note.raw_response?.descricao_servico?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                       note.raw_response?.discriminacao?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim();
    
    // Fallback: tentar extrair do nome do tomador se estiver no formato "Pet (Tutor)"
    const tomadorName = note.raw_response?.nome_tomador || note.raw_response?.razao_social_tomador || '';
    const extractedPetFromTomador = !rawPetName && tomadorName.includes('(') ? tomadorName.split('(')[0].trim() : null;
    
    const petName = rawPetName || extractedPetFromTomador || '';
    const tutorName = note.raw_response?.tutor_real_name || (tomadorName.includes('(') ? tomadorName.match(/\(([^)]+)\)/)?.[1] : tomadorName) || 'Consumidor';
    
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
      {/* Header Premium */}
      <div className="flex flex-col items-center justify-center text-center gap-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-purple-500" />
        <div>
          <h2 className="text-4xl font-bold text-pink-600" style={{ fontFamily: '"Lobster Two", cursive' }}>
            Notas Fiscais
          </h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Histórico de emissões e status legal</p>
        </div>
        <button 
          onClick={fetchNotes}
          className="flex items-center gap-2 px-6 py-2.5 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-all font-bold text-sm border border-pink-100 shadow-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Atualizar Lista
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilter('authorized')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'authorized' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Autorizadas
          </button>
          <button 
            onClick={() => setFilter('error')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'error' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Erros
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por pet, tutor ou referência..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-gray-700 font-medium"
          />
        </div>
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
              className="group bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 border-l-4 hover:border-l-pink-500 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderLeftColor: note.status === 'autorizado' ? '#22c55e' : (note.status === 'erro_autorizacao' ? '#ef4444' : '#e5e7eb') }}
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${note.status === 'autorizado' ? 'bg-green-50 text-green-600' : (note.status === 'erro_autorizacao' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400')}`}>
                  <FileText size={24} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-black text-gray-800 uppercase tracking-tight truncate">
                    {note.raw_response?.pet_name || 
                     note.raw_response?.descricao_servico?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                     note.raw_response?.discriminacao?.match(/Pet:\s*([^-\n|.]+)/i)?.[1]?.trim() ||
                     (note.raw_response?.nome_tomador?.includes('(') ? note.raw_response.nome_tomador.split('(')[0].trim() : null) ||
                     note.raw_response?.descricao_servico ||
                     (note.focus_nfe_reference.startsWith('daycare') ? 'Creche Pet' : 
                      note.focus_nfe_reference.startsWith('monthly_client') ? 'Mensalista' : 'Serviço')}
                    <span className="ml-2 text-sm font-bold text-gray-400 normal-case">
                      ({note.raw_response?.tutor_real_name || 
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
                    R$ {note.raw_response?.valor_servico ? Number(note.raw_response.valor_servico).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                  </p>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto justify-end">
                  {getStatusBadge(note.status)}
                  {note.status === 'autorizado' && note.nfe_url_pdf ? (
                    <a 
                      href={note.nfe_url_pdf} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 shadow-md hover:shadow-pink-200/50 transition-all font-bold text-sm whitespace-nowrap"
                    >
                      Ver PDF <ExternalLink size={14} />
                    </a>
                  ) : note.status === 'erro_autorizacao' ? (
                    <button 
                      onClick={() => alert(`Erro da FocusNFe: ${JSON.stringify(note.raw_response?.erros || note.error_message)}`)}
                      className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase hover:underline"
                    >
                      <AlertCircle size={12} /> Ver Detalhes
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FiscalNotesView;
