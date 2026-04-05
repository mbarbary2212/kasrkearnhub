import { Heart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const TEAM = [
  { name: 'Dr. Ahmed Mansour', role: 'Concept & Vision' },
  { name: 'Dr. Basma Bahgat', role: 'Content Management' },
  { name: 'Dr. Marwa Mostafa', role: 'Interactive Cases' },
  { name: 'Dr. Mohab Mohamed', role: 'UI Design' },
  { name: 'Dr. Mohamed Amro', role: 'Design, Code Review & Security' },
  { name: 'Dr. Mohamed Elbarbary', role: 'Concept & Design Lead' },
  { name: 'Dr. Mohamed Khaled Maslouh', role: 'MCQ Development' },
  { name: 'Dr. Mohamed Lotfy', role: 'Flashcards Development' },
  { name: 'Dr. Mohamed Osama', role: 'Video Sorting' },
  { name: 'Dr. Omar Mohamed Mahmoud', role: 'Testing & Concept Design' },
  { name: 'Dr. Omar Mofreh', role: 'Logo Design' },
  { name: 'Dr. Soha Elmorsy', role: 'Concept & Vision' },
];

export function AppCredits() {
  return (
    <div className="mt-12 mb-4 flex items-center justify-center gap-1 text-xs text-muted-foreground border-t border-border/40 pt-4">
      <span className="flex items-center gap-1">
        Built with <Heart className="h-3 w-3 text-red-500 fill-red-500" /> by the KALM Hub Team
      </span>
      <span>·</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className="underline underline-offset-2 hover:text-foreground transition-colors">
            Credits
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="center" side="top">
          <p className="text-sm font-semibold text-foreground mb-3">The KALM Hub Team</p>
          <div className="space-y-2.5">
            {TEAM.map((member) => (
              <div key={member.name}>
                <p className="text-sm font-medium text-foreground leading-tight">{member.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{member.role}</p>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
