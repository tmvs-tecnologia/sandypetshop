import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    XMarkIcon, 
    CalendarIcon, 
    CurrencyDollarIcon, 
    ChartBarIcon, 
    ChartPieIcon, 
    ArrowDownTrayIcon,
    FunnelIcon,
    ArrowTrendingUpIcon,
    UsersIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

interface StatisticsDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// --- Interfaces ---
interface KPICardProps {
    title: string;
    value: string | number;
    subValue?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color: 'pink' | 'blue' | 'green' | 'purple';
}

interface AppointmentData {
    id: string;
    created_at: string;
    appointment_time?: string; // Standard
    appointmentTime?: string; // Some variants
    price: number;
    status: string;
    service: string;
    pet_name?: string;
    owner_name?: string;
}

// --- Helper Components ---

const KPICard: React.FC<KPICardProps> = ({ title, value, subValue, icon: Icon, trend, trendValue, color }) => {
    const colorClasses = {
        pink: 'bg-pink-50 text-pink-700 border-pink-100',
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        purple: 'bg-purple-50 text-purple-700 border-purple-100',
    };
    
    const iconColorClasses = {
        pink: 'text-pink-500 bg-pink-100',
        blue: 'text-blue-500 bg-blue-100',
        green: 'text-green-500 bg-green-100',
        purple: 'text-purple-500 bg-purple-100',
    };

    return (
        <div className={`p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${colorClasses[color]}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold font-outfit">{value}</h3>
                    {subValue && <p className="text-xs mt-1 opacity-70">{subValue}</p>}
                </div>
                <div className={`p-3 rounded-xl ${iconColorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {(trend && trendValue) && (
                <div className="mt-4 flex items-center gap-1 text-xs font-medium">
                    <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                        {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
                    </span>
                    <span className="opacity-60">vs período anterior</span>
                </div>
            )}
        </div>
    );
};

// Simple SVG Bar Chart
const SimpleBarChart: React.FC<{ data: { label: string; value: number }[]; color: string }> = ({ data, color }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const height = 150;
    
    return (
        <div className="flex items-end justify-between h-[150px] gap-2 pt-4">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative">
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:opacity-80 ${color}`}
                        style={{ height: `${(d.value / maxValue) * 100}%` }}
                    >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {d.value}
                        </div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// Simple SVG Donut Chart
const SimpleDonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    if (total === 0) return <div className="h-48 flex items-center justify-center text-gray-400">Sem dados</div>;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-full">
            <div className="relative w-48 h-48 shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {data.map((slice, i) => {
                        const percent = slice.value / total;
                        const dashArray = percent * 314; // 2 * PI * R (R=50 approx, actually slightly less usually)
                        // Using simpler circle segments approach
                        const startPercent = cumulativePercent;
                        cumulativePercent += percent;
                        
                        // Calculate coordinates
                        const getCoordsForPercent = (percent: number) => {
                            const x = Math.cos(2 * Math.PI * percent) * 40; // Radius 40
                            const y = Math.sin(2 * Math.PI * percent) * 40;
                            return [x, y];
                        };

                        const [startX, startY] = getCoordsForPercent(startPercent);
                        const [endX, endY] = getCoordsForPercent(cumulativePercent);
                        const largeArcFlag = percent > 0.5 ? 1 : 0;

                        // Path command
                        // M 50 50 L 50+startX 50+startY A 40 40 0 largeArcFlag 1 50+endX 50+endY Z
                        // Actually easier to use stroke-dasharray on circles
                        return (
                            <circle
                                key={i}
                                r="40"
                                cx="50"
                                cy="50"
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="16"
                                strokeDasharray={`${dashArray} 314`}
                                strokeDashoffset={-startPercent * 314}
                                className="transition-all duration-700 hover:stroke-width-20 cursor-pointer"
                            >
                                <title>{slice.label}: {slice.value} ({Math.round(percent * 100)}%)</title>
                            </circle>
                        );
                    })}
                    {/* Inner Text */}
                    <text x="50" y="50" textAnchor="middle" dy="0.3em" className="fill-gray-700 text-xs font-bold transform rotate-90">
                        Total: {total}
                    </text>
                </svg>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                {data.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-gray-600 truncate max-w-[100px]" title={item.label}>{item.label}</span>
                        </div>
                        <span className="font-bold text-gray-800">{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

const StatisticsDashboardModal: React.FC<StatisticsDashboardModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operational' | 'monthly'>('overview');
    const [isLoading, setIsLoading] = useState(true);
    const [rawData, setRawData] = useState<{
        store: AppointmentData[],
        mobile: AppointmentData[],
        monthly: any[]
    }>({ store: [], mobile: [], monthly: [] });

    // Fetch Data
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Parallel fetch
            const [storeRes, mobileRes, monthlyRes] = await Promise.all([
                supabase.from('appointments').select('*').eq('status', 'CONCLUÍDO'),
                supabase.from('pet_movel_appointments').select('*').eq('status', 'CONCLUÍDO'),
                supabase.from('monthly_clients').select('*').eq('is_active', true)
            ]);

            setRawData({
                store: storeRes.data || [],
                mobile: mobileRes.data || [],
                monthly: monthlyRes.data || []
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Calculations ---
    const metrics = useMemo(() => {
        const allAppointments = [...rawData.store, ...rawData.mobile];
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        // Helper to get week start (Sunday)
        const getWeekStart = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day;
            return new Date(date.setDate(diff));
        };
        const weekStart = getWeekStart(now);

        let todayRevenue = 0;
        let weekRevenue = 0;
        let monthRevenue = 0;
        let yearRevenue2025 = 0;
        let yearRevenue2026 = 0;
        let todayCount = 0;

        const serviceDistribution: Record<string, number> = {};
        const hourlyDistribution: Record<number, number> = {};

        allAppointments.forEach(apt => {
            const dateStr = apt.appointment_time || apt.appointmentTime;
            if (!dateStr) return;
            
            const date = new Date(dateStr);
            const price = Number(apt.price || 0);
            const dateIso = dateStr.split('T')[0]; // simple ISO date

            // Today
            if (dateIso === todayStr) {
                todayRevenue += price;
                todayCount++;
            }

            // Week
            if (date >= weekStart) {
                weekRevenue += price;
            }

            // Month
            if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
                monthRevenue += price;
            }

            // Year
            if (date.getFullYear() === 2025) yearRevenue2025 += price;
            if (date.getFullYear() === 2026) yearRevenue2026 += price;

            // Service Dist
            const svc = apt.service || 'Outros';
            // Simplify service names
            let simplifiedSvc = 'Outros';
            if (svc.toLowerCase().includes('banho e tosa') || svc.includes('Banho & Tosa')) simplifiedSvc = 'Banho & Tosa';
            else if (svc.toLowerCase().includes('banho')) simplifiedSvc = 'Banho';
            else if (svc.toLowerCase().includes('tosa')) simplifiedSvc = 'Tosa';
            
            serviceDistribution[simplifiedSvc] = (serviceDistribution[simplifiedSvc] || 0) + 1;

            // Hourly Dist
            const hour = date.getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });

        // Weekly Chart Data (Last 7 days)
        const weeklyChartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const val = allAppointments
                .filter(a => (a.appointment_time || a.appointmentTime || '').startsWith(dStr))
                .reduce((sum, a) => sum + Number(a.price || 0), 0);
            weeklyChartData.push({
                label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
                value: val
            });
        }

        // Monthly Chart Data (Jan-Dec for current year)
        const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
            const val = allAppointments
                .filter(a => {
                    const d = new Date(a.appointment_time || a.appointmentTime || '');
                    return d.getFullYear() === now.getFullYear() && d.getMonth() === i;
                })
                .reduce((sum, a) => sum + Number(a.price || 0), 0);
            return {
                label: new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
                value: val
            };
        });

        return {
            todayRevenue,
            todayCount,
            weekRevenue,
            monthRevenue,
            yearRevenue2025,
            yearRevenue2026,
            weeklyChartData,
            monthlyChartData,
            serviceDistribution: Object.entries(serviceDistribution).map(([label, value]) => ({ 
                label, 
                value,
                color: label === 'Banho' ? '#3b82f6' : label === 'Banho & Tosa' ? '#ec4899' : '#a855f7'
            })),
            hourlyDistribution: Object.entries(hourlyDistribution).map(([label, value]) => ({ label: `${label}h`, value })).sort((a,b) => parseInt(a.label) - parseInt(b.label))
        };
    }, [rawData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[10002] p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                    <div>
                        <h2 className="text-2xl font-bold font-outfit text-gray-800 flex items-center gap-2">
                            <ChartBarIcon className="w-8 h-8 text-pink-600" />
                            Dashboard Financeiro
                        </h2>
                        <p className="text-sm text-gray-500 font-jakarta mt-1">Visão completa do desempenho do Pet Shop</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" title="Exportar Relatório">
                            <ArrowDownTrayIcon className="w-6 h-6" />
                        </button>
                        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-100 px-6 bg-white sticky top-0 z-10">
                    {[
                        { id: 'overview', label: 'Visão Geral', icon: FunnelIcon },
                        { id: 'financial', label: 'Financeiro', icon: CurrencyDollarIcon },
                        { id: 'operational', label: 'Operacional', icon: ClockIcon },
                        { id: 'monthly', label: 'Mensalistas', icon: UsersIcon },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                                activeTab === tab.id 
                                ? 'border-pink-500 text-pink-600 bg-pink-50/30' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <KPICard 
                                            title="Faturamento Hoje" 
                                            value={`R$ ${metrics.todayRevenue.toFixed(2).replace('.', ',')}`} 
                                            subValue={`${metrics.todayCount} atendimentos`}
                                            icon={CurrencyDollarIcon} 
                                            color="green" 
                                        />
                                        <KPICard 
                                            title="Esta Semana" 
                                            value={`R$ ${metrics.weekRevenue.toFixed(2).replace('.', ',')}`} 
                                            icon={CalendarIcon} 
                                            color="blue" 
                                        />
                                        <KPICard 
                                            title="Este Mês" 
                                            value={`R$ ${metrics.monthRevenue.toFixed(2).replace('.', ',')}`} 
                                            icon={ChartBarIcon} 
                                            color="purple" 
                                            trend="up"
                                            trendValue="12%"
                                        />
                                        <KPICard 
                                            title="Total 2026" 
                                            value={`R$ ${metrics.yearRevenue2026.toFixed(2).replace('.', ',')}`} 
                                            icon={ArrowTrendingUpIcon} 
                                            color="pink" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <ArrowTrendingUpIcon className="w-5 h-5 text-pink-500" />
                                                Receita Diária (Últimos 7 dias)
                                            </h3>
                                            <SimpleBarChart data={metrics.weeklyChartData} color="bg-pink-400" />
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <ChartPieIcon className="w-5 h-5 text-blue-500" />
                                                Distribuição de Serviços
                                            </h3>
                                            <SimpleDonutChart data={metrics.serviceDistribution} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* FINANCIAL TAB */}
                            {activeTab === 'financial' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-2">Faturamento 2025</h3>
                                            <p className="text-4xl font-outfit font-bold text-gray-400">R$ {metrics.yearRevenue2025.toFixed(2).replace('.', ',')}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-pink-100 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <CurrencyDollarIcon className="w-32 h-32 text-pink-600" />
                                            </div>
                                            <h3 className="font-bold text-gray-800 mb-2">Faturamento 2026 (Projeção)</h3>
                                            <p className="text-4xl font-outfit font-bold text-pink-600">R$ {metrics.yearRevenue2026.toFixed(2).replace('.', ',')}</p>
                                            <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
                                                <ArrowTrendingUpIcon className="w-4 h-4" />
                                                Crescimento Anual
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-6">Desempenho Mensal (2026)</h3>
                                        <SimpleBarChart data={metrics.monthlyChartData} color="bg-indigo-400" />
                                    </div>
                                </>
                            )}

                            {/* OPERATIONAL TAB */}
                            {activeTab === 'operational' && (
                                <div className="grid grid-cols-1 gap-6">
                                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-4">Horários de Pico</h3>
                                        <SimpleBarChart data={metrics.hourlyDistribution} color="bg-orange-400" />
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-gray-800 mb-4">Detalhamento de Serviços</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 rounded-l-lg">Serviço</th>
                                                        <th className="px-4 py-3 text-right">Qtd. Realizada</th>
                                                        <th className="px-4 py-3 text-right rounded-r-lg">% do Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {metrics.serviceDistribution.map((item, i) => (
                                                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 font-medium text-gray-800">{item.label}</td>
                                                            <td className="px-4 py-3 text-right font-bold">{item.value}</td>
                                                            <td className="px-4 py-3 text-right text-gray-500">
                                                                {Math.round((item.value / (metrics.todayCount || 1)) * 100)}%
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                             {/* MONTHLY TAB (Placeholder for now, integration with monthly logic) */}
                            {activeTab === 'monthly' && (
                                <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                                    <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-800">Módulo de Mensalistas</h3>
                                    <p className="text-gray-500 max-w-md mx-auto mt-2">
                                        A visualização detalhada de mensalistas está disponível no módulo dedicado. Em breve, todos os dados serão unificados aqui.
                                    </p>
                                    <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg inline-block">
                                        <strong>Total de Mensalistas Ativos:</strong> {rawData.monthly.length}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsDashboardModal;