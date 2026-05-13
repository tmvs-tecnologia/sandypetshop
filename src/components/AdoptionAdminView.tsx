import React, { useEffect, useState, useRef } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import { supabase } from '../../supabaseClient';
import { 
    PlusIcon, 
    TrashIcon, 
    Sparkles,
    PawPrint,
    Heart,
    ArrowLeft,
    X,
    Upload,
    Phone,
    Scale,
    Clock,
    ShieldCheck,
    Smile,
    ChevronRight,
    Image
} from 'lucide-react';

const FallbackImage = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export const AdoptionAdminView: React.FC = () => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedPet, setSelectedPet] = useState<any | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const isAnyModalOpen = isAddModalOpen || selectedPet !== null;

    useEffect(() => {
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isAnyModalOpen]);

    useEffect(() => {
        if (isAddModalOpen && modalRef.current) {
            modalRef.current.focus();
        }
    }, [isAddModalOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsAddModalOpen(false);
            setSelectedPet(null);
        }
    };

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [age, setAge] = useState('Adulto');
    const [size, setSize] = useState('Médio');
    const [gender, setGender] = useState('Macho');
    const [temperament, setTemperament] = useState('');
    const [healthStatus, setHealthStatus] = useState('Vacinado & Vermifugado');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPets = async () => {
  // This function is also used by the realtime listener below

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('adoption_pets')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPets(data || []);
        } catch (err) {
            console.error('Erro ao buscar pets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPets();
    }, []);

    // Realtime: refresh list whenever any adoption pet record changes
    useRealtime(['adoption_pets'], fetchPets);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este pet? (Ex: ele já foi adotado)')) return;
        try {
            const { error } = await supabase.from('adoption_pets').delete().eq('id', id);
            if (error) throw error;
            setPets(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAddPet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !description || !contactPhone) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        setUploading(true);
        try {
            let photo_url = null;

            if (photoFile) {
                const ext = photoFile.name.split('.').pop() || 'jpg';
                const fileName = `adoption/${Math.random().toString(36).substring(2)}-${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('pet_album').upload(fileName, photoFile);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('pet_album').getPublicUrl(fileName);
                photo_url = publicUrl;
            }

            const { error: dbError } = await supabase.from('adoption_pets').insert([{
                name,
                description,
                contact_phone: contactPhone,
                photo_url,
                age,
                size,
                gender,
                temperament: temperament || 'Dócil, Carinhoso e Brincalhão',
                health_status: healthStatus
            }]);

            if (dbError) throw dbError;

            setIsAddModalOpen(false);
            resetForm();
            fetchPets();
        } catch (err: any) {
            console.error(err);
            alert('Erro ao adicionar pet: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setContactPhone('');
        setAge('Adulto');
        setSize('Médio');
        setGender('Macho');
        setTemperament('');
        setHealthStatus('Vacinado & Vermifugado');
        setPhotoFile(null);
        setPhotoPreview(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    return (
        <div className="w-full min-h-screen bg-[#F8ECEF] p-4 sm:p-6 overflow-y-auto">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-96 h-96 bg-[#FF9A44]/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-[#E93D8E]/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                {/* Header */}
                <div className="flex flex-col items-start gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-[#4A0D2B] tracking-tight" style={{ fontFamily: '"Lobster Two", cursive' }}>
                            Gestão de Adoção
                            <Sparkles className="inline-block ml-2 w-6 h-6 text-[#FF9A44] animate-float" />
                        </h1>
                        <p className="text-[#D98AA8] font-medium text-sm mt-1 flex items-center gap-2">
                            <PawPrint className="w-4 h-4" /> Cadastre os pets que aparecerão na página de adoção
                        </p>
                    </div>
                </div>
                {/* Centered Cadastrar Pet button */}
                <div className="flex justify-center w-full mb-8">
                    <button
                        onClick={openAddModal}
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] text-white rounded-2xl font-bold hover:brightness-110 transition-all shadow-xl shadow-pink-200 active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="text-sm">Cadastrar Pet</span>
                    </button>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-5">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-pink-100 border-b-[#E93D8E] animate-spin"></div>
                            <PawPrint className="absolute inset-0 m-auto w-6 h-6 text-[#E93D8E] animate-pulse" />
                        </div>
                        <p className="text-[#D98AA8] font-bold tracking-wide text-sm uppercase">Carregando pets...</p>
                    </div>
                ) : pets.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-pink-200/50">
                        <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Sparkles className="w-12 h-12 text-[#D98AA8]" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#4A0D2B] mb-2">Nenhum pet cadastrado</h3>
                        <p className="text-[#D98AA8] text-sm max-w-xs mx-auto font-medium mb-6">
                            Cadastre os pets que estão aguardando um novo lar!
                        </p>
                        <button
                            onClick={openAddModal}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white rounded-full font-bold shadow-lg shadow-pink-200 hover:brightness-110 transition-all"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Primeiro Pet
                        </button>
                    </div>
                ) : (
                    /* Pet Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-16">
                        {pets.map((pet) => (
                            <div 
                                key={pet.id}
                                onClick={() => setSelectedPet(pet)}
                                className="group bg-white rounded-[2.5rem] p-4 shadow-xl shadow-pink-100/50 border border-white flex flex-col cursor-pointer transform-gpu hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-200/60"
                            >
                                {/* Photo Container */}
                                <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-100 mb-4">
                                    <img 
                                        src={pet.photo_url || FallbackImage} 
                                        alt={pet.name} 
                                        className="w-full h-full object-cover transition-transform duration-1000 ease-out md:group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80 pointer-events-none"></div>
                                    
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(pet.id);
                                        }}
                                        className="absolute top-4 right-4 p-3 bg-red-500/90 backdrop-blur-md text-white rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-20"
                                        title="Remover (Adotado)"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>

                                    {/* Tags */}
                                    <div className="absolute bottom-4 left-4 flex flex-wrap gap-1.5 z-10">
                                        <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#E93D8E] uppercase tracking-wider">{pet.age || 'Adulto'}</span>
                                        <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#4A0D2B] uppercase tracking-wider">{pet.size || 'Médio'}</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex flex-col flex-1 px-2">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-2xl font-black text-[#4A0D2B] tracking-tight leading-none" style={{ fontFamily: '"Outfit", sans-serif' }}>
                                            {pet.name}
                                        </h3>
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#D98AA8] uppercase tracking-widest">
                                            <PawPrint className="w-3 h-3" /> {pet.gender || 'Macho'}
                                        </span>
                                    </div>

                                    <p className="text-[#D98AA8] text-sm leading-relaxed mb-3 line-clamp-2 font-medium">
                                        {pet.description || 'Uma alma pura esperando por uma chance de brilhar ao seu lado.'}
                                    </p>

                                    {/* Contact Preview */}
                                    <div className="mt-auto flex items-center gap-2 text-xs font-bold text-[#4A0D2B]/60">
                                        <Phone className="w-3 h-3" />
                                        <span>{pet.contact_phone}</span>
                                        <ChevronRight className="w-4 h-4 ml-auto text-[#E93D8E]" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ADD PET MODAL */}
                {isAddModalOpen && (
                    <div 
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#4A0D2B]/60 backdrop-blur-md"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setIsAddModalOpen(false);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                    >
                        <div 
                            ref={modalRef}
                            tabIndex={-1}
                            className="bg-white w-full max-w-2xl rounded-[2.5rem] md:rounded-[2.5rem] shadow-2xl shadow-pink-200 md:my-8 h-full md:h-auto max-md:fixed max-md:inset-0 max-md:rounded-none max-md:top-16 overflow-hidden relative outline-none"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header - Elegante */}
                            <div className="bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] px-4 py-5 sm:px-6 sm:py-6 text-white relative overflow-hidden flex-shrink-0">
                                <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                                <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-[#FF9A44]/30 rounded-full blur-2xl"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                                            <PawPrint className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                                                Novo Pet
                                            </h2>
                                            <p className="text-white/70 text-xs font-medium">
                                                Cadastro para adoção
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl hover:bg-white/25 transition-all flex items-center justify-center shadow-md"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-4 sm:p-8 h-[calc(100vh-180px)] md:h-auto md:max-h-[70vh] overflow-y-auto no-scrollbar pb-24 md:pb-6">
                                <form onSubmit={handleAddPet} className="space-y-6">
                                    {/* Photo Upload */}
                                    <div className="flex flex-col items-center">
                                        <label className="cursor-pointer group">
                                            <div className={`relative w-32 h-32 rounded-full overflow-hidden border-4 border-dashed transition-all ${
                                                photoPreview ? 'border-[#E93D8E]' : 'border-pink-200 group-hover:border-[#E93D8E]'
                                            }`}>
                                                {photoPreview ? (
                                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center">
                                                        <Upload className="w-8 h-8 text-pink-300 group-hover:text-[#E93D8E] transition-colors" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="block text-center text-sm font-bold text-[#D98AA8] mt-2">Adicionar Foto</span>
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handlePhotoChange}
                                            />
                                        </label>
                                    </div>

                                    {/* Name & Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2">Nome do Pet *</label>
                                            <input 
                                                type="text" 
                                                required 
                                                value={name} 
                                                onChange={e => setName(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B] placeholder:text-pink-200"
                                                placeholder="Ex: Bob, Luna, Thor..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2">WhatsApp de Contato *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-300" />
                                                <input 
                                                    type="text" 
                                                    required 
                                                    value={contactPhone} 
                                                    onChange={e => setContactPhone(e.target.value)} 
                                                    className="w-full p-4 pl-12 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B] placeholder:text-pink-200"
                                                    placeholder="(11) 99999-9999"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Age, Size, Gender */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[#E93D8E]" /> Idade
                                            </label>
                                            <select 
                                                value={age} 
                                                onChange={e => setAge(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B]"
                                            >
                                                <option value="Filhote">Filhote</option>
                                                <option value="Adulto">Adulto</option>
                                                <option value="Idoso">Idoso</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2 flex items-center gap-2">
                                                <Scale className="w-4 h-4 text-[#E93D8E]" /> Porte
                                            </label>
                                            <select 
                                                value={size} 
                                                onChange={e => setSize(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B]"
                                            >
                                                <option value="Pequeno">Pequeno</option>
                                                <option value="Médio">Médio</option>
                                                <option value="Grande">Grande</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2 flex items-center gap-2">
                                                <PawPrint className="w-4 h-4 text-[#E93D8E]" /> Sexo
                                            </label>
                                            <select 
                                                value={gender} 
                                                onChange={e => setGender(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B]"
                                            >
                                                <option value="Macho">Macho</option>
                                                <option value="Fêmea">Fêmea</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Temperament & Health */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2 flex items-center gap-2">
                                                <Smile className="w-4 h-4 text-[#E93D8E]" /> Temperamento
                                            </label>
                                            <input 
                                                type="text" 
                                                value={temperament} 
                                                onChange={e => setTemperament(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B] placeholder:text-pink-200"
                                                placeholder="Ex: Dócil, Brincalhão..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-black text-[#4A0D2B] mb-2 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-[#E93D8E]" /> Status Saúde
                                            </label>
                                            <input 
                                                type="text" 
                                                value={healthStatus} 
                                                onChange={e => setHealthStatus(e.target.value)} 
                                                className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B] placeholder:text-pink-200"
                                                placeholder="Ex: Vacinado, Vermifugado..."
                                            />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-black text-[#4A0D2B] mb-2">História / Descrição *</label>
                                        <textarea 
                                            required 
                                            value={description} 
                                            onChange={e => setDescription(e.target.value)} 
                                            rows={4}
                                            className="w-full p-4 bg-[#F8ECEF] border-2 border-transparent rounded-2xl focus:border-[#E93D8E] focus:bg-white outline-none font-medium text-[#4A0D2B] placeholder:text-pink-200 resize-none"
                                            placeholder="Conte a história deste pet, sua personalidade, gostos, rotinas..."
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-4 border-t border-pink-100 flex-shrink-0 pb-safe">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsAddModalOpen(false)}
                                            className="flex-1 py-4 bg-pink-100 text-[#4A0D2B] font-bold rounded-2xl hover:bg-pink-200 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={uploading}
                                            className="flex-1 py-4 bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] text-white font-bold rounded-2xl hover:brightness-110 disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-pink-200"
                                        >
                                            {uploading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-5 h-5" />
                                                    Salvar Pet
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* PET DETAIL MODAL */}
                {selectedPet && (
                    <div 
                        className="fixed inset-0 z-[250] bg-[#4A0D2B]/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setSelectedPet(null);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                    >
                        <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl shadow-pink-200 overflow-hidden max-h-[90vh] overflow-y-auto outline-none">
                            {/* Header with Photo */}
                            <div className="relative h-64">
                                <img 
                                    src={selectedPet.photo_url || FallbackImage} 
                                    alt={selectedPet.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#4A0D2B]/60 via-transparent to-transparent"></div>
                                <button
                                    onClick={() => setSelectedPet(null)}
                                    className="absolute top-4 right-4 p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/30 transition-colors text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="absolute bottom-6 left-6 right-6">
                                    <h2 className="text-4xl font-black text-white" style={{ fontFamily: '"Lobster Two", cursive' }}>
                                        {selectedPet.name}
                                    </h2>
                                    <div className="flex gap-2 mt-2">
                                        <span className="bg-[#E93D8E] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{selectedPet.age || 'Adulto'}</span>
                                        <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{selectedPet.size || 'Médio'}</span>
                                        <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{selectedPet.gender || 'Macho'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Quick Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#F8ECEF] p-4 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center text-[#E93D8E]">
                                            <Smile className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-[#D98AA8] uppercase">Temperamento</span>
                                            <span className="text-sm font-black text-[#4A0D2B]">{selectedPet.temperament || 'Dócil e Carinhoso'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-[#F8ECEF] p-4 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-500">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-[#D98AA8] uppercase">Saúde</span>
                                            <span className="text-sm font-black text-[#4A0D2B]">{selectedPet.health_status || 'Vacinado'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] rounded-2xl p-4 text-white">
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-5 h-5" />
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase opacity-80">WhatsApp de Contato</span>
                                            <span className="text-lg font-black">{selectedPet.contact_phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="bg-white rounded-2xl p-6 border-2 border-pink-50">
                                    <h3 className="text-lg font-black text-[#4A0D2B] mb-3">Minha História</h3>
                                    <p className="text-[#4A0D2B]/80 leading-relaxed font-medium">
                                        {selectedPet.description || 'Uma alma pura esperando por uma chance de brilhar ao seu lado.'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedPet(null);
                                            handleDelete(selectedPet.id);
                                        }}
                                        className="flex-1 py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        Remover (Adotado)
                                    </button>
                                    <button
                                        onClick={() => setSelectedPet(null)}
                                        className="flex-1 py-4 bg-[#4A0D2B] text-white font-bold rounded-2xl hover:bg-[#5a1a35] transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
