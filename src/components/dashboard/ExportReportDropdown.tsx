import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Printer, Download } from 'lucide-react';
import { DashboardData } from '@/hooks/useStudentDashboard';

interface ExportReportDropdownProps {
  dashboard: DashboardData;
  yearName: string;
  moduleName: string;
  studentName?: string;
  fullWidth?: boolean;
}

export function ExportReportDropdown({ 
  dashboard, 
  yearName, 
  moduleName,
  studentName,
  fullWidth = false
}: ExportReportDropdownProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportHTML = () => {
    const strongAreas = dashboard.insights
      .filter(i => i.type === 'strong')
      .map(i => i.label)
      .slice(0, 3);
    
    const needsAttention = dashboard.insights
      .filter(i => i.type === 'attention')
      .map(i => i.label)
      .slice(0, 3);

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Learning Progress Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 14px;
      color: #666;
    }
    .context {
      background: #f8f8f8;
      padding: 16px 20px;
      border-radius: 4px;
      margin-bottom: 30px;
    }
    .context-row {
      display: flex;
      gap: 40px;
      font-size: 14px;
    }
    .context-item {
      display: flex;
      gap: 8px;
    }
    .context-label {
      font-weight: 600;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .metric-card {
      border: 1px solid #e0e0e0;
      padding: 20px;
      text-align: center;
      border-radius: 4px;
    }
    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .section-content {
      font-size: 14px;
    }
    .list {
      list-style: none;
      padding-left: 0;
    }
    .list li {
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .list li:last-child {
      border-bottom: none;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .note {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-top: 8px;
    }
    @media print {
      body {
        padding: 20px;
      }
      .metric-card {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Learning Progress Report</h1>
    <div class="subtitle">Generated on ${reportDate}</div>
  </div>

  <div class="context">
    <div class="context-row">
      ${studentName ? `<div class="context-item"><span class="context-label">Student:</span> ${studentName}</div>` : ''}
      <div class="context-item"><span class="context-label">Year:</span> ${yearName}</div>
      <div class="context-item"><span class="context-label">Module:</span> ${moduleName}</div>
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">${dashboard.coveragePercent}%</div>
      <div class="metric-label">Coverage</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${dashboard.examReadiness}%</div>
      <div class="metric-label">Exam Readiness</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${dashboard.studyStreak}</div>
      <div class="metric-label">Day Streak</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Weekly Summary</div>
    <div class="section-content">
      <ul class="list">
        <li><strong>Estimated Study Time:</strong> ${Math.round(dashboard.weeklyTimeMinutes / 60)} hours</li>
        <li><strong>Chapters Touched:</strong> ${dashboard.weeklyChaptersAdvanced}</li>
        <li><strong>Content Items Completed:</strong> ${dashboard.coverageCompleted} of ${dashboard.coverageTotal}</li>
      </ul>
    </div>
  </div>

  ${strongAreas.length > 0 ? `
  <div class="section">
    <div class="section-title">Strong Areas</div>
    <div class="section-content">
      <ul class="list">
        ${strongAreas.map(area => `<li>${area}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}

  ${needsAttention.length > 0 ? `
  <div class="section">
    <div class="section-title">Areas Needing Attention</div>
    <div class="section-content">
      <ul class="list">
        ${needsAttention.map(area => `<li>${area}</li>`).join('')}
      </ul>
    </div>
    <p class="note">These chapters have been started but have lower completion rates.</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This report reflects preparedness based on coverage and consistency, not grades.</p>
    <p>Accuracy metrics will be included once MCQ attempt tracking is enabled.</p>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = () => {
    const reportHTML = generateReportHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const reportHTML = generateReportHTML();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        // Allow user to save as PDF via print dialog
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isGenerating}
          className={fullWidth ? "w-full justify-center" : ""}
        >
          {!fullWidth && <FileDown className="w-4 h-4 mr-2" />}
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={fullWidth ? "center" : "end"} className="w-48">
        <DropdownMenuItem onClick={handleExportPDF}>
          <Download className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
