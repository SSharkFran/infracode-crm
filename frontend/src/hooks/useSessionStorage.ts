import { useEffect, useMemo, useState } from 'react';

function readSessionValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  try {
    const storedValue = window.sessionStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function useSessionStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const initialValue = useMemo(() => readSessionValue(key, defaultValue), [defaultValue, key]);
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    setValue(readSessionValue(key, defaultValue));
  }, [defaultValue, key]);

  const setStoredValue = (nextValue: T) => {
    setValue(nextValue);
    window.sessionStorage.setItem(key, JSON.stringify(nextValue));
  };

  return [value, setStoredValue];
}
