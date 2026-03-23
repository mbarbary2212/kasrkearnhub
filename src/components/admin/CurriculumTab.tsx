import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Building2, Link2, Plus, Edit, Trash2 } from 'lucide-react';
import { CurriculumImageUpload } from './CurriculumImageUpload';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Module, Year } from '@/types/curriculum';
import { DepartmentsCrudSection } from './DepartmentsCrudSection';
import { DeptAssignmentsSection } from './DeptAssignmentsSection';

interface CurriculumTabProps {
  modules: Module[];
  years: Year[];
}

export function CurriculumTab({ modules, years }: CurriculumTabProps) {
  const queryClient = useQueryClient();
  const [curriculumSubTab, setCurriculumSubTab] = useState<'modules' | 'departments' | 'assignments'>('modules');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  
  // Module form state
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({
    year_id: '',
    name: '',
    name_ar: '',
    slug: '',
    description: '',
    is_published: false,
    workload_level: '' as '' | 'light' | 'medium' | 'heavy' | 'heavy_plus',
    page_count: '' as string,
    image_url: null as string | null,
  });

  const resetModuleForm = () => {
    setModuleForm({
      year_id: '',
      name: '',
      name_ar: '',
      slug: '',
      description: '',
      is_published: false,
      workload_level: '',
      page_count: '',
      image_url: null,
    });
  };

  const openEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleForm({
      year_id: module.year_id,
      name: module.name,
      name_ar: module.name_ar || '',
      slug: module.slug,
      description: module.description || '',
      is_published: module.is_published ?? false,
      workload_level: (module.workload_level as '' | 'light' | 'medium' | 'heavy' | 'heavy_plus') || '',
      page_count: module.page_count?.toString() || '',
      image_url: (module as any).image_url || null,
    });
    setShowModuleDialog(true);
  };

  const handleCreateModule = async () => {
    if (!moduleForm.year_id || !moduleForm.name || !moduleForm.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          year_id: moduleForm.year_id,
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
          workload_level: moduleForm.workload_level || null,
          page_count: moduleForm.page_count ? parseInt(moduleForm.page_count, 10) : null,
          image_url: moduleForm.image_url,
          display_order: modules.filter(m => m.year_id === moduleForm.year_id).length,
        } as any)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      setShowModuleDialog(false);
      resetModuleForm();
      toast.success('Module created successfully');
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module');
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const { data, error } = await supabase
        .from('modules')
        .update({
          name: moduleForm.name,
          name_ar: moduleForm.name_ar || null,
          slug: moduleForm.slug,
          description: moduleForm.description || null,
          is_published: moduleForm.is_published,
          workload_level: moduleForm.workload_level || null,
          page_count: moduleForm.page_count ? parseInt(moduleForm.page_count, 10) : null,
          image_url: moduleForm.image_url,
        } as any)
        .eq('id', editingModule.id)
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      setShowModuleDialog(false);
      setEditingModule(null);
      resetModuleForm();
      toast.success('Module updated successfully');
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    setDeletingModuleId(moduleId);
  };

  const confirmDeleteModule = async () => {
    if (!deletingModuleId) return;
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', deletingModuleId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      toast.success('Module deleted successfully');
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    } finally {
      setDeletingModuleId(null);
    }
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
    <div className="space-y-4">
      {/* Sub-tabs */}
      <Tabs value={curriculumSubTab} onValueChange={(v) => setCurriculumSubTab(v as typeof curriculumSubTab)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger 
            value="modules" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger 
            value="departments" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger 
            value="assignments" 
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Link2 className="w-4 h-4" />
            Dept Assignments
          </TabsTrigger>
        </TabsList>

        {/* Modules Sub-tab */}
        <TabsContent value="modules" className="space-y-4">
          {/* Year Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filter by Year:</span>
            <Button
              variant={selectedYearFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYearFilter('all')}
              className="h-8"
            >
              All Years
            </Button>
            {years.map(year => (
              <Button
                key={year.id}
                variant={selectedYearFilter === year.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYearFilter(year.id)}
                className="h-8"
              >
                {year.name}
              </Button>
            ))}
          </div>

          {/* Modules Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Modules
                  </CardTitle>
                  <CardDescription>
                    Create and manage modules for each academic year.
                  </CardDescription>
                </div>
                <Dialog open={showModuleDialog} onOpenChange={(open) => {
                  setShowModuleDialog(open);
                  if (!open) {
                    setEditingModule(null);
                    resetModuleForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Module
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{editingModule ? 'Edit Module' : 'Create New Module'}</DialogTitle>
                      <DialogDescription>
                        {editingModule ? 'Update module details.' : 'Add a new module to the curriculum.'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                      {!editingModule && (
                        <div className="space-y-2">
                          <Label>Year *</Label>
                          <Select
                            value={moduleForm.year_id}
                            onValueChange={(value) => setModuleForm(prev => ({ ...prev, year_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map(year => (
                                <SelectItem key={year.id} value={year.id}>
                                  {year.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={moduleForm.name}
                          onChange={(e) => setModuleForm(prev => ({ 
                            ...prev, 
                            name: e.target.value,
                            slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                          }))}
                          placeholder="e.g., Cardiovascular System"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Arabic Name</Label>
                        <Input
                          value={moduleForm.name_ar}
                          onChange={(e) => setModuleForm(prev => ({ ...prev, name_ar: e.target.value }))}
                          placeholder="الاسم بالعربية"
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug *</Label>
                        <Input
                          value={moduleForm.slug}
                          onChange={(e) => setModuleForm(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="cardiovascular-system"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={moduleForm.description}
                          onChange={(e) => setModuleForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Module description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Page Count</Label>
                        <Input
                          type="number"
                          min="0"
                          value={moduleForm.page_count}
                          onChange={(e) => setModuleForm(prev => ({ ...prev, page_count: e.target.value }))}
                          placeholder="Total pages in module books"
                        />
                        <p className="text-xs text-muted-foreground">Used for auto-calculating workload.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Workload Level Override</Label>
                        <Select
                          value={moduleForm.workload_level || 'auto'}
                          onValueChange={(value) => setModuleForm(prev => ({ ...prev, workload_level: value === 'auto' ? '' : value as 'light' | 'medium' | 'heavy' | 'heavy_plus' }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-calculate from pages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-calculate from pages</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="heavy">Heavy</SelectItem>
                            <SelectItem value="heavy_plus">Heavy+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <CurriculumImageUpload
                        currentImageUrl={moduleForm.image_url}
                        onImageChange={(url) => setModuleForm(prev => ({ ...prev, image_url: url }))}
                        folder="modules"
                        entityId={editingModule?.id}
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={moduleForm.is_published}
                          onCheckedChange={(checked) => setModuleForm(prev => ({ ...prev, is_published: checked }))}
                        />
                        <Label>Published (visible to students)</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
                      <Button onClick={editingModule ? handleUpdateModule : handleCreateModule}>
                        {editingModule ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {yearsToShow.map((year) => {
                const yearModules = filteredModules.filter(m => m.year_id === year.id);
                if (yearModules.length === 0 && selectedYearFilter !== 'all') return null;
                
                return (
                  <div key={year.id} className="mb-6 last:mb-0">
                    <h3 className="font-medium text-sm text-muted-foreground mb-3">{year.name}</h3>
                    <div className="space-y-2">
                      {yearModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">No modules in this year.</p>
                      ) : (
                        yearModules.map((module) => (
                          <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 ${year.color || 'bg-primary'} rounded flex items-center justify-center`}>
                                <BookOpen className="w-4 h-4 text-primary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{module.name}</p>
                                {module.description && (
                                  <p className="text-sm text-muted-foreground">{module.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={module.is_published ? 'default' : 'secondary'}>
                                {module.is_published ? 'Published' : 'Draft'}
                              </Badge>
                              <Button variant="ghost" size="icon" onClick={() => openEditModule(module)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteModule(module.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
              {modules.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No modules created yet. Click "Add Module" to create one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Sub-tab */}
        <TabsContent value="departments">
          <DepartmentsCrudSection years={years} />
        </TabsContent>

        {/* Dept Assignments Sub-tab */}
        <TabsContent value="assignments">
          {/* Year Filter Chips for Assignments */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-sm font-medium text-muted-foreground">Filter by Year:</span>
            <Button
              variant={selectedYearFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYearFilter('all')}
              className="h-8"
            >
              All Years
            </Button>
            {years.map(year => (
              <Button
                key={year.id}
                variant={selectedYearFilter === year.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYearFilter(year.id)}
                className="h-8"
              >
                {year.name}
              </Button>
            ))}
          </div>
          <DeptAssignmentsSection 
            modules={modules} 
            years={years} 
            selectedYearFilter={selectedYearFilter}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deletingModuleId} onOpenChange={(open) => !open && setDeletingModuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this module? This will also delete all content within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
