"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type QRCodeCardProps = {
  value: string;
  size?: number;
  className?: string;
};

const GRID_SIZE = 21;
const LOGO_MODULES = 5;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function createRandom(seed: number): () => boolean {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s > 1073741823;
  };
}

function generateQRGrid(value: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  const setFinderPattern = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[startRow + r][startCol + c] = isOuter || isInner;
      }
    }
  };

  setFinderPattern(0, 0);
  setFinderPattern(0, 14);
  setFinderPattern(14, 0);

  for (let i = 8; i <= 12; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  const seed = hashString(value);
  const random = createRandom(seed);

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        grid[r][c] = random();
      }
    }
  }

  return grid;
}

export function QRCodeCard({ value, size = 200, className }: QRCodeCardProps) {
  const logoStart = Math.floor((GRID_SIZE - LOGO_MODULES) / 2);

  const cells = useMemo(() => {
    const grid = generateQRGrid(value);
    const result: { key: string; r: number; c: number; isBlack: boolean; inLogo: boolean }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isBlack = grid[r][c];
        const inLogoArea =
          r >= logoStart &&
          r < logoStart + LOGO_MODULES &&
          c >= logoStart &&
          c < logoStart + LOGO_MODULES;
        result.push({ key: `${r}-${c}`, r, c, isBlack, inLogo: inLogoArea });
      }
    }
    return result;
  }, [value, logoStart]);

  return (
    <div
      className={cn("rounded-xl border border-border bg-white p-4 shadow-sm inline-flex", className)}
      role="img"
      aria-label={`QR code untuk: ${value}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {cells.map(({ key, r, c, isBlack, inLogo }) => {
          if (!isBlack || inLogo) return null;
          return (
            <rect
              key={key}
              x={c}
              y={r}
              width={1}
              height={1}
              fill="#000000"
            />
          );
        })}
        <rect
          x={logoStart}
          y={logoStart}
          width={LOGO_MODULES}
          height={LOGO_MODULES}
          rx={0.4}
          fill="white"
          stroke="#000000"
          strokeWidth={0.5}
        />
        <text
          x={logoStart + LOGO_MODULES / 2}
          y={logoStart + LOGO_MODULES / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={1.6}
          fontWeight="bold"
          fill="#000000"
          fontFamily="sans-serif"
        >
          QR
        </text>
      </svg>
    </div>
  );
}
