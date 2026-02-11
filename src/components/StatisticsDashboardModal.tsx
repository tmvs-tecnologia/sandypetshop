import React, { useState, useEffect, useMemo } from 'react';
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
    ClockIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ChevronDownIcon
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
    children?: React.ReactNode; // For selectors
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

const KPICard: React.FC<KPICardProps> = ({ title, value, subValue, icon: Icon, trend, trendValue, color, children }) => {
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
        <div className={`p-6 rounded-2xl border shadow-sm transition-all hover:shadow-md ${colorClasses[color]} relative`}>
            <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium opacity-80">{title}</p>
                <div className={`p-2 rounded-xl ${iconColorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            
            <h3 className="text-3xl font-bold font-outfit mb-1">{value}</h3>
            {subValue && <p className="text-xs opacity-70 mb-3">{subValue}</p>}
            
            {children && (
                <div className="mt-3 pt-3 border-t border-black/5">
                    {children}
                </div>
            )}

            {(trend && trendValue && !children) && (
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
const SimpleBarChart: React.FC<{ data: { label: string; value: number; highlight?: boolean }[]; color: string }> = ({ data, color }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="flex items-end justify-between h-[150px] gap-2 pt-4">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative h-full justify-end">
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:opacity-80 ${d.highlight ? 'bg-pink-500' : 'bg-pink-300'}`}
                        style={{ height: `${(d.value / maxValue) * 100}%` }}
                    >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            R$ {d.value}
                        </div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-500 mt-2 font-medium truncate w-full text-center capitalize">{d.label}</span>
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
                        const dashArray = percent * 314;
                        const startPercent = cumulativePercent;
                        cumulativePercent += percent;
                        
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

    // Filter States
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYearTotal, setSelectedYearTotal] = useState(new Date().getFullYear());

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
        const currentYear = now.getFullYear();
        
        // Helper: Format date to Local String (pt-BR) to avoid UTC issues
        const getLocalDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return d.toLocaleDateString('pt-BR'); // "DD/MM/YYYY"
        };

        const todayLocal = now.toLocaleDateString('pt-BR');

        // Week Calculation (Sunday to Saturday)
        const curr = new Date();
        const first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
        const weekStart = new Date(curr.setDate(first));
        weekStart.setHours(0,0,0,0);
        
        // Metrics
        let todayRevenue = 0;
        let todayCount = 0;
        let monthRevenue = 0; // Based on selectedMonth
        let yearRevenue = 0; // Based on selectedYearTotal

        const serviceDistribution: Record<string, number> = {};
        const hourlyDistribution: Record<number, number> = {};
        
        // Arrays for charts
        const weeklyRevenueByDay = Array(7).fill(0); // 0=Dom, 1=Seg, ...

        allAppointments.forEach(apt => {
            const dateStr = apt.appointment_time || apt.appointmentTime;
            if (!dateStr) return;
            
            const aptDate = new Date(dateStr);
            const price = Number(apt.price || 0);
            
            // 1. Today's Revenue (Local Time Check)
            if (getLocalDate(dateStr) === todayLocal) {
                todayRevenue += price;
                todayCount++;
            }

            // 2. Monthly Revenue (Selected Month, Only Banho & Tosa)
            // Assuming "Banho & Tosa" logic refers to store appointments mostly, or filtering by service name
            const isBanhoTosa = (apt.service || '').toLowerCase().includes('banho') || (apt.service || '').toLowerCase().includes('tosa');
            
            if (aptDate.getMonth() === selectedMonth && aptDate.getFullYear() === currentYear) {
                if (isBanhoTosa) {
                    monthRevenue += price;
                }
            }

            // 3. Year Revenue (Selected Year)
            if (aptDate.getFullYear() === selectedYearTotal) {
                yearRevenue += price;
            }

            // 4. Weekly Chart Data (Current Week: Sun-Sat)
            const aptTime = aptDate.getTime();
            const weekStartTime = weekStart.getTime();
            const weekEndTime = weekStartTime + (7 * 24 * 60 * 60 * 1000);

            if (aptTime >= weekStartTime && aptTime < weekEndTime) {
                const dayIndex = aptDate.getDay(); // 0-6
                weeklyRevenueByDay[dayIndex] += price;
            }

            // Service Dist (for charts)
            const svc = apt.service || 'Outros';
            let simplifiedSvc = 'Outros';
            if (svc.toLowerCase().includes('banho e tosa') || svc.includes('Banho & Tosa')) simplifiedSvc = 'Banho & Tosa';
            else if (svc.toLowerCase().includes('banho')) simplifiedSvc = 'Banho';
            else if (svc.toLowerCase().includes('tosa')) simplifiedSvc = 'Tosa';
            serviceDistribution[simplifiedSvc] = (serviceDistribution[simplifiedSvc] || 0) + 1;

            // Hourly Dist
            const hour = aptDate.getHours();
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
        });

        // Format Weekly Data
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const weeklyChartData = weeklyRevenueByDay.map((val, i) => ({
            label: days[i],
            value: val,
            highlight: i === now.getDay() // Highlight today
        }));

        // Monthly Chart Data (Year View)
        const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
            const val = allAppointments
                .filter(a => {
                    const d = new Date(a.appointment_time || a.appointmentTime || '');
                    return d.getFullYear() === selectedYearTotal && d.getMonth() === i;
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
            monthRevenue,
            yearRevenue,
            weeklyChartData,
            monthlyChartData,
            serviceDistribution: Object.entries(serviceDistribution).map(([label, value]) => ({ 
                label, 
                value,
                color: label === 'Banho' ? '#3b82f6' : label === 'Banho & Tosa' ? '#ec4899' : '#a855f7'
            })),
            hourlyDistribution: Object.entries(hourlyDistribution).map(([label, value]) => ({ label: `${label}h`, value })).sort((a,b) => parseInt(a.label) - parseInt(b.label))
        };
    }, [rawData, selectedMonth, selectedYearTotal]);

    if (!isOpen) return null;

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Shared Components (Rendered differently based on mobile/desktop)
    const OverviewSection = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Faturamento Hoje */}
                <KPICard 
                    title="Faturamento Hoje" 
                    value={`R$ ${metrics.todayRevenue.toFixed(2).replace('.', ',')}`} 
                    subValue={`${metrics.todayCount} atendimentos`}
                    icon={CurrencyDollarIcon} 
                    color="green" 
                />

                {/* 2. Esta Semana (Mantido original, mas poderia ser removido se redundante) */}
                <KPICard 
                    title="Esta Semana" 
                    // Keeping simple calculation or reusing logic? Using raw calculation for simplicity here or removing?
                    // Let's keep it but maybe it wasn't requested to change.
                    // Actually, let's keep it as a filler or remove if user wants strict changes.
                    // User didn't ask to remove, so I keep it.
                    value={`R$ ${metrics.weeklyChartData.reduce((a,b)=>a+b.value,0).toFixed(2).replace('.', ',')}`}
                    icon={CalendarIcon} 
                    color="blue" 
                />

                {/* 3. Este Mês (Com Seletor) */}
                <KPICard 
                    title="Banho & Tosa" 
                    value={`R$ ${metrics.monthRevenue.toFixed(2).replace('.', ',')}`} 
                    icon={ChartBarIcon} 
                    color="purple" 
                >
                    <div className="flex items-center gap-2">
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-xs font-semibold text-purple-700 border-none focus:ring-0 cursor-pointer p-0"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <ChevronDownIcon className="w-3 h-3 text-purple-700" />
                    </div>
                </KPICard>

                {/* 4. Este Ano (Com Seletor) */}
                <KPICard 
                    title="Este Ano" 
                    value={`R$ ${metrics.yearRevenue.toFixed(2).replace('.', ',')}`} 
                    icon={ArrowTrendingUpIcon} 
                    color="pink" 
                >
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setSelectedYearTotal(prev => prev - 1)}
                            className="p-1 hover:bg-pink-100 rounded-full text-pink-700"
                        >
                            <ChevronLeftIcon className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-pink-700">{selectedYearTotal}</span>
                        <button 
                            onClick={() => setSelectedYearTotal(prev => prev + 1)}
                            className="p-1 hover:bg-pink-100 rounded-full text-pink-700"
                        >
                            <ChevronRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </KPICard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-5 h-5 text-pink-500" />
                        Receita Diária (Semana Atual)
                    </h3>
                    <SimpleBarChart data={metrics.weeklyChartData} color="bg-pink-400" />
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ChartPieIcon className="w-5 h-5 text-blue-500" />
                        Distribuição
                    </h3>
                    <SimpleDonutChart data={metrics.serviceDistribution} />
                </div>
            </div>
        </>
    );

    const FinancialSection = () => (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6">Desempenho Mensal ({selectedYearTotal})</h3>
                <SimpleBarChart data={metrics.monthlyChartData} color="bg-indigo-400" />
            </div>
        </div>
    );

    const OperationalSection = () => (
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
                                <th className="px-4 py-3 text-right">Qtd.</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">%</th>
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
    );

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[10002] p-2 md:p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold font-outfit text-gray-800 flex items-center gap-2">
                            <ChartBarIcon className="w-8 h-8 text-pink-600" />
                            Dashboard
                        </h2>
                        <p className="text-sm text-gray-500 font-jakarta mt-1 hidden sm:block">Visão completa do desempenho do Pet Shop</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs (Desktop Only) */}
                <div className="hidden md:flex border-b border-gray-100 px-6 bg-white sticky top-0 z-10 shrink-0">
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
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* Mobile: Show Everything Stacked */}
                            <div className="md:hidden space-y-8">
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Visão Geral</h3>
                                    <OverviewSection />
                                </section>
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Financeiro</h3>
                                    <FinancialSection />
                                </section>
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Operacional</h3>
                                    <OperationalSection />
                                </section>
                            </div>

                            {/* Desktop: Show Active Tab */}
                            <div className="hidden md:block">
                                {activeTab === 'overview' && <OverviewSection />}
                                {activeTab === 'financial' && <FinancialSection />}
                                {activeTab === 'operational' && <OperationalSection />}
                                {activeTab === 'monthly' && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                                        <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
                                        <h3 className="text-xl font-bold text-gray-800">Módulo de Mensalistas</h3>
                                        <p className="text-gray-500 max-w-md mx-auto mt-2">
                                            A visualização detalhada de mensalistas está disponível no módulo dedicado.
                                        </p>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatisticsDashboardModal;
