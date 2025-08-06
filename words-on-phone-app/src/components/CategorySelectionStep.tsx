import React, { useState, useEffect } from 'react';
import { CategorySelector } from './CategorySelector';
import { SelectionBanner } from './SelectionBanner';
import { CategoryRequestModal } from './CategoryRequestModal';
import { useCategoryMetadata } from '../hooks/useCategoryMetadata';
import { categoryRequestService } from '../services/categoryRequestService';
import { phraseService } from '../services/phraseService';
import { trackCategoryRequested, trackCategoryConfirmed, trackCategoryGenerated } from '../firebase/analytics';
import './CategorySelectionStep.css';

export type CategoryPreset = 'all' | 'random' | 'custom';

interface CategorySelectionStepProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CategorySelectionStep: React.FC<CategorySelectionStepProps> = ({
  selectedCategories,
  onCategoriesChange,
  onNext,
  onBack
}) => {
  const [selectedPreset, setSelectedPreset] = useState<CategoryPreset>('all');
  const [showCategoryRequest, setShowCategoryRequest] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  
  const { defaultCategories, customCategories, loading: categoriesLoading, reload: reloadCategories } = useCategoryMetadata();

  // Initialize with all categories when component mounts
  useEffect(() => {
    if (defaultCategories.length > 0 && selectedCategories.length === 0 && selectedPreset === 'all') {
      const allCategoryNames = defaultCategories.map(cat => cat.name);
      onCategoriesChange(allCategoryNames);
    }
  }, [defaultCategories, selectedCategories.length, selectedPreset, onCategoriesChange]);

  const handlePresetChange = (preset: CategoryPreset) => {
    setSelectedPreset(preset);
    
    switch (preset) {
      case 'all':
        const allCategories = defaultCategories.map(cat => cat.name);
        onCategoriesChange(allCategories);
        setShowManualSelection(false);
        break;
      
      case 'random':
        // Select 5 random categories to ensure enough phrases
        const shuffled = [...defaultCategories].sort(() => 0.5 - Math.random());
        const randomSelection = shuffled.slice(0, 5).map(cat => cat.name);
        onCategoriesChange(randomSelection);
        setShowManualSelection(false);
        break;
      
      case 'custom':
        setShowManualSelection(true);
        break;
    }
  };

  const handleCategoryRequest = async (categoryName: string): Promise<string[]> => {
    try {
      const sampleWords = await categoryRequestService.requestSampleWords(categoryName);
      const requestId = `req_${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const quotaCheck = await categoryRequestService.canMakeRequest();
      
      trackCategoryRequested({
        category_name: categoryName,
        request_id: requestId,
        remaining_quota: quotaCheck.remainingToday
      });
      
      return sampleWords;
    } catch (error) {
      console.error('Category request failed:', error);
      throw error;
    }
  };

  const handleConfirmGeneration = async (info: { name: string; description: string; tags: string[] }, sampleWords: string[]) => {
    const startTime = Date.now();
    const requestId = `req_${info.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    try {
      trackCategoryConfirmed({
        category_name: info.name,
        request_id: requestId,
        sample_words: sampleWords
      });
      
      const customPhrases = await categoryRequestService.generateFullCategory(info.name, sampleWords, info.description, info.tags);
      const generationTime = Date.now() - startTime;
      
      trackCategoryGenerated({
        category_name: info.name,
        request_id: requestId,
        phrases_generated: customPhrases.length,
        generation_time_ms: generationTime
      });
      
      // Refresh phrase service cache and reload category metadata
      await phraseService.refreshCustomPhrases();
      reloadCategories();
      
      console.log(`Generated ${customPhrases.length} phrases for category: ${info.name}`);
      
      return customPhrases;
    } catch (error) {
      console.error('Category generation failed:', error);
      throw error;
    }
  };

  const canProceed = selectedCategories.length > 0;

  return (
    <div className="category-selection-step">
      <div className="step-header">
        <h2 className="step-title">Choose Categories</h2>
        <p className="step-description">Select which phrases you'd like to play with</p>
      </div>

      <div className="preset-options">
        <button
          className={`preset-option ${selectedPreset === 'all' ? 'selected' : ''}`}
          onClick={() => handlePresetChange('all')}
        >
          <div className="preset-icon">🎭</div>
          <div className="preset-content">
            <h3 className="preset-title">All Categories</h3>
            <p className="preset-description">Include all available phrases ({defaultCategories.length} categories)</p>
          </div>
        </button>

        <button
          className={`preset-option ${selectedPreset === 'random' ? 'selected' : ''}`}
          onClick={() => handlePresetChange('random')}
        >
          <div className="preset-icon">🎲</div>
          <div className="preset-content">
            <h3 className="preset-title">Random Mix</h3>
            <p className="preset-description">5 randomly selected categories for variety</p>
          </div>
        </button>

        <button
          className={`preset-option ${selectedPreset === 'custom' ? 'selected' : ''}`}
          onClick={() => handlePresetChange('custom')}
        >
          <div className="preset-icon">🎯</div>
          <div className="preset-content">
            <h3 className="preset-title">Custom Selection</h3>
            <p className="preset-description">Choose exactly which categories you want</p>
          </div>
        </button>
      </div>

      {showManualSelection && (
        <div className="manual-selection">
          <div className="selection-header">
            <h3>Select Categories</h3>
            <p>Choose the categories you'd like to include in your game</p>
          </div>

          <CategorySelector
            defaultCategories={defaultCategories}
            customCategories={customCategories}
            selected={selectedCategories}
            onChange={onCategoriesChange}
            loading={categoriesLoading}
          />

          {selectedCategories.length > 0 && (
            <SelectionBanner
              categories={selectedCategories}
              onClear={() => onCategoriesChange([])}
            />
          )}
        </div>
      )}

      <div className="category-actions">
        <button
          className="request-category-button"
          onClick={() => setShowCategoryRequest(true)}
        >
          <span className="button-icon">✨</span>
          Request Custom Category
        </button>
      </div>

      <div className="step-navigation">
        <button
          className="back-button"
          onClick={onBack}
        >
          Back
        </button>
        
        <button
          className="next-button"
          onClick={onNext}
          disabled={!canProceed}
        >
          Continue ({selectedCategories.length} categories)
        </button>
      </div>

      <CategoryRequestModal
        isOpen={showCategoryRequest}
        onClose={() => setShowCategoryRequest(false)}
        onRequestCategory={handleCategoryRequest}
        onConfirmGeneration={handleConfirmGeneration}
      />
    </div>
  );
};