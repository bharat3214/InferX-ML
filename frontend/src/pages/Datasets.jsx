import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Upload,
    FileSpreadsheet,
    Image,
    Trash2,
    Eye,
    X,
    CheckCircle,
    AlertCircle,
    Clock
} from 'lucide-react'
import { datasetsApi } from '../services/api'
import './Datasets.css'

export default function Datasets() {
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [selectedDataset, setSelectedDataset] = useState(null)
    const fileInputRef = useRef()
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list()
    })

    const datasets = data?.data?.datasets || []

    const uploadMutation = useMutation({
        mutationFn: (formData) => datasetsApi.upload(formData, setUploadProgress),
        onSuccess: () => {
            queryClient.invalidateQueries(['datasets'])
            setShowUpload(false)
            setUploading(false)
            setUploadProgress(0)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => datasetsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['datasets'])
            setSelectedDataset(null)
        }
    })

    const handleFileSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)

        setUploading(true)
        uploadMutation.mutate(formData)
    }

    const getFileIcon = (fileType) => {
        if (['jpg', 'jpeg', 'png', 'zip'].includes(fileType)) {
            return <Image size={20} />
        }
        return <FileSpreadsheet size={20} />
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <span className="badge badge-success"><CheckCircle size={12} /> Profiled</span>
            case 'processing':
                return <span className="badge badge-warning"><Clock size={12} /> Processing</span>
            case 'failed':
                return <span className="badge badge-error"><AlertCircle size={12} /> Failed</span>
            default:
                return <span className="badge badge-info"><Clock size={12} /> Pending</span>
        }
    }

    const formatFileSize = (bytes) => {
        if (!bytes) return '—'
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className="datasets-page">
            <div className="page-header">
                <div>
                    <h1>Datasets</h1>
                    <p>Manage your uploaded datasets</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                    <Upload size={18} />
                    Upload Dataset
                </button>
            </div>

            {/* Datasets Grid */}
            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading datasets...</p>
                </div>
            ) : datasets.length > 0 ? (
                <div className="datasets-grid">
                    {datasets.map((dataset) => (
                        <div
                            key={dataset.id}
                            className="dataset-card card card-hover"
                            onClick={() => setSelectedDataset(dataset)}
                        >
                            <div className="dataset-icon">
                                {getFileIcon(dataset.file_type)}
                            </div>
                            <div className="dataset-info">
                                <h3>{dataset.name}</h3>
                                <p className="dataset-meta">
                                    {dataset.file_type?.toUpperCase()} • {formatFileSize(dataset.file_size)}
                                </p>
                                {dataset.num_rows && (
                                    <p className="dataset-stats">
                                        {dataset.num_rows.toLocaleString()} rows × {dataset.num_columns} columns
                                    </p>
                                )}
                            </div>
                            <div className="dataset-status">
                                {getStatusBadge(dataset.profile_status)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state card">
                    <FileSpreadsheet size={48} className="empty-icon" />
                    <h3>No datasets yet</h3>
                    <p>Upload your first dataset to get started</p>
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        <Upload size={18} />
                        Upload Dataset
                    </button>
                </div>
            )}

            {/* Upload Modal */}
            {showUpload && (
                <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Upload Dataset</h2>
                            <button
                                className="modal-close"
                                onClick={() => !uploading && setShowUpload(false)}
                                disabled={uploading}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <div
                                className="upload-zone"
                                onClick={() => !uploading && fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${uploadProgress}%` }}
                                            ></div>
                                        </div>
                                        <p>{uploadProgress}% uploaded</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={48} />
                                        <h3>Drop files here or click to upload</h3>
                                        <p>Support: CSV, Excel (.xlsx, .xls), Images (.jpg, .png), ZIP</p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.zip"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Dataset Details Modal */}
            {selectedDataset && (
                <div className="modal-overlay" onClick={() => setSelectedDataset(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedDataset.name}</h2>
                            <button className="modal-close" onClick={() => setSelectedDataset(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <div className="dataset-details">
                                <div className="detail-row">
                                    <span className="detail-label">Type</span>
                                    <span>{selectedDataset.file_type?.toUpperCase()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Size</span>
                                    <span>{formatFileSize(selectedDataset.file_size)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Data Type</span>
                                    <span className="badge badge-info">{selectedDataset.data_type || 'Unknown'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Rows</span>
                                    <span>{selectedDataset.num_rows?.toLocaleString() || '—'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Columns</span>
                                    <span>{selectedDataset.num_columns || '—'}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Profile Status</span>
                                    {getStatusBadge(selectedDataset.profile_status)}
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Uploaded</span>
                                    <span>{new Date(selectedDataset.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            {selectedDataset.column_info && (
                                <div className="columns-section">
                                    <h3>Columns</h3>
                                    <div className="columns-list">
                                        {Object.entries(selectedDataset.column_info).map(([name, info]) => (
                                            <div key={name} className="column-item">
                                                <span className="column-name">{name}</span>
                                                <span className="column-type">{info.dtype}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => deleteMutation.mutate(selectedDataset.id)}
                            >
                                <Trash2 size={18} />
                                Delete
                            </button>
                            <button className="btn btn-primary" onClick={() => {
                                window.location.href = `/training?dataset=${selectedDataset.id}`
                            }}>
                                Train Model
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
