import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
    Cpu,
    Play,
    Target,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react'
import { datasetsApi, trainingApi } from '../services/api'
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

    const startTrainingMutation = useMutation({
        mutationFn: (data) => trainingApi.start(data),
        onSuccess: (response) => {
            setCurrentJob(response.data.experiment)
            setIsTraining(true)
        }
    })

    const handleStartTraining = () => {
        if (!selectedDataset || !targetColumn) return

        startTrainingMutation.mutate({
            dataset_id: parseInt(selectedDataset),
            name: experimentName || `Experiment ${new Date().toLocaleDateString()}`,
            target_column: targetColumn,
            goal_description: goalDescription
        })
    }

    return (
        <div className="training-page">
            <div className="page-header">
                <h1>Model Training</h1>
                <p>Train machine learning models with AutoML</p>
            </div>

            <div className="training-layout">
                {/* Configuration Panel */}
                <div className="config-panel card">
                    <h2>Training Configuration</h2>

                    <div className="form-group">
                        <label className="label">Dataset</label>
                        <select
                            className="input"
                            value={selectedDataset}
                            onChange={(e) => setSelectedDataset(e.target.value)}
                            disabled={isTraining}
                        >
                            <option value="">Select a dataset...</option>
                            {datasets.map((dataset) => (
                                <option key={dataset.id} value={dataset.id}>
                                    {dataset.name} ({dataset.num_rows?.toLocaleString()} rows)
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDataset && columns.length > 0 && (
                        <div className="form-group">
                            <label className="label">
                                <Target size={16} />
                                Target Column
                            </label>
                            <select
                                className="input"
                                value={targetColumn}
                                onChange={(e) => setTargetColumn(e.target.value)}
                                disabled={isTraining}
                            >
                                <option value="">Select target column...</option>
                                {columns.map((col) => (
                                    <option key={col} value={col}>{col}</option>
                                ))}
                            </select>
                            <p className="form-hint">
                                The column you want to predict
                            </p>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="label">Experiment Name (Optional)</label>
                        <input
                            type="text"
                            className="input"
                            value={experimentName}
                            onChange={(e) => setExperimentName(e.target.value)}
                            placeholder="My Experiment"
                            disabled={isTraining}
                        />
                    </div>

                    <div className="form-group">
                        <label className="label">Goal Description (Optional)</label>
                        <textarea
                            className="input textarea"
                            value={goalDescription}
                            onChange={(e) => setGoalDescription(e.target.value)}
                            placeholder="Describe what you want to predict..."
                            rows={3}
                            disabled={isTraining}
                        />
                    </div>

                    <button
                        className="btn btn-primary start-btn"
                        onClick={handleStartTraining}
                        disabled={!selectedDataset || !targetColumn || isTraining}
                    >
                        {isTraining ? (
                            <>
                                <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                Training...
                            </>
                        ) : (
                            <>
                                <Play size={18} />
                                Start Training
                            </>
                        )}
                    </button>
                </div>

                {/* Training Progress / Info Panel */}
                <div className="info-panel">
                    {isTraining && currentJob ? (
                        <div className="progress-card card">
                            <div className="progress-header">
                                <Cpu size={24} className="text-primary" />
                                <div>
                                    <h3>{currentJob.name}</h3>
                                    <p>Training in progress...</p>
                                </div>
                            </div>

                            <div className="progress-steps">
                                <div className="step completed">
                                    <CheckCircle size={20} />
                                    <span>Data Preprocessing</span>
                                </div>
                                <div className="step active">
                                    <Clock size={20} className="animate-pulse" />
                                    <span>Model Training</span>
                                </div>
                                <div className="step">
                                    <div className="step-dot"></div>
                                    <span>Evaluation</span>
                                </div>
                                <div className="step">
                                    <div className="step-dot"></div>
                                    <span>Model Packaging</span>
                                </div>
                            </div>

                            <p className="progress-note">
                                AutoML is training multiple models and will select the best one automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="info-card card">
                            <h3>How it works</h3>
                            <div className="info-steps">
                                <div className="info-step">
                                    <div className="step-number">1</div>
                                    <div>
                                        <h4>Select Dataset</h4>
                                        <p>Choose the dataset you want to train on</p>
                                    </div>
                                </div>
                                <div className="info-step">
                                    <div className="step-number">2</div>
                                    <div>
                                        <h4>Choose Target</h4>
                                        <p>Select the column you want to predict</p>
                                    </div>
                                </div>
                                <div className="info-step">
                                    <div className="step-number">3</div>
                                    <div>
                                        <h4>AutoML Training</h4>
                                        <p>We automatically select and train the best model</p>
                                    </div>
                                </div>
                                <div className="info-step">
                                    <div className="step-number">4</div>
                                    <div>
                                        <h4>Get Results</h4>
                                        <p>Review metrics and start making predictions</p>
                                    </div>
                                </div>
                            </div>

                            <div className="algorithms-info">
                                <h4>Supported Algorithms</h4>
                                <div className="algorithm-tags">
                                    <span className="tag">Logistic Regression</span>
                                    <span className="tag">Random Forest</span>
                                    <span className="tag">XGBoost</span>
                                    <span className="tag">K-Means</span>
                                    <span className="tag">ARIMA</span>
                                    <span className="tag">Prophet</span>
                                    <span className="tag">LSTM</span>
                                    <span className="tag">MobileNet</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
