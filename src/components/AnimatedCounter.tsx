import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
}

export function AnimatedCounter({ value, duration = 2, suffix = '' }: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [value, duration, count]);

  return (
    <motion.span>
      {rounded.get()}
      {suffix}
    </motion.span>
  );
}
