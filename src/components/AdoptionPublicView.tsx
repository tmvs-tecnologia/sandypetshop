import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Heart, 
    ArrowLeft, 
    Filter, 
    PawPrint, 
    Instagram, 
    MapPin, 
    ChevronRight,
    Sparkles,
    Info,
    HeartHandshake,
    Home,
    Smile
} from 'lucide-react';
import { PetDetailView } from './PetDetailView';

const ADOPTION_MESSAGES = [
    { icon: HeartHandshake, text: "Adotar um pet é dar uma segunda chance a uma vida.", color: "from-rose-400 to-pink-500" },
    { icon: Home, text: "Um pet adotado traz amor genuino para seu lar.", color: "from-amber-400 to-orange-500" },
    { icon: Smile, text: "Pets são a fonte de alegria mais pura que existe.", color: "from-pink-400 to-rose-500" },
    { icon: Heart, text: "Adoção salva duas vidas: a do pet e a sua.", color: "from-fuchsia-400 to-pink-500" },
    { icon: PawPrint, text: "Cada pet merece um lar quente e acolhedor.", color: "from-orange-400 to-amber-500" },
    { icon: Sparkles, text: "O amor de um pet é incondicional e eterno.", color: "from-rose-400 to-red-500" },
];

const FallbackImage = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

type FilterType = 'all' | 'filhote' | 'pequeno' | 'medio' | 'grande' | 'macho' | 'femea';

