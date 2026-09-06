"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useMounted } from "@/lib/utils";

type AnimationVariants = Variants;

const slideUp: AnimationVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function SlideUp({
  children,
  delay = 0,
  className,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
} & React.ComponentProps<typeof motion.div>) {
  const shouldReduceMotion = useReducedMotion();
  const mounted = useMounted();

  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={shouldReduceMotion ? {} : slideUp}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
