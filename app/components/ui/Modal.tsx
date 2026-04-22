'use client';

import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
}

export function Modal({
  children,
  isOpen,
  onClose,
  closeOnEsc = true,
  closeOnBackdrop = false
}: ModalProps) {

  useEffect(() => {
    if (!closeOnEsc || !isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeOnEsc, isOpen, onClose]);


  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-fast pointer-events-auto"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="relative w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// Layout Helper Components

import { ArrowLeft } from '@phosphor-icons/react';

export interface ModalHeaderProps {
  title: string;
  onBack?: () => void;
  className?: string;
}

export function ModalHeader({ title, onBack, className = '' }: ModalHeaderProps) {
  return (
    <div 
      className={`w-full flex items-center justify-center py-4 pb-8 ${className}`}
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), calc(25vh - 3rem))',
      }}
    >
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-8 z-[40] w-10 h-10 flex items-center justify-center text-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="text-3xl" />
        </button>
      )}
      
      {/* Title */}
      <div className="font-russo text-white tracking-tight font-black text-[clamp(32px,6vw,48px)]">
        {title}
      </div>
    </div>
  );
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

export function ModalContent({ children, className = '', centered = true }: ModalContentProps) {
  return (
    <div 
      className={`flex-auto flex flex-col w-full px-6 items-center ${centered ? 'justify-center' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div 
      className={`w-full flex items-center justify-center ${className}`}
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), calc(25vh - 4rem))',
      }}
    >
      {children}
    </div>
  );
}
