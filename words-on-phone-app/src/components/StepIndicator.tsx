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
  steps
}) => {
  return (
    <div className="step-indicator">
      <div className="step-progress-bar">
        <div 
          className="step-progress-fill"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
      
      <div className="step-list">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step-item ${
              step.id < currentStep ? 'completed' : 
              step.id === currentStep ? 'active' : 'upcoming'
            }`}
          >
            <div className="step-circle">
              {step.id < currentStep ? (
                <span className="step-checkmark">✓</span>
              ) : (
                <span className="step-number">{step.id}</span>
              )}
            </div>
            
            <div className="step-content">
              <h4 className="step-title">{step.title}</h4>
              <p className="step-description">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};