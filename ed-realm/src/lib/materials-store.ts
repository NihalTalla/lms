export interface Material {
  id: string;
  title: string;
  format: 'pdf' | 'doc';
  description: string;
  fileName?: string;
  content?: string;
  assignedTrainerIds: string[];
}

export interface MaterialRequest {
  id: string;
  trainerId: string;
  title: string;
  message: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: string;
}

const MATERIALS_KEY = 'materials_store';
const REQUESTS_KEY = 'material_requests_store';

const canUseStorage = () => typeof window !== 'undefined';

const loadList = <T,>(key: string): T[] => {
  if (!canUseStorage()) {
    return [];
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const saveList = <T,>(key: string, value: T[]) => {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
};

export const loadMaterials = () => loadList<Material>(MATERIALS_KEY);

export const saveMaterials = (materials: Material[]) => saveList(MATERIALS_KEY, materials);

export const loadMaterialRequests = () => loadList<MaterialRequest>(REQUESTS_KEY);

export const saveMaterialRequests = (requests: MaterialRequest[]) => saveList(REQUESTS_KEY, requests);
