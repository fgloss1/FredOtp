'use client';

import React, { useState } from 'react';
import { GENERIC_FALLBACK_ICON } from '@/lib/otp-logos';

interface ServiceLogoProps {
  /** Primary logo URL from getServiceLogo() — Simple Icons SVG */
  src: string;
  name?: string;
  size?: number;
  className?: string;
}

/**
 * ServiceLogo
 * Renders Simple Icons brand SVG when available.
 * On 404 / load error → consistent generic fallback icon.
 * Never leaves a broken-image box.
 */
export default function ServiceLogo({
  src,
  name,
  size = 30,
  className = '',
}: ServiceLogoProps) {
  const [hasError, setHasError] = useState(false);

  const currentSrc = hasError || !src ? GENERIC_FALLBACK_ICON : src;

  return (
    <img
      src={currentSrc}
      alt={name || 'Service'}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        if (!hasError) setHasError(true);
      }}
      className={`object-contain select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}