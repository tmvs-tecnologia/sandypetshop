import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { SERVICE_PRICES as FALLBACK_PRICES } from '../../constants';
import { PetWeight } from '../../types';

export interface ServicePricesMap {
  [weight: string]: {
    BATH: number;
    BATH_AND_GROOMING: number;
    GROOMING_ONLY: number;
  };
}

export function useServicePrices() {
  const [prices, setPrices] = useState<ServicePricesMap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchPrices() {
      try {
        const { data, error } = await supabase
          .from('service_prices')
          .select('*');

        if (error) throw error;
        
        if (data && isMounted) {
          const pricesMap: ServicePricesMap = {};
          
          data.forEach(dbRow => {
            pricesMap[dbRow.weight_category] = {
              BATH: Number(dbRow.bath_price),
              BATH_AND_GROOMING: Number(dbRow.bath_and_grooming_price),
              GROOMING_ONLY: Number(dbRow.grooming_only_price)
            };
          });
          
          setPrices(pricesMap);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic service prices. Falling back to static prices:', err);
        // We leave `prices` as null or handle it where used
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper method to get the correct price safely
  const getPrice = (weightCategory: PetWeight | null, serviceType: 'BATH' | 'BATH_AND_GROOMING' | 'GROOMING_ONLY'): number => {
    if (!weightCategory) return 0;
    
    // First try database prices
    if (prices && prices[weightCategory]) {
       return prices[weightCategory][serviceType] || 0;
    }

    // Fallback to static constants
    const staticPriceObj = FALLBACK_PRICES[weightCategory];
    if (!staticPriceObj) return 0;

    if (serviceType === 'BATH') return staticPriceObj.BATH;
    if (serviceType === 'GROOMING_ONLY') return staticPriceObj.GROOMING_ONLY;
    if (serviceType === 'BATH_AND_GROOMING') return staticPriceObj.BATH + staticPriceObj.GROOMING_ONLY;
    
    return 0;
  };

  /**
   * Helper that acts exactly like the old constants map 
   * so we don't need to rewrite 100% of the logic
   */
  const getPricesForWeight = (weightCategory: PetWeight | null) => {
     if (!weightCategory) return null;
     
     if (prices && prices[weightCategory]) {
        return prices[weightCategory];
     }
     
     // Fallback construction
     if (FALLBACK_PRICES[weightCategory]) {
       return {
         BATH: FALLBACK_PRICES[weightCategory].BATH,
         GROOMING_ONLY: FALLBACK_PRICES[weightCategory].GROOMING_ONLY,
         BATH_AND_GROOMING: FALLBACK_PRICES[weightCategory].BATH + FALLBACK_PRICES[weightCategory].GROOMING_ONLY
       };
     }
     
     return null;
  };

  return { prices, loading, getPrice, getPricesForWeight };
}

