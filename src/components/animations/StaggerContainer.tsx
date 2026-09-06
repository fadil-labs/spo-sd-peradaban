"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useMounted } from "@/lib/utils";

type AnimationVariants = Variants;

const containerVariants: AnimationVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export function StaggerContainer({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
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
      viewport={{ once: true, amount: 0.1 }}
      variants={shouldReduceMotion ? {} : containerVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
