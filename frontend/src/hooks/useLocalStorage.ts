import { useEffect, useMemo, useState } from 'react';

function readStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const initialValue = useMemo(() => readStoredValue(key, defaultValue), [defaultValue, key]);
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    setValue(readStoredValue(key, defaultValue));
  }, [defaultValue, key]);

  useEffect(() => {
    const handleStorage = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key && event.key !== key) return;
      } else if ((event as CustomEvent<string>).detail !== key) {
        return;
      }

      setValue(readStoredValue(key, defaultValue));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage', handleStorage as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage', handleStorage as EventListener);
    };
  }, [defaultValue, key]);

  const setStoredValue = (nextValue: T) => {
    setValue(nextValue);
    window.localStorage.setItem(key, JSON.stringify(nextValue));
    window.dispatchEvent(new CustomEvent('local-storage', { detail: key }));
  };

  return [value, setStoredValue];
}
