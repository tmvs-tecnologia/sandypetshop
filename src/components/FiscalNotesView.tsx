
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
    
    const customerName = note.raw_response?.razao_social_tomador || 'Consumidor';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-700 tracking-tight">
            NOTAS FISCAIS
          </h2>
          <p className="text-gray-400 text-sm font-medium">Histórico de emissões e status legal</p>
        </div>
        <button 
          onClick={fetchNotes}
          className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-all font-bold text-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Atualizar
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
            placeholder="Buscar por cliente ou referência..." 
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${note.status === 'autorizado' ? 'bg-green-50 text-green-600' : (note.status === 'erro_autorizacao' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400')}`}>
                  <FileText size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-black text-gray-800 uppercase tracking-tight">
                    {note.raw_response?.razao_social_tomador || 'Consumidor'}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <span>{new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="opacity-30">•</span>
                    <span>{new Date(note.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="opacity-30">•</span>
                    <span className="font-mono text-[10px]">{note.focus_nfe_reference.slice(-8)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Valor do Serviço</p>
                  <p className="text-lg font-black text-gray-800">
                    R$ {note.raw_response?.valor_servico || '0,00'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(note.status)}
                  {note.status === 'autorizado' && note.nfe_url_pdf ? (
                    <a 
                      href={note.nfe_url_pdf} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 shadow-md hover:shadow-pink-200/50 transition-all font-bold text-sm"
                    >
                      Ver PDF <ExternalLink size={14} />
                    </a>
                  ) : note.status === 'erro_autorizacao' ? (
                    <button 
                      onClick={() => alert(`Erro da FocusNFe: ${JSON.stringify(note.raw_response?.erros || note.error_message)}`)}
                      className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase hover:underline"
                    >
                      <AlertCircle size={12} /> Ver Detalhes do Erro
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
