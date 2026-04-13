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
  MoreVertical,
  Star
} from 'lucide-react';

type NotificationItem = {
  id: number;
  type: 'appointment' | 'pet_movel' | 'daycare' | 'hotel' | string;
  data: any;
  read: boolean;
  created_at: string;
};

const typeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  appointment: { 
    label: 'Banho & Tosa', 
    icon: 'https://cdn-icons-png.flaticon.com/512/14969/14969909.png', 
    color: 'text-pink-600', 
    bg: 'bg-pink-50' 
  },
  pet_movel: { 
    label: 'Pet Móvel', 
    icon: 'https://cdn-icons-png.flaticon.com/512/10754/10754045.png', 
    color: 'text-purple-600', 
    bg: 'bg-purple-50' 
  },
  daycare: { 
    label: 'Creche', 
    icon: 'https://cdn-icons-png.flaticon.com/512/11201/11201086.png', 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-50' 
  },
  visit: { 
    label: 'Visita', 
    icon: 'https://cdn-icons-png.flaticon.com/512/2196/2196747.png', 
    color: 'text-blue-600', 
    bg: 'bg-blue-50' 
  },
  hotel: { 
    label: 'Hotel Pet', 
    icon: 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png', // Usando um ícone padrão de pet para hotel se não houver um específico
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50' 
  },
  feedback: { 
    label: 'Nova Avaliação', 
    icon: 'https://cdn-icons-png.flaticon.com/512/11516/11516013.png', 
    color: 'text-amber-500', 
    bg: 'bg-amber-50' 
  },
  default: { 
    label: 'Notificação', 
    icon: 'https://cdn-icons-png.flaticon.com/512/9344/9344449.png', // Ícone de sino genérico da flaticon
    color: 'text-gray-600', 
    bg: 'bg-gray-100' 
  }
};

export interface NotificationBellProps {
  onViewFeedbacks?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onViewFeedbacks }) => {
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
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to format appointment dates and times from the data object
  const getScheduledDateLabel = (data: any) => {
    if (!data) return null;

    if (data.appointment_time) {
      const d = new Date(data.appointment_time);
      const day = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const capDay = day.charAt(0).toUpperCase() + day.slice(1);
      const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${capDay} às ${time}`;
    }

    if (data.date) {
      const d = new Date(data.date);
      // workaround timezone issues with YYYY-MM-DD
      const day = new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const capDay = day.charAt(0).toUpperCase() + day.slice(1);
      if (data.time) {
         return `${capDay} às ${data.time.substring(0, 5)}`;
      }
      return capDay;
    }

    return null;
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
        bg-white rounded-[2rem] shadow-2xl shadow-pink-200/40 border border-pink-100/50 
        transform transition-all duration-300 z-50 overflow-hidden
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'}
        
        fixed top-[5rem] left-4 right-4 origin-top
        sm:absolute sm:top-full sm:mt-3 sm:left-auto sm:-right-2 sm:w-[24rem] md:w-[26rem] sm:origin-top-right
      `}>
        {/* Background decorative element */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

        {/* Header */}
        <div className="bg-white/60 backdrop-blur-xl px-6 py-5 border-b border-pink-50/80 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="p-2 bg-pink-50 rounded-xl hidden sm:block">
              <Bell className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-outfit font-bold text-gray-800 text-lg tracking-tight whitespace-nowrap">Notificações</h3>
            {unreadCount > 0 && (
              <span className="bg-gradient-to-r from-pink-500 to-rose-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap flex-shrink-0 ml-1">
                {unreadCount} NOVA{unreadCount !== 1 && 'S'}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button 
              onClick={markAllAsRead}
              title="Marcar todas como lidas"
              className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={clearAll}
              title="Limpar histórico"
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-white/40 relative z-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-4">
              <div className="w-8 h-8 border-2 border-pink-100 border-t-pink-500 rounded-full animate-spin" />
              <span className="text-sm font-medium text-pink-900/60">Buscando novidades...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="bg-pink-50 p-5 rounded-full mb-4 shadow-inner">
                <Bell className="w-8 h-8 text-pink-300" />
              </div>
              <h4 className="text-gray-800 font-outfit font-bold text-lg mb-1">Tudo tranquilo por aqui! 🐾</h4>
              <p className="text-gray-500 text-sm leading-relaxed">Você não tem novas notificações no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-pink-50/50">
              {notifications.map((item) => {
                const config = typeConfig[item.type] || typeConfig.default;
                const Icon = config.icon as React.ElementType;
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    className={`
                      group relative px-6 py-5 transition-all duration-300 hover:bg-pink-50/30 cursor-pointer
                      ${!item.read ? 'bg-white' : 'bg-gray-50/30 opacity-80 hover:opacity-100'}
                    `}
                  >
                    {!item.read && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 rounded-r-full bg-gradient-to-b from-pink-400 to-rose-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                    )}
                    
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`
                        flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-white/50
                        ${config.bg}
                      `}>
                        {typeof Icon === 'string' ? (
                          <img src={Icon} alt={config.label} className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <Icon className={`w-6 h-6 ${config.color}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-outfit font-bold text-gray-800 truncate group-hover:text-pink-600 transition-colors">
                            {config.label}
                          </p>
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100 shadow-sm whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.created_at)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 leading-relaxed">
                          {item.data?.pet_name && (
                            <span className="font-semibold text-gray-800 block mb-0.5">
                              {item.data.pet_name} 🐶
                            </span>
                          )}
                          <span className="text-gray-500 line-clamp-2">
                            {item.data?.service || 'Novo agendamento realizado'}
                          </span>
                          
                          {/* Exibição da Data e Hora do Agendamento */}
                          {getScheduledDateLabel(item.data) && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-pink-700 bg-pink-50/80 inline-flex px-2.5 py-1 rounded-lg border border-pink-100/50">
                              <Calendar className="w-3.5 h-3.5" />
                              {getScheduledDateLabel(item.data)}
                            </div>
                          )}

                          {/* Botão de Ação para Avaliações */}
                          {item.type === 'feedback' && onViewFeedbacks && (
                            <div className="mt-3">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(item.id);
                                  onViewFeedbacks();
                                  setIsOpen(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-pink-100/50 shadow-sm"
                              >
                                <Star className="w-3.5 h-3.5 fill-pink-600" />
                                Visualizar Avaliação
                              </button>
                            </div>
                          )}
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
        <div className="bg-white/80 backdrop-blur-md p-3 border-t border-pink-50/80 text-center relative z-10">
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 text-xs font-bold text-pink-600 hover:text-white hover:bg-pink-500 rounded-xl transition-all duration-300 uppercase tracking-wider"
          >
            Fechar Notificações
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
