import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Review {
  owner_name: string | null;
  comment: string;
  stars?: number | null;
  pet_name?: string | null;
  pet_photo_url?: string | null;
}

const FALLBACK_PET_IMG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23fce7f3'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='32'>🐾</text></svg>";

const TestimonialsCarousel: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  // Load reviews from Supabase – only those with a non‑empty comment
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('owner_name, comment, stars, pet_name, pet_photo_url')
        .not('comment', 'is', null)
        .order('submitted_at', { ascending: false });
      if (!error && data) {
        const filtered = (data as Review[]).filter(r => r.comment && r.comment.trim().length > 0);
        setReviews(filtered);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // Rotate review every 8 seconds
  useEffect(() => {
    if (reviews.length === 0) return undefined;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % reviews.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-pink-300 border-t-pink-600" />
      </div>
    );
  }

  if (reviews.length === 0) return null;

  const { comment, owner_name, stars, pet_name, pet_photo_url } = reviews[current];

  // Simple star visual (filled / empty)
  const starDisplay = stars ? (
    <div className="flex items-center mb-1 justify-center">
      <span className="text-pink-600 text-sm font-medium">
        {Array.from({ length: stars }).map((_, i) => <span key={i}>★</span>)}{Array.from({ length: 5 - stars }).map((_, i) => <span key={i}>☆</span>)}
      </span>
    </div>
  ) : null;

  // Determine a responsive font size and line height dynamically to fit any text size inside the strict card height
  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len > 280) return 'text-[10px] sm:text-[11px] leading-tight';
    if (len > 200) return 'text-[11px] sm:text-[12px] leading-tight';
    if (len > 130) return 'text-xs sm:text-[13px] leading-snug';
    if (len > 70) return 'text-sm sm:text-base leading-snug';
    return 'text-base sm:text-lg leading-normal';
  };
  const commentFontClass = getFontSizeClass(comment);

  return (
    <div className="my-8 flex justify-center px-4">
      {/* Formato retangular ultra-achatado (max-w-3xl e altura fixa otimizada com tipografia dinâmica) para máxima elegância sem layout shifts */}
      <div className="relative max-w-3xl w-full flex flex-col justify-between bg-gradient-to-r from-pink-100 via-pink-50 to-pink-100 p-3 sm:p-4 rounded-2xl shadow-xl border border-pink-200/50 h-[180px] xs:h-[155px] sm:h-[135px] md:h-[115px] transition-all duration-500">
        
        {starDisplay}
        
        {/* O container de comentário com espaço horizontal estendido de 768px para ocupar pouquíssimas linhas de altura */}
        <div className="flex-grow flex items-center justify-center overflow-y-auto px-2 scrollbar-thin">
          <p className={`${commentFontClass} text-pink-900 italic text-center px-2`}>
            "{comment}"
          </p>
        </div>

        {/* Rodapé com tutor e seta minimalista discreta */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-pink-200/40 z-10">
          <p className="text-pink-700 font-semibold text-xs sm:text-sm">
            - {owner_name || 'Cliente'}
          </p>
          <button 
            type="button"
            onClick={() => setCurrent(prev => (prev + 1) % reviews.length)}
            className="text-pink-500 hover:text-pink-700 hover:translate-x-1 transition-all duration-300 focus:outline-none text-2xl font-light pr-1 flex items-center"
            aria-label="Próximo depoimento"
          >
            →
          </button>
        </div>

        {/* Decorative subtle border pulse */}
        <div className="absolute inset-0 border-2 border-pink-300 rounded-2xl pointer-events-none animate-pulse opacity-50" />
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
