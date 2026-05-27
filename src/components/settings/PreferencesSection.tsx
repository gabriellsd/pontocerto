import { useEffect, useRef, useState } from 'react';
import { CalendarRange, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import type { AppSettings } from '../../types';
import { describePayPeriod, getPayPeriodConfig } from '../../utils/time';
import { SettingsSection } from './SettingsSection';
import { Toggle } from './Toggle';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import type { AutoSaveStatus } from '../../hooks/useAutoSave';

interface PreferencesSectionProps {
  settings: AppSettings;
  isDarkMode: boolean;
  onToggleDark: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
}

/**
 * Mostra brevemente "Guardado" sempre que alguma das dependências muda.
 * Aceita um signature string estável para evitar problemas com array deps de tamanho variável.
 */
function useFlashSavedStatus(signature: string): AutoSaveStatus {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const firstRef = useRef(true);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setStatus('saved');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus('idle'), 1800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [signature]);

  return status;
}

export function PreferencesSection({
  settings,
  isDarkMode,
  onToggleDark,
  onUpdateSettings,
}: PreferencesSectionProps) {
  const signature = `${settings.soundEnabled}|${settings.enableWebcam}|${settings.enableReminders}|${settings.payPeriodStartDay}|${settings.payPeriodEndDay}|${isDarkMode}`;
  const payPeriodPreview = describePayPeriod(getPayPeriodConfig(settings));

  const handlePayPeriodDay = (field: 'payPeriodStartDay' | 'payPeriodEndDay', raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    onUpdateSettings({ [field]: Math.min(31, Math.max(1, parsed)) });
  };
  const status = useFlashSavedStatus(signature);

  const handleToggleReminders = async (next: boolean) => {
    if (next && typeof Notification !== 'undefined') {
      if (Notification.permission === 'denied') {
        alert('As notificações foram bloqueadas no navegador. Reabra as permissões para ativar este recurso.');
        return;
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }
    }
    onUpdateSettings({ enableReminders: next });
  };

  return (
    <SettingsSection
      Icon={SlidersHorizontal}
      title="Preferências"
      description="Personalize comportamentos da aplicação"
      actions={<AutoSaveIndicator status={status} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label
          htmlFor="pref-theme"
          className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-brand-200 dark:hover:border-brand-900 transition"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Tema da Interface
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isDarkMode ? 'Modo escuro ativo' : 'Modo claro ativo'}
            </span>
          </span>
          <button
            id="pref-theme"
            type="button"
            onClick={onToggleDark}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>Alternar</span>
          </button>
        </label>

        <Toggle
          id="pref-sound"
          checked={settings.soundEnabled}
          onChange={(soundEnabled) => onUpdateSettings({ soundEnabled })}
          label="Feedback Sonoro"
          description="Emitir bip ao registar um ponto"
        />

        <Toggle
          id="pref-cam"
          checked={settings.enableWebcam}
          onChange={(enableWebcam) => onUpdateSettings({ enableWebcam })}
          label="Câmara de Auditoria"
          description="Permitir captura de foto ao registar"
        />

        <Toggle
          id="pref-rem"
          checked={settings.enableReminders}
          onChange={(next) => { void handleToggleReminders(next); }}
          label="Lembretes"
          description="Avisar na hora do almoço e da saída"
        />

        <div className="md:col-span-2 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-start gap-2">
            <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shrink-0">
              <CalendarRange className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Ciclo da folha de ponto</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Define o intervalo usado no histórico, totais e exportações. Atual: {payPeriodPreview}.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:max-w-xs gap-2">
            <label htmlFor="pref-pay-start" className="block space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dia de início</span>
              <input
                id="pref-pay-start"
                type="number"
                min={1}
                max={31}
                value={settings.payPeriodStartDay}
                onChange={(e) => handlePayPeriodDay('payPeriodStartDay', e.target.value)}
                className="ponto-input"
              />
            </label>
            <label htmlFor="pref-pay-end" className="block space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dia de fecho</span>
              <input
                id="pref-pay-end"
                type="number"
                min={1}
                max={31}
                value={settings.payPeriodEndDay}
                onChange={(e) => handlePayPeriodDay('payPeriodEndDay', e.target.value)}
                className="ponto-input"
              />
            </label>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
            Exemplo com 21 e 20: de 21/04 a 20/05. O fecho costuma ser no mês seguinte ao início.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
