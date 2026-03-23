import med422Asset from '@/assets/modules/med-422.png.asset.json';
import sur423Asset from '@/assets/modules/sur-423.png.asset.json';
import med522Asset from '@/assets/modules/med-522.png.asset.json';
import sur523Asset from '@/assets/modules/sur-523.png.asset.json';
import fml520Asset from '@/assets/modules/fml-520.png.asset.json';
import mpc526Asset from '@/assets/modules/mpc-526.png.asset.json';

const MODULE_IMAGES: Record<string, string> = {
  'med-422': med422Asset.url,
  'sur-423': sur423Asset.url,
  'med-522': med522Asset.url,
  'sur-523': sur523Asset.url,
  'fml-520': fml520Asset.url,
  'mpc-526': mpc526Asset.url,
};

export function getModuleImage(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return MODULE_IMAGES[slug.toLowerCase()];
}

// Gradient fallbacks for modules without images
const GRADIENTS = [
  'from-blue-900/80 to-cyan-800/80',
  'from-teal-900/80 to-emerald-800/80',
  'from-purple-900/80 to-indigo-800/80',
  'from-rose-900/80 to-red-800/80',
  'from-amber-900/80 to-orange-800/80',
  'from-slate-800/80 to-zinc-700/80',
  'from-sky-900/80 to-blue-800/80',
  'from-fuchsia-900/80 to-pink-800/80',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getModuleGradient(slug: string | null | undefined): string {
  if (!slug) return GRADIENTS[0];
  return GRADIENTS[hashString(slug) % GRADIENTS.length];
}
