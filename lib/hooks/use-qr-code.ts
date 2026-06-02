/** Hook to generate a QR-code data URL. */
import QRCode from 'qrcode';
import { useState } from 'react';

export function useQRCode() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const generateQR = async (value: string) => {
    const dataUrl = await QRCode.toDataURL(value);
    setQrDataUrl(dataUrl);
    return dataUrl;
  };

  return { qrDataUrl, generateQR };
}