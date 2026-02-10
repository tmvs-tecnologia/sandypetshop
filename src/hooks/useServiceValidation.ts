import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export const useServiceValidation = (phone: string | null | undefined) => {
    const [hasDaycare, setHasDaycare] = useState(false);
    const [hasHotel, setHasHotel] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const checkServices = async () => {
            if (!phone) {
                if (isMounted) {
                    setHasDaycare(false);
                    setHasHotel(false);
                }
                return;
            }

            // Normaliza o telefone mantendo apenas dígitos
            const cleanPhone = phone.replace(/\D/g, '');
            // Se o telefone for muito curto, ignora
            if (cleanPhone.length < 8) {
                if (isMounted) {
                    setHasDaycare(false);
                    setHasHotel(false);
                }
                return;
            }

            // Busca pelos últimos 8 dígitos
            const last8 = cleanPhone.slice(-8);
            const termPlain = `%${last8}`;
            // Formato com hífen (comum no banco: XXXX-XXXX)
            const termHyphen = `%${last8.slice(0, 4)}-${last8.slice(4)}`;

            // Query combinada: busca formato limpo OU formato com hífen
            const orQueryDaycare = `contact_phone.ilike.${termPlain},contact_phone.ilike.${termHyphen}`;
            const orQueryHotel = `tutor_phone.ilike.${termPlain},tutor_phone.ilike.${termHyphen}`;

            if (isMounted) setLoading(true);

            try {
                // Verifica Creche
                const { data: daycareData } = await supabase
                    .from('daycare_enrollments')
                    .select('id')
                    .or(orQueryDaycare)
                    .eq('status', 'Aprovado')
                    .limit(1);

                // Verifica Hotel
                const { data: hotelData } = await supabase
                    .from('hotel_registrations')
                    .select('id')
                    .or(orQueryHotel)
                    .or('status.eq.Ativo,status.eq.Aprovado,approval_status.eq.Aprovado,approval_status.eq.aprovado')
                    .limit(1);

                if (isMounted) {
                    setHasDaycare(!!(daycareData && daycareData.length > 0));
                    setHasHotel(!!(hotelData && hotelData.length > 0));
                }
            } catch (err) {
                console.error('Erro ao validar serviços:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkServices();
        return () => { isMounted = false; };
    }, [phone]);

    return { hasDaycare, hasHotel, loading };
};
