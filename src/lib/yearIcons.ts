import year1Icon from '@/assets/years/year-1-icon.png';
import year2Icon from '@/assets/years/year-2-icon.png';
import year3Icon from '@/assets/years/year-3-icon.png';
import year4Icon from '@/assets/years/year-4-icon.png';
import year5Icon from '@/assets/years/year-5-icon.png';

export const yearIcons: Record<number, string> = {
  1: year1Icon,
  2: year2Icon,
  3: year3Icon,
  4: year4Icon,
  5: year5Icon,
};

export function getYearIcon(yearNumber: number): string | undefined {
  return yearIcons[yearNumber];
}
