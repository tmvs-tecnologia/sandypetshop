import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Feedback {
    id: string;
    created_at: string;
    appointment_id: string;
    appointment_table: string;
    pet_name: string;
    owner_name: string | null;
    whatsapp: string | null;
    pet_photo_url: string | null;
    service: string | null;
    stars: number;
    comment: string | null;
    submitted_at: string;
}

// Declaração de tipo para o Web Component do Lottie
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STAR_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#a3e635', '#2dd4bf'];
const STAR_LABELS = ['Ruim', 'Regular', 'Bom', 'Ótimo', 'Excelente'];

function StarRow({ count, fbId, animate }: { count: number; fbId: string; animate?: boolean }) {
    const color = STAR_COLORS[count - 1] || '#fbbf24';
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
                const isFilled = n <= count;
                const gradId = `star-grad-${fbId}-${n}`;
                return (
                    <div
                        key={n}
                        style={{
                            display: 'inline-flex',
                            filter: isFilled
                                ? `drop-shadow(0 0 8px ${color}55) drop-shadow(0 2px 4px ${color}33)`
                                : 'none',
                            // @ts-ignore
                            '--target-opacity': isFilled ? 1 : 0.12,
                            opacity: 'var(--target-opacity)',
                            animation: animate ? `starIn 0.6s cubic-bezier(0.34,1.56,0.64,1) ${(n - 1) * 80}ms both` : 'none',
                        }}
                    >
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                            <defs>
                                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={isFilled ? color : '#d1d5db'} />
                                    <stop offset="100%" stopColor={isFilled ? color : '#9ca3af'} />
                                </linearGradient>
                            </defs>
                            <path
                                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill={`url(#${gradId})`}
                                style={{ transition: 'fill 0.3s ease' }}
                            />
                        </svg>
                    </div>
                );
            })}
        </div>
    );
}

function RatingBadge({ stars }: { stars: number }) {
    const color = STAR_COLORS[stars - 1] || '#9ca3af';
    const label = STAR_LABELS[stars - 1] || 'Nota';
    return (
        <span
            className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider"
            style={{
                background: `${color}15`,
                color,
                border: `1px solid ${color}30`,
                fontFamily: '"Outfit", sans-serif',
                boxShadow: `0 2px 10px ${color}10`,
            }}
        >
            {stars}★ {label}
        </span>
    );
}

function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
    const [err, setErr] = useState(false);
    if (!src || err) {
        return (
            <div
                className={`${className} flex items-center justify-center overflow-hidden`}
                style={{
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #fff1f7 100%)',
                    borderRadius: 'inherit'
                }}
            >
                {/* Lottie Animation proporcional ao tamanho do avatar */}
                <div style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
                    {/* @ts-ignore */}
                    <dotlottie-wc
                        src="https://lottie.host/ec93d9f5-43c7-4df9-8b68-7bf2d462895a/qNefgNdKvi.lottie"
                        style={{ width: '48px', height: '48px', display: 'block' }}
                        autoplay
                        loop
                    />
                </div>
            </div>
        );
    }
    return <img src={src} alt={alt} className={className} onError={() => setErr(true)} referrerPolicy="no-referrer" />;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
    if (diff < 60) return 'agora mesmo';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `há ${Math.floor(diff / 86400)} dias`;
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(past);
}

