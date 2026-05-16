'use client';

import { Category, CATEGORY_COLORS } from '@/types';

const CATEGORIES: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'plant', label: 'Plants' },
  { value: 'marine', label: 'Marine' },
  { value: 'invasive', label: 'Invasive' },
];

interface Props {
  active: Category | 'all';
  onChange: (cat: Category | 'all') => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CATEGORIES.map(({ value, label }) => {
        const colors = value !== 'all' ? CATEGORY_COLORS[value] : null;
        const isActive = active === value;

        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              isActive
                ? value === 'all'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : `${colors?.bg} ${colors?.text} ${colors?.border}`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
