import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthLoading } from './components/auth/AuthLoading';
import { LoginScreen } from './components/auth/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { defaultSettings } from './data/defaults';
import { Header } from './components/Header';
import { Tabs } from './components/Tabs';
import { Footer } from './components/Footer';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { GenericModal } from './components/modals/GenericModal';
import { PhotoModal, type PhotoData } from './components/modals/PhotoModal';
import { EditLogModal, type EditLogTarget } from './components/modals/EditLogModal';
import type { EditLogSavePayload } from './components/modals/EditLogModal';
import { useClock } from './hooks/useClock';
import { useReminders } from './hooks/useReminders';
import { useWebcam } from './hooks/useWebcam';
import { usePontoState } from './hooks/usePontoState';
import { useGenericModal } from './hooks/useGenericModal';
import type { BackupPayload, PointLog, PointType, TabId } from './types';
import {
  computeWorkedMinutes,
  formatHMColon,
  getCurrentTimeStr,
  getDayLabel,
  getTodayStr,
  isNonWorkDay,
  getPayPeriodConfig,
  isDateInPayPeriod,
  payPeriodKeyFromDate,
  validateOrder,
} from './utils/time';
import { playRegisterSound } from './utils/audio';
import { normalizeState } from './utils/storage';
import type { ToastData } from './components/Toast';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <LoginScreen />;
  return <PontoApp userId={user.uid} userEmail={user.email} />;
}

interface PontoAppProps {
  userId: string;
  userEmail: string | null;
}

