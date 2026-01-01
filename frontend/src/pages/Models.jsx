import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
    Box,
    Download,
    Trash2,
    TrendingUp,
    Clock,
    BarChart3
} from 'lucide-react'
import { modelsApi } from '../services/api'
import './Models.css'

export default function Models() {
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list()
    })

    const models = data?.data?.models || []

    const deleteMutation = useMutation({
        mutationFn: (id) => modelsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['models'])
        }
    })

    const getProblemTypeIcon = (type) => {
        if (type?.includes('classification')) return '🎯'
        if (type === 'regression') return '📈'
        if (type === 'clustering') return '🔮'
        if (type === 'timeseries') return '📊'
        return '🤖'
    }

    return (
        <div className="models-page">
            <div className="page-header">
                <h1>Trained Models</h1>
                <p>View and manage your trained machine learning models</p>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading models...</p>
                </div>
            ) : models.length > 0 ? (
                <div className="models-grid">
                    {models.map((model) => (
                        <div key={model.id} className="model-card card">
                            <div className="model-header">
                                <div className="model-icon">
                                    {getProblemTypeIcon(model.problem_type)}
                                </div>
                                <div className="model-meta">
                                    <span className="badge badge-info">
                                        {model.problem_type?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            <h3 className="model-name">{model.name}</h3>

                            <div className="model-stats">
                                <div className="stat">
                                    <BarChart3 size={16} />
                                    <span>{model.best_model_name || 'Auto'}</span>
                                </div>
                                <div className="stat">
                                    <TrendingUp size={16} />
                                    <span>{model.best_score ? `${(model.best_score * 100).toFixed(1)}%` : '—'}</span>
                                </div>
                                <div className="stat">
                                    <Clock size={16} />
                                    <span>{new Date(model.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="model-target">
                                <span className="target-label">Target:</span>
                                <span className="target-value">{model.target_column}</span>
                            </div>

                            <div className="model-actions">
                                <Link
                                    to={`/predictions/${model.id}`}
                                    className="btn btn-primary"
                                >
                                    <TrendingUp size={16} />
                                    Predict
                                </Link>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {/* TODO: Download */ }}
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    className="btn btn-secondary btn-danger"
                                    onClick={() => {
                                        if (confirm('Delete this model?')) {
                                            deleteMutation.mutate(model.id)
                                        }
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state card">
                    <Box size={48} className="empty-icon" />
                    <h3>No models yet</h3>
                    <p>Train your first model to see it here</p>
                    <Link to="/training" className="btn btn-primary">
                        Start Training
                    </Link>
                </div>
            )}
        </div>
    )
}
