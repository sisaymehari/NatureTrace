'use client';

import { Category, CATEGORY_COLORS } from '@/types';

const SPECIES_CATS: Array<{ value: Category; label: string }> = [
  { value: 'wildlife', label: 'Wildlife' },
  { value: 'plant',    label: 'Plants' },
  { value: 'marine',   label: 'Marine' },
  { value: 'invasive', label: 'Invasive' },
];

const THREAT_CATS: Array<{ value: Category; label: string }> = [
  { value: 'habitat_destruction',     label: '🏚️ Habitat' },
  { value: 'illegal_dumping',         label: '🚯 Dumping' },
  { value: 'pollution',               label: '💧 Pollution' },
  { value: 'environmental_emergency', label: '🔥 Emergency' },
];

interface Props {
  active: Category | 'all';
  onChange: (cat: Category | 'all') => void;
}

export default function CategoryFilter({ active, onChange }: Props) {
  const renderBtn = (value: Category | 'all', label: string) => {
    const colors = value !== 'all' ? CATEGORY_COLORS[value] : null;
    const isActive = active === value;
    return (
      <button
        key={value}
        onClick={() => onChange(value)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
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
  };

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {renderBtn('all', 'All')}
      <span className="w-px h-4 bg-gray-200 mx-0.5" />
      {SPECIES_CATS.map(({ value, label }) => renderBtn(value, label))}
      <span className="w-px h-4 bg-gray-200 mx-0.5" />
      {THREAT_CATS.map(({ value, label }) => renderBtn(value, label))}
    </div>
  );
}
