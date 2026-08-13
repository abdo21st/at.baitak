'use client';

import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useSortableData<T>(
  items: T[],
  initialConfig: SortConfig<T> | null = null,
  getValue?: (item: T, key: string) => any
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialConfig);

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (!sortConfig || !sortConfig.key || !sortConfig.direction) return items;

    const itemsCopy = [...items];
    return itemsCopy.sort((a, b) => {
      let aVal = getValue ? getValue(a, sortConfig.key as string) : (a as any)[sortConfig.key];
      let bVal = getValue ? getValue(b, sortConfig.key as string) : (b as any)[sortConfig.key];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      // Number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Numeric strings handling (e.g. employee code "101", "102")
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB) && String(aVal).trim() !== '' && String(bVal).trim() !== '') {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal, 'ar', { numeric: true, sensitivity: 'base' })
          : bVal.localeCompare(aVal, 'ar', { numeric: true, sensitivity: 'base' });
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig, getValue]);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
}
