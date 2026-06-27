"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const osEase = [0.16, 1, 0.3, 1] as const;

export const motionTimings = {
  fast: 0.16,
  base: 0.24,
  slow: 0.36,
  stagger: 0.055,
} as const;

export const motionVariants = {
  page: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: motionTimings.base,
        ease: osEase,
        staggerChildren: motionTimings.stagger,
      },
    },
  },
  section: {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: motionTimings.slow, ease: osEase },
    },
  },
  item: {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: motionTimings.base, ease: osEase },
    },
  },
} satisfies Record<string, Variants>;

type MotionDivProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
};

function MotionFrame({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export function MotionPage({ className, children, ...props }: MotionDivProps) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionFrame>
      <m.div
        animate={reduceMotion ? undefined : "show"}
        className={className}
        initial={reduceMotion ? false : "hidden"}
        variants={motionVariants.page}
        {...props}
      >
        {children}
      </m.div>
    </MotionFrame>
  );
}

export function MotionSection({
  className,
  children,
  ...props
}: MotionDivProps) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionFrame>
      <m.div
        className={className}
        variants={reduceMotion ? undefined : motionVariants.section}
        {...props}
      >
        {children}
      </m.div>
    </MotionFrame>
  );
}

export function MotionItem({ className, children, ...props }: MotionDivProps) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionFrame>
      <m.div
        className={className}
        variants={reduceMotion ? undefined : motionVariants.item}
        {...props}
      >
        {children}
      </m.div>
    </MotionFrame>
  );
}

export function MotionSurface({
  className,
  children,
  ...props
}: MotionDivProps) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionFrame>
      <m.div
        className={cn("will-change-transform", className)}
        variants={reduceMotion ? undefined : motionVariants.item}
        whileHover={
          reduceMotion
            ? undefined
            : {
                y: -2,
                transition: { duration: motionTimings.fast, ease: osEase },
              }
        }
        whileTap={reduceMotion ? undefined : { scale: 0.995 }}
        {...props}
      >
        {children}
      </m.div>
    </MotionFrame>
  );
}
