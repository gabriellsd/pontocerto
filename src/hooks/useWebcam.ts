import { useCallback, useEffect, useRef, useState } from 'react';

export interface WebcamApi {
  videoRef: (el: HTMLVideoElement | null) => void;
  canvasRef: (el: HTMLCanvasElement | null) => void;
  active: boolean;
  start: () => Promise<boolean>;
  stop: () => void;
  capture: () => string | null;
}

export function useWebcam(): WebcamApi {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Callback ref que reanexa a stream sempre que o <video> é (re)montado.
  // Necessário porque o painel de Segurança vive dentro de um modal — o elemento
  // <video> é destruído quando fecha e recriado quando reabre.
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasElRef.current = el;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    if (streamRef.current) {
      // já existe stream ativa — apenas garante que está conectada
      if (videoElRef.current && videoElRef.current.srcObject !== streamRef.current) {
        videoElRef.current.srcObject = streamRef.current;
      }
      setActive(true);
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
      }
      setActive(true);
      return true;
    } catch (e) {
      console.warn('Erro ao iniciar webcam:', e);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoElRef.current) videoElRef.current.srcObject = null;
    setActive(false);
  }, []);

  const capture = useCallback((): string | null => {
    if (!streamRef.current || !videoElRef.current || !canvasElRef.current) return null;
    try {
      const canvas = canvasElRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      canvas.width = 240;
      canvas.height = 180;
      ctx.drawImage(videoElRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch (e) {
      console.warn('Erro ao capturar foto:', e);
      return null;
    }
  }, []);

  return { videoRef, canvasRef, active, start, stop, capture };
}
