import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Loader, Circle, Brain, Shield } from 'lucide-react';
import './LearningTimeline.css';

// Phase Card Component
const PhaseCard = ({ phase, isActive, isComplete, insights, isExpanded, onToggle }) => {
    const statusIcon = isComplete 
        ? <CheckCircle size={20} className="phase-icon complete" />
        : isActive 
            ? <Loader size={20} className="phase-icon active spin" />
            : <Circle size={20} className="phase-icon pending" />;
    
    return (
        <div className={`phase-card ${isComplete ? 'complete' : ''} ${isActive ? 'active' : ''}`}>
            <div className="phase-header" onClick={onToggle}>
                {statusIcon}
                <div className="phase-info">
                    <span className="phase-icon-emoji">{phase.icon}</span>
                    <h4 className="phase-title">{phase.title}</h4>
                </div>
                {(insights.length > 0 || phase.description) && (
                    isExpanded 
                        ? <ChevronDown size={18} className="expand-icon" />
                        : <ChevronRight size={18} className="expand-icon" />
                )}
            </div>
            
            {isExpanded && (
                <div className="phase-content">
                    <p className="phase-description">{phase.description}</p>
                    {phase.why && (
                        <p className="phase-why"><em>Why: {phase.why}</em></p>
                    )}
                    
                    {insights.length > 0 && (
                        <div className="phase-insights">
                            {insights.map((insight, idx) => (
                                <div key={idx} className="insight-item">
                                    <span className="insight-bullet">💡</span>
                                    <span>{insight.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Model Card Component
const ModelCard = ({ model, isExpanded, onToggle }) => {
    const isTraining = model.status === 'training';
    const isComplete = model.status === 'completed';
    
    return (
        <div className={`model-card ${isComplete ? 'complete' : ''} ${isTraining ? 'training' : ''}`}>
            <div className="model-header" onClick={onToggle}>
                {isTraining ? (
                    <Loader size={16} className="model-status spin" />
                ) : isComplete ? (
                    <CheckCircle size={16} className="model-status complete" />
                ) : (
                    <Circle size={16} className="model-status" />
                )}
                <span className="model-name">{model.name}</span>
                {model.score && (
                    <span className="model-score">{(model.score * 100).toFixed(1)}%</span>
                )}
                {(model.learning_style || model.strengths?.length > 0) && (
                    isExpanded 
                        ? <ChevronDown size={14} className="expand-icon" />
                        : <ChevronRight size={14} className="expand-icon" />
                )}
            </div>
            
            {isExpanded && (
                <div className="model-details">
                    {model.learning_style && (
                        <p className="model-learning-style">{model.learning_style}</p>
                    )}
                    {model.analogy && (
                        <p className="model-analogy"><em>{model.analogy}</em></p>
                    )}
                    {model.result_message && (
                        <p className="model-result">{model.result_message}</p>
                    )}
                    
                    {model.strengths?.length > 0 && (
                        <div className="model-traits">
                            <span className="traits-label">✔ Strengths:</span>
                            <ul>
                                {model.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    )}
                    
                    {model.limitations?.length > 0 && (
                        <div className="model-traits limitations">
                            <span className="traits-label">⚠ Limitations:</span>
                            <ul>
                                {model.limitations.map((l, i) => <li key={i}>{l}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Trust Panel Component
const TrustPanel = ({ trust }) => {
    if (!trust || !trust.data_size) return null;
    
    return (
        <div className="trust-panel">
            <div className="trust-header">
                <Shield size={18} />
                <span>Trust & Safety</span>
            </div>
            <div className="trust-content">
                <div className="trust-item">
                    <span className="trust-check">✅</span>
                    <span>Trained on {trust.data_size?.toLocaleString()} real examples</span>
                </div>
                <div className="trust-item">
                    <span className="trust-check">✅</span>
                    <span>Tested on {trust.test_size?.toLocaleString()} held-out examples ({trust.test_ratio})</span>
                </div>
                {trust.confidence_reasons?.map((reason, idx) => (
                    <div key={idx} className="trust-item">
                        <span className="trust-check">✅</span>
                        <span>{reason}</span>
                    </div>
                ))}
                <div className="trust-confidence">
                    Confidence: <span className={`confidence-badge ${trust.confidence}`}>{trust.confidence}</span>
                </div>
            </div>
        </div>
    );
};

// Final Summary Component
const FinalSummary = ({ summary, onEnsemble, isEnsembling }) => {
    if (!summary) return null;
    
    // Check if ensemble already exists in model list
    const hasEnsemble = summary.best_model.includes("Ensemble");
    
    return (
        <div className="final-summary">
            <div className="summary-header">
                <span className="summary-icon">🎉</span>
                <h3>Your {hasEnsemble ? 'Super-Model' : 'Model'} is Ready!</h3>
            </div>
            
            <div className="summary-section">
                <h4>🏆 Best Performer: {summary.best_model}</h4>
                <p className="score-display">Accuracy: {summary.score_display}</p>
            </div>

            {!hasEnsemble && (
                <div className="ensemble-upsell">
                    <div className="upsell-text">
                        <Brain size={16} className="upsell-icon" />
                        <span>Want even higher accuracy? Combine the strengths of your Top 3 models.</span>
                    </div>
                    <button 
                        className="ensemble-btn" 
                        onClick={onEnsemble} 
                        disabled={isEnsembling}
                    >
                        {isEnsembling ? (
                            <><Loader size={14} className="spin" /> Creating Super-Model...</>
                        ) : (
                            "Combine Top 3 (Voting Ensemble)"
                        )}
                    </button>
                </div>
            )}
            
            <div className="summary-section">
                <h4>Why This Model?</h4>
                <p>{summary.why_chosen}</p>
            </div>
            
            <div className="summary-section">
                <h4>What This Means</h4>
                <p>{summary.what_it_means}</p>
            </div>
            
            {summary.model_strengths?.length > 0 && (
                <div className="summary-section strengths">
                    <h4>✔ Strengths</h4>
                    <ul>
                        {summary.model_strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            )}
            
            {summary.model_limitations?.length > 0 && (
                <div className="summary-section limitations">
                    <h4>⚠ Keep in Mind</h4>
                    <ul>
                        {summary.model_limitations.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Main Learning Timeline Component
const LearningTimeline = ({ explanationData, isTraining, onEnsemble, isEnsembling }) => {
    const [expandedPhases, setExpandedPhases] = useState({});
    const [expandedModels, setExpandedModels] = useState({});
    const [showModels, setShowModels] = useState(true);
    
    if (!explanationData || !explanationData.phases?.length) {
        return (
            <div className="learning-timeline empty">
                <div className="timeline-header">
                    <Brain size={20} />
                    <span>AI Learning Progress</span>
                </div>
                <p className="timeline-empty-msg">Waiting to start training...</p>
            </div>
        );
    }
    
    const { phases, insights, models, trust, summary, current_phase } = explanationData;
    
    const togglePhase = (phaseId) => {
        setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
    };
    
    const toggleModel = (modelName) => {
        setExpandedModels(prev => ({ ...prev, [modelName]: !prev[modelName] }));
    };
    
    return (
        <div className="learning-timeline">
            <div className="timeline-header">
                <Brain size={20} />
                <span>AI Learning Progress</span>
                {isTraining && <div className="thinking-dots"><span></span><span></span><span></span></div>}
            </div>
            
            {/* Progress Bar */}
            <div className="progress-bar-container">
                <div className="progress-bar-track">
                    <div 
                        className="progress-bar-fill" 
                        style={{ width: `${explanationData.progress || 0}%` }}
                    >
                        <span className="progress-text">{explanationData.progress || 0}%</span>
                    </div>
                </div>
            </div>
            
            <div className="timeline-phases">
                {phases.map((phase) => (
                    <PhaseCard
                        key={phase.id}
                        phase={phase}
                        isActive={phase.id === current_phase && !phase.completed_at}
                        isComplete={!!phase.completed_at}
                        insights={insights?.filter(i => i.phase === phase.id) || []}
                        isExpanded={expandedPhases[phase.id]}
                        onToggle={() => togglePhase(phase.id)}
                    />
                ))}
            </div>
            
            {models?.length > 0 && (
                <div className="models-section">
                    <div className="models-header" onClick={() => setShowModels(!showModels)}>
                        <span>Models Tested ({models.length})</span>
                        {showModels ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    
                    {showModels && (
                        <div className="models-list">
                            {models.map((model, idx) => (
                                <ModelCard
                                    key={idx}
                                    model={model}
                                    isExpanded={expandedModels[model.name]}
                                    onToggle={() => toggleModel(model.name)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            <TrustPanel trust={trust} />
            
            {summary && (
                <FinalSummary 
                    summary={summary} 
                    onEnsemble={onEnsemble} 
                    isEnsembling={isEnsembling} 
                />
            )}
        </div>
    );
};

export default LearningTimeline;
