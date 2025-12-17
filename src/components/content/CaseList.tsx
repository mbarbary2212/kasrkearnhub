import { useState } from 'react';
import { ClinicalCase } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Stethoscope } from 'lucide-react';

interface CaseListProps {
  cases: ClinicalCase[];
}

export default function CaseList({ cases }: CaseListProps) {
  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No clinical cases available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((caseItem) => (
        <Card key={caseItem.id}>
          <CardHeader>
            <CardTitle>{caseItem.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{caseItem.presentation}</p>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="history">
                <AccordionTrigger>History</AccordionTrigger>
                <AccordionContent>{caseItem.history}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="exam">
                <AccordionTrigger>Examination</AccordionTrigger>
                <AccordionContent>{caseItem.examination}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="invest">
                <AccordionTrigger>Investigations</AccordionTrigger>
                <AccordionContent>{caseItem.investigations}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="diff">
                <AccordionTrigger>Differential Diagnosis</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-4">
                    {caseItem.differentialDiagnosis.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="final">
                <AccordionTrigger>Final Diagnosis</AccordionTrigger>
                <AccordionContent className="font-semibold text-primary">{caseItem.finalDiagnosis}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="mgmt">
                <AccordionTrigger>Management</AccordionTrigger>
                <AccordionContent>{caseItem.management}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
