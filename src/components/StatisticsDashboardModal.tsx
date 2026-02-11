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
    ChevronDownIcon,
    ChevronUpIcon,
    SparklesIcon
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
    details?: AppointmentData[]; // For expanded view
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
    photo_url?: string; // If available
    monthly_client_id?: string;
}

// --- Helper Components ---

const KPICard: React.FC<KPICardProps> = ({ title, value, subValue, icon: Icon, trend, trendValue, color, children, details }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Toggle expansion only if there are details
    const handleToggle = () => {
        if (details && details.length > 0) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div 
            className={`
                rounded-2xl border shadow-sm transition-all duration-300 relative overflow-hidden
                ${colorClasses[color]} 
                ${isExpanded ? 'row-span-2 md:col-span-2' : 'hover:shadow-md'}
                ${details && details.length > 0 ? 'cursor-pointer' : ''}
            `}
            onClick={handleToggle}
        >
            <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <div className={`p-2 rounded-xl ${iconColorClasses[color]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                
                <h3 className="text-3xl font-bold font-outfit mb-1">{value}</h3>
                {subValue && <p className="text-xs opacity-70 mb-3">{subValue}</p>}
                
                {children && (
                    <div className="mt-3 pt-3 border-t border-black/5" onClick={(e) => e.stopPropagation()}>
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

            {/* Expanded Content */}
            <div className={`
                bg-white/50 backdrop-blur-sm border-t border-black/5 transition-all duration-500 ease-in-out
                ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}
            `}>
                <div className="p-4">
                    <h4 className="text-sm font-bold mb-3 opacity-80 flex justify-between items-center">
                        Detalhamento 
                        <span className="text-xs font-normal bg-white/60 px-2 py-1 rounded-full">{details?.length} itens</span>
                    </h4>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                        {details?.slice(0, 50).map((apt, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/60 p-2 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                    {/* Avatar Placeholder or Photo */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${iconColorClasses[color]}`}>
                                        {apt.pet_name?.substring(0,2).toUpperCase() || 'PET'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold leading-none">{apt.pet_name || 'Pet sem nome'}</p>
                                        <p className="text-[10px] opacity-70 leading-none mt-1">{apt.service}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold font-outfit">
                                    {formatCurrency(Number(apt.price))}
                                </span>
                            </div>
                        ))}
                         {details && details.length > 50 && (
                            <p className="text-center text-xs opacity-50 pt-2">Exibindo os primeiros 50 itens</p>
                        )}
                    </div>
                </div>
            </div>

             {/* Expand Indicator */}
             {details && details.length > 0 && (
                <div className="absolute bottom-2 right-2 opacity-30">
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </div>
            )}
        </div>
    );
};

