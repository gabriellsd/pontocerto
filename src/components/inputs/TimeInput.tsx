import { forwardRef } from 'react';

/**
 * Formata o input em HH:MM 24h enquanto o utilizador digita.
 * Aceita só dígitos, insere ":" automaticamente após 2 caracteres,
 * e limita HH a 23 e MM a 59.
 */
export function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';
  if (digits.length <= 2) {
    if (digits.length === 1) return digits;
    let hh = parseInt(digits, 10);
    if (hh > 23) hh = 23;
    return String(hh).padStart(2, '0');
  }
  let hh = parseInt(digits.slice(0, 2), 10);
  if (hh > 23) hh = 23;
  const mmRaw = digits.slice(2);
  let mm = parseInt(mmRaw, 10);
  if (mm > 59) mm = 59;
  const hhStr = String(hh).padStart(2, '0');
  const mmStr = mmRaw.length === 2 ? String(mm).padStart(2, '0') : mmRaw;
  return `${hhStr}:${mmStr}`;
}

export const TIME_24H_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  showBadge?: boolean;
}

/**
 * Input de hora em formato 24h (HH:MM) com máscara automática.
 * Não usa `type="time"` para evitar AM/PM em sistemas configurados em en-US.
 */
export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { value, onChange, invalid, showBadge = true, className, ...rest },
  ref
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-2][0-9]:[0-5][0-9]"
        placeholder="HH:MM"
        maxLength={5}
        value={value}
        onChange={(e) => onChange(formatTimeInput(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
        aria-invalid={invalid}
        className={`font-mono tracking-wider ${showBadge ? 'pr-9' : ''} ${className ?? ''}`}
        {...rest}
      />
      {showBadge && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pointer-events-none">
          24h
        </span>
      )}
    </div>
  );
});
