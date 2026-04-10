import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';

// Declaração de tipo para o Web Component do Lottie (evita erro TS no JSX)
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'dotlottie-wc': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
                src?: string;
                autoplay?: boolean | string;
                loop?: boolean | string;
                style?: React.CSSProperties;
            }, HTMLElement>;
        }
    }
}

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
        // Carrega o script do Lottie Web Component (uma única vez)
        if (!document.querySelector('script[data-lottie-wc]')) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js';
            script.type = 'module';
            script.setAttribute('data-lottie-wc', '1');
            document.head.appendChild(script);
        }
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

    // ─── OVERLAY DE SUCESSO (aparece sobre o formulário com blur) ───────────────
    if (submitted) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                style={{ background: 'rgba(253,242,248,0.55)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
            >
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Lobster+Two:wght@700&family=Outfit:wght@400;500;600;700&display=swap');
                    @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes cardUp   { from { opacity: 0; transform: translateY(60px) scale(0.93); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    @keyframes iconPop  { 0% { transform: scale(0) rotate(-15deg); opacity: 0; } 65% { transform: scale(1.18) rotate(4deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
                    @keyframes fadeUp   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes starDrop { 0% { opacity: 0; transform: translateY(-20px) scale(0.5); } 70% { transform: translateY(3px) scale(1.2); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
                    @keyframes confetti {
                        0%   { transform: translate(0, 0) rotate(0deg);   opacity: 1; }
                        100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)); opacity: 0; }
                    }
                    @keyframes pulseRing { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.15); opacity: 0.07; } }
                    .success-overlay { animation: overlayIn 0.4s ease forwards; }
                    .success-card    { animation: cardUp 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
                    .success-icon    { animation: iconPop 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
                    .success-title   { animation: fadeUp 0.5s ease 0.65s both; }
                    .success-body    { animation: fadeUp 0.5s ease 0.8s both; }
                    .success-stars   { animation: fadeUp 0.5s ease 0.95s both; }
                    .success-cta     { animation: fadeUp 0.5s ease 1.1s both; }
                `}</style>

                {/* Confetti de partículas */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden success-overlay">
                    {[...Array(22)].map((_, i) => {
                        const colors = ['#ec4899','#f97316','#fbbf24','#a78bfa','#34d399','#fb7185'];
                        const cx = `${(Math.random() - 0.5) * 200}px`;
                        const cy = `${-(60 + Math.random() * 160)}px`;
                        const cr = `${(Math.random() - 0.5) * 360}deg`;
                        const delay = `${i * 55}ms`;
                        const size = 6 + Math.random() * 8;
                        const left = `${10 + Math.random() * 80}%`;
                        const top  = `${20 + Math.random() * 60}%`;
                        const shape = i % 3 === 0 ? '2px' : i % 3 === 1 ? '50%' : '0';
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: size,
                                    height: size,
                                    left,
                                    top,
                                    background: colors[i % colors.length],
                                    borderRadius: shape,
                                    '--cx': cx,
                                    '--cy': cy,
                                    '--cr': cr,
                                    animation: `confetti 1.4s cubic-bezier(0.25,0.46,0.45,0.94) ${delay} both`,
                                } as React.CSSProperties}
                            />
                        );
                    })}
                </div>

                {/* Card principal */}
                <div
                    className="success-card relative w-full max-w-sm mx-4 mb-8 sm:mb-0 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderRadius: '2rem',
                        border: '1.5px solid rgba(255,255,255,0.95)',
                        boxShadow: '0 32px 80px rgba(236,72,153,0.18), 0 8px 32px rgba(0,0,0,0.06)',
                        padding: '2.5rem 2rem 2rem',
                        overflow: 'hidden',
                    }}
                >
                    {/* Anel de pulso atrás do ícone */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-48 h-48 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #fce7f3, transparent 70%)', animation: 'pulseRing 3s ease-in-out infinite' }} />

                    {/* Ícone central animado — sem clip no canvas (Shadow DOM não respeita overflow:hidden) */}
                    <div className="success-icon relative mx-auto mb-2" style={{ width: 128, height: 128 }}>
                        {/* Glow pulsante posicionado ATRÁS da animação */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: '-20px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(236,72,153,0.22) 0%, transparent 68%)',
                                animation: 'pulseRing 2.5s ease-in-out infinite',
                                pointerEvents: 'none',
                                zIndex: 0,
                            }}
                        />
                        {/* Círculo branco decorativo atrás — sem overflow-hidden */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: '4px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.9)',
                                boxShadow: '0 8px 32px rgba(236,72,153,0.25)',
                                border: '2px solid rgba(236,72,153,0.15)',
                                zIndex: 0,
                            }}
                        />
                        {/* Lottie livre — proporção 1:1, sem clip que deforme o canvas */}
                        <div style={{ position: 'relative', zIndex: 1, width: '128px', height: '128px' }}>
                            {/* @ts-ignore */}
                            <dotlottie-wc
                                src="https://lottie.host/e46c9d27-f5df-4d6a-99e2-63d58c0f1e36/UUGtjP1iJz.lottie"
                                style={{ width: '128px', height: '128px', display: 'block' }}
                                autoplay
                                loop
                            />
                        </div>
                    </div>

                    {/* Título */}
                    <h1
                        className="success-title"
                        style={{ fontFamily: '"Lobster Two", cursive', fontSize: '2.4rem', color: '#9d174d', lineHeight: 1.1, marginBottom: '0.6rem' }}
                    >
                        Que amor!
                    </h1>

                    {/* Subtítulo */}
                    <p
                        className="success-body"
                        style={{ fontFamily: '"Outfit", sans-serif', fontSize: '1rem', color: '#374151', lineHeight: 1.6, marginBottom: '0.5rem' }}
                    >
                        Sua avaliação foi enviada!
                    </p>
                    <p
                        className="success-body"
                        style={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.9rem', color: '#ec4899', fontWeight: 600, lineHeight: 1.5, marginBottom: '1.4rem' }}
                    >
                        O seu carinho nos motiva a cuidar ainda<br />melhor de{' '}
                        <strong style={{ color: '#db2777' }}>{petName || 'seu pet'}</strong> 💕
                    </p>

                    {/* Estrelas como recap da nota dada — entrada em stagger */}
                    <div className="success-stars flex justify-center gap-2 mb-6">
                        {[1,2,3,4,5].map((n, i) => (
                            <span
                                key={n}
                                style={{
                                    fontSize: '1.8rem',
                                    display: 'inline-block',
                                    animation: `starDrop 0.55s cubic-bezier(0.34,1.56,0.64,1) ${1.1 + i * 0.1}s both`,
                                    filter: n <= stars ? 'drop-shadow(0 2px 8px rgba(251,146,60,0.6))' : 'none',
                                }}
                            >
                                {n <= stars ? '⭐' : '☆'}
                            </span>
                        ))}
                    </div>

                    {/* Linha divisória decorativa */}
                    <div className="success-cta flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #fce7f3)' }} />
                        <span style={{ fontSize: '0.75rem', color: '#f9a8d4', fontFamily: '"Outfit", sans-serif', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sandy's Pet Shop</span>
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #fce7f3)' }} />
                    </div>

                    {/* Mensagem final */}
                    <p className="success-cta" style={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.8rem', color: '#9ca3af' }}>
                        Você pode fechar esta janela 🐾
                    </p>
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
                                {/* Glow atrás do avatar */}
                                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, #fbcfe8, #fed7aa)', filter: 'blur(8px)', opacity: 0.6, transform: 'scale(1.2)' }} />

                                {petPhotoUrl ? (
                                    /* Foto real do pet */
                                    <SafeImage
                                        src={petPhotoUrl}
                                        alt={petName}
                                        className="relative w-20 h-20 rounded-full object-cover border-4 border-white"
                                        style={{ boxShadow: '0 8px 24px rgba(236,72,153,0.25)' } as React.CSSProperties}
                                    />
                                ) : (
                                    /* Sem foto: Lottie animation dentro do avatar circular */
                                    <div
                                        className="relative rounded-full border-4 border-white overflow-hidden flex items-center justify-center"
                                        style={{
                                            width: 80,
                                            height: 80,
                                            background: 'linear-gradient(135deg, #fce7f3 0%, #fff1f7 100%)',
                                            boxShadow: '0 8px 24px rgba(236,72,153,0.25)',
                                        }}
                                    >
                                        {/* O dotlottie-wc é 300×300 internamente; escalamos para caber no avatar */}
                                        <div style={{ width: 110, height: 110, marginTop: 12, flexShrink: 0, transform: 'scale(0.7)', transformOrigin: 'center center' }}>
                                            {/* @ts-ignore — custom element do Lottie */}
                                            <dotlottie-wc
                                                src="https://lottie.host/4e6e8e18-9bb2-4dff-bf5e-f029c53b65eb/a0ljmbwA4O.lottie"
                                                style={{ width: '110px', height: '110px', display: 'block' }}
                                                autoplay
                                                loop
                                            />
                                        </div>
                                    </div>
                                )}
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
                <p className="mt-6 text-center" style={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.8rem', color: '#374151', opacity: 0.7 }}>
                    Sua opinião ajuda a melhorar o atendimento 💕
                </p>
            </div>
        </div>
    );
};

export default FeedbackPage;
