import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wind, Sparkles } from 'lucide-react';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Générer des particules aléatoires pour l'effet d'air
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-al-navy via-al-blue-800 to-al-blue-600 relative overflow-hidden flex items-center justify-center">
      {/* Effet de particules d'air */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/20 rounded-full blur-sm animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Ondes fluides en arrière-plan */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00A3E0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0066B3" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <g className="animate-wave">
            <path
              d="M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 V200 H0 Z"
              fill="url(#wave-gradient)"
            />
          </g>
          <g className="animate-wave-reverse">
            <path
              d="M0,150 Q200,120 400,150 T800,150 T1200,150 T1600,150 V200 H0 Z"
              fill="url(#wave-gradient)"
              opacity="0.5"
            />
          </g>
        </svg>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Logo et icone */}
        <div className="mb-6 flex justify-center items-center space-x-4">
          <div className="relative">
            <Wind className="w-14 h-14 text-al-sky animate-pulse-slow" strokeWidth={1.5} />
            <Sparkles className="w-6 h-6 text-white absolute -top-1 -right-1 animate-pulse" />
          </div>
        </div>

        {/* Titre principal */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
          <span className="bg-gradient-to-r from-white via-al-sky to-al-teal bg-clip-text text-transparent animate-gradient">
            ARIA
          </span>
        </h1>

        {/* Sous-titre */}
        <p className="text-lg md:text-xl text-white/90 mb-3 font-light tracking-wide">
          Air Liquide Intelligent Assistant
        </p>

        {/* Description */}
        <p className="text-base text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          Votre assistant intelligent pour optimiser vos relations avec les praticiens
          et maximiser l'impact de vos visites medicales.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="group relative inline-flex items-center justify-center px-10 py-4 text-base font-semibold text-al-navy bg-white rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-al-sky/50 cursor-pointer"
        >
          <span className="relative z-10 flex items-center space-x-3">
            <span>Lancer l'experience</span>
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          </span>

          {/* Effet de brillance au survol */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>

        {/* Points cles */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 text-white/80">
          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-default">
            <div className="text-xl font-semibold text-al-sky mb-1.5">IA Generative</div>
            <p className="text-sm text-white/70">Pitch personnalises et insights intelligents</p>
          </div>

          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-default">
            <div className="text-xl font-semibold text-al-teal mb-1.5">Analyse Predictive</div>
            <p className="text-sm text-white/70">Identification des opportunites prioritaires</p>
          </div>

          <div className="backdrop-blur-sm bg-white/10 rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-default">
            <div className="text-xl font-semibold text-white mb-1.5">Coach Virtuel</div>
            <p className="text-sm text-white/70">Recommandations strategiques en temps reel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