export const AdoptionPublicView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [selectedPet, setSelectedPet] = useState<any | null>(null);
    const [currentMessage, setCurrentMessage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMessage(prev => (prev + 1) % ADOPTION_MESSAGES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchPets = async () => {
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
        fetchPets();
        
        // Load favorites from local storage
        const localFavs = localStorage.getItem('pet_favorites');
        if (localFavs) setFavorites(JSON.parse(localFavs));
    }, []);

    const toggleFavorite = (petId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newFavs = favorites.includes(petId) 
            ? favorites.filter(id => id !== petId) 
            : [...favorites, petId];
        setFavorites(newFavs);
        localStorage.setItem('pet_favorites', JSON.stringify(newFavs));
    };

    const handleAdoptClick = (pet: any, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const phone = (pet.contact_phone || '').replace(/\D/g, '');
        const message = encodeURIComponent(`Olá! Senti uma conexão com o(a) ${pet.name} 💖 Gostaria de saber mais sobre o processo de adoção!`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    // Simulated parsing filters until table migration
    const filteredPets = pets.filter(pet => {
        if (activeFilter === 'all') return true;
        
        // Safely check fields or approximate parsing description for legacy data
        const desc = (pet.description || '').toLowerCase();
        const petSize = (pet.size || '').toLowerCase();
        const petAge = (pet.age || '').toLowerCase();
        const petGender = (pet.gender || '').toLowerCase();

        switch (activeFilter) {
            case 'filhote': 
                return petAge.includes('filhote') || desc.includes('filhote') || desc.includes('meses');
            case 'pequeno': 
                return petSize.includes('pequeno') || desc.includes('pequeno');
            case 'medio': 
                return petSize.includes('médio') || petSize.includes('medio') || desc.includes('médio');
            case 'grande': 
                return petSize.includes('grande') || desc.includes('grande');
            case 'macho': 
                return petGender.includes('macho') || desc.includes('macho') || !desc.includes('fêmea');
            case 'femea': 
                return petGender.includes('fêmea') || petGender.includes('femea') || desc.includes('fêmea') || desc.includes('femea');
            default: return true;
        }
    });

    const FilterBtn = ({ type, label, icon }: { type: FilterType, label: string, icon?: any }) => {
        const isActive = activeFilter === type;
        return (
            <button
                onClick={() => setActiveFilter(type)}
                className={`
                    px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-500 flex items-center gap-2
                    ${isActive 
                        ? 'bg-gradient-to-r from-[#FF9A44] to-[#E93D8E] text-white shadow-lg shadow-pink-300/50 scale-105 transform-gpu' 
                        : 'bg-white text-[#4A0D2B] hover:bg-pink-50 border border-pink-100 shadow-sm'
                    }
                `}
            >
                {icon}
                {label}
            </button>
        );
    };

    return (
        <div ref={containerRef} className="fixed inset-0 z-[200] bg-[#F8ECEF] overflow-y-auto overflow-x-hidden flex flex-col font-sans scroll-smooth">
            {/* Smooth Background Ambient Lights for 3D depth illusion */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-96 h-96 bg-[#FF9A44]/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-[#E93D8E]/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <button 
                onClick={onClose}
                className="absolute top-5 left-5 z-[210] p-2.5 bg-white/90 backdrop-blur-md text-pink-700 rounded-full shadow-md border border-pink-100/80 hover:bg-pink-600 hover:text-white hover:border-pink-600 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
                title="Voltar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>

            <div className="relative z-10 w-full max-w-5xl mx-auto px-5 py-6 flex flex-col flex-1 pl-14 sm:pl-5">
                {/* HEADER */}
                <header className="flex flex-col gap-2 mb-8 animate-fadeIn">
                    <div className="relative w-full flex items-center justify-center">
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-0 relative inline-block flex items-center" style={{ fontFamily: '"Lobster Two", cursive' }}>
                            <span className="font-brand text-pink-900">Sandy's</span>
                            <span className="ml-2 text-[#4A0D2B]">adoção</span>
                            <HeartHandshake className="inline-block w-4 h-4 text-[#FF9A44] animate-bounce -mt-0.5 ml-1" />
                        </h1>
                    </div>
                </header>
                <p className="text-center text-[#D98AA8] font-medium text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 mt-8 sm:mt-0">
                    Todo pet merece um lar cheio de amor <PawPrint className="w-4 h-4 inline" fill="currentColor" />
                </p>

                {/* ANIMATED MOTIVATIONAL CARD */}
                <div className="relative overflow-hidden rounded-3xl mb-6 group motivational-card-container shadow-[0_8px_30px_rgba(244,114,182,0.1)] isolate">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes cardMessageEnter {
                            0% {
                                opacity: 0;
                                transform: translateY(8px);
                            }
                            100% {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        .animate-message-change {
                            animation: cardMessageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                        .motivational-card-container * {
                            color: #ffffff !important;
                        }
                        .motivational-card-container svg, 
                        .motivational-card-container svg path {
                            stroke: #ffffff !important;
                        }
                        .motivational-card-container .icon-bg {
                            background-color: rgba(255, 255, 255, 0.2) !important;
                        }
                        .motivational-card-container .progress-dot {
                            background-color: rgba(255, 255, 255, 0.35) !important;
                            border: none !important;
                        }
                        .motivational-card-container .progress-dot.active {
                            background-color: #ffffff !important;
                        }
                    `}} />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#D91A77] opacity-95 z-0"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay z-0"></div>
                    
                    {/* Floating particles */}
                    <div className="absolute inset-0 overflow-hidden z-0">
                        <div className="absolute top-2 left-4 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
                        <div className="absolute top-8 right-8 w-3 h-3 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
                        <div className="absolute bottom-4 left-1/3 w-2 h-2 bg-white/25 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    
                    {/* Message content with animation */}
                    <div className="relative z-[60] px-6 py-5 flex items-center gap-4" style={{ zIndex: 60 }}>
                        <div className="relative flex-shrink-0">
                            <div key={currentMessage} className="w-14 h-14 icon-bg backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg animate-message-change">
                                {React.createElement(ADOPTION_MESSAGES[currentMessage].icon, { 
                                    className: "w-7 h-7",
                                    color: "#ffffff"
                                })}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping"></div>
                        </div>
                        
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-white/80 animate-spin-slow" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Motivo para Adotar</span>
                            </div>
                            <div className="overflow-hidden min-h-[4.5rem] flex items-center">
                                <p 
                                    key={currentMessage}
                                    className="text-white font-extrabold text-sm leading-snug whitespace-normal break-words animate-message-change"
                                    style={{
                                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    {ADOPTION_MESSAGES[currentMessage].text}
                                </p>
                            </div>
                            {/* Progress dots - moved below text and made more discreet */}
                            <div className="flex gap-1.5 flex-shrink-0 mt-2">
                                {ADOPTION_MESSAGES.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentMessage(idx)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 progress-dot ${
                                            idx === currentMessage 
                                                ? 'w-3 active' 
                                                : 'hover:bg-white/50'
                                        }`}
                                        aria-label={`Ver mensagem ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTERS AREA */}
                <div className="mb-8 flex flex-col gap-3 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-2 px-1 text-[#4A0D2B]">
                        <Filter className="w-4 h-4 text-[#E93D8E]" />
                        <span className="text-sm font-extrabold uppercase tracking-widest">Filtros Rápidos</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <FilterBtn type="all" label="Todos" />
                        <FilterBtn type="filhote" label="Filhotes" />
                        <FilterBtn type="pequeno" label="Pequeno Porte" />
                        <FilterBtn type="medio" label="Médio Porte" />
                        <FilterBtn type="grande" label="Grande Porte" />
                        <FilterBtn type="macho" label="Machos" />
                        <FilterBtn type="femea" label="Fêmeas" />
                    </div>
                </div>

                {/* GRID AREA */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-5">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-pink-100 border-b-[#E93D8E] animate-spin"></div>
                            <PawPrint className="absolute inset-0 m-auto w-6 h-6 text-[#E93D8E] animate-pulse" />
                        </div>
                        <p className="text-[#D98AA8] font-bold tracking-wide text-sm uppercase">Buscando corações...</p>
                    </div>
                ) : filteredPets.length === 0 ? (
                    <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-[3rem] border-4 border-dashed border-pink-200/50 animate-fadeIn flex flex-col items-center px-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Heart className="w-10 h-10 text-[#D98AA8]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#4A0D2B] mb-2">Nenhum amiguinho encontrado</h3>
                        <p className="text-[#D98AA8] text-sm max-w-xs mx-auto font-medium">
                            Tente mudar o filtro ou volte em breve, novos pets estão sempre chegando!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-16" style={{ perspective: '1000px' }}>
                        {filteredPets.map((pet, idx) => {
                            const isFavorited = favorites.includes(pet.id);
                            // Fallback tags if user didn't update Supabase columns yet
                            const displayAge = pet.age || 'Adulto';
                            const displaySize = pet.size || 'Médio';
                            const displayGender = pet.gender || 'Macho';

                            return (
                                <div 
                                    key={pet.id}
                                    onClick={() => setSelectedPet(pet)}
                                    className="group bg-white rounded-[2.5rem] p-4 shadow-xl shadow-pink-100/50 border border-white flex flex-col hover:-translate-y-2 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-200/60 relative cursor-pointer"
                                    style={{ 
                                        animation: 'bloom 0.6s cubic-bezier(0.22, 1, 0.36, 1) backwards',
                                        animationDelay: `${idx * 100}ms`
                                    }}
                                >
                                    {/* Media Container (Simulating Carousel support) */}
                                    <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-100 mb-5">
                                        <img 
                                            src={pet.photo_url || FallbackImage} 
                                            alt={pet.name} 
                                            className="w-full h-full object-cover transition-transform duration-1000 ease-out md:group-hover:scale-110"
                                            loading="lazy"
                                        />
                                        {/* Overlay Shadow for readable tags */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80 pointer-events-none"></div>

                                        {/* Favorite Action */}
<button 
                    onClick={(e) => toggleFavorite(pet.id, e)}
                    className={`absolute top-4 right-4 hidden sm:inline-flex p-3 rounded-full backdrop-blur-md transition-all duration-300 z-20 active:scale-90 shadow-md ${
                        isFavorited ? 'bg-[#E93D8E] text-white' : 'bg-white/80 text-[#4A0D2B] hover:bg-[#E93D8E] hover:text-white'
                    }`}
                >
                                            <Heart className="w-5 h-5" fill={isFavorited ? "currentColor" : "none"} />
                                        </button>

                                        {/* Tags overlay floating above the gradient at bottom of image */}
                                        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5 z-10">
                                            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#E93D8E] uppercase tracking-wider">{displayAge}</span>
                                            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-[#4A0D2B] uppercase tracking-wider">{displaySize}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col flex-1 px-2 pb-2">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-2xl font-black text-[#4A0D2B] tracking-tight leading-none" style={{ fontFamily: '"Outfit", sans-serif' }}>
                                                {pet.name}
                                            </h3>
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-[#D98AA8] uppercase tracking-widest">
                                                <PawPrint className="w-3 h-3" /> {displayGender}
                                            </span>
                                        </div>

                                        <p className="text-[#D98AA8] text-sm leading-relaxed mb-3 line-clamp-3 font-medium">
                                            {pet.description || 'Uma alma pura esperando por uma chance de brilhar ao seu lado. Venha me conhecer!'}
                                        </p>

                                        {/* Ver Mais Button explicit */}
                                        <div className="mb-6 flex justify-start">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedPet(pet); }}
                                                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#E93D8E] hover:text-[#FF9A44] transition-colors group/more"
                                            >
                                                <Info className="w-3.5 h-3.5" />
                                                <span>Ver mais</span>
                                                <ChevronRight className="w-3 h-3 transform group-hover/more:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* EMOTIONAL FOOTER */}
                <footer className="mt-auto py-10 flex flex-col items-center justify-center gap-4 text-center border-t border-[#E93D8E]/10 z-10 animate-fadeIn">
                    <div className="flex gap-2 mb-2">
                        {[...Array(3)].map((_, i) => (
                            <Heart key={i} className="w-4 h-4 text-[#E93D8E]/50" fill="currentColor" />
                        ))}
                    </div>
                    <p className="text-[#4A0D2B] font-bold text-base max-w-xs mx-auto leading-snug" style={{ fontFamily: '"Lobster Two", cursive' }}>
                        “Cada adoção muda duas vidas: a do pet e a sua 💕”
                    </p>
                    <span className="text-[#D98AA8] text-xs font-semibold tracking-widest uppercase">Sandy's PetShop • 2026</span>
                </footer>
            </div>

            {/* FULLSCREEN PET DETAILS */}
            {selectedPet && (
                <PetDetailView 
                    pet={selectedPet} 
                    isFavorited={favorites.includes(selectedPet.id)}
                    onToggleFavorite={toggleFavorite}
                    onClose={() => setSelectedPet(null)} 
                />
            )}
        </div>
    );
};
