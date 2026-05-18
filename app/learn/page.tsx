'use client';

import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Lightbulb } from 'lucide-react';
import type { Category } from '@/types';

type AppCategory = Category; // 'wildlife' | 'plant' | 'marine' | 'invasive'

interface StatusBadge {
  label: string;
  color: string;
}

interface Species {
  id: string;
  emoji: string;
  name: string;
  scientific: string;
  category: AppCategory;
  status?: StatusBadge;
  description: string;
  tip: string;
}

const SPECIES: Species[] = [
  // ── Wildlife ──────────────────────────────────────────────────────────────
  {
    id: 'red-fox',
    emoji: '🦊',
    name: 'Red Fox',
    scientific: 'Vulpes vulpes',
    category: 'wildlife',
    description: "Britain's most widespread wild carnivore, the red fox thrives in both rural and urban environments thanks to its highly adaptable diet and behaviour. Largely nocturnal, foxes are most often seen at dusk and dawn hunting rabbits, voles, and invertebrates.",
    tip: "Log your sighting with time and location on BioGuard. Avoid leaving food out in gardens, as this can encourage unhealthy dependency on humans.",
  },
  {
    id: 'hedgehog',
    emoji: '🦔',
    name: 'Hedgehog',
    scientific: 'Erinaceus europaeus',
    category: 'wildlife',
    status: { label: 'Declining', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    description: "Hedgehog populations have declined by a third since 2000, making every sighting significant. They hibernate from November to March and rely on connected wildlife corridors to forage safely at night.",
    tip: "Cut a 13 cm hole in your garden fence to let hedgehogs roam freely. Report each sighting on BioGuard — distribution data directly supports recovery projects.",
  },
  {
    id: 'red-squirrel',
    emoji: '🐿️',
    name: 'Red Squirrel',
    scientific: 'Sciurus vulgaris',
    category: 'wildlife',
    status: { label: 'Endangered', color: 'bg-red-100 text-red-800 border-red-300' },
    description: "Britain's only native squirrel is now restricted to Scotland, Northumberland, and a few islands, squeezed out by the introduced grey squirrel and squirrelpox virus. Smaller than grey squirrels, reds have distinctive ear tufts in winter.",
    tip: "Report any sighting immediately on BioGuard — real-time data helps conservation teams protect habitat corridors and manage grey squirrel populations.",
  },
  {
    id: 'barn-owl',
    emoji: '🦉',
    name: 'Barn Owl',
    scientific: 'Tyto alba',
    category: 'wildlife',
    status: { label: 'Amber Listed', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    description: "The barn owl's heart-shaped face and ghostly white plumage make it one of Britain's most recognisable birds. They hunt in near-silence using exceptional hearing to pinpoint voles and mice in complete darkness.",
    tip: "If you find a grounded barn owl, contact the RSPCA immediately. Log your sighting on BioGuard — winter records are especially important when food is scarce.",
  },
  {
    id: 'otter',
    emoji: '🦦',
    name: 'Otter',
    scientific: 'Lutra lutra',
    category: 'wildlife',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "Once near extinction due to pesticides, otters have made a remarkable recovery and now inhabit rivers across most of Britain. Largely nocturnal and territorial, they mark their range with distinctive fish-scented spraints.",
    tip: "Watch from a distance without disturbing riverbank vegetation where otters rest. Otters and their holts are legally protected — report any disturbance to the police wildlife crime unit.",
  },

  // ── Plants ─────────────────────────────────────────────────────────────────
  {
    id: 'bluebell',
    emoji: '💜',
    name: 'Bluebell',
    scientific: 'Hyacinthoides non-scripta',
    category: 'plant',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "England holds around half the world's population of native bluebells, which form spectacular violet-blue carpets in ancient woodland each April and May. Unlike the invasive Spanish bluebell, native plants have drooping one-sided spikes and a sweet honey scent.",
    tip: "Stay on paths in bluebell woods to avoid crushing bulbs. It is illegal to dig up wild bluebells — report any harvesting or picking on BioGuard.",
  },
  {
    id: 'bee-orchid',
    emoji: '🌸',
    name: 'Bee Orchid',
    scientific: 'Ophrys apifera',
    category: 'plant',
    description: "One of Britain's most extraordinary wildflowers, the bee orchid's flower mimics a female bumblebee with extraordinary accuracy to lure male pollinators. It colonises chalk and limestone grassland, road verges, and old quarries where competition is low.",
    tip: "Note the exact grid reference when you find one and log it on BioGuard. Avoid disturbing surrounding soil — orchid seeds need undisturbed, low-nutrient ground to germinate.",
  },
  {
    id: 'sundew',
    emoji: '🌱',
    name: 'Sundew',
    scientific: 'Drosera rotundifolia',
    category: 'plant',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "Britain's most common carnivorous plant, the round-leaved sundew traps insects on glistening sticky tentacles to supplement the poor nutrients of bogs and heathlands. Its small white flowers appear from June to August.",
    tip: "Never pick or uproot this legally protected plant. Record sightings on BioGuard — sundew populations are sensitive early-warning indicators of bog habitat health.",
  },
  {
    id: 'wild-garlic',
    emoji: '🌿',
    name: 'Wild Garlic',
    scientific: 'Allium ursinum',
    category: 'plant',
    description: "Also called ramsons, wild garlic creates stunning white-flowered carpets in damp ancient woodland from March to May, filling the air with a strong garlic scent. The broad leaves are edible but can be confused with toxic lily of the valley — always smell before eating.",
    tip: "Only forage with absolute confidence in identification and never take more than a small amount from any patch. Log large colonies on BioGuard to help map ancient woodland health.",
  },
  {
    id: 'foxglove',
    emoji: '🪻',
    name: 'Foxglove',
    scientific: 'Digitalis purpurea',
    category: 'plant',
    description: "A tall native biennial with spires of tubular purple-pink flowers, foxgloves thrive in woodland clearings, heathland, and hedgerows across Britain. All parts of the plant are poisonous, yet it is a vital nectar source for bumblebees and the specialist foxglove bee.",
    tip: "Keep children and pets away from all plant parts, which are toxic if ingested. Record sightings on BioGuard to help map pollinator-friendly habitats across the UK.",
  },

  // ── Marine ─────────────────────────────────────────────────────────────────
  {
    id: 'grey-seal',
    emoji: '🦭',
    name: 'Grey Seal',
    scientific: 'Halichoerus grypus',
    category: 'marine',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "Britain is home to around 40% of the world's grey seals, with major colonies on the Norfolk, Pembrokeshire, and Farne Island coasts. Males can weigh up to 300 kg and are easily identified by their distinctive flat 'Roman' nose profile.",
    tip: "Keep at least 100 metres from seals and never approach pups on beaches — mothers will abandon young disturbed by humans. Report injured seals to the BDMLR (01825 765546).",
  },
  {
    id: 'bottlenose-dolphin',
    emoji: '🐬',
    name: 'Bottlenose Dolphin',
    scientific: 'Tursiops truncatus',
    category: 'marine',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "Cardigan Bay and the Moray Firth are home to two of the few resident bottlenose dolphin populations in UK waters. These highly intelligent animals live in complex social groups and may live for over 50 years.",
    tip: "Keep vessels at least 100 m away and never approach or feed wild dolphins. Log sightings on BioGuard and the Sea Watch Foundation to contribute to long-term population monitoring.",
  },
  {
    id: 'basking-shark',
    emoji: '🦈',
    name: 'Basking Shark',
    scientific: 'Cetorhinus maximus',
    category: 'marine',
    status: { label: 'Vulnerable', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    description: "The world's second largest fish visits British waters each summer to filter-feed on zooplankton near the surface. Despite reaching 12 m in length, basking sharks are completely harmless and have been fully protected in UK waters since 1998.",
    tip: "Keep a 100 m distance by boat and never enter the water near one. Report every sighting on BioGuard and the Shark Trust — location data is vital for protecting feeding hotspots.",
  },
  {
    id: 'puffin',
    emoji: '🐦',
    name: 'Puffin',
    scientific: 'Fratercula arctica',
    category: 'marine',
    status: { label: 'Vulnerable', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    description: "Britain holds around 10% of the world's Atlantic puffins, with major colonies on the Farne Islands, Skomer, and Handa Island. Remarkable divers, puffins can carry up to 10 fish crosswise in their distinctive striped bills.",
    tip: "Visit colonies from designated viewing areas only and keep noise to a minimum. Report sightings on BioGuard, especially if you observe distressed or oiled birds.",
  },
  {
    id: 'seahorse',
    emoji: '🐠',
    name: 'Short-snouted Seahorse',
    scientific: 'Hippocampus hippocampus',
    category: 'marine',
    status: { label: 'Protected', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    description: "One of just two seahorse species in UK waters, this delicate fish inhabits seagrass beds and shallow estuaries around southern England and Wales. Uniquely, males carry and give birth to the young from a specialised brood pouch.",
    tip: "Never handle seahorses or disturb seagrass beds. Report every sighting to the Seahorse Trust and BioGuard — each record is critical for understanding their sparse UK distribution.",
  },

  // ── Invasive ────────────────────────────────────────────────────────────────
  {
    id: 'japanese-knotweed',
    emoji: '🎋',
    name: 'Japanese Knotweed',
    scientific: 'Reynoutria japonica',
    category: 'invasive',
    description: "One of the world's worst invasive plants, Japanese knotweed can penetrate concrete foundations and tarmac, and costs £165 million annually to manage in the UK. Its hollow bamboo-like stems grow up to 3 m tall and can regrow from root fragments as small as 1 cm.",
    tip: "Never cut, strim, or move any material — spreading it is a criminal offence if it reaches controlled waters. Report immediately on BioGuard so a licensed specialist can advise on eradication.",
  },
  {
    id: 'grey-squirrel',
    emoji: '🐿️',
    name: 'Grey Squirrel',
    scientific: 'Sciurus carolinensis',
    category: 'invasive',
    description: "Introduced from North America in 1876, grey squirrels carry squirrelpox virus — lethal to red squirrels — and strip bark from trees causing significant timber losses across Britain. They have displaced red squirrels from most of England and Wales.",
    tip: "Do not feed grey squirrels, especially near red squirrel strongholds in the north. Report sightings on BioGuard and support local red squirrel conservation organisations.",
  },
  {
    id: 'signal-crayfish',
    emoji: '🦞',
    name: 'Signal Crayfish',
    scientific: 'Pacifastacus leniusculus',
    category: 'invasive',
    description: "Introduced from North America, signal crayfish carry crayfish plague and have driven the native white-clawed crayfish to the edge of extinction in England. They burrow extensively into riverbanks, causing serious erosion and destabilising watercourses.",
    tip: "Always 'Check, Clean, Dry' all gear between waterways. Report sightings on BioGuard and never move any crayfish, water, or damp equipment between rivers or lakes.",
  },
  {
    id: 'himalayan-balsam',
    emoji: '🌺',
    name: 'Himalayan Balsam',
    scientific: 'Impatiens glandulifera',
    category: 'invasive',
    description: "Introduced as a garden ornamental in 1839, this tall annual now dominates riverbanks across Britain, producing up to 800 seeds per plant that explode up to 7 m from the parent. It dies back each winter, leaving bare banks highly vulnerable to erosion.",
    tip: "Pull plants before they set seed — roots come out easily in damp soil. Report large stands on BioGuard and join organised balsam-bashing volunteer events in summer.",
  },
  {
    id: 'rhododendron',
    emoji: '🌳',
    name: 'Pontian Rhododendron',
    scientific: 'Rhododendron ponticum',
    category: 'invasive',
    description: "Originally planted as game cover, this evergreen shrub now forms impenetrable, light-excluding thickets across upland woodland and heathland, eliminating all native ground flora beneath it. It is also a reservoir for Phytophthora ramorum, the pathogen behind sudden oak death.",
    tip: "Report large stands on BioGuard, especially near ancient woodland or upland heathland. Do not plant R. ponticum in gardens — many ornamental cultivars are non-invasive alternatives.",
  },
];

const CATEGORY_STYLE: Record<AppCategory, { bg: string; text: string; border: string; filterBg: string }> = {
  wildlife: { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300',  filterBg: 'bg-amber-600' },
  plant:    { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  filterBg: 'bg-green-600' },
  marine:   { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   filterBg: 'bg-blue-600' },
  invasive: { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    filterBg: 'bg-red-600' },
};

const EMOJI_BG: Record<AppCategory, string> = {
  wildlife: 'bg-amber-50',
  plant:    'bg-green-50',
  marine:   'bg-blue-50',
  invasive: 'bg-red-50',
};

const FILTERS: { label: string; value: AppCategory | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Wildlife', value: 'wildlife' },
  { label: 'Plants',   value: 'plant' },
  { label: 'Marine',   value: 'marine' },
  { label: 'Invasive', value: 'invasive' },
];

export default function LearnPage() {
  const [search, setSearch]   = useState('');
  const [active, setActive]   = useState<AppCategory | 'all'>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SPECIES.filter((s) => {
      const matchesCat  = active === 'all' || s.category === active;
      const matchesText = !q || s.name.toLowerCase().includes(q) || s.scientific.toLowerCase().includes(q) || s.category.includes(q);
      return matchesCat && matchesText;
    });
  }, [search, active]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Learn &amp; Discover</h1>
      <p className="text-gray-500 text-sm mb-6">20 UK species to know — wildlife, plants, marine life, and invasive threats.</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or category…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-7 flex-wrap">
        {FILTERS.map(({ label, value }) => {
          const isActive = active === value;
          const style = value !== 'all' ? CATEGORY_STYLE[value as AppCategory] : null;
          return (
            <button
              key={value}
              onClick={() => setActive(value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                isActive
                  ? style
                    ? `${style.filterBg} text-white border-transparent`
                    : 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-400 self-center">
          {filtered.length} species
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No species match "{search}"</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const cs = CATEGORY_STYLE[s.category];
            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Emoji header */}
                <div className={`${EMOJI_BG[s.category]} flex items-center justify-center py-6`}>
                  <span className="text-6xl leading-none select-none">{s.emoji}</span>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {/* Name + badges */}
                  <div className="mb-3">
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{s.name}</h3>
                    <p className="text-xs text-gray-400 italic mt-0.5">{s.scientific}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${cs.bg} ${cs.text} ${cs.border}`}>
                        {s.category === 'plant' ? 'Plant' : s.category.charAt(0).toUpperCase() + s.category.slice(1)}
                      </span>
                      {s.status && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${s.status.color}`}>
                          {s.category === 'invasive' || s.status.label === 'Endangered' || s.status.label === 'Declining' || s.status.label === 'Vulnerable'
                            ? <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            : null}
                          {s.status.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed flex-1">{s.description}</p>

                  {/* Tip box */}
                  <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-700">If spotted</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">{s.tip}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
