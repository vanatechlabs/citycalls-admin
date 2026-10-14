import type { Master } from '@/lib/hooks/useMasters';

export type DiagnosisField = 'complaintTypeIds' | 'symptomIds' | 'defectIds' | 'solutionTypeIds';

export const DIAGNOSIS_GROUPS: Record<DiagnosisField, { masterType: string; label: string }> = {
  complaintTypeIds: { masterType: 'COMPLAINT_TYPE', label: 'Complaint Types' },
  symptomIds: { masterType: 'SYMPTOM', label: 'Symptoms' },
  defectIds: { masterType: 'DEFECT', label: 'Defects' },
  solutionTypeIds: { masterType: 'SOLUTION', label: 'Solutions' },
};
export interface CategoryFormConfig {
  label: string;
  hint: string;
  diagnosis: DiagnosisField[];
  warranty: boolean;
  inspectionCharge: boolean;
}

const DEFAULT_CONFIG: CategoryFormConfig = {
  label: 'Service',
  hint: 'Pick a category to see the fields that apply to it.',
  diagnosis: ['complaintTypeIds', 'symptomIds', 'defectIds', 'solutionTypeIds'],
  warranty: true,
  inspectionCharge: true,
};

const CONFIG_BY_KEY: Record<string, CategoryFormConfig> = {
  HOME_APPLIANCES: {
    label: 'Home Appliances',
    hint: 'Repair & servicing — set up the diagnosis options technicians and customers choose from.',
    diagnosis: ['complaintTypeIds', 'symptomIds', 'defectIds', 'solutionTypeIds'],
    warranty: true,
    inspectionCharge: true,
  },
  HOME_CLEANING: {
    label: 'Home Cleaning',
    hint: 'Cleaning packages — price, duration and the cleaning options offered.',
    diagnosis: ['complaintTypeIds', 'solutionTypeIds'],
    warranty: false,
    inspectionCharge: false,
  },
  PEST_CONTROL: {
    label: 'Pest Control',
    hint: 'Pest treatments — set the pest problems and treatment options, plus a service warranty.',
    diagnosis: ['complaintTypeIds', 'symptomIds', 'solutionTypeIds'],
    warranty: true,
    inspectionCharge: true,
  },
  BEAUTY_SALOON: {
    label: 'Beauty & Salon',
    hint: 'At-home beauty service — just price and duration. Nothing needs to be linked.',
    diagnosis: [],
    warranty: false,
    inspectionCharge: false,
  },
  HELP_NOW: {
    label: 'Help Now',
    hint: 'Household help — just price and duration. Nothing needs to be linked.',
    diagnosis: [],
    warranty: false,
    inspectionCharge: false,
  },
};

export function getCategoryConfig(category?: Pick<Master, 'key' | 'meta'> | null): CategoryFormConfig {
  if (!category) return DEFAULT_CONFIG;
  const byKey = CONFIG_BY_KEY[category.key];
  if (byKey) return byKey;
  if (category.meta?.vertical === 'BEAUTY') return CONFIG_BY_KEY.BEAUTY_SALOON;
  return { ...DEFAULT_CONFIG, label: 'Service' };
}
