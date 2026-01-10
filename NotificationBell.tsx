import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellIcon, BellAlertIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';

type NotificationItem = {
  id: number;
  type: 'appointment' | 'pet_movel' | 'daycare' | 'hotel' | string;
  data: any;
  read: boolean;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  appointment: 'Novo agendamento (Banho & Tosa)',
  pet_movel: 'Novo agendamento (Pet Móvel)',
  daycare: 'Nova matrícula (Creche)',
  hotel: 'Nova reserva (Hotel Pet)'
};

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) {
        setItems(data as NotificationItem[]);
      }
      setLoading(false);
    };
    fetchInitial();

    const channel = supabase
      .channel('notifications_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const newItem = payload.new as NotificationItem;
        setItems(prev => [newItem, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Prevent background scroll when the notifications panel is open
  useEffect(() => {
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [open]);

  const markRead = async (id: number) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (!error) setItems(prev => prev.map(i => (i.id === id ? { ...i, read: true } : i)));
  };

  const markAllRead = async () => {
    const ids = items.filter(i => !i.read).map(i => i.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', ids);
    if (!error) setItems(prev => prev.map(i => ({ ...i, read: true })));
  };

  const clearAll = async () => {
    const confirmed = window.confirm('Tem certeza que deseja limpar todas as notificações? Esta ação removerá o histórico.');
    if (!confirmed) return;
    // Delete all notifications records
    const { error } = await supabase.from('notifications').delete().gte('id', 0);
    if (!error) {
      setItems([]);
    }
  };

  const formatApptDateTime = (n: NotificationItem) => {
    const d = (n.data?.appointment_time || n.data?.scheduled_at || n.data?.date || null) as string | null;
    const combined = n.data?.appointment_date && n.data?.appointment_hour
      ? `${n.data.appointment_date}T${n.data.appointment_hour}`
      : null;
    const target = d || combined;
    try {
      const ref = target ? new Date(target) : new Date(n.created_at);
      return ref.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return new Date(n.created_at).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  };

  const renderDescription = (n: NotificationItem) => {
    const pet = n.data?.pet_name;
    const tutor = n.data?.owner_name || n.data?.tutor_name;
    const service = n.data?.service;
    const when = formatApptDateTime(n);
    return (
      <div className="flex flex-wrap gap-1">
        {pet && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700">🐶 {pet}</span>
        )}
        {tutor && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">👤 {tutor}</span>
        )}
        {service && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">🧼 {service}</span>
        )}
        {when && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">🗓 {when}</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow ${
          open ? 'text-pink-700 bg-pink-50' : 'text-gray-700 bg-white hover:bg-pink-50 hover:text-pink-700'
        }`}
        aria-label="Notificações"
        title="Notificações"
      >
        {unreadCount > 0 ? <BellAlertIcon className="h-5 w-5"/> : <BellIcon className="h-5 w-5"/>}
        <span className="hidden md:inline">Notificações</span>
        {unreadCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center text-xs font-bold text-white bg-pink-600 rounded-full min-w-6 h-6 px-2">
            {unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-start justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="absolute inset-0 bg-gray-800/40" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="relative w-full max-w-[95vw] sm:max-w-md md:max-w-lg bg-white border border-pink-100 rounded-2xl shadow-xl p-3">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="font-semibold text-pink-800">Central de Notificações</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-2 text-xs font-semibold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded-lg"
                >
                  <CheckIcon className="h-4 w-4"/> Marcar todas como lidas
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg"
                  title="Limpar todas as notificações"
                >
                  <TrashIcon className="h-4 w-4"/> Limpar todas
                </button>
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto mt-2 divide-y divide-gray-100">
              {loading && (
                <div className="p-4 text-gray-500 text-sm">Carregando...</div>
              )}
              {!loading && items.length === 0 && (
                <div className="p-4 text-gray-500 text-sm">Sem notificações por enquanto.</div>
              )}
              {items.map(n => (
                <div key={n.id} className={`p-3 flex items-start gap-3 ${n.read ? 'bg-white' : 'bg-pink-50'}`}>
                  <div className="mt-0.5">
                    {n.type === 'daycare' || n.type === 'hotel' ? (
                      <BellIcon className="h-5 w-5 text-pink-600"/>
                    ) : (
                      <BellAlertIcon className="h-5 w-5 text-pink-600"/>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{typeLabels[n.type] ?? 'Nova notificação'}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{renderDescription(n)}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })}</div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="text-xs font-semibold text-pink-700 bg-pink-100 hover:bg-pink-200 px-2 py-1 rounded-lg"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
