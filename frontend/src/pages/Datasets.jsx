import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { datasetsApi } from '../services/api'
import {
    Search, Upload, Trash2, X, Database, Download,
    FileText, ChevronDown, ExternalLink, Loader2,
    FolderUp, CheckCircle, AlertCircle, Info, ArrowRight
} from 'lucide-react'
import './Datasets.css'

/* ─── helpers ─── */
const formatFileSize = (bytes) => {
    if (!bytes) return '—'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
    return `${size.toFixed(i ? 1 : 0)} ${units[i]}`
}

const getStatusBadge = (status) => {
    const map = {
        completed: { label: 'Profiled', cls: 'badge-ok' },
        pending:   { label: 'Pending',  cls: 'badge-pending' },
        failed:    { label: 'Failed',   cls: 'badge-fail' },
    }
    const s = map[status] || map.pending
    return <span className={`ds-badge ${s.cls}`}>{s.label}</span>
}

/* ══════════════════════════════════════ */
export default function Datasets() {
    const queryClient = useQueryClient()
    const fileInputRef = useRef(null)

    /* ── local state ── */
    const [activeTab, setActiveTab] = useState('library')   // library | search
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [selectedDataset, setSelectedDataset] = useState(null)
    const [toast, setToast] = useState(null)

    // kaggle search state
    const [kaggleQuery, setKaggleQuery] = useState('')
    const [kaggleSearchTerm, setKaggleSearchTerm] = useState('')
    const [savingRef, setSavingRef] = useState(null)

    /* ── queries ── */
    const { data: datasetsRes, isLoading } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list()
    })
    const datasets = datasetsRes?.data?.datasets || datasetsRes?.data || []

    const { data: kaggleRes, isLoading: kaggleLoading, isFetching: kaggleFetching } = useQuery({
        queryKey: ['kaggle-search', kaggleSearchTerm],
        queryFn: () => datasetsApi.searchKaggle(kaggleSearchTerm),
        enabled: !!kaggleSearchTerm,
    })
    const kaggleResults = kaggleRes?.data?.datasets || []

    /* ── mutations ── */
    const showToast = (type, message) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 4000)
    }

    const uploadMutation = useMutation({
        mutationFn: (formData) => {
            setUploading(true)
            return datasetsApi.upload(formData, setUploadProgress)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasets'] })
            setShowUpload(false)
            setUploading(false)
            setUploadProgress(0)
            showToast('success', 'Dataset uploaded successfully')
        },
        onError: (err) => {
            setUploading(false)
            setUploadProgress(0)
            showToast('error', err?.response?.data?.error || 'Upload failed')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id) => datasetsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datasets'] })
            setSelectedDataset(null)
            showToast('success', 'Dataset deleted')
        }
    })

    const kaggleDownloadMutation = useMutation({
        mutationFn: ({ ref, name }) => datasetsApi.downloadKaggle(ref, name),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['datasets'] })
            setSavingRef(null)
            showToast('success', res?.data?.message || 'Dataset saved to your library')
        },
        onError: (err) => {
            setSavingRef(null)
            showToast('error', err?.response?.data?.error || 'Download failed')
        }
    })

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        uploadMutation.mutate(formData)
    }

    const handleKaggleSearch = (e) => {
        e.preventDefault()
        if (kaggleQuery.trim()) setKaggleSearchTerm(kaggleQuery.trim())
    }

    const handleSaveKaggle = (ds) => {
        setSavingRef(ds.ref)
        kaggleDownloadMutation.mutate({ ref: ds.ref, name: ds.title })
    }

    /* ════════════════════════════════════════════════
       RENDER
       ════════════════════════════════════════════════ */
    return (
        <div className="ds-page">

            {/* ── Header ── */}
            <header className="ds-header">
                <div className="ds-header-left">
                    <Database size={22} />
                    <h1>Datasets</h1>
                </div>
                <div className="ds-header-actions">
                    <button className="ds-btn ds-btn-secondary" onClick={() => setShowUpload(true)}>
                        <Upload size={16} /> Upload
                    </button>
                </div>
            </header>

            {/* ── Tabs ── */}
            <nav className="ds-tabs">
                <button
                    className={`ds-tab ${activeTab === 'library' ? 'active' : ''}`}
                    onClick={() => setActiveTab('library')}
                >
                    <FolderUp size={15} /> My Library
                    {datasets.length > 0 && <span className="ds-tab-count">{datasets.length}</span>}
                </button>
                <button
                    className={`ds-tab ${activeTab === 'search' ? 'active' : ''}`}
                    onClick={() => setActiveTab('search')}
                >
                    <Search size={15} /> Kaggle Search
                </button>
            </nav>

            {/* ════════ MY LIBRARY TAB ════════ */}
            {activeTab === 'library' && (
                <section className="ds-section">
                    {isLoading ? (
                        <div className="ds-loading">
                            <Loader2 size={28} className="spin" />
                            <p>Loading datasets…</p>
                        </div>
                    ) : datasets.length > 0 ? (
                        <div className="ds-table-wrap">
                            <table className="ds-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Rows</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasets.map((ds) => (
                                        <tr key={ds.id} onClick={() => setSelectedDataset(ds)}>
                                            <td className="ds-cell-name">
                                                <FileText size={15} />
                                                <span>{ds.name}</span>
                                            </td>
                                            <td><span className="ds-badge badge-type">{ds.file_type?.toUpperCase()}</span></td>
                                            <td>{formatFileSize(ds.file_size)}</td>
                                            <td>{ds.num_rows ? ds.num_rows.toLocaleString() : '—'}</td>
                                            <td>{getStatusBadge(ds.profile_status)}</td>
                                            <td>
                                                <button
                                                    className="ds-icon-btn"
                                                    title="Delete"
                                                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(ds.id) }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="ds-empty">
                            <FolderUp size={40} />
                            <h3>No datasets yet</h3>
                            <p>Upload a file or search Kaggle to get started.</p>
                            <div className="ds-empty-actions">
                                <button className="ds-btn ds-btn-primary" onClick={() => setShowUpload(true)}>
                                    <Upload size={16} /> Upload
                                </button>
                                <button className="ds-btn ds-btn-secondary" onClick={() => setActiveTab('search')}>
                                    <Search size={16} /> Search Kaggle
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* ════════ KAGGLE SEARCH TAB ════════ */}
            {activeTab === 'search' && (
                <section className="ds-section">
                    <form className="ds-search-bar" onSubmit={handleKaggleSearch}>
                        <Search size={16} className="ds-search-icon" />
                        <input
                            type="text"
                            placeholder="Search Kaggle datasets…"
                            value={kaggleQuery}
                            onChange={(e) => setKaggleQuery(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="ds-btn ds-btn-primary" disabled={!kaggleQuery.trim() || kaggleFetching}>
                            {kaggleFetching ? <Loader2 size={15} className="spin" /> : 'Search'}
                        </button>
                    </form>

                    {kaggleLoading || kaggleFetching ? (
                        <div className="ds-loading">
                            <Loader2 size={28} className="spin" />
                            <p>Searching Kaggle…</p>
                        </div>
                    ) : kaggleSearchTerm && kaggleResults.length === 0 ? (
                        <div className="ds-empty">
                            <Search size={40} />
                            <h3>No results</h3>
                            <p>Try a different search term.</p>
                        </div>
                    ) : kaggleResults.length > 0 ? (
                        <div className="ds-kaggle-grid">
                            {kaggleResults.map((ds) => (
                                <div key={ds.ref} className="ds-kaggle-card">
                                    <div className="ds-kaggle-card-body">
                                        <h3 className="ds-kaggle-title">{ds.title}</h3>
                                        {ds.subtitle && <p className="ds-kaggle-sub">{ds.subtitle}</p>}
                                        <div className="ds-kaggle-meta">
                                            <span>{formatFileSize(ds.totalBytes)}</span>
                                            <span>{(ds.downloadCount || 0).toLocaleString()} downloads</span>
                                            <span>★ {ds.usabilityRating}</span>
                                        </div>
                                    </div>
                                    <div className="ds-kaggle-card-actions">
                                        <a href={ds.url} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-ghost">
                                            <ExternalLink size={14} /> View
                                        </a>
                                        <button
                                            className="ds-btn ds-btn-primary"
                                            onClick={() => handleSaveKaggle(ds)}
                                            disabled={savingRef === ds.ref}
                                        >
                                            {savingRef === ds.ref
                                                ? <><Loader2 size={14} className="spin" /> Saving…</>
                                                : <><Download size={14} /> Save to Library</>}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ds-search-hint">
                            <Search size={32} />
                            <p>Search for any Kaggle dataset and save it directly to your library.</p>
                        </div>
                    )}
                </section>
            )}

            {/* ════════ Upload Modal ════════ */}
            {showUpload && (
                <div className="ds-overlay" onClick={() => !uploading && setShowUpload(false)}>
                    <div className="ds-modal" onClick={e => e.stopPropagation()}>
                        <div className="ds-modal-header">
                            <h2>Upload Dataset</h2>
                            <button className="ds-icon-btn" onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="ds-modal-body">
                            <div
                                className="ds-upload-zone"
                                onClick={() => !uploading && fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <div className="ds-upload-progress">
                                        <div className="ds-progress-track">
                                            <div className="ds-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <p>{uploadProgress}% uploaded</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={36} />
                                        <h3>Drop files here or click to upload</h3>
                                        <p>CSV, Excel, Images, ZIP</p>
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

            {/* ════════ Dataset Details Modal ════════ */}
            {selectedDataset && (
                <div className="ds-overlay" onClick={() => setSelectedDataset(null)}>
                    <div className="ds-modal ds-modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="ds-modal-header">
                            <h2>{selectedDataset.name}</h2>
                            <button className="ds-icon-btn" onClick={() => setSelectedDataset(null)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="ds-modal-body">
                            <div className="ds-detail-grid">
                                <div className="ds-detail-row"><span>Type</span><span>{selectedDataset.file_type?.toUpperCase()}</span></div>
                                <div className="ds-detail-row"><span>Size</span><span>{formatFileSize(selectedDataset.file_size)}</span></div>
                                <div className="ds-detail-row"><span>Rows</span><span>{selectedDataset.num_rows?.toLocaleString() || '—'}</span></div>
                                <div className="ds-detail-row"><span>Columns</span><span>{selectedDataset.num_columns || '—'}</span></div>
                                <div className="ds-detail-row"><span>Status</span>{getStatusBadge(selectedDataset.profile_status)}</div>
                                <div className="ds-detail-row"><span>Uploaded</span><span>{new Date(selectedDataset.created_at).toLocaleDateString()}</span></div>
                            </div>

                            {selectedDataset.column_info && (
                                <div className="ds-columns-section">
                                    <h4>Columns</h4>
                                    <div className="ds-columns-list">
                                        {Object.entries(selectedDataset.column_info).map(([name, info]) => (
                                            <div key={name} className="ds-column-item">
                                                <span>{name}</span>
                                                <code>{info.dtype}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="ds-modal-footer">
                            <button className="ds-btn ds-btn-danger" onClick={() => deleteMutation.mutate(selectedDataset.id)}>
                                <Trash2 size={15} /> Delete
                            </button>
                            <button className="ds-btn ds-btn-primary" onClick={() => {
                                window.location.href = `/training?dataset=${selectedDataset.id}`
                            }}>
                                Train Model <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Toast ════════ */}
            {toast && (
                <div className={`ds-toast ds-toast-${toast.type}`}>
                    {toast.type === 'success' && <CheckCircle size={16} />}
                    {toast.type === 'info' && <Info size={16} />}
                    {toast.type === 'error' && <AlertCircle size={16} />}
                    <span>{toast.message}</span>
                    <button className="ds-toast-close" onClick={() => setToast(null)}>
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    )
}
