import { useNavigate } from 'react-router-dom';
import { Wind, Sparkles, Brain, TrendingUp, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Welcome = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: 'IA Générative',
      description: 'Pitch personnalisés et insights intelligents',
      color: 'from-cyan-400 to-blue-500',
    },
    {
      icon: TrendingUp,
      title: 'Analyse Prédictive',
      description: 'Identification des opportunités prioritaires',
      color: 'from-teal-400 to-cyan-500',
    },
    {
      icon: MessageSquare,
      title: 'Coach Virtuel',
      description: 'Recommandations stratégiques en temps réel',
      color: 'from-blue-400 to-indigo-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003D5C] via-[#005A82] to-[#0066B3] relative overflow-hidden flex items-center justify-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-white/10 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-400/10 to-transparent rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto py-12">
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1, bounce: 0.5 }}
          className="mb-12 flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 blur-2xl opacity-50 rounded-full" />
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <Wind className="w-16 h-16 text-cyan-300" strokeWidth={1.5} />
              <Sparkles className="w-6 h-6 text-white absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-8xl md:text-9xl font-black mb-6 tracking-tight"
        >
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            ARIA
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl text-white/90 mb-4 font-light tracking-wide"
        >
          Air Liquide Intelligent Assistant
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Votre assistant intelligent pour optimiser vos relations avec les praticiens
          et maximiser l'impact de vos visites médicales.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard')}
          className="group relative inline-flex items-center justify-center px-12 py-5 text-lg font-semibold text-[#003D5C] bg-white rounded-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-400/50 mb-20"
        >
          <span className="relative z-10 flex items-center space-x-3">
            <span>Lancer l'expérience</span>
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </motion.button>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl blur-xl" />
              <div className="relative backdrop-blur-md bg-white/10 rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 h-full">
                <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-white/70 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