function PontoApp({ userId, userEmail }: PontoAppProps) {
  const { signOut } = useAuth();
  const now = useClock();
  const webcam = useWebcam();
  const modal = useGenericModal();

  const {
    state,
    currentEmployee,
    syncStatus,
    lastSyncedAt,
    toggleDarkMode,
    addLog,
    upsertLog,
    removeLog,
    addLogs,
    updateEmployee,
    updateSettings,
    setHoliday,
    removeHoliday,
    setShiftMark,
    removeShiftMark,
    replaceState,
    resetData,
    clearPoints,
  } = usePontoState(userId, () =>
    modal.showAlert(
      'Espaço Esgotado',
      'Não foi possível guardar os dados no navegador. Considere exportar um backup e limpar registos antigos.',
      'warning'
    )
  );

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const payPeriodConfig = useMemo(
    () => getPayPeriodConfig(state.settings),
    [state.settings.payPeriodStartDay, state.settings.payPeriodEndDay]
  );

  const [monthKey, setMonthKey] = useState<string>(() =>
    payPeriodKeyFromDate(new Date(), getPayPeriodConfig(defaultSettings))
  );

  useEffect(() => {
    setMonthKey(payPeriodKeyFromDate(new Date(), payPeriodConfig));
  }, [payPeriodConfig]);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [editTarget, setEditTarget] = useState<EditLogTarget | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayStr());

  const todayStr = getTodayStr(now);
  const isViewingToday = selectedDate === todayStr;

  const todayLogs = useMemo(() => {
    if (!currentEmployee) return [];
    return state.logs.filter((l) => l.employeeId === currentEmployee.id && l.date === todayStr);
  }, [state.logs, currentEmployee, todayStr]);

  const dayLogs = useMemo(() => {
    if (!currentEmployee) return [];
    if (selectedDate === todayStr) return todayLogs;
    return state.logs.filter((l) => l.employeeId === currentEmployee.id && l.date === selectedDate);
  }, [state.logs, currentEmployee, selectedDate, todayStr, todayLogs]);

  useReminders({
    enabled: state.settings.enableReminders && Boolean(currentEmployee),
    employee: currentEmployee ?? state.employees[0],
    todayLogs,
    now,
  });

  const showToast = useCallback((message: string, color: ToastData['color'] = 'green') => {
    setToast({ message, color });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleStartWebcam = useCallback(async () => {
    if (!state.settings.enableWebcam) {
      modal.showAlert(
        'Câmara desativada',
        'A câmara está desativada nas configurações. Ative-a em Configurações → Preferências.',
        'info'
      );
      return;
    }
    const ok = await webcam.start();
    if (!ok) {
      modal.showAlert(
        'Câmara indisponível',
        'Não foi possível aceder à câmara. O registo prosseguirá sem foto de auditoria.',
        'warning'
      );
    }
  }, [webcam, modal, state.settings.enableWebcam]);

  const handleRegister = useCallback(
    (type: PointType) => {
      if (!currentEmployee) return;

      if (!isViewingToday) {
        showToast('Só é possível registar pontos no dia de hoje.', 'yellow');
        return;
      }

      const check = validateOrder(type, todayLogs);
      if (!check.ok) {
        showToast(check.reason ?? 'Operação inválida.', 'red');
        return;
      }

      const time = getCurrentTimeStr(new Date());
      const photo = state.settings.enableWebcam ? webcam.capture() : null;

      const newLog: PointLog = {
        employeeId: currentEmployee.id,
        date: todayStr,
        type,
        time,
        note: note.trim().slice(0, 200),
        photo,
      };

      addLog(newLog);
      playRegisterSound(state.settings.soundEnabled);
      showToast(`"${type}" registada às ${time}!`, 'green');
      setNote('');
    },
    [
      currentEmployee,
      todayLogs,
      webcam,
      todayStr,
      note,
      addLog,
      showToast,
      state.settings,
      isViewingToday,
    ]
  );

  const handleEditLog = useCallback(
    (type: PointType) => {
      if (!currentEmployee) return;
      const existing = dayLogs.find((l) => l.type === type) ?? null;
      const shiftMark =
        state.shiftMarks.find(
          (m) => m.employeeId === currentEmployee.id && m.date === selectedDate
        ) ?? null;
      setEditTarget({
        employeeId: currentEmployee.id,
        date: selectedDate,
        type,
        existing,
        otherLogs: dayLogs,
        shiftMark,
      });
    },
    [currentEmployee, dayLogs, selectedDate, state.shiftMarks]
  );

  const handleSaveEditedLog = useCallback(
    ({ log, employeeId, date, plantao, plantaoNote }: EditLogSavePayload) => {
      if (log) upsertLog(log);
      if (plantao) {
        setShiftMark({
          employeeId,
          date,
          note: plantaoNote,
        });
      } else {
        removeShiftMark(employeeId, date);
      }
      if (log) {
        showToast(`Marcação "${log.type}" guardada às ${log.time}.`, 'green');
      } else if (plantao) {
        showToast(`Plantão guardado em ${date}.`, 'green');
      } else {
        showToast('Plantão desmarcado neste dia.', 'yellow');
      }
    },
    [upsertLog, setShiftMark, removeShiftMark, showToast]
  );

  const handleDeleteLog = useCallback(
    (employeeId: number, date: string, type: PointType) => {
      removeLog(employeeId, date, type);
      showToast(`Marcação "${type}" eliminada.`, 'yellow');
    },
    [removeLog, showToast]
  );

  const handleOpenPhoto = useCallback((log: PointLog) => {
    if (!log.photo) return;
    setPhotoData({
      src: log.photo,
      caption: `${log.type} às ${log.time}`,
    });
  }, []);

  const handleExportCSV = useCallback(() => {
    if (!currentEmployee) return;
    const monthLogs = state.logs.filter(
      (l) => l.employeeId === currentEmployee.id && isDateInPayPeriod(l.date, monthKey, payPeriodConfig)
    );
    const uniqueDates = [...new Set(monthLogs.map((l) => l.date))].sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) {
      modal.showAlert('Sem dados', 'Não existem registos para exportar neste período.', 'info');
      return;
    }
    const sanitize = (v: string | number | null | undefined) => String(v ?? '').replace(/"/g, '""');

    const dailyLabel = formatHMColon(currentEmployee.dailyMinutes);

    let csv = '\uFEFF';
    csv +=
      'Colaborador;Jornada Esperada;Data;Dia;Entrada;Almoco Saida;Almoco Retorno;Saida;Total Horas;Banco Horas;Tipo;Observacoes\r\n';

    const formatSignedColon = (mins: number) => {
      if (mins === 0) return '00:00';
      const sign = mins > 0 ? '+' : '-';
      return `${sign}${formatHMColon(Math.abs(mins))}`;
    };

    const holidaySet = new Set(state.holidays.map((h) => h.date));

    uniqueDates.forEach((date) => {
      const dayLogs = monthLogs.filter((l) => l.date === date);
      const ent = dayLogs.find((l) => l.type === 'Entrada')?.time || '--:--';
      const almS = dayLogs.find((l) => l.type === 'Saída Almoço')?.time || '--:--';
      const almR = dayLogs.find((l) => l.type === 'Retorno Almoço')?.time || '--:--';
      const sai = dayLogs.find((l) => l.type === 'Saída')?.time || '--:--';
      const totalMins = computeWorkedMinutes(dayLogs, false);
      const totalLabel = totalMins > 0 ? formatHMColon(totalMins) : '--:--';
      const notes = dayLogs.map((l) => l.note).filter(Boolean).join(' | ');
      const nonWork = isNonWorkDay(date, currentEmployee.weekdaysOnly, holidaySet);
      const holiday = holidaySet.has(date);
      const expected = nonWork ? 0 : currentEmployee.dailyMinutes;
      const balance = totalMins > 0 ? totalMins - expected : 0;
      const balanceLabel = totalMins > 0 ? formatSignedColon(balance) : '--:--';
      const tipo = holiday
        ? 'Feriado'
        : nonWork
        ? 'Plantão'
        : totalMins > currentEmployee.dailyMinutes
        ? 'Hora Extra'
        : 'Normal';
      const dayLabel = getDayLabel(date);

      csv += `"${sanitize(currentEmployee.name)}";"${dailyLabel}";"${date}";"${dayLabel}";"${ent}";"${almS}";"${almR}";"${sai}";"${totalLabel}";"${balanceLabel}";"${tipo}";"${sanitize(notes)}"\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ponto_${monthKey}_${currentEmployee.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentEmployee, state.logs, state.holidays, monthKey, payPeriodConfig, modal]);

  const handleExportPDF = useCallback(async () => {
    if (!currentEmployee) return;
    try {
      const { exportMonthPDF } = await import('./utils/pdfExport');
      const ok = exportMonthPDF({
        employee: currentEmployee,
        logs: state.logs,
        holidays: state.holidays,
        monthKey,
        payPeriodConfig,
      });
      if (!ok) {
        modal.showAlert('Sem dados', 'Não existem registos para exportar neste período.', 'info');
      }
    } catch (err) {
      console.error('Falha a gerar PDF:', err);
      modal.showAlert('Erro', 'Não foi possível gerar o PDF.', 'danger');
    }
  }, [currentEmployee, state.logs, state.holidays, monthKey, payPeriodConfig, modal]);

  const handleExportBackup = useCallback(() => {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pontocerto_backup_${todayStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Backup exportado.', 'green');
  }, [state, todayStr, showToast]);

  const handleImportBackup = useCallback(
    async (file: File) => {
      const ok = await modal.showConfirm(
        'Importar Backup',
        'Os dados atuais serão substituídos pelo backup importado. Continuar?',
        'warning'
      );
      if (!ok) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(String(e.target?.result ?? '')) as Partial<BackupPayload>;
          if (!data?.state || !Array.isArray(data.state.employees) || !Array.isArray(data.state.logs)) {
            throw new Error('Estrutura inválida');
          }
          replaceState(normalizeState(data.state));
          showToast('Backup restaurado com sucesso!', 'green');
        } catch {
          modal.showAlert('Erro na importação', 'Ficheiro inválido ou corrompido.', 'danger');
        }
      };
      reader.readAsText(file);
    },
    [modal, replaceState, showToast]
  );

  const handleGoHome = useCallback(() => {
    setActiveTab('dashboard');
    setSelectedDate(getTodayStr());
  }, []);

  const handleReset = useCallback(async () => {
    const ok = await modal.showConfirm(
      'Repor dados de fábrica',
      'Todos os registos de ponto e configurações serão substituídos pelos valores iniciais. Esta ação é irreversível. Continuar?',
      'danger'
    );
    if (!ok) return;
    resetData();
    showToast('Dados repostos para o estado inicial.', 'green');
  }, [modal, resetData, showToast]);

  const handleClearPoints = useCallback(async () => {
    const ok = await modal.showConfirm(
      'Zerar apenas pontos',
      'Todos os registos de ponto e marcações de plantão serão removidos. Configurações, feriados e perfil serão mantidos. Esta ação é irreversível. Continuar?',
      'danger'
    );
    if (!ok) return;
    clearPoints();
    showToast('Pontos apagados com sucesso.', 'green');
  }, [modal, clearPoints, showToast]);

  if (!currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Sem perfil</h1>
          <p className="text-slate-500">A inicializar o estado da aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        isDarkMode={state.isDarkMode}
        onToggleTheme={toggleDarkMode}
        onGoHome={handleGoHome}
        currentEmployee={currentEmployee}
        onOpenSettings={setActiveTab}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
        <Tabs active={activeTab} onChange={setActiveTab} />

        {activeTab === 'dashboard' && (
          <DashboardTab
            now={now}
            employee={currentEmployee}
            selectedDate={selectedDate}
            todayStr={todayStr}
            onChangeDate={setSelectedDate}
            dayLogs={dayLogs}
            allLogs={state.logs}
            holidays={state.holidays}
            shiftMarks={state.shiftMarks}
            note={note}
            onNoteChange={setNote}
            onRegister={handleRegister}
            onEditLog={handleEditLog}
            toast={toast}
            onOpenPhoto={handleOpenPhoto}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            employee={currentEmployee}
            allLogs={state.logs}
            shiftMarks={state.shiftMarks}
            holidays={state.holidays}
            settings={state.settings}
            payPeriodConfig={payPeriodConfig}
            monthKey={monthKey}
            onMonthChange={setMonthKey}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            employee={currentEmployee}
            logs={state.logs}
            holidays={state.holidays}
            settings={state.settings}
            isDarkMode={state.isDarkMode}
            userEmail={userEmail}
            onSignOut={signOut}
            onUpdateEmployee={updateEmployee}
            onUpdateSettings={updateSettings}
            onSetHoliday={setHoliday}
            onRemoveHoliday={removeHoliday}
            onToggleDark={toggleDarkMode}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onImportPoints={addLogs}
            onReset={handleReset}
            onClearPoints={handleClearPoints}
            onResultToast={showToast}
          />
        )}
      </main>

      <Footer />

      <GenericModal config={modal.config} />
      <PhotoModal photo={photoData} onClose={() => setPhotoData(null)} />
      <EditLogModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEditedLog}
        onDelete={handleDeleteLog}
        videoRef={webcam.videoRef}
        canvasRef={webcam.canvasRef}
        webcamActive={webcam.active}
        onStartWebcam={handleStartWebcam}
        capturePhoto={webcam.capture}
      />
    </div>
  );
}
