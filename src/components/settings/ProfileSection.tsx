import { useEffect, useMemo, useState } from 'react';
import { UserCircle } from 'lucide-react';
import type { Employee, Regime } from '../../types';
import { SettingsSection } from './SettingsSection';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { useAutoSave } from '../../hooks/useAutoSave';

interface ProfileSectionProps {
  employee: Employee;
  onSave: (patch: Partial<Omit<Employee, 'id'>>) => void;
  onClearPoints: () => void;
}

interface FormState {
  name: string;
  role: string;
  email: string;
  regime: Regime;
}

function toForm(emp: Employee): FormState {
  return {
    name: emp.name,
    role: emp.role,
    email: emp.email,
    regime: emp.regime,
  };
}

export function ProfileSection({ employee, onSave, onClearPoints }: ProfileSectionProps) {
  const [form, setForm] = useState<FormState>(() => toForm(employee));

  useEffect(() => {
    setForm(toForm(employee));
  }, [employee.id, employee.name, employee.role, employee.email, employee.regime]);

  const sanitized = useMemo<FormState>(
    () => ({
      name: form.name.trim().slice(0, 100),
      role: form.role.trim().slice(0, 100),
      email: form.email.trim().slice(0, 120),
      regime: form.regime,
    }),
    [form]
  );

  const status = useAutoSave({
    value: sanitized,
    enabled: sanitized.name.length > 0,
    onSave: (next) => onSave(next),
  });

  return (
    <SettingsSection
      Icon={UserCircle}
      title="Perfil do Colaborador"
      description="Editar dados pessoais do utilizador ativo no painel"
      actions={<AutoSaveIndicator status={status} />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field id="prof-name" label="Nome Completo">
          <input
            id="prof-name"
            type="text"
            maxLength={100}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="ponto-input"
          />
        </Field>
        <Field id="prof-role" label="Cargo / Função">
          <input
            id="prof-role"
            type="text"
            maxLength={100}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="ponto-input"
          />
        </Field>
        <Field id="prof-email" label="E-mail">
          <input
            id="prof-email"
            type="email"
            maxLength={120}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="ponto-input"
          />
        </Field>
        <Field id="prof-regime" label="Regime de Trabalho">
          <select
            id="prof-regime"
            value={form.regime}
            onChange={(e) => setForm({ ...form, regime: e.target.value as Regime })}
            className="ponto-input"
          >
            <option value="Presencial">Presencial</option>
            <option value="Teletrabalho">Teletrabalho</option>
            <option value="Híbrido">Híbrido</option>
          </select>
        </Field>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Para apagar apenas registos de ponto: clique no botão abaixo.
        </p>
        <button
          type="button"
          onClick={onClearPoints}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg transition border border-red-200 dark:border-red-900/40"
        >
          Zerar todos os pontos
        </button>
      </div>
    </SettingsSection>
  );
}

interface FieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

function Field({ id, label, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
