const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf-8');

const startIndex = content.indexOf('    if (!isOpen) return null;');
const endIndex = content.indexOf('// FIX: Define the missing Calendar component');

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find bounds');
    console.error(startIndex, endIndex);
    process.exit(1);
}

const newJsx = `    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10001] overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-5xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-pink-100 my-8 animate-fadeIn relative">
                {/* Header Elegante */}
                <div className="relative p-6 sm:p-10 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 rounded-t-[2rem] overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-pink-900 shadow-sm border border-pink-100/50 backdrop-blur-sm transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        title="Fechar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-950 tracking-tight mb-2">Novo Agendamento</h2>
                            <p className="text-pink-800/80 font-medium text-sm sm:text-base">Cadastre um novo agendamento no sistema</p>
                        </div>
                        <div className="hidden sm:flex h-20 w-20 bg-white rounded-3xl shadow-sm items-center justify-center text-4xl transform rotate-3">
                            📅
                        </div>
                    </div>
                </div>

                {/* Formulário Único */}
                <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-12">
                    
                    {/* Seção 1: Informações do Pet e Tutor */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-bold text-sm">1</span>
                            <h3 className="text-xl font-bold text-gray-800">Dados do Pet & Tutor</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Pet</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><PawIcon /></span>
                                    <input type="text" name="petName" value={formData.petName} onChange={handleInputChange} required className={\`block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all \${clientFound ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`} placeholder="Ex: Buddy" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Raça do Pet</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><BreedIcon /></span>
                                    <input type="text" name="petBreed" value={formData.petBreed} onChange={handleInputChange} required className={\`block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all \${clientFound ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`} placeholder="Ex: Golden Retriever" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Tutor</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><UserIcon /></span>
                                    <input type="text" name="ownerName" value={formData.ownerName} onChange={handleInputChange} required className={\`block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all \${clientFound ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`} placeholder="Ex: João Silva" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><WhatsAppIcon /></span>
                                    <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} required placeholder="(XX) XXXXX-XXXX" maxLength={15} className={\`block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all \${clientFound ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'}\`} />
                                    {isFetchingClient && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                                        </div>
                                    )}
                                    {clientFound && !isFetchingClient && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                {clientFound && (
                                    <div className="mt-2 flex justify-between items-center">
                                        <p className="text-xs text-green-600">Dados do cliente preenchidos automaticamente.</p>
                                        <button type="button" onClick={() => { setClientFound(false); setFormData({ petName: '', ownerName: '', whatsapp: '', petBreed: '', ownerAddress: '' }); }} className="text-xs text-red-600 hover:text-red-800 underline">Limpar</button>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Endereço Completo</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><AddressIcon /></span>
                                    <input type="text" name="ownerAddress" value={formData.ownerAddress} onChange={handleInputChange} required className={\`block w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all \${clientFound ? 'border-green-300 bg-green-50' : 'border-gray-200'}\`} placeholder="Rua, Número, Bairro" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Seção 2: Seleção de Serviço */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-bold text-sm">2</span>
                            <h3 className="text-xl font-bold text-gray-800">Serviços do Agendamento</h3>
                        </div>

                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                            {serviceStepView === 'main' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setServiceStepView('bath_groom')}
                                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition-colors text-left bg-white"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-3 bg-pink-50 rounded-lg text-pink-600"><BathTosaIcon /></div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">Banho & Tosa</h4>
                                                <p className="text-sm text-gray-500">Serviços de higiene e estética</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setServiceStepView('pet_movel')}
                                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-pink-500 transition-colors text-left bg-white"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="p-3 bg-pink-50 rounded-lg text-pink-600"><PetMovelIcon /></div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">Pet Móvel</h4>
                                                <p className="text-sm text-gray-500">Atendimento em condomínios</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            )}

                            {serviceStepView === 'bath_groom' && (
                                <div className="space-y-6">
                                    <button type="button" onClick={() => {setServiceStepView('main'); setSelectedService(null);}} className="flex items-center text-pink-600 hover:text-pink-700 text-sm font-semibold">
                                        <ChevronLeftIcon className="h-4 w-4 mr-1" /> Voltar para categorias
                                    </button>

                                    <div>
                                        <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Serviços Base</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[ServiceType.BATH, ServiceType.GROOMING_ONLY, ServiceType.BATH_AND_GROOMING, ServiceType.VISIT_DAYCARE, ServiceType.VISIT_HOTEL].map((service) => (
                                                <label key={service} className={\`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all \${selectedService === service ? 'border-pink-500 bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}\`}>
                                                    <input type="radio" name="service" value={service} checked={selectedService === service} onChange={(e) => setSelectedService(e.target.value as ServiceType)} className="text-pink-600 focus:ring-pink-500 w-4 h-4" />
                                                    <span className={\`font-semibold \${selectedService === service ? 'text-pink-700' : 'text-gray-700'}\`}>{SERVICES[service].label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedService && !isVisitService && (
                                        <div>
                                            <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Porte do Pet</label>
                                            <div className="relative">
                                                <select value={selectedWeight || ''} onChange={handleWeightChange} className="block w-full py-3.5 pl-4 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm appearance-none text-ellipsis overflow-hidden whitespace-nowrap" required>
                                                    <option value="" disabled>Selecione o porte</option>
                                                    {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg></div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedService && selectedWeight && !isVisitService && (
                                        <div>
                                            <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Serviços Adicionais</label>
                                            <div className="flex flex-col gap-3 text-sm max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                {ADDON_SERVICES.filter(addon => !addon.excludesWeight?.includes(selectedWeight) && (!addon.requiresWeight || addon.requiresWeight.includes(selectedWeight))).map((addon) => {
                                                    const isSelected = !!selectedAddons[addon.id];
                                                    return (
                                                        <label key={addon.id} className={\`flex items-center p-3.5 rounded-xl border-2 transition-all cursor-pointer hover:bg-pink-50/50 \${isSelected ? 'border-pink-500 bg-pink-50/30' : 'border-gray-200 bg-white'}\`}>
                                                            <input type="checkbox" checked={isSelected} onChange={() => handleAddonToggle(addon.id)} className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300" />
                                                            <span className={\`ml-3 flex-1 font-medium \${isSelected ? 'text-pink-800' : 'text-gray-700'}\`}>{addon.label}</span>
                                                            <span className="text-pink-600 font-bold">+ R$ {addon.price.toFixed(2)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {serviceStepView === 'pet_movel' && (
                                <div className="space-y-6">
                                    <button type="button" onClick={() => {setServiceStepView('main'); setSelectedService(null); setSelectedCondo('');}} className="flex items-center text-pink-600 hover:text-pink-700 text-sm font-semibold">
                                        <ChevronLeftIcon className="h-4 w-4 mr-1" /> Voltar para categorias
                                    </button>

                                    <div>
                                        <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Condomínio</label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5"><AddressIcon /></span>
                                            <select value={selectedCondo || ''} onChange={(e) => setSelectedCondo(e.target.value)} className="block w-full pl-11 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm appearance-none text-ellipsis overflow-hidden whitespace-nowrap" required>
                                                <option value="" disabled>Selecione o condomínio</option>
                                                <option value="Vitta Parque">Vitta Parque</option>
                                                <option value="Max Haus">Max Haus</option>
                                                <option value="Paseo">Paseo</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg></div>
                                        </div>
                                    </div>

                                    {selectedCondo && (
                                        <div>
                                            <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Serviços Base</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {[ServiceType.PET_MOBILE_BATH, ServiceType.PET_MOBILE_GROOMING_ONLY, ServiceType.PET_MOBILE_BATH_AND_GROOMING].map((service) => (
                                                    <label key={service} className={\`flex items-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all \${selectedService === service ? 'border-pink-500 bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50'}\`}>
                                                        <input type="radio" name="service" value={service} checked={selectedService === service} onChange={(e) => setSelectedService(e.target.value as ServiceType)} className="text-pink-600 focus:ring-pink-500 w-4 h-4" />
                                                        <span className={\`font-semibold \${selectedService === service ? 'text-pink-700' : 'text-gray-700'}\`}>{SERVICES[service].label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedService && selectedCondo && (
                                        <div>
                                            <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Porte do Pet</label>
                                            <div className="relative">
                                                <select value={selectedWeight || ''} onChange={handleWeightChange} className="block w-full py-3.5 pl-4 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all shadow-sm appearance-none text-ellipsis overflow-hidden whitespace-nowrap" required>
                                                    <option value="" disabled>Selecione o porte</option>
                                                    {Object.entries(PET_WEIGHT_OPTIONS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg></div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedService && selectedWeight && selectedCondo && (
                                        <div>
                                            <label className="block text-sm font-bold text-pink-900 uppercase tracking-wider mb-3">Serviços Adicionais</label>
                                            <div className="flex flex-col gap-3 text-sm max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                {ADDON_SERVICES.filter(addon => !addon.excludesWeight?.includes(selectedWeight) && (!addon.requiresWeight || addon.requiresWeight.includes(selectedWeight))).map((addon) => {
                                                    const isSelected = !!selectedAddons[addon.id];
                                                    return (
                                                        <label key={addon.id} className={\`flex items-center p-3.5 rounded-xl border-2 transition-all cursor-pointer hover:bg-pink-50/50 \${isSelected ? 'border-pink-500 bg-pink-50/30' : 'border-gray-200 bg-white'}\`}>
                                                            <input type="checkbox" checked={isSelected} onChange={() => handleAddonToggle(addon.id)} className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-gray-300" />
                                                            <span className={\`ml-3 flex-1 font-medium \${isSelected ? 'text-pink-800' : 'text-gray-700'}\`}>{addon.label}</span>
                                                            <span className="text-pink-600 font-bold">+ R$ {addon.price.toFixed(2)}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {totalPrice > 0 && serviceStepView !== 'main' && (
                                <div className="bg-white rounded-xl p-4 border border-pink-100 text-center shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mb-1">Total Previsto</p>
                                    <p className="text-3xl font-extrabold text-pink-600">R$ {(totalPrice ?? 0).toFixed(2).replace('.', ',')}</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Seção 3: Data e Horário */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 text-pink-600 font-bold text-sm">3</span>
                            <h3 className="text-xl font-bold text-gray-800">Data e Horário</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Data do Agendamento</label>
                                <Calendar
                                    selectedDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                    disablePast={true}
                                    disableWeekends={true}
                                    allowedDays={allowedDays}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">Horário</label>
                                <TimeSlotPicker
                                    isAdmin={true}
                                    selectedDate={selectedDate}
                                    selectedService={selectedService}
                                    appointments={appointments}
                                    onTimeSelect={setSelectedTime}
                                    selectedTime={selectedTime}
                                    workingHours={isVisitService ? VISIT_WORKING_HOURS : WORKING_HOURS}
                                    isPetMovel={isPetMovel}
                                    allowedDays={allowedDays}
                                    selectedCondo={selectedCondo}
                                    disablePastTimes={false}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="pt-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                        <button type="button" onClick={onClose} className="w-full sm:w-auto px-8 py-4 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-gray-200 outline-none">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!isStep1Valid || !isStep2Valid || !isStep3Valid || isSubmitting} className="w-full sm:w-auto px-10 py-4 bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-200 hover:bg-pink-700 hover:shadow-pink-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 outline-none flex items-center justify-center space-x-2">
                            {isSubmitting && <LoadingSpinner />}
                            <span>{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// FIX: Define the missing Calendar component`;

const newContent = content.substring(0, startIndex) + newJsx + content.substring(endIndex);
fs.writeFileSync('App.tsx', newContent);
console.log('Successfully updated App.tsx');
