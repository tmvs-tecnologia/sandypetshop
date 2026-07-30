import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowsRightLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { AdminAppointment } from '../../types';

interface MigrateAppointmentModalProps {
  isOpen: boolean;
  appointment: AdminAppointment | null;
  onClose: () => void;
  onConfirm: (condominium?: string) => Promise<void>;
  isLoading?: boolean;
}

const CONDOMINIUM_OPTIONS = [
  'Vitta Parque',
  'Max Haus',
  'Paseo',
  'Outro'
];

export const MigrateAppointmentModal: React.FC<MigrateAppointmentModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [selectedCondo, setSelectedCondo] = useState<string>('Vitta Parque');
  const [customCondo, setCustomCondo] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (appointment) {
      // Se tiver condomínio existente e for válido, pré-seleciona
      if (appointment.condominium && CONDOMINIUM_OPTIONS.includes(appointment.condominium)) {
        setSelectedCondo(appointment.condominium);
      } else if (appointment.condominium && appointment.condominium !== 'Banho & Tosa Fixo') {
        setSelectedCondo('Outro');
        setCustomCondo(appointment.condominium);
      } else {
        setSelectedCondo('Vitta Parque');
        setCustomCondo('');
      }
      setError('');
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  // Identifica a direção da migração
  const isCurrentlyMobile = appointment.table === 'pet_movel_appointments' || 
    (appointment.condominium && appointment.condominium !== 'Banho & Tosa Fixo' && !appointment.condominium.toUpperCase().includes('FIXO')) ||
    (appointment.service && appointment.service.toUpperCase().includes('MÓVEL'));

  const targetCategory = isCurrentlyMobile ? 'Banho & Tosa Fixo' : 'Pet Móvel';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalCondo = 'Banho & Tosa Fixo';
    if (!isCurrentlyMobile) {
      // Migrando para Pet Móvel -> precisa de condomínio
      finalCondo = selectedCondo === 'Outro' ? customCondo.trim() : selectedCondo;
      if (!finalCondo) {
        setError('Por favor, informe o condomínio para o Pet Móvel.');
        return;
      }
    }

    try {
      await onConfirm(finalCondo);
    } catch (err: any) {
      setError(err?.message || 'Erro ao realizar a migração.');
    }
  };

  const formattedDate = appointment.appointment_time
    ? new Date(appointment.appointment_time).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Data não informada';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ArrowsRightLeftIcon className="w-6 h-6" />
            <span>Migrar Agendamento</span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Card Resumo do Agendamento */}
          <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 text-base">{appointment.pet_name}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-pink-100 text-pink-700">
                {isCurrentlyMobile ? 'Pet Móvel' : 'Banho & Tosa'} ➔ {targetCategory}
              </span>
            </div>
            <div className="text-gray-600 text-xs space-y-1">
              <p>👤 <strong>Tutor:</strong> {appointment.owner_name}</p>
              <p>📅 <strong>Data & Hora:</strong> {formattedDate}</p>
              <p>✂️ <strong>Serviço:</strong> {appointment.service}</p>
            </div>
          </div>

          {/* Se migrando para Pet Móvel: Exibe seleção de Condomínio */}
          {!isCurrentlyMobile ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                <span className="flex items-center gap-1.5 mb-1 text-pink-700 font-bold">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  Condomínio de Destino (Pet Móvel)
                </span>
                Selecione o condomínio onde será realizado o atendimento móvel:
              </label>

              <select
                value={selectedCondo}
                onChange={(e) => setSelectedCondo(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium text-gray-800"
              >
                {CONDOMINIUM_OPTIONS.map((condo) => (
                  <option key={condo} value={condo}>
                    {condo}
                  </option>
                ))}
              </select>

              {selectedCondo === 'Outro' && (
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Digite o nome do condomínio..."
                    value={customCondo}
                    onChange={(e) => setCustomCondo(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-xl">
              💡 Este agendamento será migrado do <strong>Pet Móvel</strong> para o <strong>Banho & Tosa Fixo</strong>. O condomínio será definido como <em>Banho & Tosa Fixo</em>.
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  <span>Confirmar Migração</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MigrateAppointmentModal;
