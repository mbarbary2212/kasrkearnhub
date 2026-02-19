import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useConcepts, useCreateConcept } from '@/hooks/useConcepts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConceptSelectProps {
  moduleId: string;
  chapterId?: string;
  sectionId?: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function ConceptSelect({
  moduleId,
  chapterId,
  sectionId,
  value,
  onChange,
  className,
}: ConceptSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: concepts = [] } = useConcepts(moduleId, chapterId);
  const createConcept = useCreateConcept();

  const selected = useMemo(
    () => concepts.find((c) => c.id === value),
    [concepts, value]
  );

  const handleCreate = async () => {
    const trimmed = search.trim();
    if (!trimmed) return;

    // Generate a concept_key from the title
    const conceptKey = `${moduleId.slice(0, 8)}_${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;

    try {
      const newConcept = await createConcept.mutateAsync({
        module_id: moduleId,
        chapter_id: chapterId || null,
        section_id: sectionId || null,
        title: trimmed,
        concept_key: conceptKey,
      });
      onChange(newConcept.id);
      setSearch('');
      setOpen(false);
      toast.success(`Concept "${trimmed}" created`);
    } catch (error: any) {
      if (error?.message?.includes('idx_concepts_concept_key')) {
        toast.error('A concept with a similar key already exists');
      } else {
        toast.error('Failed to create concept');
      }
    }
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium">Concept (optional)</Label>
      <div className="flex gap-2 mt-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
            >
              {selected ? selected.title : 'Select concept…'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[99999]" align="start">
            <Command>
              <CommandInput
                placeholder="Search or create concept…"
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty className="py-2 px-3">
                  {search.trim() ? (
                    <button
                      onClick={handleCreate}
                      disabled={createConcept.isPending}
                      className="flex items-center gap-2 w-full text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Create "{search.trim()}"
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">No concepts found</span>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {concepts.map((concept) => (
                    <CommandItem
                      key={concept.id}
                      value={concept.title}
                      onSelect={() => {
                        onChange(concept.id === value ? null : concept.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === concept.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {concept.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {search.trim() && concepts.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create "{search.trim()}"
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => onChange(null)}
            title="Clear concept"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
