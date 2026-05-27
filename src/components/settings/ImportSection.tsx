import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  Loader2,
  ScanLine,
  Upload,
  X,
} from 'lucide-react';
import type { PointLog } from '../../types';
import { SettingsSection } from './SettingsSection';
import { parsePointsText } from '../../utils/importPoints';
import { formatDateBR, getDayLabel, isWeekend } from '../../utils/time';
import { extractTextFromFile, ACCEPTED_FILE_TYPES } from '../../utils/fileText';

interface ImportSectionProps {
  employeeId: number;
  onImport: (logs: PointLog[], opts: { overwrite: boolean }) => { added: number; replaced: number };
  onResultToast: (message: string, kind: 'green' | 'red' | 'yellow') => void;
}

const EXAMPLE = `Período: 04/05/2026 a 20/05/2026
04/05 Seg 05:59 11:22 12:53 16:27
05/05 Ter 05:53 11:23 12:35 16:04
...`;

interface FileInfo {
  name: string;
  size: number;
  source: 'pdf' | 'text' | 'csv';
  pages?: number;
}

export function ImportSection({ employeeId, onImport, onResultToast }: ImportSectionProps) {
  const [text, setText] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    return parsePointsText(text, { employeeId, noteTag: 'Importado do relatório' });
  }, [text, employeeId]);

  const handleFile = async (file: File) => {
    setLoading(true);
    setFileInfo(null);
    try {
      const { text: extracted, source, pages } = await extractTextFromFile(file);
      setText(extracted);
      setFileInfo({ name: file.name, size: file.size, source, pages });
      if (!extracted.trim()) {
        onResultToast('Não foi possível extrair texto do ficheiro.', 'yellow');
      }
    } catch (e) {
      console.warn(e);
      onResultToast('Falha ao ler o ficheiro. Tente colar o texto manualmente.', 'red');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setText('');
    setFileInfo(null);
  };

  const handleImport = () => {
    if (!result || result.logs.length === 0) return;
    const { added, replaced } = onImport(result.logs, { overwrite });
    if (added === 0 && replaced === 0) {
      onResultToast('Todos os pontos já existiam (ative "Sobrescrever" para atualizar).', 'yellow');
    } else {
      onResultToast(
        `${added} novo(s) ponto(s) adicionado(s)${replaced > 0 ? ` e ${replaced} atualizado(s)` : ''}.`,
        'green'
      );
      handleClear();
    }
  };

  return (
    <SettingsSection
      Icon={ScanLine}
      title="Importar Marcações"
      description="Envie um relatório (PDF, TXT, CSV) ou cole o texto e o sistema deteta automaticamente as datas e horários"
    >
      <div className="space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-3 text-center transition ${
            dragActive
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30'
              : 'border-slate-300 dark:border-slate-700 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            {loading ? (
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                A ler ficheiro...
              </p>
            ) : fileInfo ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                <FileText className="w-4 h-4" />
                <span className="truncate max-w-[18rem]">{fileInfo.name}</span>
                <span className="text-emerald-600/70 dark:text-emerald-500/70 font-normal uppercase">
                  {fileInfo.source}
                  {fileInfo.pages ? ` · ${fileInfo.pages} pág.` : ''}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  aria-label="Remover ficheiro"
                  className="ml-1 p-0.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Arraste um ficheiro aqui ou{' '}
                  <span className="text-brand-600 dark:text-brand-400 underline">
                    selecione do disco
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aceito: PDF, TXT, CSV
                </p>
              </>
            )}
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Ou cole o texto
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <div>
          <textarea
            id="import-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (fileInfo) setFileInfo(null);
            }}
            placeholder={EXAMPLE}
            rows={5}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
          />
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>
              Uma linha por dia: <code className="font-mono">DD/MM Dia HH:MM …</code> (4 marcações). Colunas
              de jornada/saldo no PDF são ignoradas.
            </span>
          </div>
        </div>

        {result && result.days.length > 0 && (
          <>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>
                  {result.days.length} dia(s) · {result.logs.length} marcação(ões)
                </span>
                {result.warnings.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {result.warnings.length} aviso(s)
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {result.days.map((d) => {
                  const weekend = isWeekend(d.date);
                  return (
                    <div
                      key={d.date}
                      className="px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                    >
                      <div className="flex items-center gap-2 sm:w-40 shrink-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {formatDateBR(d.date)}
                        </span>
                        <span className="text-slate-400">{getDayLabel(d.date)}</span>
                        {weekend && (
                          <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded font-bold uppercase text-[9px]">
                            Plantão
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 flex-1">
                        {d.mapping.map((m) => (
                          <span
                            key={m.type}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300"
                            title={m.type}
                          >
                            {abbrType(m.type)} {m.time}
                          </span>
                        ))}
                      </div>
                      {d.warning && (
                        <span
                          className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold sm:max-w-[14rem] sm:text-right"
                          title={d.warning}
                        >
                          {d.warning}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                <strong>Sobrescrever</strong> marcações já existentes (mesmo dia + mesmo tipo)
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={result.logs.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Importar {result.logs.length} marcação(ões)
              </button>
            </div>
          </>
        )}

        {result && result.days.length === 0 && (
          <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3 rounded-xl">
            Não consegui detectar nenhuma data e hora no texto. Verifique o formato ou edite manualmente o texto extraído.
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

function abbrType(t: string): string {
  switch (t) {
    case 'Entrada':
      return 'ENT';
    case 'Saída Almoço':
      return 'S.ALM';
    case 'Retorno Almoço':
      return 'R.ALM';
    case 'Saída':
      return 'SAI';
    default:
      return t;
  }
}
