import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, BellRing } from 'lucide-react';
import { cn } from '../lib/utils';

interface MonthlyReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MonthlyReminderModal: React.FC<MonthlyReminderModalProps> = ({ isOpen, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Get current month key for localStorage (e.g., "2026-03")
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const storageKey = `monthly_payment_reminder_completed_${currentMonthKey}`;

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      // Check if already completed in this session/render
      const completed = localStorage.getItem(storageKey) === 'true';
      setIsCompleted(completed);
    }
  }, [isOpen, storageKey]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const handleToggleComplete = () => {
    const newVal = !isCompleted;
    setIsCompleted(newVal);
    if (newVal) {
      localStorage.setItem(storageKey, 'true');
      // Auto close after completion with a slight delay for satisfaction
      setTimeout(handleClose, 800);
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300 ease-out",
      isOpen && !isClosing ? "opacity-100 backdrop-blur-sm bg-black/40" : "opacity-0 backdrop-blur-0 bg-transparent pointer-events-none"
    )}>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes modalEnter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes modalExit {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.9) translateY(20px); }
        }
        .animate-modal-enter { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-modal-exit { animation: modalExit 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
      
      <div className={cn(
        "relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden",
        isOpen && !isClosing ? "animate-modal-enter" : "animate-modal-exit"
      )}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-16 -mt-16 blur-2xl opacity-60" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-50 rounded-full -ml-12 -mb-12 blur-2xl opacity-60" />
        
        <div className="relative p-8 md:p-10 flex flex-col items-center text-center">
          {/* Header Icon */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-pink-100 rounded-full scale-150 blur-xl opacity-40 animate-pulse" />
            <div className="relative bg-gradient-to-br from-pink-500 to-purple-600 p-5 rounded-3xl shadow-lg ring-8 ring-pink-50 animate-float">
              <BellRing className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-4xl font-bold text-gray-800 mb-4" 
            style={{ fontFamily: "'Lobster Two', cursive" }}
          >
            Lembrete Mensal
          </h2>
          
          {/* Content */}
          <div className="space-y-4 mb-8">
            <p className="text-lg text-gray-600 leading-relaxed font-medium">
              Atenção, administrador! O dia 30 está se aproximando.
            </p>
            <div className="bg-pink-50/50 p-6 rounded-3xl border border-pink-100/50">
              <p className="text-pink-800 font-semibold text-lg">
                Mude o status de pagamento dos mensalistas para <span className="underline decoration-pink-300 underline-offset-4 font-bold">"Pendente"</span> para garantir que as cobranças sejam geradas corretamente.
              </p>
            </div>
          </div>

          {/* Action Area */}
          <div className="w-full space-y-4">
            <button
              onClick={handleToggleComplete}
              className={cn(
                "w-full flex items-center justify-center gap-3 p-5 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                isCompleted 
                  ? "bg-green-500 text-white shadow-green-100 shadow-xl" 
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100"
              )}
            >
              <div className={cn(
                "p-1 rounded-full transition-all duration-300",
                isCompleted ? "bg-white/20" : "bg-gray-200 group-hover:bg-gray-300"
              )}>
                <CheckCircle2 className={cn("w-6 h-6", isCompleted ? "text-white" : "text-gray-400")} />
              </div>
              <span className="text-xl font-bold font-outfit">
                {isCompleted ? "Tudo Pronto!" : "Marcar como Concluído"}
              </span>
              
              {/* Shine effect on hover */}
              {!isCompleted && (
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              )}
            </button>

            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 font-medium transition-colors p-2"
            >
              Lembrar mais tarde
            </button>
          </div>
        </div>

        {/* Close Button UI */}
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default MonthlyReminderModal;
