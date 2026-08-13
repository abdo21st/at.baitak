'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortConfig } from '@/hooks/useSortableData';

interface SortHeaderProps {
  title: string;
  sortKey: string;
  sortConfig: SortConfig<any> | null;
  onRequestSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export default function SortHeader({
  title,
  sortKey,
  sortConfig,
  onRequestSort,
  className = '',
  align = 'right'
}: SortHeaderProps) {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig?.direction : null;

  const alignClasses =
    align === 'center'
      ? 'justify-center text-center'
      : align === 'left'
      ? 'justify-start text-left'
      : 'justify-start text-right';

  return (
    <th
      onClick={() => onRequestSort(sortKey)}
      className={`py-3.5 px-4 font-bold select-none cursor-pointer hover:bg-slate-100/80 transition-colors group ${className}`}
      title={`انقر لترتيب حسب ${title}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClasses}`}>
        <span>{title}</span>
        <span className="inline-flex items-center transition-colors">
          {direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-extrabold" />
          ) : direction === 'desc' ? (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-extrabold" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
      </div>
    </th>
  );
}
