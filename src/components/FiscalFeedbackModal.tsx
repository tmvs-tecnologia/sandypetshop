import React from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  ExternalLink, 
  X 
} from 'lucide-react';

interface FiscalFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'processing' | 'error' | 'warning';
    title: string;
    message: string;
    pdfUrl?: string;
}

const FiscalFeedbackModal: React.FC<FiscalFeedbackModalProps> = ({
    isOpen,
    onClose,
    type,
    title,
    message,
    pdfUrl
}) => {
    if (!isOpen) return null;

    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    bgGradient: 'from-emerald-500 to-teal-400',
                    icon: <CheckCircle2 className="w-12 h-12 text-white animate-[scaleIn_0.5s_ease-out]" />,
                    accentBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    btnBg: 'from-emerald-500 to-teal-600 shadow-emerald-200 hover:shadow-emerald-300',
                    iconBg: 'bg-white/20 border-white/30',
                };
            case 'processing':
                return {
                    bgGradient: 'from-indigo-500 to-blue-400',
                    icon: <Loader2 className="w-12 h-12 text-white animate-spin" />,
                    accentBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                    btnBg: 'from-indigo-500 to-blue-600 shadow-indigo-200 hover:shadow-indigo-300',
                    iconBg: 'bg-white/20 border-white/30',
                };
            case 'error':
                return {
                    bgGradient: 'from-rose-500 to-red-400',
                    icon: <XCircle className="w-12 h-12 text-white animate-[bounce_0.8s_ease-in-out]" />,
                    accentBg: 'bg-rose-50 text-rose-700 border-rose-100',
                    btnBg: 'from-rose-500 to-red-600 shadow-rose-200 hover:shadow-rose-300',
                    iconBg: 'bg-white/20 border-white/30',
                };
            case 'warning':
                return {
                    bgGradient: 'from-amber-500 to-orange-400',
                    icon: <AlertTriangle className="w-12 h-12 text-white animate-[pulse_1.5s_infinite]" />,
                    accentBg: 'bg-amber-50 text-amber-800 border-amber-100',
                    btnBg: 'from-amber-500 to-orange-600 shadow-amber-200 hover:shadow-amber-300',
                    iconBg: 'bg-white/20 border-white/30',
                };
        }
    };

    const config = getConfig();

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-950/50 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn border border-gray-100/50 relative">
                {/* Header com Gradiente Temático */}
                <div className={`relative h-32 bg-gradient-to-br ${config.bgGradient} flex items-center justify-center`}>
                    <div className="absolute top-0 right-0 p-4 z-10">
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className={`p-4 rounded-full backdrop-blur-xl border shadow-inner ${config.iconBg}`}>
                        {config.icon}
                    </div>
                    
                    {/* Elementos Decorativos de Fundo */}
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="absolute top-0 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                </div>

                {/* Conteúdo */}
                <div className="px-8 pt-8 pb-8 text-center flex flex-col items-center">
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-3">
                        {title}
                    </h3>
                    
                    {/* Mensagem principal */}
                    <div className={`rounded-2xl p-4 mb-6 border text-sm leading-relaxed ${config.accentBg} w-full`}>
                        {message}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2.5 w-full">
                        {type === 'success' && pdfUrl && (
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-pink-200 hover:shadow-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={18} />
                                Visualizar PDF da NFS-e
                            </a>
                        )}
                        
                        <button
                            onClick={onClose}
                            className={`w-full py-4 bg-gradient-to-r ${config.btnBg} text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FiscalFeedbackModal;
