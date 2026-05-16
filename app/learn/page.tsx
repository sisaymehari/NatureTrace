'use client';

import { useState } from 'react';
import { Search, AlertTriangle, TreePine, Fish, Heart } from 'lucide-react';

interface SpeciesCard {
  id: string;
  name: string;
  scientificName: string;
  category: 'endangered' | 'invasive' | 'marine' | 'habitat';
  description: string;
  threat?: string;
  icon: string;
}

const SPECIES_DATA: SpeciesCard[] = [
  // UK Endangered
  { id: '1', name: 'Red Squirrel', scientificName: 'Sciurus vulgaris', category: 'endangered', description: 'Native to the UK, severely threatened by the introduction of the grey squirrel. Found mainly in Scotland, Northern Ireland, and some English islands.', threat: 'Habitat loss & grey squirrel competition', icon: '🐿️' },
  { id: '2', name: 'Hazel Dormouse', scientificName: 'Muscardinus avellanarius', category: 'endangered', description: 'A tiny nocturnal mammal that hibernates for up to 7 months. Populations have declined by 70% since the 1970s due to woodland loss.', threat: 'Woodland fragmentation', icon: '🐭' },
  { id: '3', name: 'White-tailed Eagle', scientificName: 'Haliaeetus albicilla', category: 'endangered', description: 'Britain\'s largest bird of prey with a wingspan of up to 2.5m. Extinct in England for 240 years and now the subject of reintroduction programs.', threat: 'Historical persecution', icon: '🦅' },
  { id: '4', name: 'Scottish Wildcat', scientificName: 'Felis silvestris grampia', category: 'endangered', description: 'Critically endangered with fewer than 300 individuals remaining. Interbreeding with domestic cats is the greatest threat.', threat: 'Hybridisation & habitat loss', icon: '🐱' },
  { id: '5', name: 'Natterjack Toad', scientificName: 'Epidalea calamita', category: 'endangered', description: 'UK\'s rarest amphibian, identified by the yellow stripe down its back. Found on sandy heaths and coastal dunes.', threat: 'Habitat degradation', icon: '🐸' },
  { id: '6', name: 'Large Blue Butterfly', scientificName: 'Phengaris arion', category: 'endangered', description: 'Extinct in the UK in 1979 and successfully reintroduced. Depends on a complex life cycle involving red ant colonies.', threat: 'Grassland management changes', icon: '🦋' },
  // Invasive
  { id: '7', name: 'Japanese Knotweed', scientificName: 'Reynoutria japonica', category: 'invasive', description: 'One of the world\'s worst invasive plants. Can grow through concrete and causes significant structural damage. Costs £165m annually to manage in the UK.', threat: 'Outcompetes native plants', icon: '🌿' },
  { id: '8', name: 'Grey Squirrel', scientificName: 'Sciurus carolinensis', category: 'invasive', description: 'Introduced from North America in 1876. Carries squirrelpox virus lethal to red squirrels and strips bark from trees.', threat: 'Displaces red squirrels', icon: '🐿️' },
  { id: '9', name: 'Himalayan Balsam', scientificName: 'Impatiens glandulifera', category: 'invasive', description: 'Tall annual plant that dominates riverbanks and outcompetes native vegetation. Each plant produces up to 800 seeds.', threat: 'Riverbank erosion', icon: '🌸' },
  { id: '10', name: 'American Mink', scientificName: 'Neovison vison', category: 'invasive', description: 'Escaped from fur farms in the 1950s. Predates ground-nesting birds and water voles, causing 95% decline in vole populations.', threat: 'Predates native wildlife', icon: '🦦' },
  { id: '11', name: 'Signal Crayfish', scientificName: 'Pacifastacus leniusculus', category: 'invasive', description: 'Introduced from North America. Outcompetes native white-clawed crayfish and carries crayfish plague. Causes bank erosion.', threat: 'Disease & competition', icon: '🦞' },
  // Marine
  { id: '12', name: 'Bottlenose Dolphin', scientificName: 'Tursiops truncatus', category: 'marine', description: 'The most well-known cetacean in UK waters. The Cardigan Bay population is one of only two resident groups in the UK.', threat: 'Bycatch & pollution', icon: '🐬' },
  { id: '13', name: 'Basking Shark', scientificName: 'Cetorhinus maximus', category: 'marine', description: 'World\'s second largest fish, growing up to 12m. Seasonally common in UK waters and protected since 1998.', threat: 'Bycatch & boat strikes', icon: '🦈' },
  { id: '14', name: 'Common Seagrass', scientificName: 'Zostera marina', category: 'marine', description: 'Vital marine habitat that captures carbon 35x faster than tropical rainforest. 92% lost from UK coasts over the past century.', threat: 'Water quality & anchoring', icon: '🌊' },
  // Habitat
  { id: '15', name: 'Ancient Woodland', scientificName: 'Various species', category: 'habitat', description: 'Woodland that has existed continuously since at least 1600 AD. Home to 700+ species found nowhere else. Only 2.5% of UK land area.', threat: 'Development & fragmentation', icon: '🌳' },
  { id: '16', name: 'Peat Bogs', scientificName: 'Sphagnum spp.', category: 'habitat', description: 'UK peat bogs store more carbon than all of Europe\'s forests combined. Home to rare species including sundews and marsh orchids.', threat: 'Drainage & peat extraction', icon: '🌾' },
];

const CATEGORY_CONFIG = {
  endangered: { label: 'UK Endangered', icon: AlertTriangle, color: 'bg-red-50 border-red-100 text-red-700' },
  invasive: { label: 'Invasive Species', icon: AlertTriangle, color: 'bg-orange-50 border-orange-100 text-orange-700' },
  marine: { label: 'Marine Life', icon: Fish, color: 'bg-blue-50 border-blue-100 text-blue-700' },
  habitat: { label: 'Key Habitats', icon: TreePine, color: 'bg-green-50 border-green-100 text-green-700' },
};

const INFO_CARDS = [
  {
    title: 'Why Biodiversity Matters',
    icon: Heart,
    color: 'bg-emerald-50 border-emerald-200',
    content: 'Biodiversity underpins all ecosystem services — clean air, fresh water, food production, climate regulation, and disease control. The UK has lost 50% of its biodiversity since the 1970s, one of the most nature-depleted countries in the world.',
  },
  {
    title: 'How You Can Help',
    icon: TreePine,
    color: 'bg-green-50 border-green-200',
    content: 'Create wildlife-friendly gardens, reduce pesticide use, report invasive species, volunteer with local conservation groups, choose sustainably sourced food, and use apps like BioGuard to log what you observe.',
  },
];

export default function LearnPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'endangered' | 'invasive' | 'marine' | 'habitat'>('all');

  const filtered = SPECIES_DATA.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.scientificName.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || s.category === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Learn & Discover</h1>
      <p className="text-gray-500 text-sm mb-6">Explore UK wildlife, invasive species, and conservation insights.</p>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {INFO_CARDS.map(({ title, icon: Icon, color, content }) => (
          <div key={title} className={`rounded-xl border p-5 ${color}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-emerald-700" />
              <h3 className="font-semibold text-gray-800">{title}</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search species or habitats…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'endangered', 'invasive', 'marine', 'habitat'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeTab === tab
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {tab === 'all' ? 'All' : CATEGORY_CONFIG[tab].label}
          </button>
        ))}
      </div>

      {/* Species Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No species found for "{search}"</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const config = CATEGORY_CONFIG[s.category];
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight">{s.name}</h3>
                    <p className="text-xs text-gray-400 italic">{s.scientificName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{s.description}</p>
                {s.threat && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{s.threat}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
