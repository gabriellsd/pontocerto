import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { AppState } from '../types';
import { normalizeState } from '../utils/storage';
import { getFirestoreDb } from './config';

function stateRef(userId: string) {
  return doc(getFirestoreDb(), 'users', userId, 'app', 'state');
}

export function statesEqual(a: AppState, b: AppState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function subscribeRemoteState(
  userId: string,
  onData: (state: AppState | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    stateRef(userId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const raw = snap.data();
      const { updatedAt: _u, ...rest } = raw as Record<string, unknown>;
      onData(normalizeState(rest as Partial<AppState>));
    },
    (err) => onError(err)
  );
}

export async function pushRemoteState(userId: string, state: AppState): Promise<void> {
  await setDoc(stateRef(userId), {
    ...state,
    updatedAt: serverTimestamp(),
  });
}
