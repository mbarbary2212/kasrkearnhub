import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Trash2, Printer, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { StudyResource, ClinicalCaseWorkedContent } from '@/hooks/useStudyResources';
import { requestResourceDelete } from '@/components/content/ResourcesDeleteManager';

interface WorkedCaseCardProps {
  resource: StudyResource;
  canManage?: boolean;
  onEdit?: (resource: StudyResource) => void;
}

export function WorkedCaseCard({ resource, canManage = false, onEdit }: WorkedCaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = resource.content as ClinicalCaseWorkedContent;

  const handleDelete = () => {
    requestResourceDelete('clinical_case_worked', resource.id, resource.title);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${resource.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 1.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
            h2 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #333; }
            p, li { line-height: 1.6; margin: 0.5rem 0; }
            ol, ul { padding-left: 1.5rem; }
            .investigation { margin-bottom: 0.5rem; }
            .justification { color: #666; font-style: italic; margin-left: 1rem; }
            @media print { body { padding: 1rem; } }
          </style>
        </head>
        <body>
          <h1>${resource.title}</h1>
          
          <h2>1. History</h2>
          <p>${content.history || 'Not provided'}</p>
          
          <h2>2. Clinical Examination</h2>
          <p>${content.clinical_examination || 'Not provided'}</p>
          
          <h2>3. Provisional Diagnosis</h2>
          <p>${content.provisional_diagnosis || 'Not provided'}</p>
          
          <h2>4. Differential Diagnosis</h2>
          <ol>
            ${content.differential_diagnosis?.map(dx => `<li>${dx}</li>`).join('') || '<li>Not provided</li>'}
          </ol>
          
          <h2>5. Investigations</h2>
          ${content.investigations?.map(inv => `
            <div class="investigation">
              <strong>${inv.test}</strong>
              ${inv.justification ? `<div class="justification">Justification: ${inv.justification}</div>` : ''}
            </div>
          `).join('') || '<p>Not provided</p>'}
          
          <h2>6. Final Diagnosis</h2>
          <p>${content.final_diagnosis || 'Not provided'}</p>
          
          <h2>7. Management Plan</h2>
          <p>${content.management_plan || 'Not provided'}</p>
          
          <h2>8. Key Learning Points</h2>
          <ul>
            ${content.key_learning_points?.map(point => `<li>${point}</li>`).join('') || '<li>Not provided</li>'}
          </ul>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-medium">{resource.title}</CardTitle>
              </div>
            </CollapsibleTrigger>
            
            {canManage && (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onEdit?.(resource)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* 1. History */}
            <Section title="1. History">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.history || 'Not provided'}</p>
            </Section>

            {/* 2. Clinical Examination */}
            <Section title="2. Clinical Examination">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.clinical_examination || 'Not provided'}</p>
            </Section>

            {/* 3. Provisional Diagnosis */}
            <Section title="3. Provisional Diagnosis">
              <Badge variant="outline" className="text-sm">{content.provisional_diagnosis || 'Not provided'}</Badge>
            </Section>

            {/* 4. Differential Diagnosis */}
            <Section title="4. Differential Diagnosis">
              <ol className="list-decimal list-inside space-y-1">
                {content.differential_diagnosis?.map((dx, i) => (
                  <li key={i} className="text-sm text-muted-foreground">{dx}</li>
                )) || <li className="text-sm text-muted-foreground">Not provided</li>}
              </ol>
            </Section>

            {/* 5. Investigations */}
            <Section title="5. Investigations">
              <div className="space-y-2">
                {content.investigations?.map((inv, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-sm font-medium">{inv.test}</p>
                    {inv.justification && (
                      <p className="text-xs text-muted-foreground italic">→ {inv.justification}</p>
                    )}
                  </div>
                )) || <p className="text-sm text-muted-foreground">Not provided</p>}
              </div>
            </Section>

            {/* 6. Final Diagnosis */}
            <Section title="6. Final Diagnosis">
              <Badge className="text-sm">{content.final_diagnosis || 'Not provided'}</Badge>
            </Section>

            {/* 7. Management Plan */}
            <Section title="7. Management Plan">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.management_plan || 'Not provided'}</p>
            </Section>

            {/* 8. Key Learning Points */}
            <Section title="8. Key Learning Points / Exam Pearls">
              <ul className="space-y-1">
                {content.key_learning_points?.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary">•</span>
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                )) || <li className="text-sm text-muted-foreground">Not provided</li>}
              </ul>
            </Section>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}
