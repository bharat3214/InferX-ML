import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
    Cpu,
    Play,
    Target,
    CheckCircle,
    Clock,
    AlertCircle,
    Sparkles,
    Wand2,
    Brain,
    ChevronDown,
    Database,
    Zap,
    BarChart3,
    Terminal,
    ImageIcon
} from 'lucide-react'
import { datasetsApi, trainingApi } from '../services/api'
import LearningTimeline from '../components/LearningTimeline'
import './Training.css'

export default function Training() {
    const [searchParams] = useSearchParams()
    const preselectedDataset = searchParams.get('dataset')

    const [selectedDataset, setSelectedDataset] = useState(preselectedDataset || '')
    const [targetColumn, setTargetColumn] = useState('')
    const [experimentName, setExperimentName] = useState('')
    const [goalDescription, setGoalDescription] = useState('')
    const [isTraining, setIsTraining] = useState(false)
    const [currentJob, setCurrentJob] = useState(null)
    const logsEndRef = useRef(null)

    // AI Prompt Analysis State
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiAnalysis, setAiAnalysis] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisError, setAnalysisError] = useState(null)

    const { data: datasetsData } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list()
    })

    const datasets = datasetsData?.data?.datasets || []
    const selectedDatasetInfo = datasets.find(d => d.id.toString() === selectedDataset)

    const { data: profileData } = useQuery({
        queryKey: ['dataset-profile', selectedDataset],
        queryFn: () => datasetsApi.getProfile(selectedDataset),
        enabled: !!selectedDataset
    })

    const columns = profileData?.data?.column_info
        ? Object.keys(profileData.data.column_info)
        : []

    // Detect if this is an image dataset
    const isImageDataset = selectedDatasetInfo?.data_type === 'image'
    const imageClasses = isImageDataset && selectedDatasetInfo?.column_info
        ? selectedDatasetInfo.column_info
        : null

    // Polling for status
    const { data: statusData } = useQuery({
        queryKey: ['training-status', currentJob?.id],
        queryFn: () => trainingApi.getStatus(currentJob.id),
        enabled: !!currentJob,
        refetchInterval: isTraining ? 2000 : false
    })

    // Polling for logs
    const { data: logsData } = useQuery({
        queryKey: ['training-logs', currentJob?.id],
        queryFn: () => trainingApi.getLogs(currentJob.id),
        enabled: !!currentJob,
        refetchInterval: isTraining ? 2000 : false
    })

    // Polling for thinking logs
    const { data: thinkingData } = useQuery({
        queryKey: ['training-thinking', currentJob?.id],
        queryFn: () => trainingApi.getThinkingLogs(currentJob.id),
        enabled: !!currentJob,
        refetchInterval: isTraining ? 1500 : false
    })

    const thinkingMessages = thinkingData?.data?.thinking_logs || []

    // Get explanation data from status response
    const explanationData = statusData?.data?.experiment?.explanation_data || null

    const startTrainingMutation = useMutation({
        mutationFn: (data) => trainingApi.start(data),
        onSuccess: (response) => {
            setCurrentJob(response.data.experiment)
            setIsTraining(true)
        }
    })

    // Check for completion
    if (isTraining && statusData?.data?.experiment?.status === 'completed') {
        setIsTraining(false)
    }

    // AI Prompt Analysis Handler
    const handleAnalyzeWithAI = async () => {
        if (!selectedDataset || !aiPrompt.trim()) return

        setIsAnalyzing(true)
        setAnalysisError(null)
        setAiAnalysis(null)

        try {
            const response = await trainingApi.analyzePrompt(parseInt(selectedDataset), aiPrompt)
            if (response.data.success) {
                setAiAnalysis(response.data.analysis)
                if (response.data.analysis.suggested_target) {
                    setTargetColumn(response.data.analysis.suggested_target)
                }
                setGoalDescription(aiPrompt)
            } else {
                setAnalysisError(response.data.error || 'Analysis failed')
            }
        } catch (error) {
            setAnalysisError(error.response?.data?.error || 'Failed to analyze with AI')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleStartTraining = () => {
        if (!selectedDataset || !experimentName.trim()) return

        startTrainingMutation.mutate({
            dataset_id: parseInt(selectedDataset),
            name: experimentName.trim(),
            target_column: isImageDataset ? null : (targetColumn || null),
            goal_description: isImageDataset ? 'Image classification' : goalDescription
        })
    }

    // Combine all logs
    const allLogs = logsData?.data?.logs || []
    const combinedLogs = allLogs.map(job =>
        `--- ${job.model_name} ---\n${job.logs || ''}`
    ).join('\n')

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [combinedLogs])

    const experimentStatus = statusData?.data?.experiment?.status

    return (
        <div className="training-page">
            {/* ── Compact Header ── */}
            <div className="training-header">
                <div className="header-left">
                    <Cpu size={20} className="header-icon" />
                    <h1>Model Training</h1>
                </div>
                <button
                    className="btn btn-primary start-btn"
                    onClick={handleStartTraining}
                    disabled={!experimentName.trim() || !selectedDataset || (isTraining && experimentStatus !== 'completed')}
                >
                    {isTraining ? (
                        <>
                            <div className="spinner" style={{ width: 16, height: 16 }}></div>
                            Training...
                        </>
                    ) : (
                        <>
                            <Play size={16} />
                            {experimentStatus === 'completed' ? 'New Training' : 'Start Training'}
                        </>
                    )}
                </button>
            </div>

            {/* ── Two-Column Layout ── */}
            <div className="training-layout">

                {/* ═══ LEFT PANEL: User Inputs ═══ */}
                <div className="panel panel-left">
                    <div className="panel-header">
                        <Zap size={16} />
                        <span>Configuration</span>
                    </div>

                    {/* 1. Experiment Name (Required) */}
                    <div className="form-group">
                        <label className="label">
                            Experiment Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            className={`input ${!experimentName.trim() ? 'input-required' : ''}`}
                            value={experimentName}
                            onChange={(e) => setExperimentName(e.target.value)}
                            placeholder="Enter experiment name..."
                            disabled={isTraining}
                            required
                        />
                    </div>

                    {/* 2. Dataset */}
                    <div className="form-group">
                        <label className="label">
                            <Database size={14} />
                            Dataset <span className="required">*</span>
                        </label>
                        <select
                            className="input"
                            value={selectedDataset}
                            onChange={(e) => setSelectedDataset(e.target.value)}
                            disabled={isTraining}
                        >
                            <option value="">Select a dataset...</option>
                            {datasets.map((dataset) => (
                                <option key={dataset.id} value={dataset.id}>
                                    {dataset.name} ({dataset.data_type === 'image'
                                        ? `${dataset.num_rows?.toLocaleString()} images · ${dataset.num_columns} classes`
                                        : `${dataset.num_rows?.toLocaleString()} rows`})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* ── Image Dataset: Class Gallery ── */}
                    {isImageDataset && imageClasses && (
                        <div className="image-classes-panel">
                            <label className="label">
                                <ImageIcon size={14} />
                                Image Classes Detected
                            </label>
                            <div className="image-class-gallery">
                                {imageClasses.classes?.map((cls) => {
                                    const count = imageClasses.counts?.[cls] || 0
                                    const maxCount = Math.max(...Object.values(imageClasses.counts || {}))
                                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                                    return (
                                        <div key={cls} className="image-class-card">
                                            <div className="class-info">
                                                <span className="class-name">{cls}</span>
                                                <span className="class-count">{count} images</span>
                                            </div>
                                            <div className="class-bar-track">
                                                <div className="class-bar-fill" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="image-summary">
                                <span>📊 {imageClasses.total_images} total images · {imageClasses.num_classes} classes</span>
                                <span>🧠 Models: MobileNetV2, EfficientNet-B0</span>
                            </div>
                        </div>
                    )}

                    {/* ── Tabular Dataset Config ── */}
                    {!isImageDataset && (
                        <>
                            <div className={`ai-section ${!selectedDataset ? 'section-disabled' : ''}`}>
                                <label className="label">
                                    <Sparkles size={14} />
                                    AI Goal Analysis
                                </label>
                                <div className="ai-input-row">
                                    <textarea
                                        className="input textarea"
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        placeholder="e.g., Predict which products need restocking..."
                                        rows={2}
                                        disabled={!selectedDataset || isTraining || isAnalyzing}
                                    />
                                    <button
                                        className="btn btn-secondary ai-analyze-btn"
                                        onClick={handleAnalyzeWithAI}
                                        disabled={!selectedDataset || !aiPrompt.trim() || isAnalyzing || isTraining}
                                    >
                                        {isAnalyzing ? (
                                            <div className="spinner" style={{ width: 14, height: 14 }}></div>
                                        ) : (
                                            <Wand2 size={14} />
                                        )}
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                                    </button>
                                </div>
                                <p className="form-hint">Let AI suggest the best target column</p>

                                {/* AI Analysis Results */}
                                {aiAnalysis && (
                                    <div className="ai-analysis-result">
                                        <div className="ai-result-header">
                                            <Sparkles size={16} className="text-primary" />
                                            <span>AI Recommendation</span>
                                        </div>
                                        <div className="ai-result-content">
                                            <div className="ai-result-item">
                                                <strong>Target:</strong>
                                                <span className="ai-target-badge">{aiAnalysis.suggested_target}</span>
                                            </div>
                                            <div className="ai-result-item">
                                                <strong>Type:</strong>
                                                <span className="ai-problem-badge">{aiAnalysis.problem_type}</span>
                                            </div>
                                            {aiAnalysis.confidence && (
                                                <div className="ai-result-item">
                                                    <strong>Confidence:</strong>
                                                    <span>{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                            )}
                                            <div className="ai-reasoning">
                                                <strong>Reasoning:</strong>
                                                <p>{aiAnalysis.reasoning}</p>
                                            </div>
                                            {aiAnalysis.preprocessing_suggestions?.length > 0 && (
                                                <div className="ai-suggestions">
                                                    <strong>Tips:</strong>
                                                    <ul>
                                                        {aiAnalysis.preprocessing_suggestions.map((tip, i) => (
                                                            <li key={i}>{tip}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {analysisError && (
                                    <div className="ai-error">
                                        <AlertCircle size={14} />
                                        <span>{analysisError}</span>
                                    </div>
                                )}
                            </div>

                            {/* 4. Target Column (Optional — not needed for all training types) */}
                            <div className="form-group">
                                <label className="label">
                                    <Target size={14} />
                                    Target Column <span className="optional-tag">Optional</span>
                                </label>
                                <select
                                    className="input"
                                    value={targetColumn}
                                    onChange={(e) => setTargetColumn(e.target.value)}
                                    disabled={!selectedDataset || isTraining}
                                >
                                    <option value="">{selectedDataset ? 'None (auto-detect or unsupervised)' : 'Select a dataset first...'}</option>
                                    {columns.map((col) => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>
                                <p className="form-hint">Select only for supervised learning (classification / regression)</p>
                            </div>
                        </>
                    )}
                </div>

                {/* ═══ RIGHT PANEL: Logs + Model Progress ═══ */}
                <div className="panel panel-right">

                    {/* RIGHT TOP: Developer Logs */}
                    <div className="right-section logs-section">
                        <div className="panel-header">
                            <Terminal size={16} />
                            <span>Developer Logs</span>
                            {isTraining && <div className="live-dot" />}
                        </div>
                        <pre className="terminal-content">
                            {combinedLogs || 'Waiting for training to start...'}
                            <div ref={logsEndRef} />
                        </pre>
                    </div>

                    {/* RIGHT BOTTOM: What the Model Does */}
                    <div className="right-section model-section">
                        <div className="panel-header">
                            <Brain size={16} />
                            <span>What the Model is Doing</span>
                        </div>

                        {currentJob ? (
                            <div className="model-progress-content">
                                {/* Status Bar */}
                                <div className="status-row">
                                    <span className="exp-name">{currentJob.name}</span>
                                    <span className={`status-badge ${experimentStatus}`}>
                                        {experimentStatus || 'Starting...'}
                                    </span>
                                </div>

                                {/* Pipeline Steps */}
                                <div className="pipeline-steps">
                                    <div className={`pipeline-step ${['training', 'completed'].includes(experimentStatus) ? 'completed' : 'active'}`}>
                                        <div className="pipeline-dot">
                                            <CheckCircle size={14} />
                                        </div>
                                        <span>Preprocessing</span>
                                    </div>
                                    <div className="pipeline-line" />
                                    <div className={`pipeline-step ${experimentStatus === 'training' ? 'active' : experimentStatus === 'completed' ? 'completed' : ''}`}>
                                        <div className="pipeline-dot">
                                            <Clock size={14} className={experimentStatus === 'training' ? 'animate-pulse' : ''} />
                                        </div>
                                        <span>Training</span>
                                    </div>
                                    <div className="pipeline-line" />
                                    <div className={`pipeline-step ${experimentStatus === 'completed' ? 'completed' : ''}`}>
                                        <div className="pipeline-dot">
                                            <BarChart3 size={14} />
                                        </div>
                                        <span>Evaluation</span>
                                    </div>
                                </div>

                                {/* Learning Timeline */}
                                <LearningTimeline
                                    explanationData={explanationData}
                                    isTraining={isTraining}
                                />

                                {/* Training Success */}
                                {experimentStatus === 'completed' && (
                                    <div className="success-message">
                                        <CheckCircle size={20} className="text-success" />
                                        <h3>Training Complete!</h3>
                                        {statusData.data.experiment.best_model_name && (
                                            <div className="result-summary">
                                                <div className="result-item">
                                                    <span className="result-label">🏆 Best Model</span>
                                                    <span className="result-value">{statusData.data.experiment.best_model_name}</span>
                                                </div>
                                                <div className="result-item">
                                                    <span className="result-label">📊 Score</span>
                                                    <span className="result-value">
                                                        {(statusData.data.experiment.best_score * 100).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <a href="/models" className="btn btn-sm btn-outline">View Models</a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="model-empty">
                                <p>Configure and start training to see model progress here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
