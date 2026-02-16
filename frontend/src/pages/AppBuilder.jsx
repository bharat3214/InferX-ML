import React, { useState, useEffect, useRef } from 'react';
import './AppBuilder.css';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AppBuilder() {
    const { token } = useAuthStore();

    // Core State
    const [prompt, setPrompt] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState('openai');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);

    // V0 Experience State
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [logsExpanded, setLogsExpanded] = useState(true);

    // Model Selection State
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    const statusInterval = useRef(null);
    const logsEndRef = useRef(null);

    // Initial Load
    useEffect(() => {
        // Load API defaults
        const savedKey = localStorage.getItem('opencode_api_key');
        const savedProvider = localStorage.getItem('opencode_provider');
        if (savedKey) setApiKey(savedKey);
        if (savedProvider) setProvider(savedProvider);
    }, []);

    // Load Models
    useEffect(() => {
        if (!token) return;
        fetchModels();
    }, [token]);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [status?.logs]);

    // Cleanup polling
    useEffect(() => {
        return () => {
            if (statusInterval.current) clearInterval(statusInterval.current);
        };
    }, []);

    // Fetch Files when project is completed or in progress
    useEffect(() => {
        if (currentProject && (status?.status === 'completed' || status?.status === 'in_progress')) {
            fetchFiles();
        }
    }, [currentProject, status?.status]);

    const fetchModels = async () => {
        try {
            const res = await fetch(`${API_URL}/models`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setModels(Array.isArray(data) ? data : (data.models || []));
            }
        } catch (err) {
            console.error('Failed to load models', err);
        }
    };

    const fetchFiles = async () => {
        if (!currentProject) return;
        try {
            const res = await fetch(`${API_URL}/builder/${currentProject}/files`);
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
            }
        } catch (err) {
            console.error('Failed to load files', err);
        }
    };

    const handleFileSelect = async (file) => {
        setSelectedFile(file);
        try {
            const res = await fetch(`${API_URL}/builder/${currentProject}/files/read?path=${encodeURIComponent(file.path)}`);
            if (res.ok) {
                const data = await res.json();
                setFileContent(data.content);
                setViewMode('code');
            }
        } catch (err) {
            console.error('Failed to read file', err);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !apiKey.trim()) return;

        setLoading(true);
        setStatus({ status: 'queued', message: 'Initializing agent...', logs: [] });
        setLogsExpanded(true);

        // Save preferences
        localStorage.setItem('opencode_api_key', apiKey);
        localStorage.setItem('opencode_provider', provider);

        try {
            const res = await fetch(`${API_URL}/builder/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    api_key: apiKey,
                    provider,
                    model_id: selectedModel || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');

            setCurrentProject(data.project_id);
            // Start polling
            startStatusPolling(data.project_id);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const startStatusPolling = (projectId) => {
        if (statusInterval.current) clearInterval(statusInterval.current);

        statusInterval.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/builder/${projectId}/status`);
                const data = await res.json();
                setStatus(prev => ({ ...prev, ...data }));

                if (data.status === 'completed') {
                    clearInterval(statusInterval.current);
                    setLoading(false);
                    fetchFiles();
                    // Auto preview
                    if (!data.preview_url) startPreview(projectId);
                } else if (data.status === 'failed') {
                    clearInterval(statusInterval.current);
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
            }
        }, 2000);
    };

    const startPreview = async (projectId) => {
        try {
            const res = await fetch(`${API_URL}/builder/${projectId}/preview`, { method: 'POST' });
            const data = await res.json();
            if (data.preview_url) {
                setStatus(prev => ({ ...prev, preview_url: data.preview_url }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-fill prompt template
    useEffect(() => {
        if (selectedModel && !prompt) {
            const model = models.find(m => m.id.toString() === selectedModel.toString());
            if (model) {
                setPrompt(`Create a modern prediction dashboard for the ${model.name} model. Include a clean input form and visualize the results.`);
            }
        }
    }, [selectedModel, models]);

    return (
        <div className="v0-workspace">
            {/* LEFT PANEL: Chat & Controls */}
            <div className="v0-sidebar">
                <header className="v0-header">
                    <h2><span className="icon">🚀</span> App Builder</h2>
                </header>

                <div className="v0-chat-messages">
                    {/* Welcome Message */}
                    {!status && (
                        <div className="welcome-message">
                            <h3>What would you like to build?</h3>
                            <p>I can generate full-stack React & Python apps with your trained models integrated.</p>
                        </div>
                    )}

                    {/* Status Logs (Thinking Process) */}
                    {status && (
                        <div className="agent-thinking">
                            <div
                                className="thinking-header"
                                onClick={() => setLogsExpanded(!logsExpanded)}
                            >
                                <span className={`status-dot ${status.status}`}></span>
                                <span className="status-text">
                                    {status.status === 'completed' ? 'Done!' : status.message || 'Thinking...'}
                                </span>
                                <span className="toggle-icon">{logsExpanded ? '▼' : '▶'}</span>
                            </div>

                            {logsExpanded && status.logs && (
                                <div className="thinking-logs">
                                    {status.logs.map((log, i) => (
                                        <div key={i} className="log-entry">
                                            <span className="log-line">│</span> {log}
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="v0-input-area">
                    {models.length > 0 && (
                        <div className="model-chip-selector">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="model-select-chip"
                            >
                                <option value="">+ Add Model Context</option>
                                {models.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <textarea
                        className="v0-prompt-input"
                        placeholder="Describe your app..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        disabled={loading}
                        rows={3}
                    />

                    <div className="input-controls">
                        <select
                            className="provider-mini-select"
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                        >
                            <option value="openai">GPT-4o</option>
                            <option value="anthropic">Claude 3.5</option>
                            <option value="google">Gemini 1.5 Pro</option>
                            <option value="google-flash">Gemini 2.0 Flash</option>
                        </select>

                        {!apiKey ? (
                            <input
                                type="password"
                                className="api-key-mini"
                                placeholder="API Key needed"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        ) : null}

                        <button
                            className="v0-send-btn"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'Generate ⏎'}
                        </button>
                    </div>
                    {error && <div className="mini-error">{error}</div>}
                </div>
            </div>

            {/* RIGHT PANEL: Workspace */}
            <div className="v0-main-panel">
                <div className="v0-tabs">
                    <button
                        className={`tab-btn ${viewMode === 'preview' ? 'active' : ''}`}
                        onClick={() => setViewMode('preview')}
                    >
                        � Preview
                    </button>
                    <button
                        className={`tab-btn ${viewMode === 'code' ? 'active' : ''}`}
                        onClick={() => setViewMode('code')}
                    >
                        💻 Code
                    </button>
                    {status?.status === 'completed' && (
                        <div className="tab-actions">
                            <a
                                href={`${API_URL}/builder/${currentProject}/download`}
                                className="action-link"
                                target="_blank"
                            >
                                ⬇ Download ZIP
                            </a>
                            {status.preview_url && (
                                <a
                                    href={status.preview_url}
                                    target="_blank"
                                    className="action-link"
                                >
                                    🔗 Open New Tab
                                </a>
                            )}
                        </div>
                    )}
                </div>

                <div className="v0-content-area">
                    {viewMode === 'preview' ? (
                        <div className="preview-container">
                            {status?.preview_url ? (
                                <>
                                    <div className="preview-toolbar">
                                        <span className="preview-url">{status.preview_url}</span>
                                        <button
                                            className="refresh-btn"
                                            onClick={() => {
                                                const frame = document.getElementById('preview-frame');
                                                if (frame) frame.src = frame.src;
                                            }}
                                        >
                                            🔄 Refresh
                                        </button>
                                        <a href={status.preview_url} target="_blank" className="external-link">↗</a>
                                    </div>
                                    <iframe
                                        id="preview-frame"
                                        src={status.preview_url}
                                        title="App Preview"
                                        className="app-preview-iframe"
                                    />
                                    {/* Startup Hint */}
                                    <div className="startup-hint">
                                        Note: First boot may take ~30s (installing dependencies)
                                    </div>
                                </>
                            ) : (
                                <div className="preview-placeholder">
                                    <div className="placeholder-content">
                                        <span className="icon-large">⚡</span>
                                        <h3>App Preview</h3>
                                        <p>{status ? 'Building your app...' : 'Generated app will appear here'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="code-workspace">
                            <div className="file-tree">
                                {files.map((file, i) => (
                                    <div
                                        key={i}
                                        className={`file-item ${selectedFile?.path === file.path ? 'active' : ''}`}
                                        onClick={() => handleFileSelect(file)}
                                        style={{ paddingLeft: `${file.path.split('/').length * 10}px` }}
                                    >
                                        {file.name}
                                    </div>
                                ))}
                            </div>
                            <div className="code-editor">
                                {selectedFile ? (
                                    <textarea
                                        className="code-textarea"
                                        value={fileContent}
                                        readOnly
                                    />
                                ) : (
                                    <div className="code-placeholder">Select a file to view</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AppBuilder;
