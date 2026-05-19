import { useCallback, useEffect, useState } from 'react';

type RemoveBehavior = 'clear' | 'preserve';

interface Options<T> {
  items: T[];
  onChange: (next: T[]) => void;
  removeBehavior?: RemoveBehavior;
}

export function useSelectableListState<T>({
  items,
  onChange,
  removeBehavior = 'preserve',
}: Options<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex((current) => (current !== null && current >= items.length ? null : current));
  }, [items.length]);

  const updateAt = useCallback((index: number, item: T) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  }, [items, onChange]);

  const patchAt = useCallback((index: number, updates: Partial<T>) => {
    const currentItem = items[index];
    if (currentItem === undefined) {
      return;
    }

    updateAt(index, { ...currentItem, ...updates });
  }, [items, updateAt]);

  const addItem = useCallback((item: T) => {
    const next = [...items, item];
    onChange(next);
    setSelectedIndex(next.length - 1);
  }, [items, onChange]);

  const removeAt = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setSelectedIndex((current) => {
      if (current === null) {
        return current;
      }

      if (removeBehavior === 'clear') {
        return null;
      }

      if (current === index) {
        return null;
      }

      return current > index ? current - 1 : current;
    });
  }, [items, onChange, removeBehavior]);

  const moveAt = useCallback((index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
    setSelectedIndex(nextIndex);
  }, [items, onChange]);

  return {
    selectedIndex,
    setSelectedIndex,
    updateAt,
    patchAt,
    addItem,
    removeAt,
    moveAt,
  };
}
