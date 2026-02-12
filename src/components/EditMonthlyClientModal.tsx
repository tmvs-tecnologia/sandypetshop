import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../supabaseClient';
import { MonthlyClient, PetWeight, ServiceType } from '../../types';
import ExtraServicesSelection from './ExtraServicesSelection';
import { PET_WEIGHT_OPTIONS } from '../../constants';

// --- Interfaces ---
interface EditMonthlyClientModalProps {
    client: MonthlyClient;
    onClose: () => void;
    onMonthlyClientUpdated: () => void;
}

// --- Helper Components ---
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 mt-2 flex items-center gap-2">
        {children}
    </h3>
);

const Label: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {children}
    </label>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
    <input
        ref={ref}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all placeholder-gray-400"
        {...props}
    />
));
Input.displayName = 'Input';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
    <div className="relative">
        <select
            ref={ref}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all appearance-none cursor-pointer"
            {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
    </div>
));
Select.displayName = 'Select';

// --- Main Component ---
const EditMonthlyClientModal: React.FC<EditMonthlyClientModalProps> = ({ client, onClose, onMonthlyClientUpdated }) => {
    const [formData, setFormData] = useState<MonthlyClient>(client);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load fresh data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('monthly_clients')
                    .select('*')
                    .eq('id', client.id)
                    .single();
                
                if (error) throw error;
                if (data) {
                    // Ensure extra_services is parsed if string, or object if null
                    let extra = data.extra_services;
                    if (typeof extra === 'string') {
                        try { extra = JSON.parse(extra); } catch { extra = {}; }
                    }
                    setFormData({ ...data, extra_services: extra || {} });
                }
            } catch (err: any) {
                console.error('Erro ao carregar cliente:', err);
                setError('Falha ao carregar dados atualizados.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [client.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleExtraServiceToggle = (key: string) => {
        setFormData(prev => {
            const currentExtras = (prev.extra_services as any) || {};
            const currentService = currentExtras[key] || {};
            return {
                ...prev,
                extra_services: {
                    ...currentExtras,
                    [key]: {
                        ...currentService,
                        enabled: !currentService.enabled
                    }
                }
            };
        });
    };

    const handleExtraServiceValueChange = (key: string, value: string) => {
        setFormData(prev => {
            const currentExtras = (prev.extra_services as any) || {};
            return {
                ...prev,
                extra_services: {
                    ...currentExtras,
                    [key]: {
                        ...currentExtras[key],
                        value: value
                    }
                }
            };
        });
    };

    const handleExtraServiceQuantityChange = (key: string, quantity: string) => {
        setFormData(prev => {
            const currentExtras = (prev.extra_services as any) || {};
            return {
                ...prev,
                extra_services: {
                    ...currentExtras,
                    [key]: {
                        ...currentExtras[key],
                        quantity: parseInt(quantity) || 1
                    }
                }
            };
        });
    };

    const generateFutureAppointments = async (client: MonthlyClient) => {
        // Only generate if active
        if (!client.is_active) return;

        const appointmentsToCreate: any[] = [];
        let startDate = new Date();
        const limitDate = new Date('2026-12-31T23:59:59');

        // Check last appointment to avoid duplicates or start from scratch
        const { data: lastAppt } = await supabase
            .from('appointments')
            .select('appointment_time')
            .eq('monthly_client_id', client.id)
            .order('appointment_time', { ascending: false })
            .limit(1);

        if (lastAppt && lastAppt.length > 0) {
            startDate = new Date(lastAppt[0].appointment_time);
            startDate = addInterval(startDate, client.recurrence_type);
        } else {
            // No history, start from next occurrence from today
            startDate = new Date();
             // Adjust to next occurrence
             // Logic similar to mass script but relative to today if no history
             // But for new clients, we want to start ASAP.
             // If today is Monday and recurrence is Monday, schedule today? 
             // Usually yes.
             startDate.setHours(0,0,0,0);
        }
        
        // Helper to adjust day
        const getDayOfWeekSystem = (d: Date) => { const js = d.getDay(); return js === 0 ? 7 : js; };

        // Adjust start date to match recurrence day
        if (client.recurrence_type !== 'monthly') {
            // Find next matching weekday
            // If today matches and time hasn't passed (handled by hour logic), could be today.
            // But let's keep it simple: find next matching date >= startDate
            while (getDayOfWeekSystem(startDate) !== client.recurrence_day) {
                startDate.setDate(startDate.getDate() + 1);
            }
        } else {
            // Monthly
            if (startDate.getDate() > client.recurrence_day) {
                startDate.setMonth(startDate.getMonth() + 1);
            }
            startDate.setDate(client.recurrence_day);
        }
        
        // Hour logic
        let hour = 12; // Default UTC noon
        try {
             if (typeof client.recurrence_time === 'string') {
                const parts = client.recurrence_time.split(':');
                if (parts.length >= 1) hour = parseInt(parts[0]) + 3;
            } else if (typeof client.recurrence_time === 'number') {
                hour = client.recurrence_time + 3;
            }
        } catch(e) {}

        // Calculate unit price
        let unitPrice = client.price;
        if (client.recurrence_type === 'weekly') {
            unitPrice = client.price / 4;
        } else if (client.recurrence_type === 'bi-weekly') {
            unitPrice = client.price / 2;
        }
        unitPrice = Math.round(unitPrice * 100) / 100;

        let currentDate = new Date(startDate);
        
        // Generate loop
        while (currentDate <= limitDate) {
            const apptDate = new Date(currentDate);
            apptDate.setUTCHours(hour, 0, 0, 0);
            const isoString = apptDate.toISOString().replace('.000Z', '+00:00');

            appointmentsToCreate.push({
                monthly_client_id: client.id,
                pet_name: client.pet_name,
                owner_name: client.owner_name,
                pet_breed: client.pet_breed,
                owner_address: client.owner_address,
                whatsapp: client.whatsapp,
                service: client.service,
                weight: client.weight,
                price: unitPrice, // Use calculated unit price
                condominium: client.condominium,
                status: 'AGENDADO',
                appointment_time: isoString,
                recurrence_type: client.recurrence_type,
                pet_photo_url: client.pet_photo_url
            });

            currentDate = addInterval(currentDate, client.recurrence_type);
        }

        if (appointmentsToCreate.length > 0) {
            await supabase.from('appointments').insert(appointmentsToCreate);
        }
    };

    const addInterval = (date: Date, type: string) => {
        const newDate = new Date(date);
        if (type === 'weekly') newDate.setDate(newDate.getDate() + 7);
        else if (type === 'bi-weekly') newDate.setDate(newDate.getDate() + 14);
        else if (type === 'monthly') newDate.setMonth(newDate.getMonth() + 1);
        return newDate;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            // Prepare payload
            const payload = { ...formData };
            
            // Clean up extra services
            const cleanExtras: any = {};
            if (payload.extra_services) {
                Object.entries(payload.extra_services).forEach(([k, v]: [string, any]) => {
                    if (v.enabled || v.quantity > 0) { // Keep if enabled or has quantity logic
                         cleanExtras[k] = {
                             enabled: !!v.enabled,
                             value: v.value ? Number(v.value) : 0,
                             quantity: v.quantity ? Number(v.quantity) : undefined
                         };
                    }
                });
            }
            payload.extra_services = cleanExtras;

            // Handle dates / nulls
            if (!payload.payment_due_date) (payload as any).payment_due_date = null;

            const { error: updateError } = await supabase
                .from('monthly_clients')
                .update(payload)
                .eq('id', client.id);

            if (updateError) throw updateError;

            // Generate future appointments automatically
            await generateFutureAppointments(payload);

            onMonthlyClientUpdated();
            onClose();
        } catch (err: any) {
            console.error('Erro ao salvar:', err);
            setError(err.message || 'Erro ao salvar alterações.');
        } finally {
            setSaving(false);
        }
    };

    const formatWhatsapp = (value: string) => {
        const digits = value.replace(/\D/g, '');
        return digits.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3').slice(0, 15);
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                    <div>
                        <h2 className="text-2xl font-bold font-outfit text-gray-800">Editar Mensalista</h2>
                        <p className="text-sm text-gray-500 font-jakarta">Atualize os dados e serviços do cliente</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
                    
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Seção 1: Identificação */}
                            <section>
                                <SectionTitle>
                                    <span className="bg-pink-100 text-pink-600 p-1.5 rounded-lg text-xs">01</span>
                                    Dados do Pet & Tutor
                                </SectionTitle>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Pet */}
                                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">Informações do Pet</h4>
                                        <div>
                                            <Label htmlFor="pet_name">Nome do Pet</Label>
                                            <Input id="pet_name" name="pet_name" value={formData.pet_name} onChange={handleInputChange} required />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label htmlFor="pet_breed">Raça</Label>
                                                <Input id="pet_breed" name="pet_breed" value={formData.pet_breed} onChange={handleInputChange} />
                                            </div>
                                            <div>
                                                <Label htmlFor="weight">Porte</Label>
                                                <Select id="weight" name="weight" value={formData.weight} onChange={handleInputChange}>
                                                    {PET_WEIGHT_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </Select>
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="pet_photo_url">Foto do Pet (URL)</Label>
                                            <Input id="pet_photo_url" name="pet_photo_url" value={formData.pet_photo_url || ''} onChange={handleInputChange} placeholder="https://..." />
                                        </div>
                                    </div>

                                    {/* Tutor */}
                                    <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-bold text-gray-900 mb-2">Informações do Tutor</h4>
                                        <div>
                                            <Label htmlFor="owner_name">Nome do Tutor</Label>
                                            <Input id="owner_name" name="owner_name" value={formData.owner_name} onChange={handleInputChange} required />
                                        </div>
                                        <div>
                                            <Label htmlFor="whatsapp">WhatsApp</Label>
                                            <Input 
                                                id="whatsapp" 
                                                name="whatsapp" 
                                                value={formatWhatsapp(formData.whatsapp || '')} 
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    handleInputChange({ target: { name: 'whatsapp', value: raw } } as any);
                                                }} 
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="owner_address">Endereço</Label>
                                            <Input id="owner_address" name="owner_address" value={formData.owner_address || ''} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Seção 2: Plano e Agendamento */}
                            <section>
                                <SectionTitle>
                                    <span className="bg-purple-100 text-purple-600 p-1.5 rounded-lg text-xs">02</span>
                                    Plano & Agendamento
                                </SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2 lg:col-span-1">
                                        <Label htmlFor="service">Serviço Principal</Label>
                                        <Select id="service" name="service" value={formData.service} onChange={handleInputChange}>
                                            <option value={ServiceType.BATH}>Banho</option>
                                            <option value={ServiceType.GROOMING}>Banho & Tosa</option>
                                            <option value="Pet Móvel">Pet Móvel</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="price">Preço Base (R$)</Label>
                                        <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <Label htmlFor="recurrence_type">Frequência</Label>
                                        <Select id="recurrence_type" name="recurrence_type" value={formData.recurrence_type} onChange={handleInputChange}>
                                            <option value="weekly">Semanal (Toda semana)</option>
                                            <option value="bi-weekly">Quinzenal (A cada 15 dias)</option>
                                            <option value="monthly">Mensal (Uma vez por mês)</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="recurrence_day">Dia</Label>
                                        <Select id="recurrence_day" name="recurrence_day" value={formData.recurrence_day} onChange={handleInputChange}>
                                            {formData.recurrence_type === 'monthly' ? (
                                                Array.from({length: 31}, (_, i) => i + 1).map(d => (
                                                    <option key={d} value={d}>Dia {d}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value={1}>Segunda-feira</option>
                                                    <option value={2}>Terça-feira</option>
                                                    <option value={3}>Quarta-feira</option>
                                                    <option value={4}>Quinta-feira</option>
                                                    <option value={5}>Sexta-feira</option>
                                                    <option value={6}>Sábado</option>
                                                </>
                                            )}
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="recurrence_time">Horário</Label>
                                        <Select id="recurrence_time" name="recurrence_time" value={formData.recurrence_time} onChange={handleInputChange}>
                                            {Array.from({ length: 13 }, (_, i) => 7 + i).map(h => (
                                                <option key={h} value={h}>{h}:00</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <Label htmlFor="condominium">Condomínio</Label>
                                        <Input id="condominium" name="condominium" value={formData.condominium || ''} onChange={handleInputChange} placeholder="Ex: Vila das Flores" />
                                    </div>
                                </div>
                            </section>

                            {/* Seção 3: Serviços Extras */}
                            <section>
                                <SectionTitle>
                                    <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg text-xs">03</span>
                                    Serviços Extras Recorrentes
                                </SectionTitle>
                                <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                    <ExtraServicesSelection 
                                        extraServices={(formData.extra_services as any) || {}}
                                        onToggle={handleExtraServiceToggle}
                                        onValueChange={handleExtraServiceValueChange}
                                        onQuantityChange={handleExtraServiceQuantityChange}
                                        type="monthly"
                                    />
                                </div>
                            </section>

                            {/* Seção 4: Status e Vencimento */}
                            <section>
                                <SectionTitle>
                                    <span className="bg-green-100 text-green-600 p-1.5 rounded-lg text-xs">04</span>
                                    Status & Pagamento
                                </SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="is_active">Status do Cliente</Label>
                                        <Select 
                                            id="is_active" 
                                            name="is_active" 
                                            value={formData.is_active ? 'true' : 'false'} 
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                                        >
                                            <option value="true">Ativo</option>
                                            <option value="false">Inativo / Pausado</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="payment_due_date">Data de Vencimento</Label>
                                        <Input id="payment_due_date" name="payment_due_date" type="date" value={formData.payment_due_date || ''} onChange={handleInputChange} />
                                    </div>
                                    <div>
                                        <Label htmlFor="payment_status">Status Atual Pagamento</Label>
                                        <Select id="payment_status" name="payment_status" value={formData.payment_status} onChange={handleInputChange}>
                                            <option value="Pendente">Pendente</option>
                                            <option value="Pago">Pago</option>
                                        </Select>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-600 font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        type="button"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-8 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-pink-500/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditMonthlyClientModal;
