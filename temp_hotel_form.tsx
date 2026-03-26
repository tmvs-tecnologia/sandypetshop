import { formatPhoneForWebhook } from './src/lib/utils';

const HotelRegistrationForm: React.FC<{

    setView?: (view: 'scheduler' | 'login' | 'hotelRegistration') => void;
    isAdmin?: boolean;
    onSuccess?: () => void;
}> = ({ setView, isAdmin = false, onSuccess }) => {
    const [formData, setFormData] = useState<HotelRegistration>({
        pet_name: '', pet_sex: null, pet_breed: '', is_neutered: null, pet_age: '',
        pet_weight: null,
        tutor_name: '', tutor_rg: '', tutor_address: '', tutor_phone: '', tutor_email: '', tutor_social_media: '',
        veterinarian: '', vet_phone: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
        has_rg_document: null, has_residence_proof: null, has_vaccination_card: null, has_vet_certificate: null,
        has_flea_tick_remedy: null, flea_tick_remedy_date: '', photo_authorization: null, retrieve_at_checkout: null,
        preexisting_disease: null, allergies: null, behavior: null, fears_traumas: null, wounds_marks: null,
        food_brand: null, food_quantity: null, feeding_frequency: null, food_observations: null, accepts_treats: null, special_food_care: null,
        check_in_date: '', check_in_time: '', check_out_date: '', check_out_time: '',
        service_bath: null, service_transport: null, service_daily_rate: null, service_extra_hour: null,
        service_vet: null, service_training: null, total_services_price: 0, additional_info: '',
        professional_name: '', registration_date: new Date().toISOString().split('T')[0],
        tutor_check_in_signature: '', tutor_check_out_signature: '', tutor_signature: '', declaration_accepted: false, status: 'Ativo',
        last_vaccination_date: '',
        extra_services: {
            pernoite: false, pernoite_quantity: 0, pernoite_price: 0,
            banho_tosa: false, banho_tosa_price: 0,
            so_banho: false, so_banho_price: 0,
            adestrador: false, adestrador_price: 0,
            despesa_medica: false, despesa_medica_price: 0,
            dias_extras: false, dias_extras_quantity: 0, dias_extras_price: 0
        }
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);


    useEffect(() => {
        if (!formData.payment_date) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const defaultPaymentDate = `${year}-${month}-30`;
            setFormData(prev => ({ ...prev, payment_date: defaultPaymentDate }));
        }
    }, []);
    const [isExtraServicesExpanded, setIsExtraServicesExpanded] = useState(false);
    const [step, setStep] = useState(1);
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [checkInHour, setCheckInHour] = useState<number | null>(null);
    const [checkOutHour, setCheckOutHour] = useState<number | null>(null);
    const [serviceBathText, setServiceBathText] = useState('');
    const [serviceTransportText, setServiceTransportText] = useState('');
    const [serviceDailyText, setServiceDailyText] = useState('');
    const [serviceExtraHourText, setServiceExtraHourText] = useState('');
    const [serviceTrainingText, setServiceTrainingText] = useState('');
    const [hasPreexistingDisease, setHasPreexistingDisease] = useState(false);
    const [needsSpecialFoodCare, setNeedsSpecialFoodCare] = useState(false);
    const [hasBehavior, setHasBehavior] = useState(false);
    const [hasFearsTraumas, setHasFearsTraumas] = useState(false);
    const [hasWoundsMarks, setHasWoundsMarks] = useState(false);
    const [hasAllergies, setHasAllergies] = useState(false);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showCheckinWarning, setShowCheckinWarning] = useState(false);

    const holidaySet = new Set(['12-23', '12-24', '12-25', '12-30', '12-31', '1-1']);
    function addDays(base: Date, days: number) {
        const r = new Date(base);
        r.setDate(r.getDate() + days);
        return r;
    }
    function getEasterDate(year: number) {
        const a = year % 19;
        const b = Math.floor(year / 100);
        const c = year % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const L = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * L) / 451);
        const month = Math.floor((h + L - 7 * m + 114) / 31); // 3=March, 4=April
        const day = ((h + L - 7 * m + 114) % 31) + 1;
        return new Date(year, month - 1, day);
    }
    function isHoliday(date: Date) {
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const key = `${m}-${d}`;
        if (holidaySet.has(key)) return true;
        const year = date.getFullYear();
        const easter = getEasterDate(year);
        const goodFriday = addDays(easter, -2);
        const easterSaturday = addDays(easter, -1);
        const easterSunday = easter;
        const carnivalMonday = addDays(easter, -48);
        const carnivalTuesday = addDays(easter, -47);
        const cmp = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
        return (
            cmp(date, goodFriday) ||
            cmp(date, easterSaturday) ||
            cmp(date, easterSunday) ||
            cmp(date, carnivalMonday) ||
            cmp(date, carnivalTuesday)
        );
    }
    function normalizeWeight(w: any): 'UP_TO_5' | 'KG_10' | 'KG_20' {
        if (w === 'UP_TO_5') return 'UP_TO_5';
        if (w === 'KG_10' || w === 'KG_15') return 'KG_10';
        return 'KG_20';
    }
    function getLengthBracket(n: number): '2_3' | '4_5' | '6_7' {
        if (n <= 3) return '2_3';
        if (n <= 5) return '4_5';
        return '6_7';
    }
    const priceBase = {
        '2_3': { UP_TO_5: 100, KG_10: 120, KG_20: 150 },
        '4_5': { UP_TO_5: 90, KG_10: 110, KG_20: 140 },
        '6_7': { UP_TO_5: 80, KG_10: 100, KG_20: 130 },
    } as const;
    const priceHoliday = { UP_TO_5: 120, KG_10: 140, KG_20: 160 } as const;
    function calculateTotal(ci: string | null, co: string | null, w: any) {
        if (!ci || !co) return { total: 0, nDiarias: 0, holidayDates: [] as Date[] };
        const ciPart = (ci || '').split('T')[0];
        const coPart = (co || '').split('T')[0];
        const ciParts = ciPart.split('-').map(Number);
        const coParts = coPart.split('-').map(Number);
        if (ciParts.length !== 3 || coParts.length !== 3) return { total: 0, nDiarias: 0, holidayDates: [] as Date[] };
        const start = new Date(ciParts[0], ciParts[1] - 1, ciParts[2]);
        const end = new Date(coParts[0], coParts[1] - 1, coParts[2]);
        const days: Date[] = [];
        const cur = new Date(start);
        while (cur < end) {
            days.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        if (days.length === 0) {
            days.push(new Date(start)); // mínimo de 1 diária mesmo se check-out no mesmo dia
        }
        const bracket = getLengthBracket(days.length);
        const normalized = normalizeWeight(w);
        let total = 0;
        const holidayDates: Date[] = [];
        for (const d of days) {
            if (isHoliday(d)) {
                total += priceHoliday[normalized];
                holidayDates.push(d);
            } else {
                total += priceBase[bracket][normalized];
            }
        }
        return { total, nDiarias: days.length, holidayDates };
    }

    useEffect(() => {
        if (checkInDate && checkInHour !== null) {
            const dateStr = checkInDate.toISOString().split('T')[0];
            const timeStr = `${checkInHour.toString().padStart(2, '0')}:00`;
            setFormData(prev => ({ ...prev, check_in_date: dateStr, check_in_time: timeStr }));
        }
    }, [checkInDate, checkInHour]);

    useEffect(() => {
        if (checkOutDate && checkOutHour !== null) {
            const dateStr = checkOutDate.toISOString().split('T')[0];
            const timeStr = `${checkOutHour.toString().padStart(2, '0')}:00`;
            setFormData(prev => ({ ...prev, check_out_date: dateStr, check_out_time: timeStr }));
        }
    }, [checkOutDate, checkOutHour]);

    // Cálculo automático do total de serviços


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            // Permite digitação livre para campos numéricos, sem conversão imediata
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            const shouldFormat = name === 'tutor_phone' || name === 'emergency_contact_phone' || name === 'vet_phone';
            setFormData(prev => ({ ...prev, [name]: shouldFormat ? formatWhatsapp(value) : value }));
        }
    };

    const handleRadioChange = (name: keyof HotelRegistration, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.declaration_accepted) {
            alert('Por favor, aceite a declaração antes de prosseguir');
            return;
        }
        setIsSubmitting(true);
        try {
            const { total: computedTotal } = calculateTotal(formData.check_in_date || null, formData.check_out_date || null, formData.pet_weight);

            const payload = {
                pet_name: formData.pet_name || '',
                pet_sex: formData.pet_sex,
                pet_breed: formData.pet_breed || '',
                is_neutered: formData.is_neutered,
                pet_age: formData.pet_age || '',
                pet_weight: formData.pet_weight || null,
                tutor_name: formData.tutor_name || '',
                tutor_rg: formData.tutor_rg || '',
                tutor_address: formData.tutor_address || '',
                tutor_phone: formData.tutor_phone || '',
                tutor_email: formData.tutor_email || '',
                tutor_social_media: formData.tutor_social_media || '',
                vet_phone: formData.vet_phone || '',
                emergency_contact_name: formData.emergency_contact_name || '',
                emergency_contact_phone: formData.emergency_contact_phone || '',
                emergency_contact_relation: formData.emergency_contact_relation || '',
                has_rg_document: formData.has_rg_document,
                has_residence_proof: formData.has_residence_proof,
                has_vaccination_card: formData.has_vaccination_card,
                has_vet_certificate: formData.has_vet_certificate,
                has_flea_tick_remedy: formData.has_flea_tick_remedy,
                flea_tick_remedy_date: formData.flea_tick_remedy_date || null,
                last_vaccination_date: formData.last_vaccination_date || null,
                photo_authorization: formData.photo_authorization,
                retrieve_at_checkout: formData.retrieve_at_checkout,
                preexisting_disease: formData.preexisting_disease,
                allergies: formData.allergies,
                behavior: formData.behavior,
                fears_traumas: formData.fears_traumas,
                wounds_marks: formData.wounds_marks,
                food_brand: formData.food_brand,
                food_quantity: formData.food_quantity,
                feeding_frequency: formData.feeding_frequency,
                food_observations: formData.food_observations,
                accepts_treats: formData.accepts_treats,
                special_food_care: formData.special_food_care,
                check_in_date: formData.check_in_date || null,
                check_in_time: formData.check_in_time || null,
                check_out_date: formData.check_out_date || null,
                check_out_time: formData.check_out_time || null,
                service_bath: formData.service_bath,
                service_transport: formData.service_transport,
                service_daily_rate: formData.service_daily_rate,
                service_extra_hour: formData.service_extra_hour,
                service_vet: formData.service_vet,
                service_training: formData.service_training,
                total_services_price: computedTotal,
                additional_info: formData.additional_info || '',
                professional_name: formData.professional_name || '',
                registration_date: formData.registration_date || new Date().toISOString().split('T')[0],
                tutor_check_in_signature: formData.tutor_check_in_signature || '',
                tutor_check_out_signature: formData.tutor_check_out_signature || '',
                tutor_signature: formData.tutor_signature || '',
                declaration_accepted: formData.declaration_accepted || false,
                contract_accepted: formData.contract_accepted || false,
                status: formData.status || 'Ativo',
                extra_services: formData.extra_services || {},
                // Campos que existem na tabela mas podem estar faltando
                check_in_status: 'pending',
                checked_in_at: null,
                checked_out_at: null,
                payment_status: 'Pendente',
                responsible_signature: formData.tutor_signature || '', // Usar tutor_signature como fallback
                veterinarian: formData.veterinarian || ''
            };

            console.log('Payload completo:', payload);

            let { error } = await supabase.from('hotel_registrations').insert(payload);
            if (error) {
                const msg = String(error.message || '');
                if (msg.includes("pet_weight") && msg.includes("schema cache")) {
                    const fallback = { ...payload } as any;
                    delete fallback.pet_weight;
                    const weightLabel = formData.pet_weight ? PET_WEIGHT_OPTIONS[formData.pet_weight as PetWeight] : 'N/A';
                    fallback.additional_info = `${fallback.additional_info ? fallback.additional_info + '\n' : ''}Peso do Pet: ${weightLabel}`;
                    const retry = await supabase.from('hotel_registrations').insert(fallback);
                    error = retry.error;
                }
            }
            if (error) throw error;

            // Envio para webhook de documentos (N8N)
            const webhookUrl = 'https://n8n.intelektus.tech/webhook/envioDocumentosHotel';
            const formattedPhone = formatPhoneForWebhook(formData.tutor_phone);
            
            try {
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tutor_name: formData.tutor_name,
                        tutor_phone: formattedPhone
                    })
                }).catch(err => console.error('Erro assíncrono no webhook:', err));
                console.log('Webhook de documentos disparado');
            } catch (webhookErr) {
                console.error('Erro ao disparar webhook de documentos:', webhookErr);
            }

            setShowCheckinWarning(false);

            setIsSuccess(true);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            alert(`Erro ao criar registro de hotel: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-pink-600 bg-opacity-90 flex items-center justify-center z-50 animate-fadeIn p-4">
                <div className="text-center bg-white p-8 rounded-2xl shadow-2xl max-w-full sm:max-w-sm mx-auto">
                    <SuccessIcon />
                    <h2 className="text-3xl font-bold text-gray-800 mt-2">Solicitação Enviada!</h2>
                    <p className="text-gray-600 mt-2">Recebemos sua solicitação de check-in. Entraremos em contato em breve.</p>
                    <button onClick={() => setView && setView('scheduler')} className="mt-6 bg-pink-600 text-white font-bold py-3.5 px-8 rounded-lg hover:bg-pink-700 transition-colors">OK</button>
                </div>
            </div>
        );
    }

    const renderRadioGroup = (label: string, name: keyof HotelRegistration, options: { label: string, value: any }[]) => (
        <div>
            <label className="block text-base font-semibold text-gray-700 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button type="button" key={opt.label} onClick={() => handleRadioChange(name, opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${formData[name as keyof typeof formData] === opt.value ? 'bg-pink-300 text-black border-pink-600' : 'bg-white text-gray-700 border-gray-300 hover:border-pink-400'}`}>
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    const hotelHours = [8, 9, 10, 11, 12, 14, 15, 16, 17, 18];

    const onBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            setView && setView('scheduler');
        }
    };

    const isStep1Valid = formData.pet_name && formData.tutor_name && formData.tutor_phone && formData.pet_breed && formData.tutor_address;
    const isStep2Valid = true;
    const isStep3Valid = true;
    const isStep4Valid = formData.check_in_date && formData.check_in_time && formData.check_out_date && formData.check_out_time;
    const isStep5Valid = true;

    const formContent = (
        <div className="w-full max-w-3xl mx-auto bg-rose-50 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
            <form ref={formRef} onSubmit={handleSubmit} className="relative p-6 sm:p-8">
                {/* Seção 1: Dados do Pet e Tutor */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📋 Dados do Pet e Tutor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 text-center">
                            <h4 className="text-lg font-bold text-gray-800">Dados Pet</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Pet *</label>
                            <input type="text" name="pet_name" value={formData.pet_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                            <select name="pet_sex" value={formData.pet_sex} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione o sexo</option>
                                <option value="Macho">Macho</option>
                                <option value="Fêmea">Fêmea</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Peso do Pet</label>
                            <select name="pet_weight" value={formData.pet_weight || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione o peso</option>
                                {(Object.keys(PET_WEIGHT_OPTIONS) as PetWeight[]).map(key => (
                                    <option key={key} value={key}>{PET_WEIGHT_OPTIONS[key]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Raça</label>
                            <input type="text" name="pet_breed" value={formData.pet_breed} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Idade</label>
                            <input type="text" name="pet_age" value={formData.pet_age} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="md:col-span-2 text-center">
                            <h4 className="text-lg font-bold text-gray-800">Dados Tutor</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                            <input type="text" name="tutor_rg" value={formData.tutor_rg} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Tutor *</label>
                            <input type="text" name="tutor_name" value={formData.tutor_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone *</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    name="tutor_phone"
                                    value={formData.tutor_phone}
                                    onChange={handleInputChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" name="tutor_email" value={formData.tutor_email} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Endereço</label>
                            <input type="text" name="tutor_address" value={formData.tutor_address} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rede Social (Instagram)</label>
                            <input type="text" name="tutor_social_media" value={formData.tutor_social_media || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="@perfil" />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Nome</label>
                                <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Telefone</label>
                                <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Contato Emergência - Relação</label>
                                <input type="text" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção 2: Informações Médicas */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🏥 Informações Médicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome Veterinário</label>
                            <input type="text" name="veterinarian" value={formData.veterinarian} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Telefone do Veterinário</label>
                            <input type="tel" name="vet_phone" value={formData.vet_phone || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Última vacinação</label>
                            <input type="date" name="last_vaccination_date" value={formData.last_vaccination_date || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={!!formData.is_neutered} onChange={(e) => setFormData(prev => ({ ...prev, is_neutered: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Castrado</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasPreexistingDisease} onChange={(e) => { setHasPreexistingDisease(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, preexisting_disease: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Doença pré-existente</label>
                        </div>
                        {hasPreexistingDisease && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descreva a doença pré-existente</label>
                                <textarea name="preexisting_disease" value={formData.preexisting_disease || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasBehavior} onChange={(e) => { setHasBehavior(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, behavior: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Comportamento</label>
                        </div>
                        {hasBehavior && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comportamento (descreva)</label>
                                <textarea name="behavior" value={formData.behavior || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasFearsTraumas} onChange={(e) => { setHasFearsTraumas(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, fears_traumas: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Medos/Traumas</label>
                        </div>
                        {hasFearsTraumas && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Medos/Traumas (descreva)</label>
                                <textarea name="fears_traumas" value={formData.fears_traumas || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasWoundsMarks} onChange={(e) => { setHasWoundsMarks(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, wounds_marks: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Feridas/Marcas</label>
                        </div>
                        {hasWoundsMarks && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Feridas/Marcas — marque na foto</label>
                                <textarea name="wounds_marks" value={formData.wounds_marks || ''} onChange={handleInputChange} placeholder="Descreva e marque na foto durante o check-in" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={2} />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={hasAllergies} onChange={(e) => { setHasAllergies(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, allergies: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Alergias</label>
                        </div>
                        {hasAllergies && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Alergias (descreva)</label>
                                <textarea name="allergies" value={formData.allergies || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Seção 3: Alimentação */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">🍽️ Alimentação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Marca da Ração</label>
                            <input type="text" name="food_brand" value={formData.food_brand || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade por Refeição</label>
                            <input type="text" name="food_quantity" value={formData.food_quantity || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Frequência de Alimentação</label>
                            <select name="feeding_frequency" value={formData.feeding_frequency || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="">Selecione a frequência</option>
                                <option value="1x ao dia">1x ao dia</option>
                                <option value="2x ao dia">2x ao dia</option>
                                <option value="3x ao dia">3x ao dia</option>
                                <option value="Livre demanda">Livre demanda</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={(formData.accepts_treats || '') === 'Sim'} onChange={(e) => setFormData(prev => ({ ...prev, accepts_treats: e.target.checked ? 'Sim' : 'Não' }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Aceita petiscos</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={needsSpecialFoodCare} onChange={(e) => { setNeedsSpecialFoodCare(e.target.checked); if (!e.target.checked) setFormData(prev => ({ ...prev, special_food_care: null })); }} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                            <label className="text-sm font-medium text-gray-700">Cuidado especial</label>
                        </div>
                        {needsSpecialFoodCare && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Descreva o cuidado especial</label>
                                <textarea name="special_food_care" value={formData.special_food_care || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Observações sobre Alimentação</label>
                            <textarea name="food_observations" value={formData.food_observations || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                        </div>
                    </div>
                </div>

                {/* Seção 4: Check-in e Check-out */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📅 Datas e Horários</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Check-in *</label>
                            <input type="date" name="check_in_date" value={formData.check_in_date} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Check-in *</label>
                            <select name="check_in_time" value={formData.check_in_time || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2, '0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Check-out *</label>
                            <input type="date" name="check_out_date" value={formData.check_out_date} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent relative z-10" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Check-out *</label>
                            <select name="check_out_time" value={formData.check_out_time || ''} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                                <option value="">Selecione...</option>
                                {Array.from({ length: ((19 - 7) * 2) + 1 }, (_, i) => {
                                    const h = 7 + Math.floor(i / 2);
                                    const m = i % 2 ? '30' : '00';
                                    const t = `${String(h).padStart(2, '0')}:${m}`;
                                    return (<option key={t} value={t}>{t}</option>);
                                })}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Seção 5: Serviços Adicionais */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => setIsExtraServicesExpanded(!isExtraServicesExpanded)}
                    >
                        <h3 className="text-xl font-bold text-gray-800">🛁 Serviços Adicionais</h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">
                                {isExtraServicesExpanded ? 'Ocultar' : 'Mostrar'} opções
                            </span>
                            <svg
                                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExtraServicesExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {isExtraServicesExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="bath" checked={formData.extra_services?.bath || false} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, bath: e.target.checked } }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Banho</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="transport" checked={formData.extra_services?.transport || false} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, transport: e.target.checked } }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Transporte</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="vet" checked={formData.extra_services?.vet || false} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, vet: e.target.checked } }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Veterinário</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input type="checkbox" name="training" checked={formData.extra_services?.training || false} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, training: e.target.checked } }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                    <label className="text-sm font-medium text-gray-700">Adestramento</label>
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Diária (quantidade de dias)</label>
                                    <input type="number" name="daily_rate" value={formData.extra_services.daily_rate} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, daily_rate: e.target.value === '' ? 0 : parseInt(e.target.value) } }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
                                </div>
                                <div className="md:col-span-2 lg:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora Extra (quantidade de horas)</label>
                                    <input type="number" name="extra_hour" value={formData.extra_services.extra_hour} onChange={(e) => setFormData(prev => ({ ...prev, extra_services: { ...prev.extra_services, extra_hour: e.target.value === '' ? 0 : parseInt(e.target.value) } }))} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" min="0" />
                                </div>
                                {/* Campo "Total dos Serviços" removido conforme solicitado */}
                            </div>
                        </div>
                    )}
                </div>

                {/* Seção 6: Informações Finais */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">📝 Informações Finais</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Informações Adicionais</label>
                            <textarea name="additional_info" value={formData.additional_info} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={4} placeholder="Observações gerais, comportamento do pet, preferências, etc." />
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-pink-100">
                            <h4 className="text-lg font-bold text-pink-700 mb-3 text-center">Resumo do Check-in</h4>
                            {(() => {
                                const ciDate = formData.check_in_date || null;
                                const coDate = formData.check_out_date || null;
                                const ciTime = formData.check_in_time || '';
                                const coTime = formData.check_out_time || '';
                                const { total, nDiarias, holidayDates } = calculateTotal(ciDate, coDate, formData.pet_weight);
                                const pesoLabel = formData.pet_weight ? PET_WEIGHT_OPTIONS[formData.pet_weight as any] : '—';
                                const feriados = holidayDates.map(d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`).join(', ');
                                const extras: string[] = [];
                                if (formData.extra_services?.bath) extras.push('Banho');
                                if (formData.extra_services?.transport) extras.push('Transporte');
                                if (formData.extra_services?.vet) extras.push('Veterinário');
                                if (formData.extra_services?.training) extras.push('Adestramento');
                                return (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                            <div><span className="font-semibold">Pet:</span> {formData.pet_name || '—'}</div>
                                            <div><span className="font-semibold">Peso:</span> {pesoLabel}</div>
                                            <div><span className="font-semibold">Tutor:</span> {formData.tutor_name || '—'}</div>
                                            <div><span className="font-semibold">Telefone:</span> {formData.tutor_phone || '—'}</div>
                                            <div><span className="font-semibold">Check-in:</span> {ciDate ? formatDateToBR(ciDate) : '—'} {ciTime ? `às ${ciTime}` : ''}</div>
                                            <div><span className="font-semibold">Check-out:</span> {coDate ? formatDateToBR(coDate) : '—'} {coTime ? `às ${coTime}` : ''}</div>
                                            <div><span className="font-semibold">Diárias:</span> {nDiarias || 0}</div>
                                            <div><span className="font-semibold">Feriados:</span> {feriados || '—'}</div>
                                        </div>
                                        {extras.length > 0 && (
                                            <div>
                                                <h5 className="text-sm font-semibold text-gray-800 mb-1">Serviços Adicionais</h5>
                                                <div className="flex flex-wrap gap-1">
                                                    {extras.map(e => (
                                                        <span key={e} className="px-2 py-1 text-xs rounded-full bg-pink-100 text-pink-700">{e}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-2 p-3 rounded-lg bg-pink-50 border border-pink-100 text-center">
                                            <p className="text-base font-bold text-pink-700">Total do Serviço: R$ {total.toFixed(2)}</p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="declaration_accepted" checked={formData.declaration_accepted || false} onChange={(e) => setFormData(prev => ({ ...prev, declaration_accepted: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" required />
                                <label className="text-sm text-gray-700">
                                    Declaro que todas as informações fornecidas são verdadeiras e autorizo o hotel pet a cuidar do meu animal de acordo com as instruções fornecidas. *
                                </label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="photo_authorization" checked={formData.photo_authorization || false} onChange={(e) => setFormData(prev => ({ ...prev, photo_authorization: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                <label className="text-sm text-gray-700">
                                    Autorizo o uso de fotos do meu pet para divulgação nas redes sociais do estabelecimento.
                                </label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <input type="checkbox" name="contract_accepted" checked={formData.contract_accepted || false} onChange={(e) => setFormData(prev => ({ ...prev, contract_accepted: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                <label className="text-sm text-gray-700">
                                    Concordo e estou de acordo com as cláusulas do <button type="button" onClick={() => setShowContractModal(true)} className="underline text-pink-700 hover:text-pink-800">Contrato de hospedagem da Sandy Pet Hotel</button>.
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assinatura do Tutor *</label>
                                <SignaturePad
                                    value={formData.tutor_signature}
                                    onChange={(dataUrl) => setFormData(prev => ({ ...prev, tutor_signature: dataUrl }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify_between items-center">
                    <button type="button" onClick={onBack} className="bg-gray-200 text-gray-800 font-bold py-3.5 px-5 rounded-lg hover:bg_gray-300 transition-colors">Voltar</button>
                    <div className="flex-grow"></div>
                    <button
                        type="button"
                        disabled={
                            isSubmitting ||
                            !formData.declaration_accepted ||
                            !formData.contract_accepted ||
                            !formData.tutor_signature ||
                            !(formData.pet_name && formData.tutor_rg && formData.tutor_name && formData.tutor_phone && formData.tutor_address && formData.check_in_date && formData.check_out_date)
                        }
                        onClick={() => setShowCheckinWarning(true)}
                        className="w-full md:w-auto bg-green-500 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
                    >
                        {isSubmitting ? 'Salvando...' : 'Solicitar Check-in'}
                    </button>
                </div>
            </form>
            {showCheckinWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-800">Antes de solicitar o check-in</h3>
                        <p className="text-gray-700 mt-2">No dia do check-in, o tutor deve levar:</p>
                        <ul className="mt-3 list-disc list-inside text-gray-700 space-y-1">
                            <li>RG</li>
                            <li>Comprovante de Residência</li>
                            <li>Carteira de Vacinação</li>
                            <li>Ração</li>
                            <li>Guia</li>
                            <li>Coberta</li>
                            <li>Comedouros</li>
                        </ul>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button type="button" onClick={() => setShowCheckinWarning(false)} className="bg-gray-200 text-gray-800 font-bold py-2.5 px-5 rounded-lg hover:bg-gray-300 transition-colors">Voltar</button>
                            <button
                                type="button"
                                disabled={
                                    isSubmitting ||
                                    !formData.declaration_accepted ||
                                    !formData.contract_accepted ||
                                    !formData.tutor_signature ||
                                    !(formData.pet_name && formData.tutor_rg && formData.tutor_name && formData.tutor_phone && formData.tutor_address && formData.check_in_date && formData.check_out_date)
                                }
                                onClick={() => formRef.current?.requestSubmit()}
                                className="w-full md:w-auto bg-green-500 text-white font-bold py-3.5 px-5 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300"
                            >
                                Solicitar Check-in
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showContractModal && createPortal(
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Contrato de hospedagem da Sandy Pet Hotel</h3>
                            <button type="button" onClick={() => setShowContractModal(false)} className="p-2 rounded-md hover:bg-gray-100">✕</button>
                        </div>
                        <div className="p-4 space-y-3 text-sm text-gray-700">
                            <p><span className="font-semibold">Nome do Pet:</span> {formData.pet_name || '—'}</p>
                            <p><span className="font-semibold">Nome do Cliente (tutor):</span> {formData.tutor_name || '—'}</p>
                            <h4 className="font-semibold mt-2">Cláusula 1</h4>
                            <p>Será de responsabilidade do Hotel Sandys Pet, a alimentação (fornecida pelo tutor), hidratação, guarda e integridade física e mental do hóspede, no tempo de permanência do pet no Hotel.</p>
                            <p>1.1 Será seguida à risca as informações contidas na ficha de Check in/check out do hóspede, acordadas com o tutor.</p>
                            <p>1.2 O tutor receberá acesso às câmeras 24h para a vigilância do seu pet.</p>
                            <h4 className="font-semibold mt-2">Cláusula 2</h4>
                            <p>Acompanhamento do médico(a) veterinário(a), se necessário, os custos serão repassados ao tutor. A não ser que, o veterinário(a) específico do tutor venha atender o hóspede no local.</p>
                            <h4 className="font-semibold mt-2">Cláusula 3</h4>
                            <p>Em caso de óbito do hóspede, por morte natural ou por agravamento de doenças crônicas ou preexistentes, o Hotel não tem responsabilidade nenhuma.</p>
                            <p>3.1 O tutor poderá solicitar necropsia para comprovação da morte, porém as despesas serão por sua conta.</p>
                            <p>3.2 Se comprovada morte por má hospedagem, manejo ou acidente no Hotel enquanto hospedado, o ressarcimento terá o valor de um animal filhote.</p>
                            <h4 className="font-semibold mt-2">Cláusula 4</h4>
                            <p>Será exigida no check-in cópias dos seguintes documentos: RG e Comprovante de residência do tutor, carteira de vacinação do pet, receituário de remédios ou procedimentos e um atestado veterinário da boa saúde do pet.</p>
                            <p>4.1 Não aceitamos pet no cio.</p>
                            <p>4.2 Pet vacinado a menos de 15 dias, antes do check-in (se contrair algum vírus, a responsabilidade será do tutor).</p>
                            <p>4.3 Não aceitamos pets agressivos ou de difícil manejo.</p>
                            <p>4.4 Somente o tutor poderá retirar o pet (a não ser que tenha deixado previamente avisado a recepção do Hotel e colocado no check-in).</p>
                            <h4 className="font-semibold mt-2">Cláusula 5</h4>
                            <p>Pagamento integral no check-in do pet.</p>
                            <p>5.1 No check-out, atente-se aos dias e horários estabelecidos, para que não gerem taxas extras.</p>
                            <p>5.2 Se o tutor retirar o pet antes da data de check-out o valor da diária ou diárias não será devolvido.</p>
                            <p>5.3 Feriados prolongados, o tutor deverá fazer reserva antecipada e deixar 50% pago.</p>
                            <h4 className="font-semibold mt-2">Cláusula 6</h4>
                            <p>Todo o ambiente do Hotel é lavado e higienizado com produtos específicos, 2 a 3 vezes ao dia.</p>
                            <h4 className="font-semibold mt-2">Cláusula 7</h4>
                            <p>Se contratado serviço de banho e tosa, o mesmo será feito apenas no dia da entrega.</p>
                            <p>7.1 Na devolução do pet o tutor deverá examinar o mesmo, pois não aceitaremos reclamações posteriores.</p>
                            <p>7.2 Brinquedos e pertences devem estar com o nome do pet.</p>
                            <h4 className="font-semibold mt-2">Cláusula 8</h4>
                            <p>O pet que não for retirado (e o Hotel não conseguir contato), após 24 horas poderá ser doado, e o tutor responderá criminalmente por abandono de animais.</p>
                            <h4 className="font-semibold mt-2">Cláusula 9</h4>
                            <p>Pendências decorrentes deste contrato serão determinadas pelo Foro Central da Comarca da Capital/SP.</p>
                            <h4 className="font-semibold mt-2">Cláusula 10</h4>
                            <p>Os valores deste contrato poderão ser corrigidos sem aviso prévio.</p>
                            <p>Estando todas as partes em comum acordo e anexado aqui: check list (CHECK IN - CHECK OUT), CÓPIA DOS DOCUMENTOS CLÁUSULA 4.</p>
                        </div>
                        <div className="p-4 border-t flex justify-end">
                            <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Fechar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );

    if (isAdmin) {
        return formContent;
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-[#fff0f5] font-sans selection:bg-pink-200">
            <div className="w-full max-w-5xl mx-auto animate-fadeIn">
                <header className="w-full flex flex-col md:flex-row items-center justify-between mb-8 animate-fadeInUp gap-6">
                    <div className="flex items-center gap-5 text-center md:text-left">
                        <div className="relative">
                            <div className="absolute inset-0 bg-pink-300 rounded-full blur-xl opacity-50"></div>
                            <SafeImage src="https://i.imgur.com/M3Gt3OA.png" alt="Sandy's Pet Shop Logo" className="relative h-20 w-20 object-contain drop-shadow-2xl" loading="eager" />
                        </div>
                        <div>
                            <h1 className="font-brand text-4xl md:text-5xl text-pink-900 tracking-tight leading-none">Sandy's Pet Shop</h1>
                            <p className="text-pink-800/70 text-sm md:text-base font-semibold tracking-wide uppercase mt-2">Matrícula no Hotel</p>
                        </div>
                    </div>
                </header>

                <main className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-pink-100/50 backdrop-blur-sm relative">
                    <button
                        type="button"
                        onClick={() => setView && setView('scheduler')}
                        className="absolute left-4 top-4 p-2 rounded-full bg-white/80 hover:bg-white text-pink-600 hover:text-pink-800 shadow-sm border border-pink-100 transition-all z-10"
                        title="Voltar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <div className="pt-8">
                        {formContent}
                    </div>
                </main>
            </div>
        </div>
    );
};