import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Building2, Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Department, DepartmentCategory } from '@/types/database';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/useDepartments';
import { useAllModuleDepartments, useUpdateModuleDepartments } from '@/hooks/useModuleDepartments';
import type { Module, Year } from '@/types/curriculum';
import { useAuthContext } from '@/contexts/AuthContext';

interface DepartmentsTabProps {
  modules: Module[];
  years: Year[];
}

const LUCIDE_ICONS = [
  'BookOpen', 'Heart', 'Brain', 'Stethoscope', 'Pill', 'Syringe', 'Activity',
  'Microscope', 'FlaskConical', 'Dna', 'Bone', 'Eye', 'Ear', 'Baby',
  'Users', 'Building', 'GraduationCap', 'FileText', 'ClipboardList',
];

interface DepartmentFormData {
  name: string;
  name_ar: string;
  slug: string;
  category: DepartmentCategory;
  years: number[];
  icon: string;
  description: string;
  display_order: number;
}

const defaultFormData: DepartmentFormData = {
  name: '',
  name_ar: '',
  slug: '',
  category: 'basic',
  years: [],
  icon: 'BookOpen',
  description: '',
  display_order: 0,
};

export function DepartmentsTab({ modules, years }: DepartmentsTabProps) {
  const { isSuperAdmin } = useAuthContext();
  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const { data: allModuleDepts = [] } = useAllModuleDepartments();
  
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const updateModuleDepts = useUpdateModuleDepartments();

  // Department form state
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentFormData>(defaultFormData);
  const [deptSearch, setDeptSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DepartmentCategory>('all');

  // Module-Department assignment state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigningModule, setAssigningModule] = useState<Module | null>(null);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [primaryDeptId, setPrimaryDeptId] = useState<string>('');

  // Filter departments
  const filteredDepts = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.name_ar && d.name_ar.includes(deptSearch));
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get departments for a module
  const getModuleDepts = (moduleId: string) => {
    return allModuleDepts.filter(md => md.module_id === moduleId);
  };

  const handleCreateDept = async () => {
    if (!deptForm.name || !deptForm.slug) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      await createDepartment.mutateAsync({
        name: deptForm.name,
        name_ar: deptForm.name_ar || undefined,
        slug: deptForm.slug,
        category: deptForm.category,
        years: deptForm.years,
        icon: deptForm.icon,
        description: deptForm.description || undefined,
        display_order: deptForm.display_order,
      });
      toast.success('Department created');
      setShowDeptDialog(false);
      resetDeptForm();
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
    }
  };

  const handleUpdateDept = async () => {
    if (!editingDept) return;

    try {
      await updateDepartment.mutateAsync({
        id: editingDept.id,
        name: deptForm.name,
        name_ar: deptForm.name_ar || undefined,
        slug: deptForm.slug,
        category: deptForm.category,
        years: deptForm.years,
        icon: deptForm.icon,
        description: deptForm.description || undefined,
        display_order: deptForm.display_order,
      });
      toast.success('Department updated');
      setShowDeptDialog(false);
      setEditingDept(null);
      resetDeptForm();
    } catch (error) {
      console.error('Error updating department:', error);
      toast.error('Failed to update department');
    }
  };

  const handleDeleteDept = async (dept: Department) => {
    // Check if department is linked to any modules
    const linkedModules = allModuleDepts.filter(md => md.department_id === dept.id);
    if (linkedModules.length > 0) {
      toast.error(`Cannot delete: Department is linked to ${linkedModules.length} module(s). Remove assignments first.`);
      return;
    }

    if (!confirm(`Delete department "${dept.name}"?`)) return;

    try {
      await deleteDepartment.mutateAsync(dept.id);
      toast.success('Department deleted');
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    }
  };

  const openEditDept = (dept: Department) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      name_ar: dept.name_ar || '',
      slug: dept.slug,
      category: dept.category,
      years: dept.years,
      icon: dept.icon || 'BookOpen',
      description: dept.description || '',
      display_order: dept.display_order || 0,
    });
    setShowDeptDialog(true);
  };

  const resetDeptForm = () => {
    setDeptForm(defaultFormData);
    setEditingDept(null);
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
      
      // If removing the primary, clear primary
      if (!newIds.includes(primaryDeptId)) {
        setPrimaryDeptId('');
      }
      
      return newIds;
    });
  };

  const getYearName = (yearId: string) => years.find(y => y.id === yearId)?.name || 'Unknown';

  return (
    <div className="grid gap-6">
      {/* Departments CRUD Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Departments
              </CardTitle>
              <CardDescription>
                Manage academic departments. {!isSuperAdmin && '(View only - Super Admin required for edits)'}
              </CardDescription>
            </div>
            {isSuperAdmin && (
              <Dialog open={showDeptDialog} onOpenChange={(open) => {
                setShowDeptDialog(open);
                if (!open) resetDeptForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Department
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
                    <DialogDescription>
                      {editingDept ? 'Update department details.' : 'Add a new academic department.'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={deptForm.name}
                        onChange={(e) => setDeptForm(prev => ({
                          ...prev,
                          name: e.target.value,
                          slug: prev.slug || e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                        }))}
                        placeholder="e.g., Anatomy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Arabic Name</Label>
                      <Input
                        value={deptForm.name_ar}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, name_ar: e.target.value }))}
                        placeholder="التشريح"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug *</Label>
                      <Input
                        value={deptForm.slug}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="anatomy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={deptForm.category}
                        onValueChange={(value: DepartmentCategory) => setDeptForm(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic Sciences</SelectItem>
                          <SelectItem value="clinical">Clinical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Years</Label>
                      <div className="flex gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map(year => (
                          <label key={year} className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                              checked={deptForm.years.includes(year)}
                              onCheckedChange={(checked) => {
                                setDeptForm(prev => ({
                                  ...prev,
                                  years: checked
                                    ? [...prev.years, year].sort()
                                    : prev.years.filter(y => y !== year),
                                }));
                              }}
                            />
                            <span className="text-sm">Year {year}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={deptForm.icon}
                        onValueChange={(value) => setDeptForm(prev => ({ ...prev, icon: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LUCIDE_ICONS.map(icon => (
                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={deptForm.description}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={deptForm.display_order}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeptDialog(false)}>Cancel</Button>
                    <Button
                      onClick={editingDept ? handleUpdateDept : handleCreateDept}
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    >
                      {editingDept ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search departments..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="basic">Basic Sciences</SelectItem>
                <SelectItem value="clinical">Clinical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Departments Table */}
          {loadingDepts ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredDepts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {deptSearch || categoryFilter !== 'all' ? 'No departments match your search.' : 'No departments yet.'}
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Years</th>
                    <th className="text-left p-3 font-medium">Modules</th>
                    {isSuperAdmin && <th className="text-right p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDepts.map(dept => {
                    const linkedCount = allModuleDepts.filter(md => md.department_id === dept.id).length;
                    return (
                      <tr key={dept.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            {dept.name_ar && <p className="text-sm text-muted-foreground" dir="rtl">{dept.name_ar}</p>}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={dept.category === 'basic' ? 'secondary' : 'default'}>
                            {dept.category === 'basic' ? 'Basic Sciences' : 'Clinical'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-sm">{dept.years.join(', ')}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-muted-foreground">{linkedCount} linked</span>
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditDept(dept)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDept(dept)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module-Department Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Module Department Assignments
          </CardTitle>
          <CardDescription>
            Assign departments to modules. The primary department (★) appears first in listings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {years.map(year => {
            const yearModules = modules.filter(m => m.year_id === year.id);
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
          <div className="space-y-3 py-4 max-h-[50vh] overflow-y-auto">
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
    </div>
  );
}
