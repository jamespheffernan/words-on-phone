import { useEffect, useState } from 'react';
import { phraseService } from '../services/phraseService';
import { CategoryMetadata } from '../types/category';

interface CategoryMetadataState {
  defaultCategories: CategoryMetadata[];
  customCategories: CategoryMetadata[];
  loading: boolean;
  reload: () => void;
}

export function useCategoryMetadata(): CategoryMetadataState {
  const [defaultCategories, setDefaultCategories] = useState<CategoryMetadata[]>([]);
  const [customCategories, setCustomCategories] = useState<CategoryMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const defaults = phraseService.getDefaultCategoryMetadata();
      setDefaultCategories(defaults);
      const customs = await phraseService.getCustomCategoryMetadata();
      setCustomCategories(customs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { defaultCategories, customCategories, loading, reload: load };
} 