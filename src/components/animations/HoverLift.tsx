"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useMounted } from "@/lib/utils";

type AnimationVariants = Variants;

const hoverLiftVariants: AnimationVariants = {
  initial: { y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.02,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export function HoverLift({
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
      initial={shouldReduceMotion ? "hover" : "initial"}
      whileHover={shouldReduceMotion ? "hover" : "hover"}
      variants={shouldReduceMotion ? {} : hoverLiftVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
