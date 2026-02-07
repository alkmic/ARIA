import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Brain, TrendingUp, MapPin, Users, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-gradient-to-br from-al-blue-500 via-al-blue-800 to-al-navy relative overflow-hidden flex flex-col">
      {/* Animated background elements - subtler */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.2, 0.15] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-64 h-64 bg-al-teal/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.15, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-al-sky/30 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content - Centered vertically */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4">
        {/* Logo Air Liquide - Compact */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4"
        >
          <div className="text-white text-sm font-semibold tracking-[0.3em] uppercase">
            Air Liquide Healthcare
          </div>
          <div className="h-0.5 w-full bg-gradient-to-r from-al-teal to-al-sky mt-1" />
        </motion.div>

        {/* ARIA Title - More compact */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-3"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            ARIA
          </h1>
          <div className="flex items-center justify-center gap-2 text-al-teal text-sm font-medium mt-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistant Intelligent pour Représentants</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </motion.div>

        {/* Description - Shorter */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-white/70 text-sm sm:text-base text-center max-w-lg mb-6 leading-relaxed"
        >
          Optimisez vos visites terrain, générez des pitchs personnalisés et
          maximisez l'impact de vos actions commerciales.
        </motion.p>

        {/* Features - 2 rows, more compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 mb-6 max-w-3xl"
        >
          {[
            { icon: Brain, label: 'Coach IA', color: 'text-al-teal' },
            { icon: Zap, label: 'Pitch IA', color: 'text-al-sky' },
            { icon: TrendingUp, label: 'Analytics', color: 'text-al-teal' },
            { icon: Users, label: 'CRM Pro', color: 'text-al-sky' },
            { icon: MapPin, label: 'Territoire', color: 'text-al-teal' },
            { icon: Target, label: 'Objectifs', color: 'text-al-sky' },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-1.5 group-hover:bg-white/20 transition-colors">
                <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.color}`} />
              </div>
              <span className="text-white/80 text-xs font-medium">{feature.label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button - Smaller */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.03, boxShadow: "0 15px 30px rgba(0, 181, 173, 0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="group relative px-8 py-3 bg-gradient-to-r from-al-teal to-al-sky text-white text-base font-semibold rounded-xl shadow-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <div className="relative flex items-center gap-2">
            <span>Accéder au dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </motion.button>
      </div>

      {/* Footer - Version tag */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative z-10 pb-4 text-center"
      >
        <span className="text-white/30 text-xs">
          v1.0 · Propulsé par IA générative
        </span>
      </motion.div>
    </div>
  );
}
