import { useEffect, useState } from 'react';

/**
 * Devolve a hora atual atualizada a cada segundo (no início de cada segundo).
 * O primeiro tick é alinhado ao próximo segundo inteiro para que todas as
 * instâncias do hook permaneçam em fase e o relógio mostre minutos coerentes.
 */
export function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let intervalId: number | null = null;
    const delay = 1000 - (Date.now() % 1000);
    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 1000);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  return now;
}
