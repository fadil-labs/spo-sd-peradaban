"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";

type PaymentCountdownProps = {
  expiresAt: string | Date;
  onExpire?: () => void;
  className?: string;
};

export function PaymentCountdown({ expiresAt, onExpire, className }: PaymentCountdownProps) {
  const [now, setNow] = useState(() => new Date());
  const [expired, setExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  const targetDate = useMemo(() => new Date(expiresAt), [expiresAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (now >= targetDate && !expiredRef.current) {
      expiredRef.current = true;
      setExpired(true);
      onExpireRef.current?.();
    }
  }, [now, targetDate]);

  const diff = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "text-sm font-medium transition-colors duration-300",
        expired ? "text-danger" : "text-primary",
        className
      )}
      aria-live="polite"
      aria-label={expired ? "Kedaluwarsa" : `Sisa waktu: ${formatted}`}
    >
      {expired ? "Kedaluwarsa" : formatted}
    </div>
  );
}
