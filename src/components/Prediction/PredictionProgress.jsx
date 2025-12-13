import React from 'react';
import { useTranslation } from 'react-i18next';
import './PredictionProgress.css';

export const PredictionProgress = ({ currentStage, completeness }) => {
  const { t } = useTranslation();

  const stages = [
    { id: 'groups', label: t('home.groupStage'), icon: '🏟️' },
    { id: 'third', label: t('pred.thirdPlace'), icon: '🥉' },
    { id: 'knockout', label: t('pred.knockout'), icon: '🏆' }
  ];

  const getStageStatus = (stageId) => {
    if (currentStage === stageId) return 'active';
    
    const stageOrder = ['groups', 'third', 'knockout'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stageId);
    
    if (stageIndex < currentIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="prediction-progress">
      <div className="progress-steps">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.id);
          
          return (
            <React.Fragment key={stage.id}>
              <div className={`progress-step ${status}`}>
                <div className="step-icon">
                  {status === 'completed' ? '✓' : stage.icon}
                </div>
                <div className="step-label">{stage.label}</div>
              </div>
              
              {index < stages.length - 1 && (
                <div className={`progress-connector ${status === 'completed' ? 'completed' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {completeness && (
        <div className="completeness-info">
          <div className="completeness-item">
            <span className="completeness-label">{t("pred.groupStage")}:</span>
            <span className="completeness-value">
              {completeness.groups_completed} / {completeness.groups_required}
            </span>
          </div>
          <div className="completeness-item">
            <span className="completeness-label">{t("pred.thirdPlace")}:</span>
            <span className="completeness-value">
              {completeness.third_place_selections} / {completeness.third_place_required}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
