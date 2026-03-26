const fs = require('fs');

let content = fs.readFileSync('App.tsx', 'utf8');

const oldStr = `    const formContent = (
        <div className="w-full max-w-3xl mx-auto bg-rose-50 rounded-2xl shadow-xl overflow-hidden animate-fadeIn">
            <form ref={formRef} onSubmit={handleSubmit} className="relative p-6 sm:p-8">`;

const newStr = `    const formContent = (
        <main 
            className={\`w-full max-w-5xl mx-auto bg-white rounded-[2rem] shadow-xl border border-pink-100 mb-8 transition-all ease-out transform origin-top \${isAnimating ? 'translate-y-full opacity-0 duration-500' : 'animate-fadeIn opacity-100 scale-100'} \${!isDragging && !isAnimating ? 'duration-500' : 'duration-0'}\`}
            style={!isAnimating && dragY > 0 ? { transform: \`translateY(\${dragY}px)\` } : {}}
        >
            {/* Header Elegante */}
            <div 
                className="relative p-6 sm:p-10 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-pink-100 rounded-t-[2rem] overflow-hidden shrink-0 cursor-grab active:cursor-grabbing select-none"
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-pink-300/40 rounded-full mt-3 hover:bg-pink-300/60 transition-colors"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 hover:bg-white text-pink-900 shadow-sm border border-pink-100/50 backdrop-blur-sm transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    title="Fechar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-pink-950 tracking-tight mb-2">Hotel Pet</h2>
                        <p className="text-pink-800/80 font-medium text-sm sm:text-base">Cadastre uma nova hospedagem para o pet</p>
                    </div>
                    <div className="hidden sm:flex h-20 w-20 bg-white rounded-3xl shadow-sm items-center justify-center text-4xl transform rotate-3">
                        🏨
                    </div>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-12">`;

if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    console.log("Replaced start");
} else {
    console.log("Could not find start");
}

const oldEnd = `                        </div>
                    </div>
                </div>
            )}
        </div>
    );`;

const newEnd = `                        </div>
                    </div>
                </div>
            )}
        </main>
    );`;

if (content.includes(oldEnd)) {
    content = content.replace(oldEnd, newEnd);
    console.log("Replaced end");
} else {
    console.log("Could not find end");
}

fs.writeFileSync('App.tsx', content, 'utf8');
