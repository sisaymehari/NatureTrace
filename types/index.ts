export type Category = 'wildlife' | 'plant' | 'marine' | 'invasive';

export interface Report {
  id: string;
  user_id: string;
  category: Category;
  species_name: string;
  description: string;
  photo_url: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  ai_confidence: number | null;
  is_invasive: boolean;
  is_verified: boolean;
  severity: string;
  status: 'pending' | 'verified' | 'resolved';
  created_at: string;
  users?: { username: string; avatar_url: string | null };
}

export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  eco_points: number;
  badge_ids: string[];
  reports_count: number;
  created_at: string;
}

export interface AIIdentifyResult {
  species_name: string;
  scientific_name: string;
  category: Category;
  confidence: number;
  is_invasive: boolean;
  conservation_note: string;
  similar_species: string[];
}

export interface OfflineReport {
  category: Category;
  species_name: string;
  description: string;
  photo_base64: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string;
  queued_at: number;
}

export const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; pin: string }> = {
  wildlife: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', pin: '#BA7517' },
  plant: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', pin: '#639922' },
  marine: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', pin: '#378ADD' },
  invasive: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', pin: '#E24B4A' },
};

export const BADGES: Record<string, { label: string; icon: string; description: string }> = {
  first_report: { label: 'First Report', icon: '🌿', description: 'Submitted your first report' },
  invasive_spotter: { label: 'Invasive Spotter', icon: '🚨', description: 'Reported 3 invasive species' },
  verified_10: { label: 'Verified Expert', icon: '✅', description: '10 verified reports' },
  top_reporter: { label: 'Top Reporter', icon: '🏆', description: 'Earned 500+ eco points' },
};
