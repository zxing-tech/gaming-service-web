'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Play } from '@phosphor-icons/react';

interface CircularTimerButtonProps {
  duration: number; // seconds
  onComplete: () => void;
  onClick: () => void;
  size?: number;
}

export function CircularTimerButton({ duration, onComplete, onClick, size = 120 }: CircularTimerButtonProps) {
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isCompletedRef = useRef(false);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const totalDurationMs = duration * 1000;
      
      const remainingPercentage = Math.max(0, 100 - (elapsed / totalDurationMs) * 100);
      setProgress(remainingPercentage);

      if (elapsed < totalDurationMs) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onComplete();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [duration, onComplete]);

  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <button 
      onClick={onClick}
      className="relative rounded-full flex items-center justify-center group active:scale-95 transition-transform duration-150"
      style={{ width: size, height: size }}
      aria-label="Continue button"
    >
      {/* Background Circle */}
      <svg 
        width={size} 
        height={size} 
        className="absolute inset-0 rotate-[-90deg]"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4facfe"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-75 ease-linear"
        />
      </svg>

      {/* Button Content */}
      <div 
        className="absolute inset-2 rounded-full bg-gradient-to-br from-[#4facfe] to-[#00f2fe] flex flex-col items-center justify-center shadow-[0_0_20px_rgba(79,172,254,0.4)] border-2 border-white/20"
        style={{ width: size - 16, height: size - 16 }}
      >
        <Play weight="fill" className="text-4xl text-white drop-shadow-md ml-1" aria-hidden="true" />
        <span className="text-white font-bold text-sm mt-1">Continue</span>
      </div>
      
      {/* Pulse Effect */}
      <div className="absolute inset-0 rounded-full bg-[#4facfe] opacity-20 animate-ping pointer-events-none" />
    </button>
  );
}
