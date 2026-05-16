import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  value: string;
  size?: number;
  dark?: string;   // foreground color, default '#F0EDE8'
  light?: string;  // background color, default '#1A1714'
}

export default function QRCodeImg({ value, size = 240, dark = '#F0EDE8', light = '#1A1714' }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: { dark, light },
    }).then(setSrc).catch(() => setSrc(null));
  }, [value, size, dark, light]);

  if (!src) return <div style={{ width: size, height: size, background: light, borderRadius: 4 }} />;
  return <img src={src} width={size} height={size} alt="QR code" style={{ borderRadius: 4, display: 'block' }} />;
}