// ─── Componente Principal ─────────────────────────────────────────────────────
const FeedbacksView: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterPet, setFilterPet] = useState('');
    const [filterStars, setFilterStars] = useState(0); // 0 = todos
    const [sortOrder, setSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');
    const [mounted, setMounted] = useState(false);
    
    // Novas estados para Ação
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [activeFeedback, setActiveFeedback] = useState<Feedback | null>(null);
    const [shareStyle, setShareStyle] = useState<'pink-sweet' | 'elegant-minimal'>('pink-sweet');

    useEffect(() => {
        // Carrega o script do Lottie Web Component (uma única vez)
        if (!document.querySelector('script[data-lottie-wc-admin]')) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js';
            script.type = 'module';
            script.setAttribute('data-lottie-wc-admin', '1');
            document.head.appendChild(script);
        }

        const t = setTimeout(() => setMounted(true), 60);
        return () => clearTimeout(t);
    }, []);

    const fetchFeedbacks = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('feedbacks')
                .select('*')
                .order('submitted_at', { ascending: false });
            if (!error && data) setFeedbacks(data as Feedback[]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

    // Estatísticas
    const avg = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.stars, 0) / feedbacks.length)
        : 0;
    const dist = [5, 4, 3, 2, 1].map(s => ({
        stars: s,
        count: feedbacks.filter(f => f.stars === s).length,
    }));

    // Filtros
    const petNames = Array.from(new Set(feedbacks.map(f => f.pet_name).filter(Boolean))).sort();

    const filtered = feedbacks
        .filter(f => !filterPet || f.pet_name?.toLowerCase().includes(filterPet.toLowerCase()))
        .filter(f => !filterStars || f.stars === filterStars)
        .sort((a, b) => {
            if (sortOrder === 'highest') return b.stars - a.stars;
            if (sortOrder === 'lowest') return a.stars - b.stars;
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        });

    return (
        <div
            className="animate-fadeIn"
            style={{
                fontFamily: '"Outfit", sans-serif',
                minHeight: '100vh',
                padding: '0 0 5rem 0',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'none' : 'translateY(20px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lobster+Two:wght@700&family=Outfit:wght@400;500;600;700&display=swap');
                @keyframes starIn { from { opacity: 0; transform: translateY(-8px) scale(0.6); } to { opacity: var(--target-opacity); transform: none; } }
                @keyframes cardSlide { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
                @keyframes barGrow { from { width: 0; } to { width: var(--bar-w); } }
                .fb-card { animation: cardSlide 0.5s cubic-bezier(0.34,1.1,0.64,1) both; }
                .fb-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(236,72,153,0.13), 0 4px 12px rgba(0,0,0,0.06); }
                .fb-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
                .bar-fill { animation: barGrow 0.9s cubic-bezier(0.4,0,0.2,1) 0.3s both; }
                .filter-btn { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
                .filter-btn:active { transform: scale(0.95); }
                .action-btn { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); position: relative; overflow: hidden; }
                .action-btn::after { content: ''; position: absolute; inset: 0; background: white; opacity: 0; transition: opacity 0.2s; }
                .action-btn:hover::after { opacity: 0.1; }
                .action-btn:active { transform: scale(0.96); }
                .modal-overlay { 
                    backdrop-filter: blur(12px); 
                    animation: fadeIn 0.3s ease-out; 
                    overflow-y: auto; 
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: none; opacity: 1; } }
                .share-card { animation: slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
                .paw-pattern { opacity: 0.1; pointer-events: none; }
            `}</style>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="relative flex flex-col items-center text-center mb-8">
                <button
                    onClick={fetchFeedbacks}
                    disabled={loading}
                    className="absolute left-0 top-1 filter-btn flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                    style={{
                        background: 'rgba(252, 231, 243, 0.4)',
                        border: '1px solid rgba(252, 231, 243, 0.5)',
                        color: '#db2777',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 0.7,
                    }}
                    title="Atualizar"
                >
                    <svg 
                        className={loading ? 'animate-spin' : ''} 
                        width="20" height="20" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <div>
                    <h1 style={{
                        fontFamily: '"Lobster Two", cursive',
                        fontSize: '2.25rem',
                        fontWeight: 700,
                        color: '#db2777',
                        lineHeight: 1.1,
                        marginBottom: '0.2rem',
                    }}>
                        Avaliações
                    </h1>
                    <p className="text-[11px] sm:text-sm text-gray-600 font-medium">
                        O que os tutores estão dizendo sobre seus pets
                    </p>
                </div>
            </div>

            {/* ── Stats Cards ─────────────────────────────────────────────────── */}
            {!loading && feedbacks.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
                    {/* Média geral */}
                    <div
                        className="rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center relative overflow-hidden h-full"
                        style={{
                            background: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
                            boxShadow: '0 12px 40px rgba(236,72,153,0.3)',
                            color: 'white',
                        }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10" />
                        <span style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, lineHeight: 1 }}>
                            {avg.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', marginTop: '-0.1rem' }}>⭐</span>
                        <span className="mt-1 text-white/90 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Média Geral</span>
                    </div>

                    {/* Total de avaliações */}
                    <div
                        className="rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center h-full"
                        style={{ background: 'white', border: '1px solid #fce7f3', boxShadow: '0 4px 20px rgba(236,72,153,0.07)' }}
                    >
                        <span style={{ fontSize: 'clamp(2.2rem, 10vw, 3.2rem)', fontWeight: 900, color: '#db2777', lineHeight: 1 }}>
                            {feedbacks.length}
                        </span>
                        <span className="mt-1 text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Avaliações</span>
                    </div>

                    {/* Distribuição por estrelas */}
                    <div
                        className="rounded-2xl p-4 flex flex-col gap-1.5 col-span-2 lg:col-span-1"
                        style={{ background: 'white', border: '1px solid #fce7f3', boxShadow: '0 4px 20px rgba(236,72,153,0.07)' }}
                    >
                        {dist.map(({ stars: s, count }) => {
                            const pct = feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0;
                            return (
                                <div key={s} className="flex items-center gap-2">
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: STAR_COLORS[s - 1], width: 14, textAlign: 'right', flexShrink: 0 }}>{s}★</span>
                                    <div className="flex-1 bg-gray-100 rounded-full overflow-hidden" style={{ height: 6 }}>
                                        <div
                                            className="bar-fill h-full rounded-full"
                                            style={{
                                                width: `${pct}%`,
                                                '--bar-w': `${pct}%`,
                                                background: STAR_COLORS[s - 1],
                                            } as React.CSSProperties}
                                        />
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', width: 20, flexShrink: 0 }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Filtros ─────────────────────────────────────────────────────── */}
            <div
                className="flex flex-col sm:flex-row gap-3 mb-6 p-4 rounded-2xl"
                style={{ background: 'white', border: '1px solid #fce7f3', boxShadow: '0 2px 12px rgba(236,72,153,0.06)' }}
            >
                {/* Filtro por nome do pet */}
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        type="text"
                        value={filterPet}
                        onChange={e => setFilterPet(e.target.value)}
                        placeholder="Filtrar por nome do pet..."
                        list="pet-names-list"
                        style={{
                            width: '100%',
                            padding: '0.6rem 0.9rem 0.6rem 2.4rem',
                            borderRadius: '0.75rem',
                            border: '1.5px solid #fce7f3',
                            fontFamily: '"Outfit", sans-serif',
                            fontSize: '0.9rem',
                            color: '#374151',
                            background: '#fdf2f8',
                            outline: 'none',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#ec4899'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(236,72,153,0.12)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#fce7f3'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <datalist id="pet-names-list">
                        {petNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                    {filterPet && (
                        <button onClick={() => setFilterPet('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-pink-400 transition-colors" aria-label="Limpar filtro">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Filtro por estrela */}
                <div className="flex gap-1.5 flex-wrap">
                    {[0, 5, 4, 3, 2, 1].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStars(s)}
                            className="filter-btn px-3 py-1.5 rounded-xl text-xs font-bold"
                            style={{
                                background: filterStars === s ? 'linear-gradient(135deg, #ec4899, #f97316)' : '#fdf2f8',
                                color: filterStars === s ? 'white' : '#9ca3af',
                                border: filterStars === s ? '1.5px solid transparent' : '1.5px solid #fce7f3',
                            }}
                        >
                            {s === 0 ? 'Todas' : `${s}★`}
                        </button>
                    ))}
                </div>

                {/* Ordenação */}
                <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                    style={{
                        padding: '0.6rem 0.9rem',
                        borderRadius: '0.75rem',
                        border: '1.5px solid #fce7f3',
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: '0.85rem',
                        color: '#374151',
                        background: '#fdf2f8',
                        outline: 'none',
                        cursor: 'pointer',
                    }}
                >
                    <option value="newest">Mais recentes</option>
                    <option value="highest">Melhor nota</option>
                    <option value="lowest">Pior nota</option>
                </select>
            </div>

            {/* ── Contagem filtrada ────────────────────────────────────────────── */}
            {(filterPet || filterStars !== 0) && (
                <div className="mb-4 flex items-center gap-2">
                    <span style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 500 }}>
                        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={() => { setFilterPet(''); setFilterStars(0); }}
                        className="text-pink-400 hover:text-pink-600 transition-colors"
                        style={{ fontSize: '0.78rem', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        Limpar filtros
                    </button>
                </div>
            )}

            {/* ── Estado de carregamento ───────────────────────────────────────── */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div
                        className="w-16 h-16 rounded-full border-4 border-pink-100 border-t-pink-500 animate-spin"
                        style={{ boxShadow: '0 0 24px rgba(236,72,153,0.2)' }}
                    />
                    <p style={{ color: '#f9a8d4', fontWeight: 600, fontSize: '0.9rem' }}>Carregando avaliações...</p>
                </div>
            )}

            {/* ── Vazio ────────────────────────────────────────────────────────── */}
            {!loading && feedbacks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div
                        className="text-6xl mb-4"
                        style={{ animation: 'starIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both' }}
                    >
                        🌸
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                        Nenhuma avaliação ainda
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', maxWidth: 280 }}>
                        As avaliações dos clientes aparecerão aqui conforme os serviços forem concluídos.
                    </p>
                </div>
            )}

            {/* ── Lista de avaliações ──────────────────────────────────────────── */}
            {!loading && filtered.length === 0 && feedbacks.length > 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Nenhuma avaliação encontrada com esse filtro.</p>
                </div>
            )}

            <div className="space-y-4">
                {filtered.map((fb, idx) => (
                    <div
                        key={fb.id}
                        className="fb-card rounded-2xl p-5 relative overflow-hidden"
                        style={{
                            background: 'white',
                            border: `1px solid ${STAR_COLORS[fb.stars - 1]}22`,
                            boxShadow: `0 4px 24px rgba(0,0,0,0.05), 0 0 0 0 ${STAR_COLORS[fb.stars - 1]}`,
                            animationDelay: `${idx * 60}ms`,
                        }}
                    >
                        {/* Acento de cor lateral por estrela */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                            style={{ background: `linear-gradient(to bottom, ${STAR_COLORS[fb.stars - 1]}, ${STAR_COLORS[fb.stars - 1]}44)` }}
                        />

                        <div className="flex items-start gap-4 pl-3">
                            {/* Avatar do pet */}
                            <div className="relative flex-shrink-0">
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{ background: `${STAR_COLORS[fb.stars - 1]}22`, filter: 'blur(6px)', transform: 'scale(1.15)' }}
                                />
                                <SafeImage
                                    src={fb.pet_photo_url || ''}
                                    alt={fb.pet_name}
                                    className="relative w-14 h-14 rounded-full object-cover"
                                    style={{ border: `3px solid ${STAR_COLORS[fb.stars - 1]}44`, boxShadow: `0 4px 16px ${STAR_COLORS[fb.stars - 1]}33` } as React.CSSProperties}
                                />
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                                    <div>
                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', letterSpacing: '-0.01em' }}>
                                            {fb.pet_name}
                                        </span>
                                        {fb.owner_name && (
                                            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500, marginLeft: '0.5rem' }}>
                                                — {fb.owner_name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <RatingBadge stars={fb.stars} />
                                        <span style={{ fontSize: '0.72rem', color: '#d1d5db', fontWeight: 500 }}>
                                            {timeAgo(fb.submitted_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <StarRow count={fb.stars} fbId={fb.id} animate />
                                </div>

                                {fb.service && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            color: '#be185d',
                                            background: '#fce7f3',
                                            borderRadius: '0.5rem',
                                            padding: '0.2rem 0.6rem',
                                            marginBottom: '0.6rem',
                                            letterSpacing: '0.03em',
                                        }}
                                    >
                                        {fb.service}
                                    </span>
                                )}

                                {fb.comment ? (
                                    <p
                                        style={{
                                            fontSize: '0.88rem',
                                            color: '#374151',
                                            lineHeight: 1.65,
                                            background: '#fafafa',
                                            borderRadius: '0.75rem',
                                            padding: '0.7rem 0.9rem',
                                            borderLeft: `3px solid ${STAR_COLORS[fb.stars - 1]}55`,
                                            margin: 0,
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        "{fb.comment}"
                                    </p>
                                ) : (
                                    <p style={{ fontSize: '0.8rem', color: '#d1d5db', fontStyle: 'italic' }}>
                                        Sem comentário
                                    </p>
                                )}

                                {/* ── Ações (Feedback ⮕ Ação) ────────────────────── */}
                                <div className="mt-4 pt-4 border-t border-gray-100/50 flex items-center gap-3">
                                    {fb.stars >= 4 ? (
                                        <button
                                            onClick={() => {
                                                setActiveFeedback(fb);
                                                setIsShareModalOpen(true);
                                            }}
                                            className="action-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                                            style={{
                                                background: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
                                                color: 'white',
                                                boxShadow: '0 4px 12px rgba(219,39,119,0.2)',
                                            }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            Gerar Post Instagram
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const phone = fb.whatsapp ? fb.whatsapp.replace(/\D/g, '') : '';
                                                const message = encodeURIComponent(`Olá ${fb.owner_name}, aqui é da Sandy's PetShop. 🐾 Recebemos o seu feedback sobre o(a) ${fb.pet_name}. Gostaríamos de entender melhor o que aconteceu para que possamos melhorar nossos cuidados! Como podemos te ajudar?`);
                                                window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}?text=${message}`, '_blank');
                                            }}
                                            className="action-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                                            style={{
                                                background: 'rgba(5, 150, 105, 0.08)',
                                                color: '#059669',
                                                border: '1px solid rgba(5, 150, 105, 0.15)',
                                            }}
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                            Entender o Problema
                                        </button>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                        <button
                                            className="p-2 transition-all hover:bg-gray-100 rounded-full text-gray-400 hover:text-pink-500"
                                            title="Histórico do Pet"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Modal de Compartilhamento (Feedback ⮕ Ação) ────────────────── */}
            {isShareModalOpen && activeFeedback && (
                <div className="modal-overlay fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/60 pt-20 pb-10">
                    <div className="share-card relative w-full h-fit flex flex-col items-center" style={{ maxWidth: 'min(384px, 95vw)' }}>
                        {/* Seletor de Estilo */}
                        <div className="absolute -top-14 bg-white/20 backdrop-blur-md rounded-2xl p-1 flex gap-1 border border-white/20 z-20">
                            <button
                                onClick={() => setShareStyle('pink-sweet')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shareStyle === 'pink-sweet' ? 'bg-white text-pink-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                            >
                                Pink Sweet
                            </button>
                            <button
                                onClick={() => setShareStyle('elegant-minimal')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${shareStyle === 'elegant-minimal' ? 'bg-white text-gray-800 shadow-lg' : 'text-white hover:bg-white/10'}`}
                            >
                                Elegant Minimal
                            </button>
                        </div>

                        {/* O Card do Instagram */}
                        <div
                            className="w-full aspect-square rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col p-8 select-none"
                            style={shareStyle === 'pink-sweet' ? {
                                background: 'linear-gradient(135deg, #db2777 0%, #ec4899 50%, #f472b6 100%)',
                                color: 'white',
                                maxHeight: '70vh'
                            } : {
                                background: '#ffffff',
                                color: '#111827',
                                border: '1px solid #f3f4f6',
                                maxHeight: '70vh'
                            }}
                        >
                            {/* Patinhas Decorativas (Apenas no Pink Sweet) */}
                            {shareStyle === 'pink-sweet' && (
                                <div className="absolute inset-0 overflow-hidden paw-pattern pointer-events-none">
                                    <span style={{ position: 'absolute', top: '5%', left: '10%', fontSize: '3rem' }}>🐾</span>
                                    <span style={{ position: 'absolute', bottom: '10%', right: '10%', fontSize: '4rem', transform: 'rotate(25deg)' }}>🐾</span>
                                    <span style={{ position: 'absolute', top: '40%', right: '-5%', fontSize: '2.5rem', opacity: 0.2 }}>🐾</span>
                                </div>
                            )}

                            {/* Logo / Header do Card */}
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex flex-col">
                                    <span style={{
                                        fontFamily: '"Lobster Two", cursive',
                                        fontSize: 'clamp(1rem, 5vw, 1.6rem)',
                                        lineHeight: 1
                                    }}>
                                        Sandy's
                                    </span>
                                    <span style={{
                                        fontSize: 'clamp(0.4rem, 2vw, 0.6rem)',
                                        fontWeight: 800,
                                        letterSpacing: '0.2em',
                                        opacity: 0.8,
                                        marginTop: '1px'
                                    }}>
                                        PET SHOP
                                    </span>
                                </div>
                                <div
                                    className="px-3 py-1 rounded-full text-[10px] font-bold tracking-tighter"
                                    style={{
                                        background: shareStyle === 'pink-sweet' ? 'rgba(255,255,255,0.2)' : '#fce7f3',
                                        color: shareStyle === 'pink-sweet' ? 'white' : '#db2777'
                                    }}
                                >
                                    Feedback do Mês
                                </div>
                            </div>

                            {/* Foto e Nome */}
                            <div className="flex flex-col items-center mb-6 relative z-10">
                                <div className="relative mb-4">
                                    <div
                                        className="absolute inset-0 blur-xl rounded-full"
                                        style={{ background: shareStyle === 'pink-sweet' ? 'rgba(255,255,255,0.4)' : 'rgba(219,39,119,0.2)' }}
                                    />
                                    <SafeImage
                                        src={activeFeedback.pet_photo_url || ''}
                                        alt={activeFeedback.pet_name}
                                        className="w-24 h-24 rounded-full object-cover relative border-4"
                                        style={{ borderColor: shareStyle === 'pink-sweet' ? 'rgba(255,255,255,0.3)' : '#fce7f3' }}
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    </div>
                                </div>
                                <h4 style={{
                                    fontFamily: '"Lobster Two", cursive',
                                    fontSize: 'clamp(1.5rem, 8vw, 2.2rem)',
                                    lineHeight: 1,
                                    textShadow: shareStyle === 'pink-sweet' ? '0 2px 10px rgba(0,0,0,0.1)' : 'none'
                                }}>
                                    {activeFeedback.pet_name}
                                </h4>
                                <div className="flex gap-1 mt-2">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <svg key={n} className="w-4 h-4" fill={n <= activeFeedback.stars ? (shareStyle === 'pink-sweet' ? '#ffffff' : '#facc15') : 'rgba(0,0,0,0.1)'} viewBox="0 0 24 24">
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                    ))}
                                </div>
                            </div>

                            {/* Comentário */}
                            <div className="flex-1 flex items-center justify-center relative z-10 text-center">
                                <div className="relative">
                                    <span style={{
                                        position: 'absolute',
                                        top: '-1rem',
                                        left: '-1.5rem',
                                        fontSize: '3rem',
                                        opacity: 0.15,
                                        fontFamily: 'serif'
                                    }}>"</span>
                                    <p style={{
                                        fontSize: 'clamp(0.85rem, 4.5vw, 1.1rem)',
                                        fontWeight: 600,
                                        fontStyle: 'italic',
                                        lineHeight: 1.4,
                                        letterSpacing: '-0.01em'
                                    }}>
                                        {activeFeedback.comment || "Super recomendo o Sandy's PetShop! Cuidados impecáveis e muito carinho."}
                                    </p>
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '-2rem',
                                        right: '-1.5rem',
                                        fontSize: '3rem',
                                        opacity: 0.15,
                                        fontFamily: 'serif'
                                    }}>"</span>
                                </div>
                            </div>

                            {/* Footer do Card */}
                            <div className="mt-6 flex justify-center relative z-10">
                                <div className="px-4 py-1.5 rounded-full border border-current opacity-60 text-[9px] font-bold uppercase tracking-widest">
                                    @sandypetshop.oficial
                                </div>
                            </div>
                        </div>

                        {/* Botões de Ação do Modal */}
                        <div className="mt-8 flex gap-3 w-full">
                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/20"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => {
                                    alert('Dica: Tire um print desta tela para postar nos stories! Em breve teremos exportação direta de imagem.');
                                }}
                                className="flex-[2] py-4 bg-white text-pink-600 rounded-2xl font-bold shadow-xl shadow-pink-900/40 transform hover:scale-105 transition-all"
                            >
                                Como postar?
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbacksView;
