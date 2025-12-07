import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionAPI } from '../api/api';
import { GroupStage } from '../components/Prediction/GroupStage';
import { ThirdPlaceStage } from '../components/Prediction/ThirdPlaceStage';
import { KnockoutStage } from '../components/Prediction/KnockoutStage';
import { PredictionProgress } from '../components/Prediction/PredictionProgress';
import { Button } from '../components/UI/Button';
import { useAuth } from '../context/AuthContext';
import './PredictionPage.css';

export const PredictionPage = () => {
  const [currentStage, setCurrentStage] = useState('groups');
  const [savedPredictions, setSavedPredictions] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [status, setStatus] = useState(null);
  const [groupRankings, setGroupRankings] = useState({});
  const [thirdPlaceAdvancers, setThirdPlaceAdvancers] = useState([]);
  const [loading, setLoading] = useState(true);
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

      // Build group rankings from saved data
      if (response.data.groupRankings) {
        const rankings = {};
        response.data.groupRankings.forEach(ranking => {
          if (!rankings[ranking.group_id]) {
            rankings[ranking.group_id] = [];
          }
          rankings[ranking.group_id][ranking.position - 1] = {
            id: ranking.team_id,
            name: ranking.team_name,
            fifa_code: ranking.fifa_code
          };
        });
        setGroupRankings(rankings);

        // Check if all groups completed
        if (Object.keys(rankings).length === 12) {
          setCurrentStage('third');
        }
      }

      // Set third place advancers
      if (response.data.thirdPlaceSelections && response.data.thirdPlaceSelections.length === 8) {
        setThirdPlaceAdvancers(response.data.thirdPlaceSelections);
        setCurrentStage('knockout');
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

      // If already submitted, redirect to leaderboard
      if (statusRes.data.predictions_submitted) {
        navigate('/leaderboard');
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleGroupStageComplete = () => {
    setCurrentStage('third');
    loadStatus();
  };

  const handleThirdPlaceComplete = () => {
    setCurrentStage('knockout');
    loadStatus();
  };

  const handleBackToGroups = () => {
    setCurrentStage('groups');
  };

  const handleBackToThird = () => {
    setCurrentStage('third');
  };

  const handleSubmitAll = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot make changes after submission.')) {
      return;
    }

    try {
      await predictionAPI.submitComplete();
      alert('✅ Predictions submitted successfully! Good luck!');
      navigate('/leaderboard');
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="prediction-page loading">
        <div className="loading-spinner">
          <div className="spinner-icon"></div>
          <p>Loading your predictions...</p>
        </div>
      </div>
    );
  }

  if (status?.predictions_submitted) {
    return (
      <div className="prediction-page submitted">
        <div className="submitted-message">
          <div className="success-icon">✓</div>
          <h2>Predictions Submitted!</h2>
          <p>Your predictions have been locked in. Good luck!</p>
          <Button onClick={() => navigate('/leaderboard')}>
            View Leaderboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-page">
      <div className="prediction-header">
        <div className="header-content">
          <h1>Make Your Predictions</h1>
          <p className="welcome-text">Welcome, {user?.username}! 👋</p>
        </div>
      </div>

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
            groupRankings={groupRankings}
          />
        )}

        {currentStage === 'knockout' && (
          <KnockoutStage
            onBack={handleBackToThird}
            onSubmit={handleSubmitAll}
            savedPredictions={savedPredictions}
            groupRankings={groupRankings}
            thirdPlaceAdvancers={thirdPlaceAdvancers}
          />
        )}
      </div>
    </div>
  );
};
