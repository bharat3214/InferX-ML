import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
    Box,
    Download,
    Trash2,
    TrendingUp,
    Clock,
    BarChart3,
    Loader2
} from 'lucide-react'
import { modelsApi } from '../services/api'
import './Models.css'

export default function Models() {
    const queryClient = useQueryClient()
    const [downloadingId, setDownloadingId] = useState(null)

    const { data, isLoading } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list()
    })

    const models = data?.data?.models || []

    const deleteMutation = useMutation({
        mutationFn: (id) => modelsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['models'])
        },
        onError: (error) => {
            console.error('Delete failed:', error)
            alert('Failed to delete model. Please try again.')
        }
    })

    const handleDownload = async (modelId, modelName) => {
        setDownloadingId(modelId)
        try {
            const response = await modelsApi.download(modelId)

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/zip' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${modelName.replace(/\s+/g, '_')}_model.zip`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download failed:', error)
            alert('Download failed. Model package may not be available.')
        } finally {
            setDownloadingId(null)
        }
    }

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
                                    onClick={() => handleDownload(model.id, model.name)}
                                    disabled={downloadingId === model.id || !model.has_package}
                                    title={!model.has_package ? 'Package not available. Train a new model to enable downloads.' : 'Download model package'}
                                >
                                    {downloadingId === model.id ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    {downloadingId === model.id ? 'Downloading...' : 'Download'}
                                </button>
                                <button
                                    className="btn btn-secondary btn-danger"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                        if (window.confirm('Delete this model?')) {
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
