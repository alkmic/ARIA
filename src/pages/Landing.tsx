import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, Brain, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-airLiquide-primary via-airLiquide-darkBlue to-airLiquide-navy relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-airLiquide-teal/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-airLiquide-lightBlue/20 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {/* Logo Air Liquide */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <div className="text-white text-2xl font-bold tracking-wider">
            AIR LIQUIDE
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-airLiquide-teal to-airLiquide-lightBlue mt-2" />
        </motion.div>

        {/* ARIA Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-6"
        >
          <h1 className="text-8xl font-black text-white mb-4 tracking-tight">
            ARIA
          </h1>
          <div className="flex items-center justify-center gap-3 text-airLiquide-teal text-2xl font-semibold">
            <Sparkles className="w-6 h-6" />
            <span>Air Liquide Intelligent Assistant</span>
            <Sparkles className="w-6 h-6" />
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-white/80 text-xl text-center max-w-2xl mb-12 leading-relaxed"
        >
          Votre assistant intelligent pour optimiser vos visites médicales,
          générer des pitchs personnalisés et maximiser l'impact de vos actions terrain.
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-3 gap-8 mb-16"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-airLiquide-teal" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Coach IA</h3>
            <p className="text-white/60 text-sm">
              Recommandations personnalisées en temps réel
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-airLiquide-lightBlue" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Pitch Generator</h3>
            <p className="text-white/60 text-sm">
              Génération de pitchs personnalisés avec IA
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-airLiquide-teal" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Analytics</h3>
            <p className="text-white/60 text-sm">
              Suivi de performance et insights actionnables
            </p>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0, 181, 173, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          className="group relative px-12 py-5 bg-gradient-to-r from-airLiquide-teal to-airLiquide-lightBlue text-white text-xl font-bold rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <div className="relative flex items-center gap-3">
            <span>Commencer l'expérience</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
          </div>
        </motion.button>

        {/* Version tag */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-12 text-white/40 text-sm"
        >
          Démonstrateur v1.0 · Propulsé par Groq Llama 3.3 70B
        </motion.div>
      </div>
    </div>
  );
}
