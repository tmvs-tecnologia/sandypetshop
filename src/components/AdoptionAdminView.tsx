import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { TrashIcon, PlusIcon, SparklesIcon, PhotoIcon } from '@heroicons/react/24/outline';

const FallbackImage = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23fdf2f8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="28">🐾</text></svg>';

export const AdoptionAdminView: React.FC = () => {
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [age, setAge] = useState('Adulto');
    const [size, setSize] = useState('Médio');
    const [gender, setGender] = useState('Macho');
    const [photoFile, setPhotoFile] = useState<File | null>(null);

    const fetchPets = async () => {
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

    const handleDelete = async (id: string, photoUrl: string) => {
        if (!confirm('Tem certeza que deseja remover este pet? (Ex: ele já foi adotado)')) return;
        try {
            const { error } = await supabase.from('adoption_pets').delete().eq('id', id);
            if (error) throw error;
            setPets(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
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
                gender
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
        setPhotoFile(null);
    };

    return (
        <div className="w-full flex flex-col items-center animate-fadeIn">
            <div className="mb-8 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-2">
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-6 sm:px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Cadastrar Pet para Adoção</span>
                </button>
                <p className="text-xs text-pink-800/60 mt-4 text-center">
                    Estes pets aparecerão na área pública de adoção para os clientes.
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                </div>
            ) : pets.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-[2.5rem] border-4 border-dashed border-orange-100 w-full max-w-2xl">
                    <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <SparklesIcon className="w-10 h-10 text-orange-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-orange-900 mb-2">Nenhum pet cadastrado</h3>
                    <p className="text-orange-800/60">Cadastre os pets que estão aguardando um novo lar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
                    {pets.map((pet) => (
                        <div key={pet.id} className="relative group bg-white rounded-3xl overflow-hidden shadow-lg border border-pink-50 flex flex-col">
                            <div className="h-48 relative bg-pink-50 overflow-hidden">
                                {pet.photo_url ? (
                                    <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <img src={FallbackImage} alt="Sem foto" className="w-full h-full object-cover opacity-50" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-4">
                                    <button
                                        onClick={() => handleDelete(pet.id, pet.photo_url)}
                                        className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform hover:scale-110 transition-all"
                                        title="Remover (Adotado)"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-800">{pet.name}</h3>
                                    <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">{pet.gender || 'Macho'}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">WhatsApp: {pet.contact_phone}</p>
                                <div className="flex gap-1.5 mb-3 flex-wrap">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium">{pet.age || 'Adulto'}</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-medium">{pet.size || 'Médio'}</span>
                                </div>
                                <p className="text-sm text-gray-600 flex-1 line-clamp-3">{pet.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
                    <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl my-8">
                        <h2 className="text-2xl font-bold text-orange-600 mb-6" style={{ fontFamily: '"Lobster Two", cursive' }}>Novo Pet para Adoção</h2>
                        <form onSubmit={handleAddPet} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Pet</label>
                                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ex: Bob" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">WhatsApp</label>
                                    <input type="text" required value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="(XX) 9XXXX-XXXX" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Idade</label>
                                    <select value={age} onChange={e => setAge(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none">
                                        <option value="Filhote">Filhote</option>
                                        <option value="Adulto">Adulto</option>
                                        <option value="Idoso">Idoso</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Porte</label>
                                    <select value={size} onChange={e => setSize(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none">
                                        <option value="Pequeno">Pequeno</option>
                                        <option value="Médio">Médio</option>
                                        <option value="Grande">Grande</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sexo</label>
                                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none">
                                        <option value="Macho">Macho</option>
                                        <option value="Fêmea">Fêmea</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">História / Descrição</label>
                                <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none resize-none" placeholder="Conte um pouco sobre a personalidade dele..." />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Principal</label>
                                <label className="flex items-center justify-center gap-2 p-3 bg-orange-50 text-orange-600 border border-orange-200 border-dashed rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                                    <PhotoIcon className="w-5 h-5" />
                                    <span className="text-sm font-medium truncate max-w-[200px]">{photoFile ? photoFile.name : 'Escolher Arquivo'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                            
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Cancelar</button>
                                <button type="submit" disabled={uploading} className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 flex justify-center items-center">
                                    {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Pet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