// Simple SVG Bar Chart
const SimpleBarChart: React.FC<{ 
    data: { label: string; value: number; highlight?: boolean }[]; 
    color: string;
    tooltipPrefix?: string;
    tooltipSuffix?: string;
}> = ({ data, color, tooltipPrefix = 'R$ ', tooltipSuffix = '' }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="flex items-end justify-between h-[150px] gap-1 sm:gap-2 pt-4">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 group relative h-full justify-end min-w-0">
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ease-out hover:opacity-80 ${d.highlight ? 'bg-pink-500' : color}`}
                        style={{ height: `${(d.value / maxValue) * 100}%` }}
                    >
                        {/* Tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {tooltipPrefix}{d.value}{tooltipSuffix}
                        </div>
                    </div>
                    <span className="text-[9px] sm:text-xs text-gray-500 mt-2 font-medium truncate w-full text-center capitalize">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// Simple SVG Donut Chart
const SimpleDonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let cumulativePercent = 0;

    if (total === 0) return <div className="h-48 flex items-center justify-center text-gray-400">Sem dados</div>;

    const displayValue = activeIndex !== null ? data[activeIndex].value : total;
    const displayLabel = activeIndex !== null ? data[activeIndex].label : 'Total';

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-full">
            <div className="relative w-48 h-48 shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {data.map((slice, i) => {
                        const percent = slice.value / total;
                        const circumference = 2 * Math.PI * 40;
                        const dashArray = percent * circumference;
                        const startPercent = cumulativePercent;
                        cumulativePercent += percent;
                        const isActive = activeIndex === i;
                        
                        return (
                            <circle
                                key={i}
                                r="40"
                                cx="50"
                                cy="50"
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth={isActive ? "20" : "16"}
                                strokeDasharray={`${dashArray} ${circumference}`}
                                strokeDashoffset={-startPercent * circumference}
                                className="transition-all duration-300 cursor-pointer"
                                onMouseEnter={() => setActiveIndex(i)}
                                onMouseLeave={() => setActiveIndex(null)}
                                onClick={() => setActiveIndex(i === activeIndex ? null : i)}
                            />
                        );
                    })}
                </svg>
                {/* Inner Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-gray-800 transition-all duration-300">{displayValue}</span>
                    <span className="text-xs text-gray-500 uppercase font-medium max-w-[80px] text-center truncate px-2">{displayLabel}</span>
                </div>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
                {data.map((item, i) => (
                    <div 
                        key={i} 
                        className={`flex items-center justify-between text-sm cursor-pointer p-1 rounded hover:bg-gray-50 transition-colors ${activeIndex === i ? 'bg-gray-50 font-semibold' : ''}`}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0 block" style={{ backgroundColor: item.color, minWidth: '0.75rem' }}></span>
                            <span className="text-gray-600 truncate max-w-[100px]" title={item.label}>{item.label}</span>
                        </div>
                        <span className="font-bold text-gray-800">{Math.round((item.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Simple Horizontal Bar Chart
const HorizontalBarChart: React.FC<{ 
    data: { label: string; value: number; photoUrl?: string; secondaryLabel?: string }[]; 
    color: string;
    valuePrefix?: string;
    valueSuffix?: string;
    showRank?: boolean;
}> = ({ data, color, valuePrefix = '', valueSuffix = '', showRank = false }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="space-y-4">
            {data.map((d, i) => (
                <div key={i} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                            {showRank && (
                                <span className={`
                                    w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold
                                    ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                      i === 1 ? 'bg-gray-100 text-gray-700' : 
                                      i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-gray-400'}
                                `}>
                                    {i + 1}
                                </span>
                            )}
                            {d.photoUrl && (
                                <img 
                                    src={d.photoUrl || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} 
                                    alt={d.label}
                                    className="w-6 h-6 rounded-full object-cover border border-gray-100"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'; }}
                                />
                            )}
                            <div>
                                <span className="font-medium text-gray-800">{d.label}</span>
                                {d.secondaryLabel && <span className="text-xs text-gray-400 ml-2">({d.secondaryLabel})</span>}
                            </div>
                        </div>
                        <span className="font-bold text-gray-700">{valuePrefix}{d.value.toLocaleString('pt-BR')}{valueSuffix}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
                            style={{ width: `${(d.value / maxValue) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
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
                supabase.from('appointments').select('*').in('status', ['CONCLUÍDO', 'AGENDADO']),
                supabase.from('pet_movel_appointments').select('*').in('status', ['CONCLUÍDO', 'AGENDADO']),
                supabase.from('monthly_clients').select('*') // Removed .eq('is_active', true) to include historical data
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
        // Tagging source for correct classification
        const storeApts = rawData.store.map(a => ({ ...a, _source: 'store' }));
        const mobileApts = rawData.mobile.map(a => ({ ...a, _source: 'mobile' }));
        const allAppointments = [...storeApts, ...mobileApts];
        
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
        const todayDetails: AppointmentData[] = [];

        let monthRevenue = 0; // Based on selectedMonth
        const monthDetails: AppointmentData[] = [];

        let yearRevenue = 0; // Based on selectedYearTotal
        const yearDetails: AppointmentData[] = [];
        
        // Week details (not strictly requested but good to have if we kept "Esta Semana" card logic consistent)
        const weekDetails: AppointmentData[] = []; 

        const serviceDistribution: Record<string, number> = {
            'Banho': 0,
            'Banho & Tosa': 0,
            'Pet Móvel': 0
        };
        
        const hourlyDistribution: Record<number, number> = {};
        
        // Arrays for charts
        const weeklyRevenueByDay = Array(7).fill(0); // 0=Dom, 1=Seg, ...

        // Monthly Clients Analytics
        const monthlyStats: Record<string, {
            id: string;
            pet_name: string;
            owner_name: string;
            photo_url?: string;
            servicesCount: number;
            totalSpent: number;
            monthlyPrice: number;
        }> = {};
        
        // Map for fallback name matching: "pet_owner" -> id
        const nameToIdMap: Record<string, string> = {};

        // Initialize with all monthly clients (even if no services yet)
        rawData.monthly.forEach(mc => {
            // Index by ID for reliability
            monthlyStats[mc.id] = {
                id: mc.id,
                pet_name: mc.pet_name,
                owner_name: mc.owner_name,
                photo_url: mc.pet_photo_url,
                servicesCount: 0,
                totalSpent: 0,
                monthlyPrice: Number(mc.price || 0)
            };
            
            // Populate fallback map
            const key = `${mc.pet_name?.trim().toLowerCase()}_${mc.owner_name?.trim().toLowerCase()}`;
            nameToIdMap[key] = mc.id;
        });

        allAppointments.forEach(apt => {
            const dateStr = apt.appointment_time || apt.appointmentTime;
            if (!dateStr) return;
            
            const aptDate = new Date(dateStr);
            const price = Number(apt.price || 0);
            const serviceLower = (apt.service || '').toLowerCase();
            const isCompleted = apt.status === 'CONCLUÍDO';
            
            // --- Monthly Client Matching ---
            if (isCompleted) {
                let matchedId = null;

                // 1. Priority: Match by monthly_client_id (if available)
                if (apt.monthly_client_id && monthlyStats[apt.monthly_client_id]) {
                    matchedId = apt.monthly_client_id;
                }
                // 2. Fallback: Match by Name (for older records or missing IDs)
                else {
                    const key = `${apt.pet_name?.trim().toLowerCase()}_${apt.owner_name?.trim().toLowerCase()}`;
                    if (nameToIdMap[key]) {
                        matchedId = nameToIdMap[key];
                    }
                }

                if (matchedId && monthlyStats[matchedId]) {
                    monthlyStats[matchedId].servicesCount++;
                    monthlyStats[matchedId].totalSpent += price;
                }
            }

            // --- Service Classification for Chart (Operacional - Todos) ---
            // Priority: 
            // 1. Mobile Source -> 'Pet Móvel'
            // 2. Service name contains 'banho e tosa' -> 'Banho & Tosa'
            // 3. Service name contains 'banho' -> 'Banho'
            // 4. Others
            if (apt._source === 'mobile') {
                serviceDistribution['Pet Móvel']++;
            } else if (serviceLower.includes('banho') && serviceLower.includes('tosa')) {
                serviceDistribution['Banho & Tosa']++;
            } else if (serviceLower.includes('banho')) {
                serviceDistribution['Banho']++;
            } else {
                if (serviceLower.includes('tosa')) serviceDistribution['Banho & Tosa']++;
                else serviceDistribution['Banho']++; // Catch-all for store
            }

            // --- Time-based Metrics ---

            // 1. Today's Revenue (Financeiro - Apenas Concluídos)
            if (isCompleted && getLocalDate(dateStr) === todayLocal) {
                todayRevenue += price;
                todayCount++;
                todayDetails.push(apt);
            }

            // 2. Monthly Revenue (Financeiro - Apenas Concluídos)
            if (isCompleted && aptDate.getMonth() === selectedMonth && aptDate.getFullYear() === currentYear) {
                const isBanhoTosaFilter = serviceLower.includes('banho') || serviceLower.includes('tosa');
                
                if (isBanhoTosaFilter) {
                    monthRevenue += price;
                    monthDetails.push(apt);
                }
            }

            // 3. Year Revenue (Financeiro - Apenas Concluídos)
            if (isCompleted && aptDate.getFullYear() === selectedYearTotal) {
                yearRevenue += price;
                yearDetails.push(apt);
            }

            // 4. Weekly Chart Data (Financeiro - Apenas Concluídos)
            const aptTime = aptDate.getTime();
            const weekStartTime = weekStart.getTime();
            const weekEndTime = weekStartTime + (7 * 24 * 60 * 60 * 1000);

            if (isCompleted && aptTime >= weekStartTime && aptTime < weekEndTime) {
                const dayIndex = aptDate.getDay(); // 0-6
                weeklyRevenueByDay[dayIndex] += price;
                weekDetails.push(apt); // For "Esta Semana" card
            }

            // Hourly Dist (Operacional - Todos)
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

        // Monthly Chart Data (Year View - Financeiro - Apenas Concluídos)
        const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
            const val = allAppointments
                .filter(a => {
                    const d = new Date(a.appointment_time || a.appointmentTime || '');
                    return a.status === 'CONCLUÍDO' && d.getFullYear() === selectedYearTotal && d.getMonth() === i;
                })
                .reduce((sum, a) => sum + Number(a.price || 0), 0);
            return {
                label: new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
                value: val
            };
        });

        // Prepare Distribution Data for Chart (Strict 3 colors)
        const distributionData = [
            { label: 'Banho', value: serviceDistribution['Banho'], color: '#3b82f6' }, // Blue
            { label: 'Banho & Tosa', value: serviceDistribution['Banho & Tosa'], color: '#ec4899' }, // Pink
            { label: 'Pet Móvel', value: serviceDistribution['Pet Móvel'], color: '#a855f7' } // Purple
        ].filter(d => d.value > 0);

        // Prepare Monthly Client Charts
        const monthlyClientsList = Object.values(monthlyStats);
        
        const topServicesClients = [...monthlyClientsList]
            .sort((a, b) => b.servicesCount - a.servicesCount)
            .slice(0, 5)
            .map(c => ({
                label: c.pet_name,
                secondaryLabel: c.owner_name,
                value: c.servicesCount,
                photoUrl: c.photo_url
            }));

        const topRevenueClients = [...monthlyClientsList]
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)
            .map(c => ({
                label: c.pet_name,
                secondaryLabel: c.owner_name,
                value: c.totalSpent,
                photoUrl: c.photo_url
            }));

        return {
            todayRevenue,
            todayCount,
            todayDetails: todayDetails.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
            
            monthRevenue,
            monthDetails: monthDetails.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
            
            yearRevenue,
            yearDetails: yearDetails.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
            
            weekDetails: weekDetails.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),

            weeklyChartData,
            monthlyChartData,
            serviceDistribution: distributionData,
            hourlyDistribution: Object.entries(hourlyDistribution).map(([label, value]) => ({ label: `${label}h`, value })).sort((a,b) => parseInt(a.label) - parseInt(b.label)),
            
            monthlyStats: {
                list: monthlyClientsList.sort((a,b) => a.pet_name.localeCompare(b.pet_name)),
                topServices: topServicesClients,
                topRevenue: topRevenueClients
            }
        };
    }, [rawData, selectedMonth, selectedYearTotal]);

    if (!isOpen) return null;

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Shared Components (Rendered differently based on mobile/desktop)
    const OverviewSection = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Faturamento Hoje */}
                <KPICard 
                    title="Faturamento Hoje" 
                    value={formatCurrency(metrics.todayRevenue)} 
                    subValue={`${metrics.todayCount} atendimentos`}
                    icon={CurrencyDollarIcon} 
                    color="green" 
                    details={metrics.todayDetails}
                />

                {/* 2. Esta Semana */}
                <KPICard 
                    title="Esta Semana" 
                    value={formatCurrency(metrics.weeklyChartData.reduce((a,b)=>a+b.value,0))}
                    icon={CalendarIcon} 
                    color="blue"
                    details={metrics.weekDetails} 
                />

                {/* 3. Este Mês (Com Seletor) */}
                <KPICard 
                    title={selectedMonth === new Date().getMonth() ? "Este mês" : months[selectedMonth]} 
                    value={formatCurrency(metrics.monthRevenue)} 
                    icon={ChartBarIcon} 
                    color="purple"
                    details={metrics.monthDetails} 
                >
                    <div className="flex items-center gap-2">
                        <select 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-xs font-semibold text-purple-700 border-none focus:ring-0 cursor-pointer p-0"
                            onClick={(e) => e.stopPropagation()}
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
                    value={formatCurrency(metrics.yearRevenue)} 
                    icon={ArrowTrendingUpIcon} 
                    color="pink"
                    details={metrics.yearDetails} 
                >
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedYearTotal(prev => prev - 1); }}
                            className="p-1 hover:bg-pink-100 rounded-full text-pink-700"
                        >
                            <ChevronLeftIcon className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-pink-700">{selectedYearTotal}</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedYearTotal(prev => prev + 1); }}
                            className="p-1 hover:bg-pink-100 rounded-full text-pink-700"
                        >
                            <ChevronRightIcon className="w-3 h-3" />
                        </button>
                    </div>
                </KPICard>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-6">
                <h3 className="text-lg font-bold text-gray-800 -mb-2">Financeiro</h3>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-5 h-5 text-pink-500" />
                        Receita Diária (Semana Atual)
                    </h3>
                    <SimpleBarChart data={metrics.weeklyChartData} color="bg-pink-400" />
                </div>
            </div>
        </>
    );

    const FinancialSection = () => (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-6">Desempenho Mensal ({selectedYearTotal})</h3>
                <SimpleBarChart data={metrics.monthlyChartData} color="bg-pink-400" />
            </div>
        </div>
    );

    const OperationalSection = () => (
        <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <ChartPieIcon className="w-5 h-5 text-blue-500" />
                    Distribuição por Serviços
                </h3>
                <SimpleDonutChart data={metrics.serviceDistribution} />
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Horários de Pico</h3>
                <SimpleBarChart 
                    data={metrics.hourlyDistribution} 
                    color="bg-pink-400" 
                    tooltipPrefix="" 
                    tooltipSuffix=" agend." 
                />
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
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Mensalistas</h3>
                                    <div className="space-y-6">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <SparklesIcon className="w-5 h-5 text-yellow-500" />
                                                Top 5: Mais Serviços Concluídos
                                            </h3>
                                            {metrics.monthlyStats.topServices.length > 0 ? (
                                                <HorizontalBarChart 
                                                    data={metrics.monthlyStats.topServices} 
                                                    color="bg-yellow-400" 
                                                    valueSuffix=" serviços"
                                                    showRank
                                                />
                                            ) : (
                                                <p className="text-gray-400 text-sm text-center py-8">Sem dados suficientes</p>
                                            )}
                                        </div>

                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                                                Top 5: Maior Investimento
                                            </h3>
                                            {metrics.monthlyStats.topRevenue.length > 0 ? (
                                                <HorizontalBarChart 
                                                    data={metrics.monthlyStats.topRevenue} 
                                                    color="bg-green-400" 
                                                    valuePrefix="R$ "
                                                    showRank
                                                />
                                            ) : (
                                                <p className="text-gray-400 text-sm text-center py-8">Sem dados suficientes</p>
                                            )}
                                        </div>

                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <UsersIcon className="w-5 h-5 text-purple-500" />
                                                Lista de Mensalistas ({metrics.monthlyStats.list.length})
                                            </h3>
                                            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                                                {metrics.monthlyStats.list.map(client => (
                                                    <div key={client.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                                                        <div className="flex items-center gap-3">
                                                             <img 
                                                                src={client.photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} 
                                                                alt={client.pet_name}
                                                                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'; }}
                                                            />
                                                            <div>
                                                                <p className="font-bold text-gray-800">{client.pet_name}</p>
                                                                <p className="text-xs text-gray-500">{client.owner_name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="font-outfit font-bold text-lg text-gray-900 whitespace-nowrap">
                                                            R$ {client.monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>
                                                ))}
                                                {metrics.monthlyStats.list.length === 0 && (
                                                    <div className="text-center py-8 text-gray-400">
                                                        Nenhum mensalista encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Desktop: Show Active Tab */}
                            <div className="hidden md:block">
                                {activeTab === 'overview' && <OverviewSection />}
                                {activeTab === 'financial' && <FinancialSection />}
                                {activeTab === 'operational' && <OperationalSection />}
                                {activeTab === 'monthly' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Top Services Chart */}
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                    <SparklesIcon className="w-5 h-5 text-yellow-500" />
                                                    Top 5: Mais Serviços Concluídos
                                                </h3>
                                                {metrics.monthlyStats.topServices.length > 0 ? (
                                                    <HorizontalBarChart 
                                                        data={metrics.monthlyStats.topServices} 
                                                        color="bg-yellow-400" 
                                                        valueSuffix=" serviços"
                                                        showRank
                                                    />
                                                ) : (
                                                    <p className="text-gray-400 text-sm text-center py-8">Sem dados suficientes</p>
                                                )}
                                            </div>

                                            {/* Top Revenue Chart */}
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                    <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                                                    Top 5: Maior Investimento
                                                </h3>
                                                {metrics.monthlyStats.topRevenue.length > 0 ? (
                                                    <HorizontalBarChart 
                                                        data={metrics.monthlyStats.topRevenue} 
                                                        color="bg-green-400" 
                                                        valuePrefix="R$ "
                                                        showRank
                                                    />
                                                ) : (
                                                    <p className="text-gray-400 text-sm text-center py-8">Sem dados suficientes</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* All Monthly Clients Grid */}
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                                <UsersIcon className="w-5 h-5 text-purple-500" />
                                                Lista de Mensalistas ({metrics.monthlyStats.list.length})
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                {metrics.monthlyStats.list.map((client) => (
                                                    <div key={client.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-md transition-shadow bg-gray-50/30">
                                                        <img 
                                                            src={client.photo_url || 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'} 
                                                            alt={client.pet_name}
                                                            className="w-10 h-10 rounded-full object-cover border border-white shadow-sm"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3009/3009489.png'; }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-bold text-gray-800 text-sm truncate">{client.pet_name}</p>
                                                            <p className="text-xs text-gray-500 truncate">{client.owner_name}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="block text-xs font-bold text-pink-600">{client.servicesCount} serv.</span>
                                                            <span className="block text-[10px] text-gray-400 font-medium">
                                                                R$ {client.totalSpent.toLocaleString('pt-BR')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {metrics.monthlyStats.list.length === 0 && (
                                                    <div className="col-span-full text-center py-8 text-gray-400">
                                                        Nenhum mensalista encontrado.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
