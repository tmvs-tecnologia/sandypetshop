import React, { useEffect, useState, useRef } from 'react';
import { 
    Heart, 
    ArrowLeft, 
    Share2, 
    ChevronRight, 
    ShieldCheck, 
    Clock, 
    Scale, 
    Smile,
    Calendar,
    MapPin,
    Phone,
    MessageCircle,
    PawPrint,
    Star
} from 'lucide-react';

interface PetDetailProps {
    pet: any;
    onClose: () => void;
    isFavorited: boolean;
    onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

const FallbackImage = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

export const PetDetailView: React.FC<PetDetailProps> = ({ pet, onClose, isFavorited, onToggleFavorite }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Extract secondary images if present, or just use primary photos list mock
    const images = pet.photo_urls ? JSON.parse(pet.photo_urls) : [pet.photo_url || FallbackImage, pet.photo_url || FallbackImage];
    const displayAge = pet.age || 'Adulto';
    const displaySize = pet.size || 'Médio';
    const displayGender = pet.gender || 'Macho';
    const temperament = pet.temperament || 'Dócil, Carinhoso e Brincalhão';
    const healthStatus = pet.health_status || 'Vacinado & Vermifugado';
    
    // Handle scroll for glassmorphic header effects
    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                setIsScrolled(containerRef.current.scrollTop > 80);
            }
        };
        const ref = containerRef.current;
        ref?.addEventListener('scroll', handleScroll);
        return () => ref?.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAdoptClick = () => {
        const phone = (pet.contact_phone || '').replace(/\D/g, '');
        const message = encodeURIComponent(`Olá! Fiquei completamente encantado(a) pelo(a) ${pet.name} e adoraria conversar sobre como adotá-lo(a) ❤️`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    const sharePet = async () => {
        try {
            await navigator.share({
                title: `Adote o ${pet.name} ❤️`,
                text: `Olha esse amiguinho esperando por um lar! 🐾`,
                url: window.location.href,
            });
        } catch (err) {
            // ignore user abort
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[300] bg-[#F8ECEF] flex flex-col overflow-hidden animate-in slide-in-from-right duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        >
            {/* Glassy Top Nav */}
            <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 transition-all duration-500 ${
                isScrolled ? 'bg-white/80 backdrop-blur-xl border-b border-pink-100 shadow-sm' : 'bg-transparent'
            }`}>
                <button 
                    onClick={onClose}
                    className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-sm ${
                        isScrolled ? 'bg-[#E93D8E] text-white' : 'bg-white/80 backdrop-blur-md text-[#4A0D2B] hover:bg-white'
                    }`}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className={`font-black text-[#4A0D2B] transition-all duration-300 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={{ fontFamily: '"Lobster Two", cursive' }}>
                    <h2 className="text-2xl">{pet.name}</h2>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={sharePet}
                        className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-sm ${
                            isScrolled ? 'bg-white text-[#4A0D2B] border border-pink-100' : 'bg-white/80 text-[#4A0D2B]'
                        }`}
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => onToggleFavorite(pet.id, e)}
                        className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-sm ${
                            isFavorited ? 'bg-[#E93D8E] text-white' : (isScrolled ? 'bg-white text-[#4A0D2B] border border-pink-100' : 'bg-white/80 text-[#4A0D2B]')
                        }`}
                    >
                        <Heart className="w-5 h-5" fill={isFavorited ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div ref={containerRef} className="flex-1 overflow-y-auto relative no-scrollbar pb-32">
                
                {/* HERO HERO HERO */}
                <div className="relative w-full h-[65vh] sm:h-[75vh] overflow-hidden px-4 pt-4">
                    <div className="relative w-full h-full rounded-[3rem] overflow-hidden shadow-2xl shadow-pink-200 group">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#4A0D2B]/60 via-transparent to-transparent z-10"></div>
                        <img 
                            src={images[currentImageIndex]} 
                            alt={pet.name} 
                            className="w-full h-full object-cover transform scale-105 group-hover:scale-100 transition-transform duration-[2s] ease-out"
                        />

                        {/* Pagination Dots Over the image */}
                        {images.length > 1 && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 px-3 py-2 bg-black/20 backdrop-blur-md rounded-full">
                                {images.map((_, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => setCurrentImageIndex(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-6 bg-[#E93D8E]' : 'w-1.5 bg-white/60'}`}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Bottom Floating Hero Info */}
                        <div className="absolute bottom-10 left-8 right-8 z-20 animate-slideUp" style={{ animationDelay: '300ms' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#E93D8E] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#E93D8E]/40">Em Adoção</span>
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black text-white drop-shadow-md" style={{ fontFamily: '"Lobster Two", cursive' }}>
                                {pet.name}
                            </h1>
                            <div className="flex items-center gap-2 text-white/90 font-medium mt-2">
                                <MapPin className="w-4 h-4 text-[#FF9A44]" />
                                <span className="text-sm">Disponível na Sandy's PetShop</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT WRAPPER */}
                <div className="px-5 py-8 max-w-3xl mx-auto">
                    
                    {/* QUICK STATS PILLS - Minimalist elegant chips */}
                    <div className="grid grid-cols-3 gap-3 mb-10 animate-fadeIn" style={{ animationDelay: '400ms' }}>
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white flex flex-col items-center text-center group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2 text-blue-500 group-hover:bg-blue-100">
                                <Scale className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-[#D98AA8] uppercase tracking-wider">Porte</span>
                            <span className="text-sm font-black text-[#4A0D2B] mt-0.5">{displaySize}</span>
                        </div>
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white flex flex-col items-center text-center group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mb-2 text-purple-500 group-hover:bg-purple-100">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-[#D98AA8] uppercase tracking-wider">Idade</span>
                            <span className="text-sm font-black text-[#4A0D2B] mt-0.5">{displayAge}</span>
                        </div>
                        <div className="bg-white rounded-3xl p-4 shadow-sm border border-white flex flex-col items-center text-center group hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center mb-2 text-[#E93D8E] group-hover:bg-pink-100">
                                <PawPrint className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-[#D98AA8] uppercase tracking-wider">Sexo</span>
                            <span className="text-sm font-black text-[#4A0D2B] mt-0.5">{displayGender}</span>
                        </div>
                    </div>

                    {/* ADDITIONAL QUICK INFO BAR */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-12">
                        <div className="flex-1 bg-[#FFF9FA] border border-pink-100/50 rounded-[2rem] p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-[#D98AA8] uppercase tracking-wider">Status Saúde</span>
                                <span className="text-sm font-black text-[#4A0D2B]">{healthStatus}</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#FFF9FA] border border-pink-100/50 rounded-[2rem] p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                                <Smile className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-[#D98AA8] uppercase tracking-wider">Temperamento</span>
                                <span className="text-sm font-black text-[#4A0D2B] line-clamp-1">{temperament}</span>
                            </div>
                        </div>
                    </div>

                    {/* STORY EDITORIAL SECTION */}
                    <div className="mb-12 animate-fadeIn" style={{ animationDelay: '500ms' }}>
                        <h3 className="text-2xl font-black text-[#4A0D2B] mb-6 relative flex items-center gap-2">
                            Minha História 
                            <div className="flex-1 h-[2px] bg-gradient-to-r from-pink-100 to-transparent ml-4"></div>
                        </h3>
                        <div className="prose prose-pink">
                            <p className="text-[#4A0D2B]/80 text-base leading-relaxed font-medium whitespace-pre-line bg-white rounded-[2.5rem] p-8 shadow-xl shadow-pink-100/30 border border-white relative overflow-hidden">
                                <span className="absolute top-4 right-8 text-8xl font-serif text-pink-50 opacity-50 select-none">“</span>
                                {pet.description || `Olá! Ainda estou esperando que minha biografia seja escrita, mas posso te contar que sou um companheirinho cheio de amor para dar. Venha me conhecer e quem sabe a gente não escreve o próximo capítulo da minha história juntos?`}
                            </p>
                        </div>
                    </div>

                    {/* WHY ADOPT SECTION (EMOTIONAL HIGHLIGHTS) */}
                    <div className="bg-gradient-to-br from-[#FF9A44] to-[#E93D8E] rounded-[3rem] p-8 text-white shadow-2xl shadow-pink-200 mb-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="relative z-10">
                            <h3 className="text-2xl font-black mb-6" style={{ fontFamily: '"Lobster Two", cursive' }}>
                                Por que adotar o(a) {pet.name}?
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { icon: <Heart className="w-5 h-5" />, title: 'Puro Amor', desc: 'Capacidade infinita de dar e receber carinho.' },
                                    { icon: <Star className="w-5 h-5" />, title: 'Companheirismo', desc: 'Estará sempre ao seu lado em todos os momentos.' },
                                    { icon: <PawPrint className="w-5 h-5" />, title: 'Transformação', desc: 'Mudar a vida de um animal muda a sua alma.' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                        <div className="bg-white text-[#E93D8E] p-2 rounded-xl shadow-md">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-wide">{item.title}</h4>
                                            <p className="text-white/80 text-sm mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CONTACT CARD */}
                    <div className="bg-white border border-white rounded-[2.5rem] p-6 shadow-xl shadow-pink-100/30 flex flex-col gap-4 mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[#FFF9FA] rounded-2xl flex items-center justify-center text-[#4A0D2B] border border-pink-50">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-[#4A0D2B]">Informações de Contato</h4>
                                <p className="text-xs font-bold text-[#D98AA8]">Fale diretamente com a Sandy's</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-[#F8ECEF] p-4 rounded-2xl flex items-center gap-3 border border-pink-50">
                                <MessageCircle className="w-5 h-5 text-[#E93D8E]" />
                                <div>
                                    <span className="block text-[10px] text-[#D98AA8] uppercase font-bold">WhatsApp</span>
                                    <span className="font-black text-[#4A0D2B]">{pet.contact_phone || '(XX) 9XXXX-XXXX'}</span>
                                </div>
                            </div>
                            <div className="bg-[#F8ECEF] p-4 rounded-2xl flex items-center gap-3 border border-pink-50">
                                <Calendar className="w-5 h-5 text-[#E93D8E]" />
                                <div>
                                    <span className="block text-[10px] text-[#D98AA8] uppercase font-bold">Horário</span>
                                    <span className="font-black text-[#4A0D2B]">Segunda a Sábado</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* BOTTOM STICKY CTA BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-pink-100 p-4 px-6 pb-8 flex justify-center items-center shadow-[0_-10px_30px_rgba(233,61,142,0.05)] animate-in slide-in-from-bottom duration-700">
                <div className="w-full max-w-xl">
                    <button 
                        onClick={handleAdoptClick}
                        className="w-full group/btn relative bg-gradient-to-r from-[#FF9A44] via-[#E93D8E] to-[#E93D8E] hover:brightness-110 text-white font-black py-5 rounded-[1.75rem] shadow-2xl shadow-pink-300/50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] transform-gpu overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
                        <Heart className="w-6 h-6 animate-pulse" fill="currentColor" />
                        <span className="text-lg uppercase tracking-widest">QUERO ADOTAR AGORA</span>
                        <ChevronRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};
