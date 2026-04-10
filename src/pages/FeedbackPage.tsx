import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

// ─── Design System: "Warm Luxury" ────────────────────────────────────────────
// Tone: Organic/Natural com acento Luxury/Refined
// Fonte display: Lobster Two (brand identity)
// Fonte corpo: Outfit (legibilidade moderna)
// Cor dominante: Rosa profundo (#d63384) com gradientes quentes
// Âncora visual: Estrelas interativas com partículas flutuantes ao selecionar
// Diferencial: Não usa grid genérico; composição assimétrica com "orbs" decorativos
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="%23fce7f3"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="52">🐾</text></svg>';

const SafeImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMG);
    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setCurrentSrc(FALLBACK_IMG)}
        />
    );
};

// Ícone de estrela SVG com gradiente
const StarIcon: React.FC<{ filled: boolean; hovered: boolean; onClick: () => void; onHover: () => void; onLeave: () => void; index: number }> = ({
    filled, hovered, onClick, onHover, onLeave, index
}) => {
    const isActive = filled || hovered;
    return (
        <button
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onTouchStart={onHover}
            onTouchEnd={() => { onClick(); onLeave(); }}
            className="relative group"
            style={{
                transform: isActive ? 'scale(1.25) translateY(-4px)' : 'scale(1) translateY(0)',
                transition: `transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 40}ms`,
                filter: isActive ? 'drop-shadow(0 4px 12px rgba(251,146,60,0.7))' : 'none',
            }}
            aria-label={`Avaliar com ${index + 1} estrela${index !== 0 ? 's' : ''}`}
        >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <defs>
                    <linearGradient id={`star-grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={isActive ? '#fbbf24' : '#e5e7eb'} />
                        <stop offset="100%" stopColor={isActive ? '#f97316' : '#d1d5db'} />
                    </linearGradient>
                </defs>
                <path
                    d="M26 6L31.5 19.3H46L34.3 27.8L38.8 41.1L26 32.6L13.2 41.1L17.7 27.8L6 19.3H20.5L26 6Z"
                    fill={`url(#star-grad-${index})`}
                    style={{ transition: 'fill 0.2s ease' }}
                />
            </svg>
        </button>
    );
};

// Partícula decorativa flutuante
const FloatingOrb: React.FC<{ size: number; x: string; y: string; color: string; delay: string; duration: string }> = ({ size, x, y, color, delay, duration }) => (
    <div
        className="absolute rounded-full pointer-events-none"
        style={{
            width: size,
            height: size,
            left: x,
            top: y,
            background: color,
            filter: 'blur(40px)',
            opacity: 0.35,
            animation: `float ${duration} ease-in-out ${delay} infinite alternate`,
        }}
    />
);

const starMessages: Record<number, string> = {
    1: 'Epa! Vamos melhorar! 😟',
    2: 'Obrigada pelo retorno! 🙏',
    3: 'Foi bom! Podemos fazer mais! ✨',
    4: 'Que alegria! Obrigada! 🌸',
    5: 'Amamos saber disso! 💖',
};

export const FeedbackPage: React.FC = () => {
    // ── parse query params from hash ──────────────────────────────────────────
    const getParams = () => {
        const hash = window.location.hash; // e.g. #feedback?id=...&table=...
        const qIdx = hash.indexOf('?');
        if (qIdx === -1) return new URLSearchParams();
        return new URLSearchParams(hash.slice(qIdx + 1));
    };

    const params = getParams();
    const appointmentId = params.get('id') || '';
    const table = params.get('table') || 'appointments';
    const petName = decodeURIComponent(params.get('pet') || '');
    const ownerName = decodeURIComponent(params.get('owner') || '');
    const whatsapp = decodeURIComponent(params.get('wa') || '');
    const service = decodeURIComponent(params.get('service') || '');
    const petPhotoUrl = decodeURIComponent(params.get('photo') || '');

    // ── state ─────────────────────────────────────────────────────────────────
    const [stars, setStars] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [showParticles, setShowParticles] = useState(false);
    const commentRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Animação de entrada com pequeno delay
        const t = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(t);
    }, []);

    const handleStarClick = (rating: number) => {
        setStars(rating);
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1200);
        // Auto-foca na caixa de comentário após selecionar estrela
        setTimeout(() => commentRef.current?.focus(), 300);
    };

    const handleSubmit = async () => {
        if (stars === 0) {
            setError('Por favor, selecione uma avaliação em estrelas.');
            return;
        }
        if (!appointmentId) {
            setError('Link de avaliação inválido ou expirado.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const { error: dbError } = await supabase.from('feedbacks').insert({
                appointment_id: appointmentId,
                appointment_table: table,
                pet_name: petName,
                owner_name: ownerName,
                whatsapp: whatsapp,
                pet_photo_url: petPhotoUrl,
                service: service,
                stars: stars,
                comment: comment.trim() || null,
            });

            if (dbError) throw dbError;
            setSubmitted(true);
        } catch (err: any) {
            setError('Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
            console.error('Feedback error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── TELA DE SUCESSO ──────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f7 50%, #fce7f3 100%)' }}>
                <style>{`
                    @keyframes float { from { transform: translateY(0px); } to { transform: translateY(-20px); } }
                    @keyframes sparkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }
                    @keyframes successPop { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 70% { transform: scale(1.1) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
                `}</style>

                <FloatingOrb size={300} x="-10%" y="-15%" color="radial-gradient(circle, #f9a8d4, #ec4899)" delay="0s" duration="6s" />
                <FloatingOrb size={200} x="80%" y="70%" color="radial-gradient(circle, #fbbf24, #f97316)" delay="2s" duration="8s" />

                <div className="relative z-10 text-center px-6 max-w-sm mx-auto" style={{ animation: 'successPop 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full flex items-center justify-center text-6xl"
                        style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)', boxShadow: '0 20px 60px rgba(236,72,153,0.4)' }}>
                        🐾
                    </div>
                    <h1 className="font-brand text-pink-800 text-4xl mb-3" style={{ fontFamily: '"Lobster Two", cursive' }}>
                        Que amor!
                    </h1>
                    <p className="text-gray-600 text-lg leading-relaxed font-outfit mb-2">
                        Sua avaliação foi enviada com sucesso!
                    </p>
                    <p className="text-pink-500 text-base font-outfit font-medium">
                        O seu carinho nos motiva a cuidar ainda melhor do <strong>{petName || 'seu pet'}</strong>. 💕
                    </p>

                    <div className="mt-8 flex justify-center gap-2">
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-3xl" style={{ animation: `sparkle 1.5s ease-in-out ${i * 0.2}s infinite` }}>
                                {i < stars ? '⭐' : '☆'}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const activeStar = hoveredStar || stars;

    // ─── TELA DE FEEDBACK ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fff7f0 50%, #fce7f3 100%)' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lobster+Two:wght@700&family=Outfit:wght@400;500;600;700&display=swap');
                @keyframes float { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-25px) rotate(3deg); } }
                @keyframes revealCard { from { opacity: 0; transform: translateY(40px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes revealTitle { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes particle { 0% { transform: translate(0,0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .card-reveal { animation: revealCard 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .title-reveal { animation: revealTitle 0.6s ease-out 0.2s both; }
                .star-reveal { animation: revealTitle 0.5s ease-out both; }
                .pet-card:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(236,72,153,0.2); }
                .pet-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .submit-btn { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .submit-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); box-shadow: 0 16px 40px rgba(219,39,119,0.4); }
                .submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.98); }
                .textarea-fx { transition: border-color 0.2s ease, box-shadow 0.2s ease; }
                .textarea-fx:focus { border-color: #ec4899; box-shadow: 0 0 0 3px rgba(236,72,153,0.15), 0 4px 20px rgba(236,72,153,0.1); outline: none; }
            `}</style>

            {/* Orbs decorativos */}
            <FloatingOrb size={400} x="-15%" y="-20%" color="radial-gradient(circle, #f9a8d4 0%, transparent 70%)" delay="0s" duration="7s" />
            <FloatingOrb size={300} x="75%" y="5%" color="radial-gradient(circle, #fde68a 0%, transparent 70%)" delay="1.5s" duration="9s" />
            <FloatingOrb size={250} x="60%" y="75%" color="radial-gradient(circle, #c4b5fd 0%, transparent 70%)" delay="3s" duration="11s" />

            {/* Conteúdo principal */}
            <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

                {/* Header com logo + título */}
                <div className="title-reveal text-center mb-6">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <img src="https://i.imgur.com/M3Gt3OA.png" alt="Logo Sandy's" className="w-10 h-10 drop-shadow-md" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <span style={{ fontFamily: '"Lobster Two", cursive', fontSize: '1.4rem', color: '#9d174d', letterSpacing: '0.01em' }}>
                            Sandy's Pet Shop
                        </span>
                    </div>
                    <h1 style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: '#1f2937', lineHeight: 1.2 }}>
                        Como foi a experiência?
                    </h1>
                    {service && (
                        <p style={{ fontFamily: '"Outfit", sans-serif', color: '#6b7280', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                            {service}
                        </p>
                    )}
                </div>

                {/* Card principal */}
                <div
                    className="card-reveal w-full max-w-md"
                    style={{
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '2rem',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 24px 80px rgba(236,72,153,0.12), 0 4px 20px rgba(0,0,0,0.05)',
                        padding: '2rem',
                    }}
                >
                    {/* Pet info */}
                    {petName && (
                        <div className="pet-card flex items-center gap-4 mb-8 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #fdf2f8, #fff1f7)', border: '1px solid #fce7f3' }}>
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, #fbcfe8, #fed7aa)', filter: 'blur(8px)', opacity: 0.6, transform: 'scale(1.1)' }} />
                                <SafeImage
                                    src={petPhotoUrl}
                                    alt={petName}
                                    className="relative w-20 h-20 rounded-full object-cover border-4 border-white"
                                    style={{ boxShadow: '0 8px 24px rgba(236,72,153,0.25)' } as React.CSSProperties}
                                />
                            </div>
                            <div>
                                <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#111827' }}>{petName}</div>
                                {ownerName && (
                                    <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>
                                        Tutor(a): {ownerName}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Estrelas */}
                    <div className="star-reveal mb-2 text-center" style={{ animationDelay: '0.3s' }}>
                        <p style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '0.85rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.2rem' }}>
                            Toque nas estrelas para avaliar
                        </p>

                        {/* Partículas ao selecionar estrela */}
                        <div className="relative">
                            {showParticles && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[...Array(12)].map((_, i) => {
                                        const angle = (i / 12) * 360;
                                        const dist = 40 + Math.random() * 30;
                                        const tx = Math.cos((angle * Math.PI) / 180) * dist;
                                        const ty = Math.sin((angle * Math.PI) / 180) * dist;
                                        return (
                                            <div
                                                key={i}
                                                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                                                style={{
                                                    background: i % 2 === 0 ? '#fbbf24' : '#f97316',
                                                    '--tx': `${tx}px`,
                                                    '--ty': `${ty}px`,
                                                    animation: `particle 0.8s ease-out ${i * 30}ms forwards`,
                                                    marginLeft: -4,
                                                    marginTop: -4,
                                                } as React.CSSProperties}
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <StarIcon
                                        key={n}
                                        index={n - 1}
                                        filled={n <= stars}
                                        hovered={n <= hoveredStar}
                                        onClick={() => handleStarClick(n)}
                                        onHover={() => setHoveredStar(n)}
                                        onLeave={() => setHoveredStar(0)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Mensagem da avaliação */}
                        <div style={{
                            height: '1.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '0.75rem',
                            transition: 'opacity 0.3s ease',
                            opacity: activeStar ? 1 : 0,
                        }}>
                            <span style={{
                                fontFamily: '"Outfit", sans-serif',
                                fontWeight: 600,
                                fontSize: '1rem',
                                color: activeStar >= 4 ? '#ec4899' : activeStar >= 3 ? '#f59e0b' : '#ef4444',
                            }}>
                                {activeStar ? starMessages[activeStar] : ''}
                            </span>
                        </div>
                    </div>

                    {/* Divisor decorativo */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #fce7f3)' }} />
                        <span style={{ color: '#f9a8d4', fontSize: '1.1rem' }}>🐾</span>
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #fce7f3)' }} />
                    </div>

                    {/* Caixa de comentário */}
                    <div className="mb-6">
                        <label style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: '0.85rem', color: '#374151', display: 'block', marginBottom: '0.6rem' }}>
                            Tem algo que queira nos contar? (opcional)
                        </label>
                        <textarea
                            ref={commentRef}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={`Conte-nos como foi a experiência do ${petName || 'seu pet'}...`}
                            rows={4}
                            maxLength={500}
                            className="textarea-fx w-full resize-none"
                            style={{
                                fontFamily: '"Outfit", sans-serif',
                                fontSize: '0.9rem',
                                color: '#374151',
                                background: 'rgba(255,255,255,0.9)',
                                borderRadius: '1rem',
                                border: '1.5px solid #fce7f3',
                                padding: '0.9rem 1.1rem',
                                lineHeight: 1.6,
                            }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#d1d5db', marginTop: '0.3rem', fontFamily: '"Outfit", sans-serif' }}>
                            {comment.length}/500
                        </div>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="mb-4 text-center p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <p style={{ fontFamily: '"Outfit", sans-serif', color: '#ef4444', fontSize: '0.85rem', fontWeight: 500 }}>{error}</p>
                        </div>
                    )}

                    {/* Botão enviar */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || stars === 0}
                        className="submit-btn w-full flex items-center justify-center gap-3 relative overflow-hidden"
                        style={{
                            background: stars === 0
                                ? 'linear-gradient(135deg, #e5e7eb, #d1d5db)'
                                : 'linear-gradient(135deg, #ec4899 0%, #db2777 50%, #f97316 100%)',
                            backgroundSize: isSubmitting ? '200% 100%' : '100% 100%',
                            animation: isSubmitting ? 'shimmer 1.5s linear infinite' : 'none',
                            color: stars === 0 ? '#9ca3af' : 'white',
                            border: 'none',
                            borderRadius: '1rem',
                            padding: '1rem 2rem',
                            fontFamily: '"Outfit", sans-serif',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: stars === 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Enviando avaliação...
                            </>
                        ) : (
                            <>
                                <span>Enviar Avaliação</span>
                                <span className="text-xl">{stars > 0 ? '⭐' : '🐾'}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center" style={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.8rem', color: '#d1d5db' }}>
                    Sua opinião ajuda a melhorar o atendimento 💕
                </p>
            </div>
        </div>
    );
};

export default FeedbackPage;
