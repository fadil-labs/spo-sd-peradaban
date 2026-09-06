"use client";

import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useMounted } from "@/lib/utils";

type AnimationVariants = Variants;

const floatingVariants: AnimationVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: [0, -8, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};

export function FloatingCard({
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
      animate={shouldReduceMotion ? "visible" : "visible"}
      variants={shouldReduceMotion ? {} : floatingVariants}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
