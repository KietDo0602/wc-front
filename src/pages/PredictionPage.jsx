import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { predictionAPI } from '../api/api';
import { GroupStage } from '../components/Prediction/GroupStage';
import { ThirdPlaceStage } from '../components/Prediction/ThirdPlaceStage';
import { KnockoutCanvas } from '../components/Prediction/KnockoutCanvas';
import { PredictionProgress } from '../components/Prediction/PredictionProgress';
import { Button } from '../components/UI/Button';
import { useAuth } from '../context/AuthContext';
import './PredictionPage.css';

export const PredictionPage = () => {
  const [currentStage, setCurrentStage] = useState('groups');
  const [savedPredictions, setSavedPredictions] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [status, setStatus] = useState(null);
  const [thirdPlaceAdvancers, setThirdPlaceAdvancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(false); // NEW: View-only mode
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadPredictions();
    loadStatus();
  }, []);

  const loadPredictions = async () => {
    try {
      const response = await predictionAPI.getMyPredictions();
      setSavedPredictions(response.data);

      if (response.data.groupRankings) {
        const groupIds = [...new Set(response.data.groupRankings.map(r => r.group_id))];
        if (groupIds.length === 12) {
          const hasThirdPlace = response.data.thirdPlaceSelections && 
                                response.data.thirdPlaceSelections.length === 8;
          
          if (hasThirdPlace) {
            setThirdPlaceAdvancers(response.data.thirdPlaceSelections);
            setCurrentStage('knockout');
          } else {
            setCurrentStage('third');
          }
        }
      }

    } catch (error) {
      console.error('Failed to load predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const [statusRes, completenessRes] = await Promise.all([
        predictionAPI.getStatus(),
        predictionAPI.getCompleteness()
      ]);
      
      setStatus(statusRes.data);
      setCompleteness(completenessRes.data);

      // Set view mode if already submitted
      if (statusRes.data.predictions_submitted) {
        setViewMode(true);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleGroupStageComplete = async () => {
    await loadPredictions();
    await loadStatus();
    setCurrentStage('third');
  };

  const handleThirdPlaceComplete = async () => {
    await loadPredictions();
    await loadStatus();
    setCurrentStage('knockout');
  };

  const handleBackToGroups = () => {
    setCurrentStage('groups');
  };

  const handleBackToThird = () => {
    setCurrentStage('third');
  };

  const handleSubmitAll = async () => {
    if (!window.confirm(t('confirm.submit'))) {
      return;
    }

    try {
      await predictionAPI.submitComplete();
      
      // Reload BOTH predictions AND status after submission
      await Promise.all([
        loadPredictions(),
        loadStatus()
      ]);
      
      alert(t('confirm.submit.success'));
      setViewMode(true); // Enable view mode
    } catch (error) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || t('Failed to submit predictions'));
    }
  };
  if (loading) {
    return (
      <div className="prediction-page loading">
        <div className="loading-spinner">
          <div className="spinner-icon"></div>
          <p>{t('pred.prediction.loading')}</p>
        </div>
      </div>
    );
  }

  // Show view mode if submitted
  if (viewMode) {
    return (
      <div className="prediction-page view-mode">
        <div className="prediction-container">
          <div className="view-mode-tabs">
            <button 
              className={`tab ${currentStage === 'groups' ? 'active' : ''}`}
              onClick={() => setCurrentStage('groups')}
            >
              {t('pred.groupStage')}
            </button>
            <button 
              className={`tab ${currentStage === 'third' ? 'active' : ''}`}
              onClick={() => setCurrentStage('third')}
            >
              {t('pred.thirdPlace')}
            </button>
            <button 
              className={`tab ${currentStage === 'knockout' ? 'active' : ''}`}
              onClick={() => setCurrentStage('knockout')}
            >
              {t('pred.knockout')}
            </button>
          </div>

          {currentStage === 'groups' && (
            <GroupStage
              onComplete={handleGroupStageComplete}
              savedPredictions={savedPredictions}
              viewMode={true}
            />
          )}

          {currentStage === 'third' && (
            <ThirdPlaceStage
              onComplete={handleThirdPlaceComplete}
              onBack={handleBackToGroups}
              savedPredictions={savedPredictions}
              viewMode={true}
            />
          )}

          {currentStage === 'knockout' && (
            <KnockoutCanvas
              viewMode={viewMode}
              onBack={handleBackToThird}
              onSubmit={handleSubmitAll}
              savedPredictions={savedPredictions}
              thirdPlaceAdvancers={thirdPlaceAdvancers}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-page">
      <div className="prediction-container">
        <PredictionProgress 
          currentStage={currentStage} 
          completeness={completeness}
        />

        {currentStage === 'groups' && (
          <GroupStage
            onComplete={handleGroupStageComplete}
            savedPredictions={savedPredictions}
          />
        )}

        {currentStage === 'third' && (
          <ThirdPlaceStage
            onComplete={handleThirdPlaceComplete}
            onBack={handleBackToGroups}
            savedPredictions={savedPredictions}
          />
        )}

        {currentStage === 'knockout' && (
          <KnockoutCanvas
            viewMode={viewMode}
            onBack={handleBackToThird}
            onSubmit={handleSubmitAll}
            savedPredictions={savedPredictions}
            thirdPlaceAdvancers={thirdPlaceAdvancers}
            user={user}
          />
        )}
      </div>
    </div>
  );
};
