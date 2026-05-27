import { useCallback, useState } from 'react';
import type { GenericModalConfig } from '../components/modals/GenericModal';
import type { ModalKind } from '../types';

export interface ModalApi {
  config: GenericModalConfig | null;
  showAlert: (title: string, message: string, kind?: ModalKind) => Promise<boolean>;
  showConfirm: (title: string, message: string, kind?: ModalKind) => Promise<boolean>;
}

export function useGenericModal(): ModalApi {
  const [config, setConfig] = useState<GenericModalConfig | null>(null);

  const open = useCallback(
    (params: Omit<GenericModalConfig, 'onResolve'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfig({
          ...params,
          onResolve: (result) => {
            setConfig(null);
            resolve(result);
          },
        });
      });
    },
    []
  );

  const showAlert = useCallback(
    (title: string, message: string, kind: ModalKind = 'info') =>
      open({ title, message, kind, confirmText: 'OK', showCancel: false }),
    [open]
  );

  const showConfirm = useCallback(
    (title: string, message: string, kind: ModalKind = 'warning') =>
      open({ title, message, kind, confirmText: 'Confirmar', showCancel: true }),
    [open]
  );

  return { config, showAlert, showConfirm };
}
