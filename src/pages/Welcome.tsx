import { useNavigate } from 'react-router-dom';
import { Wind, Sparkles, Brain, TrendingUp, MessageSquare, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#00293D] via-[#003D5C] to-[#0066B3] relative overflow-hidden flex items-center justify-center">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-radial from-cyan-400/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-radial from-blue-500/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto py-12">
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1, bounce: 0.5 }}
          className="mb-12 flex justify-center"
        >
          <div className="relative">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 blur-3xl opacity-50 rounded-full"
            />
            <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/30 shadow-2xl">
              <Wind className="w-20 h-20 text-cyan-200" strokeWidth={1.5} />
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-7 h-7 text-yellow-300 absolute -top-2 -right-2" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <h1 className="text-9xl md:text-[12rem] font-black mb-8 tracking-tighter leading-none">
            <motion.span
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              className="bg-gradient-to-r from-cyan-200 via-blue-300 to-cyan-200 bg-clip-text text-transparent bg-[length:200%_auto]"
            >
              ARIA
            </motion.span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl md:text-4xl text-white mb-3 font-light tracking-wide"
        >
          Air Liquide Intelligent Assistant
        </motion.p>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg md:text-xl text-cyan-100/80 mb-16 max-w-3xl mx-auto leading-relaxed"
        >
          Votre assistant intelligent pour optimiser vos relations avec les praticiens
          et maximiser l'impact de vos visites médicales.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="group relative inline-flex items-center justify-center px-14 py-6 text-xl font-bold text-[#00293D] bg-gradient-to-r from-white to-cyan-100 rounded-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-400/50 mb-24"
        >
          <span className="relative z-10 flex items-center space-x-3">
            <span>Lancer l'expérience</span>
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-6 h-6" />
            </motion.div>
          </span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-blue-400/30 to-cyan-400/30"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.button>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.15, duration: 0.6 }}
              whileHover={{
                y: -10,
                transition: { duration: 0.2 }
              }}
              className="relative group cursor-pointer"
            >
              {/* Glow effect on hover */}
              <motion.div
                className={`absolute -inset-1 bg-gradient-to-br ${feature.color} rounded-3xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500`}
              />

              {/* Card content */}
              <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl p-10 border border-white/20 hover:border-white/40 transition-all duration-300 h-full shadow-xl">
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${feature.color} mb-6 shadow-lg`}
                >
                  <feature.icon className="w-10 h-10 text-white" strokeWidth={2} />
                </motion.div>

                <h3 className="text-3xl font-bold text-white mb-4">
                  {feature.title}
                </h3>

                <p className="text-cyan-100/70 text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-16 text-sm text-cyan-200/60 tracking-widest uppercase"
        >
          Powered by AI • Built for Excellence
        </motion.p>
      </div>
    </div>
  );
};

export default Welcome;
