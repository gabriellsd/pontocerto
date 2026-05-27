import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Camera,
  Clock,
  ImageOff,
  Pencil,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type { PointLog, PointType, ShiftMark } from '../../types';
import { formatDateBR, validateDayLogs } from '../../utils/time';
import { TimeInput, TIME_24H_RE } from '../inputs/TimeInput';

export interface EditLogTarget {
  date: string;
  type: PointType;
  existing: PointLog | null;
  employeeId: number;
  otherLogs: PointLog[];
  shiftMark: ShiftMark | null;
}

export interface EditLogSavePayload {
  log: PointLog | null;
  employeeId: number;
  date: string;
  type: PointType;
  plantao: boolean;
  plantaoNote: string;
}

interface EditLogModalProps {
  target: EditLogTarget | null;
  onClose: () => void;
  onSave: (payload: EditLogSavePayload) => void;
  onDelete: (employeeId: number, date: string, type: PointType) => void;
  videoRef: (el: HTMLVideoElement | null) => void;
  canvasRef: (el: HTMLCanvasElement | null) => void;
  webcamActive: boolean;
  onStartWebcam: () => void;
  capturePhoto: () => string | null;
}

const TIME_RE = TIME_24H_RE;

export function EditLogModal({
  target,
  onClose,
  onSave,
  onDelete,
  videoRef,
  canvasRef,
  webcamActive,
  onStartWebcam,
  capturePhoto,
}: EditLogModalProps) {
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [plantao, setPlantao] = useState(false);
  const [plantaoNote, setPlantaoNote] = useState('');

  useEffect(() => {
    if (!target) return;
    setTime(target.existing?.time ?? '');
    setNote(target.existing?.note ?? '');
    setPhoto(target.existing?.photo ?? null);
    setPlantao(Boolean(target.shiftMark));
    setPlantaoNote(target.shiftMark?.note ?? '');
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const validation = useMemo(() => {
    if (!target || !TIME_RE.test(time)) return { ok: true, warnings: [] };
    const candidateLog: PointLog = {
      employeeId: target.employeeId,
      date: target.date,
      type: target.type,
      time,
      note: '',
      photo: null,
    };
    const merged = [...target.otherLogs.filter((l) => l.type !== target.type), candidateLog];
    return validateDayLogs(merged);
  }, [target, time]);

  if (!target) return null;

  const isNew = !target.existing;
  const isValid = TIME_RE.test(time);
  const hadShiftMark = Boolean(target.shiftMark);
  // Permite guardar só plantão, ou desmarcar plantão sem hora (remove a marcação)
  const canSave = isValid || plantao || hadShiftMark;

  const handleCapture = () => {
    const data = capturePhoto();
    if (data) setPhoto(data);
  };

  const handleClearPhoto = () => setPhoto(null);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      log: isValid
        ? {
            employeeId: target.employeeId,
            date: target.date,
            type: target.type,
            time,
            note: note.trim().slice(0, 200),
            photo,
          }
        : null,
      employeeId: target.employeeId,
      date: target.date,
      type: target.type,
      plantao,
      plantaoNote: plantaoNote.trim().slice(0, 200),
    });
    onClose();
  };

  const handleDelete = () => {
    if (target.existing) {
      onDelete(target.employeeId, target.date, target.type);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {isNew ? 'Adicionar marcação' : 'Editar marcação'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {target.type} · {formatDateBR(target.date)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label
              htmlFor="edit-log-time"
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1"
            >
              Hora
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <TimeInput
                id="edit-log-time"
                value={time}
                onChange={setTime}
                invalid={time.length > 0 && !isValid}
                autoFocus
                className="w-full pl-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Formato 24h, ex: <span className="font-mono">06:00</span>,{' '}
              <span className="font-mono">13:30</span>, <span className="font-mono">22:45</span>.
            </p>
          </div>

          <div>
            <label
              htmlFor="edit-log-note"
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1"
            >
              Observação (opcional)
            </label>
            <input
              id="edit-log-note"
              type="text"
              maxLength={200}
              placeholder="Ex: marcação corrigida manualmente"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={plantao}
                onChange={(e) => setPlantao(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
              />
              <span className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-800 dark:text-indigo-200">
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  Plantão neste dia
                </span>
                <span className="block text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-snug">
                  Só conta na folha e na calculadora se estiver marcado.
                </span>
              </span>
            </label>
            {plantao && (
              <input
                type="text"
                maxLength={200}
                placeholder="Obs. plantão (opcional)"
                value={plantaoNote}
                onChange={(e) => setPlantaoNote(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            )}
          </div>

          {!validation.ok && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Marcações fora de ordem:</strong>
                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Foto de auditoria
              </span>
            </div>

            <div className="relative bg-slate-100 dark:bg-slate-900 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${
                  webcamActive && !photo ? '' : 'hidden'
                }`}
                autoPlay
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover hidden"
              />
              {photo && (
                <img
                  src={photo}
                  alt="Foto anexada"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {!webcamActive && !photo && (
                <div className="text-center p-2 z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                    <Camera className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={onStartWebcam}
                    className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-md transition"
                  >
                    Ligar Câmara
                  </button>
                </div>
              )}

              {webcamActive && !photo && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-full shadow-md transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capturar foto
                  </button>
                </div>
              )}

              {photo && (
                <button
                  type="button"
                  onClick={handleClearPhoto}
                  className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 bg-slate-900/70 hover:bg-slate-900/90 text-white text-[10px] font-bold rounded-md transition backdrop-blur-sm"
                >
                  <ImageOff className="w-3 h-3" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 rounded-b-2xl shrink-0">
          {!isNew ? (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md transition"
            >
              {isNew ? 'Adicionar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
