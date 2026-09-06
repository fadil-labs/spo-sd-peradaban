"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useMounted } from "@/lib/utils";

type AnimationVariants = Variants;

const scaleIn: AnimationVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function ScaleIn({
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
      variants={shouldReduceMotion ? {} : scaleIn}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
