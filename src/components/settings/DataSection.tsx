import { Database, RotateCcw, Save, Upload } from 'lucide-react';
import { SettingsSection } from './SettingsSection';

interface DataSectionProps {
  logsCount: number;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onReset: () => void;
}

export function DataSection({
  logsCount,
  onExportBackup,
  onImportBackup,
  onReset,
}: DataSectionProps) {
  return (
    <SettingsSection
      Icon={Database}
      title="Dados & Backup"
      description="Gerir os dados armazenados localmente neste navegador"
    >
      <div className="space-y-3">
        <Stat label="Total de registos de ponto" value={String(logsCount)} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Exportar Backup</span>
          </button>
          <label
            htmlFor="data-import-input"
            className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-bold rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Backup</span>
          </label>
          <input
            id="data-import-input"
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportBackup(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg transition border border-red-200 dark:border-red-900/40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repor Defeito</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg leading-snug">
          <strong className="text-slate-700 dark:text-slate-200 font-semibold">Persistência:</strong> os dados são
          gravados em <code className="font-mono">data/pontocerto.json</code> pelo servidor local, com
          backup automático <code className="font-mono">.bak</code>. Mesmo assim, recomendamos exportar
          um backup periodicamente.
        </div>
      </div>
    </SettingsSection>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800">
      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm font-bold font-mono text-slate-800 dark:text-white">{value}</span>
    </div>
  );
}
