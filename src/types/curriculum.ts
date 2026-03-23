// Curriculum types for Year -> Module structure

export interface Year {
  id: string;
  number: number;
  name: string;
  name_ar: string | null;
  subtitle: string | null;
  description: string | null;
  color: string | null;
  display_order: number | null;
  is_active: boolean | null;
  image_url: string | null;
  created_at: string | null;
}

export type WorkloadLevel = 'light' | 'medium' | 'heavy' | 'heavy_plus';

export interface Module {
  id: string;
  year_id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  display_order: number | null;
  is_published: boolean | null;
  workload_level: WorkloadLevel | null;
  page_count: number | null;
  image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ModuleDepartment {
  id: string;
  module_id: string;
  department_id: string;
  is_primary: boolean | null;
  created_at: string | null;
}

export interface ModuleAdmin {
  id: string;
  user_id: string;
  module_id: string;
  assigned_by: string | null;
  created_at: string | null;
}

// Extended types with relations
export interface ModuleWithYear extends Module {
  year?: Year;
}

export interface ModuleDepartmentWithDetails {
  id: string;
  department_id: string;
  is_primary: boolean | null;
  departments?: { id: string; name: string } | null;
}

export interface ModuleWithDepartments extends Module {
  module_departments?: ModuleDepartmentWithDetails[];
}
