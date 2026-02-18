import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-al-navy via-al-blue-500 to-al-sky flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.8 }}
            className="text-center"
          >
            {/* Logo animé */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(255,255,255,0.3)',
                  '0 0 60px rgba(255,255,255,0.6)',
                  '0 0 20px rgba(255,255,255,0.3)',
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-4xl font-bold gradient-text">A</span>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              ARIA
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/70"
            >
              {t('welcome.splashSubtitle')}
            </motion.p>

            {/* Barre de chargement */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '200px' }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="h-1 bg-white/30 rounded-full mt-8 mx-auto overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-full w-1/2 bg-white rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
