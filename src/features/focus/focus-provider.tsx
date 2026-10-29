import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { createFocusClock } from '@/services/focus-clock';
import { createFocusStore } from '@/store/focus-store';

type FocusRuntime = ReturnType<typeof createRuntime>;
const FocusContext = createContext<FocusRuntime | null>(null);

function createRuntime() {
  const clock = createFocusClock();
  const store = createFocusStore(
    AsyncStorage,
    clock.now,
    () =>
      `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  );
  return { clock, store };
}

export function FocusProvider({ children }: PropsWithChildren) {
  const [runtime] = useState(createRuntime);
  useEffect(() => {
    void runtime.store.load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runtime.clock.rebase();
        void runtime.store.checkpoint();
      } else {
        void runtime.store.checkpoint();
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active' || AppState.currentState === null) {
        void runtime.store.tick();
      }
    }, 1000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [runtime]);
  return <FocusContext value={runtime}>{children}</FocusContext>;
}

export function useFocus() {
  const runtime = useContext(FocusContext);
  if (!runtime) throw new Error('FocusProvider is required');
  const snapshot = useSyncExternalStore(
    runtime.store.subscribe,
    runtime.store.getSnapshot,
    runtime.store.getServerSnapshot,
  );
  return { ...snapshot, actions: runtime.store };
}
