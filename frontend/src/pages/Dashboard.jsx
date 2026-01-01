import { useQuery } from '@tanstack/react-query'
import {
    Database,
    Cpu,
    Box,
    TrendingUp,
    ArrowUpRight,
    Clock
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { datasetsApi, modelsApi } from '../services/api'
import './Dashboard.css'

export default function Dashboard() {
    const { data: datasetsData } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list()
    })

    const { data: modelsData } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list()
    })

    const datasets = datasetsData?.data?.datasets || []
    const models = modelsData?.data?.models || []

    const stats = [
        {
            label: 'Total Datasets',
            value: datasets.length,
            icon: Database,
            color: 'blue',
            link: '/datasets'
        },
        {
            label: 'Trained Models',
            value: models.length,
            icon: Box,
            color: 'purple',
            link: '/models'
        },
        {
            label: 'Training Jobs',
            value: 0,
            icon: Cpu,
            color: 'orange',
            link: '/training'
        },
        {
            label: 'Predictions Today',
            value: 0,
            icon: TrendingUp,
            color: 'green',
            link: '/predictions'
        }
    ]

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome to InferX-ML. Start by uploading a dataset.</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat) => (
                    <Link to={stat.link} key={stat.label} className={`stat-card stat-${stat.color}`}>
                        <div className="stat-icon">
                            <stat.icon size={24} />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                        </div>
                        <ArrowUpRight className="stat-arrow" size={18} />
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="section">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <Link to="/datasets" className="action-card">
                        <Database size={32} />
                        <h3>Upload Dataset</h3>
                        <p>Upload CSV, Excel, or images to get started</p>
                    </Link>
                    <Link to="/training" className="action-card">
                        <Cpu size={32} />
                        <h3>Train Model</h3>
                        <p>Start a new training job with AutoML</p>
                    </Link>
                    <Link to="/predictions" className="action-card">
                        <TrendingUp size={32} />
                        <h3>Make Predictions</h3>
                        <p>Use your trained models for predictions</p>
                    </Link>
                </div>
            </div>

            {/* Recent Models */}
            <div className="section">
                <div className="section-header">
                    <h2>Recent Models</h2>
                    <Link to="/models" className="view-all">View All</Link>
                </div>

                {models.length > 0 ? (
                    <div className="models-list">
                        {models.slice(0, 5).map((model) => (
                            <div key={model.id} className="model-item card">
                                <div className="model-info">
                                    <Box size={20} className="model-icon" />
                                    <div>
                                        <h4>{model.name}</h4>
                                        <p className="text-sm text-gray-500">
                                            {model.problem_type} • {model.best_model_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="model-meta">
                                    <span className="badge badge-success">
                                        {(model.best_score * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Clock size={14} />
                                        {new Date(model.created_at).toLocaleDateString()}
                                    </span>
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
                            <Cpu size={18} />
                            Start Training
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
