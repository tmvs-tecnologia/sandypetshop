import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

interface Review {
  owner_name: string | null;
  comment: string;
  stars?: number | null;
}

const TestimonialsCarousel: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  // Load reviews from Supabase – only those with a non‑empty comment
  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('owner_name, comment, stars')
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

  // Rotate review every 6 seconds
  useEffect(() => {
    if (reviews.length === 0) return undefined;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % reviews.length);
    }, 6000);
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

  const { comment, owner_name, stars } = reviews[current];

  // Simple star visual (filled / empty)
  const starDisplay = stars ? (
    <div className="flex items-center mb-2 justify-center">
      <span className="text-pink-600 text-sm font-medium">
        {Array.from({ length: stars }).map(() => '★')}{Array.from({ length: 5 - stars }).map(() => '☆')}
      </span>
    </div>
  ) : null;

  // Determine a responsive font size based on comment length so the text fits within a fixed‑height card
  const getFontSize = (text: string) => {
    if (text.length > 250) return 'text-xs'; // very long
    if (text.length > 180) return 'text-sm'; // long
    return 'text-base'; // default
  };
  const commentFontClass = getFontSize(comment);

  return (
    <div className="my-8 flex justify-center">
      {/* Fixed height ensures consistent card size across reviews */}
      <div className="relative max-w-xl w-full flex flex-col justify-between bg-gradient-to-r from-pink-100 via-pink-50 to-pink-100 p-6 rounded-2xl shadow-xl border border-pink-200/50 transition-opacity duration-700">
        {starDisplay}
        <p className={`${commentFontClass} text-pink-900 italic mb-4 text-center`}>{comment}</p>
        <p className="text-pink-700 font-semibold text-right mt-2">- {owner_name || 'Cliente'}</p>
        {/* Decorative subtle pulse */}
        <div className="absolute inset-0 border-2 border-pink-300 rounded-2xl pointer-events-none animate-pulse" />
      </div>
    </div>
  );
};

export default TestimonialsCarousel;
