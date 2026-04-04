import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Star, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartments';
import { useAllModuleDepartments, useUpdateModuleDepartments } from '@/hooks/useModuleDepartments';
import type { Module, Year } from '@/types/curriculum';

interface DeptAssignmentsSectionProps {
  modules: Module[];
  years: Year[];
  selectedYearFilter: string;
}

export function DeptAssignmentsSection({ modules, years, selectedYearFilter }: DeptAssignmentsSectionProps) {
  const { data: departments = [] } = useDepartments();
  const { data: allModuleDepts = [] } = useAllModuleDepartments();
  const updateModuleDepts = useUpdateModuleDepartments();

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningModule, setAssigningModule] = useState<Module | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [primaryDeptId, setPrimaryDeptId] = useState<string>('');

  const getModuleDepts = (moduleId: string) => {
    return allModuleDepts.filter(md => md.module_id === moduleId);
  };

  const openAssignDialog = (module: Module) => {
    const currentDepts = getModuleDepts(module.id);
    setAssigningModule(module);
    setSelectedDeptIds(currentDepts.map(md => md.department_id));
    setPrimaryDeptId(currentDepts.find(md => md.is_primary)?.department_id || '');
    setShowAssignDialog(true);
  };

  const handleSaveAssignments = async () => {
    if (!assigningModule) return;

    try {
      await updateModuleDepts.mutateAsync({
        moduleId: assigningModule.id,
        departmentIds: selectedDeptIds,
        primaryDepartmentId: primaryDeptId || null,
      });
      toast.success('Department assignments updated');
      setShowAssignDialog(false);
      setAssigningModule(null);
    } catch (error) {
      console.error('Error updating assignments:', error);
      toast.error('Failed to update assignments');
    }
  };

  const toggleDeptSelection = (deptId: string) => {
    setSelectedDeptIds(prev => {
      const newIds = prev.includes(deptId)
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId];
      
      if (!newIds.includes(primaryDeptId)) {
        setPrimaryDeptId('');
      }
      
      return newIds;
    });
  };

  // Filter modules by year
  const filteredModules = selectedYearFilter === 'all' 
    ? modules 
    : modules.filter(m => m.year_id === selectedYearFilter);

  // Group by year for display
  const yearsToShow = selectedYearFilter === 'all' 
    ? years 
    : years.filter(y => y.id === selectedYearFilter);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Module Department Assignments
          </CardTitle>
          <CardDescription>
            Assign departments to modules. The primary department (★) appears first in listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {yearsToShow.map(year => {
            const yearModules = filteredModules.filter(m => m.year_id === year.id);
            if (yearModules.length === 0) return null;

            return (
              <div key={year.id} className="mb-6 last:mb-0">
                <h3 className="font-medium text-sm text-muted-foreground mb-3">{year.name}</h3>
                <div className="space-y-2">
                  {yearModules.map(module => {
                    const moduleDepts = getModuleDepts(module.id);
                    const primaryDept = moduleDepts.find(md => md.is_primary);
                    const otherDepts = moduleDepts.filter(md => !md.is_primary);

                    return (
                      <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{module.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {primaryDept && (
                              <Badge variant="default" className="gap-1">
                                <Star className="w-3 h-3" />
                                {primaryDept.departments.name}
                              </Badge>
                            )}
                            {otherDepts.map(md => (
                              <Badge key={md.id} variant="secondary">
                                {md.departments.name}
                              </Badge>
                            ))}
                            {moduleDepts.length === 0 && (
                              <span className="text-sm text-muted-foreground">No departments assigned</span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openAssignDialog(module)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredModules.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No modules to display. {selectedYearFilter !== 'all' && 'Try selecting a different year.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Departments</DialogTitle>
            <DialogDescription>
              Select departments for "{assigningModule?.name}". Click the star to set as primary.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 overflow-y-auto min-h-0">
            {departments.map(dept => {
              const isSelected = selectedDeptIds.includes(dept.id);
              const isPrimary = dept.id === primaryDeptId;

              return (
                <div key={dept.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleDeptSelection(dept.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">{dept.category === 'basic' ? 'Basic Sciences' : 'Clinical'}</p>
                  </div>
                  {isSelected && (
                    <Button
                      variant={isPrimary ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPrimaryDeptId(isPrimary ? '' : dept.id)}
                    >
                      <Star className={`w-4 h-4 ${isPrimary ? 'fill-current' : ''}`} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAssignments} disabled={updateModuleDepts.isPending}>
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
