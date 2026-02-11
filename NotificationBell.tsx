import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  Calendar, 
  Truck, 
  Home, 
  Dog,
  Clock,
  MoreVertical
} from 'lucide-react';

type NotificationItem = {
  id: number;
  type: 'appointment' | 'pet_movel' | 'daycare' | 'hotel' | string;
  data: any;
  read: boolean;
  created_at: string;
};

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  appointment: { 
    label: 'Banho & Tosa', 
    icon: Calendar, 
    color: 'text-pink-600', 
    bg: 'bg-pink-100' 
  },
  pet_movel: { 
    label: 'Pet Móvel', 
    icon: Truck, 
    color: 'text-purple-600', 
    bg: 'bg-purple-100' 
  },
  daycare: { 
    label: 'Creche', 
    icon: Dog, 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-100' 
  },
  hotel: { 
    label: 'Hotel Pet', 
    icon: Home, 
    color: 'text-blue-600', 
    bg: 'bg-blue-100' 
  },
  default: { 
    label: 'Notificação', 
    icon: Bell, 
    color: 'text-gray-600', 
    bg: 'bg-gray-100' 
  }
};

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('notifications_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        setNotifications(prev => [payload.new as NotificationItem, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setNotifications(data as NotificationItem[]);
    setLoading(false);
  };

  const markAsRead = async (id: number) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = async () => {
    if (!window.confirm('Deseja limpar todas as notificações?')) return;
    await supabase.from('notifications').delete().gte('id', 0);
    setNotifications([]);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Agora mesmo';
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2.5 rounded-xl transition-all duration-300 group
          ${isOpen ? 'bg-pink-50 text-pink-600 shadow-sm' : 'hover:bg-gray-50 text-gray-600 hover:text-pink-600'}
        `}
      >
        <Bell className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-12 scale-110' : 'group-hover:scale-105'}`} />
        
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-600 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <div className={`
        fixed left-4 right-4 top-24 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 md:w-96 
        bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 
        transform transition-all duration-200 origin-top-right z-50 overflow-hidden
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
      `}>
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 text-lg">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} NOVA{unreadCount !== 1 && 'S'}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={markAllAsRead}
              title="Marcar todas como lidas"
              className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={clearAll}
              title="Limpar histórico"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
              <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Bell className="w-6 h-6 text-gray-300" />
              </div>
              <h4 className="text-gray-900 font-semibold mb-1">Tudo tranquilo!</h4>
              <p className="text-gray-500 text-sm">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((item) => {
                const config = typeConfig[item.type] || typeConfig.default;
                const Icon = config.icon;
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`
                      group relative px-5 py-4 transition-all duration-200 hover:bg-white cursor-pointer
                      ${!item.read ? 'bg-white' : 'bg-gray-50/50 opacity-75 hover:opacity-100'}
                    `}
                  >
                    {!item.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-pink-600" />
                    )}
                    
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`
                        flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm
                        ${config.bg} ${config.color}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {config.label}
                          </p>
                          <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-100 shadow-sm">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 leading-snug">
                          {item.data?.pet_name && (
                            <span className="font-medium text-gray-800 block mb-0.5">
                              {item.data.pet_name}
                            </span>
                          )}
                          <span className="text-gray-500">
                            {item.data?.service || 'Novo agendamento realizado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-2 border-t border-gray-100 text-center">
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors uppercase tracking-wide"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
