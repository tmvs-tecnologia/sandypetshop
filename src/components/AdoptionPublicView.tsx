import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { HeartIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const FallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23fdf2f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28">🐾</text></svg>';

export const AdoptionPublicView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
                console.error('Erro ao buscar pets para adoção:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPets();
    }, []);

    const handleAdoptClick = (pet: any) => {
        const phone = pet.contact_phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá! Tenho interesse em adotar o(a) ${pet.name} que vi no site da Sandy's PetShop. Podemos conversar?`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[150] bg-[#fff0f5] overflow-y-auto animate-fadeIn flex flex-col">
            <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col flex-1">
                <header className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8 animate-slideDown">
                    <div className="flex items-center gap-4 md:gap-6 w-full">
                        <button 
                            onClick={onClose}
                            className="flex-shrink-0 z-50 p-3 bg-white text-pink-700 rounded-full shadow-md border border-pink-100 hover:bg-pink-600 hover:text-white transition-all duration-300 hover:scale-110 flex items-center justify-center group"
                            title="Voltar"
                        >
                            <ArrowLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
                        </button>
                        <div className="text-left flex-1">
                            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600 leading-none pb-2" style={{ fontFamily: '"Lobster Two", cursive' }}>Adote um Amigo</h2>
                            <p className="text-pink-600 font-extrabold text-[10px] md:text-xs uppercase tracking-[0.2em] mt-1 md:mt-2">A felicidade tem quatro patas</p>
                        </div>
                    </div>
                </header>

                <div className="max-w-3xl mx-auto text-center mb-16 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                    <p className="text-xl text-pink-900/80 leading-relaxed font-medium">
                        Adotar é um ato de amor que transforma duas vidas: a do pet que ganha um lar e a sua, que ganha um companheiro leal para sempre. Conheça nossos focinhos que estão em busca de uma família!
                    </p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
                        <p className="text-pink-800/40 font-medium">Buscando focinhos disponíveis...</p>
                    </div>
                ) : pets.length === 0 ? (
                    <div className="text-center py-20 bg-white/40 rounded-[2.5rem] border-4 border-dashed border-pink-200">
                        <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <HeartSolidIcon className="w-12 h-12 text-pink-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-pink-900 mb-2">Nenhum pet no momento</h3>
                        <p className="text-pink-800/60 max-w-sm mx-auto">Volte em breve! Sempre temos novos amiguinhos procurando um lar cheio de amor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {pets.map((pet, index) => (
                            <div 
                                key={pet.id} 
                                className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-pink-100 transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl animate-bloom"
                                style={{ animationDelay: `${index * 150}ms` }}
                            >
                                <div className="relative h-72 overflow-hidden bg-pink-50">
                                    {pet.photo_url ? (
                                        <img 
                                            src={pet.photo_url} 
                                            alt={pet.name} 
                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                        />
                                    ) : (
                                        <img src={FallbackImage} alt="Sem foto" className="w-full h-full object-cover opacity-50" />
                                    )}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-pink-50 flex items-center gap-2">
                                        <HeartSolidIcon className="w-4 h-4 text-pink-500 animate-pulse" />
                                        <span className="text-pink-900 font-bold text-xs uppercase tracking-wider">Me Adote</span>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-3xl font-black text-gray-900 mb-4" style={{ fontFamily: '"Lobster Two", cursive' }}>{pet.name}</h3>
                                    <p className="text-gray-600 mb-8 text-sm leading-relaxed line-clamp-4">{pet.description}</p>
                                    
                                    <button 
                                        onClick={() => handleAdoptClick(pet)}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 flex items-center justify-center gap-3 transform hover:scale-[1.02] transition-all active:scale-95"
                                    >
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        Quero Adotar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
