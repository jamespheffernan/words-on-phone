import React from 'react';
import './StepIndicator.css';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  // steps parameter not used in simplified design
}) => {
  const stepNames = ['Game Mode', 'Categories', 'Settings'];
  
  return (
    <div className="step-indicator">
      <div className="step-row">
        {stepNames.map((name, index) => (
          <div
            key={index + 1}
            className={`step-item ${
              index + 1 < currentStep ? 'completed' : 
              index + 1 === currentStep ? 'active' : 'upcoming'
            }`}
          >
            <span className="step-name">{name}</span>
            {index < stepNames.length - 1 && <span className="step-separator">|</span>}
          </div>
        ))}
      </div>
      
      <div className="step-progress-bar">
        <div 
          className="step-progress-fill"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
};