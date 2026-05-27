interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

export function Toggle({ checked, onChange, label, description, id }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-brand-200 dark:hover:border-brand-900 transition"
    >
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {description && (
          <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{description}</span>
        )}
      </span>
      <span className="relative inline-flex items-center shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-9 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer-checked:bg-brand-600 transition" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
