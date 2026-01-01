import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
    Sparkles,
    Send,
    Info,
    AlertCircle
} from 'lucide-react'
import { modelsApi, predictionsApi } from '../services/api'
import './Predictions.css'

export default function Predictions() {
    const { modelId } = useParams()
    const [selectedModel, setSelectedModel] = useState(modelId || '')
    const [formValues, setFormValues] = useState({})
    const [prediction, setPrediction] = useState(null)
    const [explanation, setExplanation] = useState(null)

    const { data: modelsData } = useQuery({
        queryKey: ['models'],
        queryFn: () => modelsApi.list()
    })

    const models = modelsData?.data?.models || []

    const { data: schemaData } = useQuery({
        queryKey: ['model-schema', selectedModel],
        queryFn: () => modelsApi.getSchema(selectedModel),
        enabled: !!selectedModel
    })

    const schema = schemaData?.data?.ui_schema || { fields: [] }

    // Initialize form values when schema loads
    useEffect(() => {
        if (schema.fields?.length > 0) {
            const initialValues = {}
            schema.fields.forEach(field => {
                initialValues[field.name] = field.default ?? ''
            })
            setFormValues(initialValues)
        }
    }, [schema])

    const predictMutation = useMutation({
        mutationFn: (input) => predictionsApi.predict(selectedModel, input),
        onSuccess: (response) => {
            setPrediction(response.data)
        }
    })

    const explainMutation = useMutation({
        mutationFn: (input) => predictionsApi.explain(selectedModel, input),
        onSuccess: (response) => {
            setExplanation(response.data)
        }
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        setPrediction(null)
        setExplanation(null)
        predictMutation.mutate(formValues)
    }

    const handleExplain = () => {
        explainMutation.mutate(formValues)
    }

    const renderField = (field) => {
        const value = formValues[field.name] ?? ''

        switch (field.input_type) {
            case 'dropdown':
                return (
                    <select
                        className="input"
                        value={value}
                        onChange={(e) => setFormValues(prev => ({
                            ...prev,
                            [field.name]: e.target.value
                        }))}
                    >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                )

            case 'slider':
                return (
                    <div className="slider-container">
                        <input
                            type="range"
                            className="slider"
                            min={field.min || 0}
                            max={field.max || 100}
                            value={value || field.default || 50}
                            onChange={(e) => setFormValues(prev => ({
                                ...prev,
                                [field.name]: parseFloat(e.target.value)
                            }))}
                        />
                        <span className="slider-value">{value || field.default || 50}</span>
                    </div>
                )

            case 'checkbox':
                return (
                    <label className="checkbox-container">
                        <input
                            type="checkbox"
                            checked={value || false}
                            onChange={(e) => setFormValues(prev => ({
                                ...prev,
                                [field.name]: e.target.checked
                            }))}
                        />
                        <span className="checkmark"></span>
                        {field.label}
                    </label>
                )

            case 'radio':
                return (
                    <div className="radio-group">
                        {field.options?.map(opt => (
                            <label key={opt} className="radio-container">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value={opt}
                                    checked={value === opt}
                                    onChange={(e) => setFormValues(prev => ({
                                        ...prev,
                                        [field.name]: e.target.value
                                    }))}
                                />
                                <span className="radio-mark"></span>
                                {opt}
                            </label>
                        ))}
                    </div>
                )

            case 'number':
            default:
                return (
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        className="input"
                        value={value}
                        min={field.min}
                        max={field.max}
                        onChange={(e) => setFormValues(prev => ({
                            ...prev,
                            [field.name]: field.type === 'number'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value
                        }))}
                    />
                )
        }
    }

    return (
        <div className="predictions-page">
            <div className="page-header">
                <h1>Make Predictions</h1>
                <p>Use your trained models to make predictions</p>
            </div>

            <div className="predictions-layout">
                {/* Input Form */}
                <div className="input-panel card">
                    <h2>Input Values</h2>

                    <div className="form-group">
                        <label className="label">Select Model</label>
                        <select
                            className="input"
                            value={selectedModel}
                            onChange={(e) => {
                                setSelectedModel(e.target.value)
                                setPrediction(null)
                                setExplanation(null)
                            }}
                        >
                            <option value="">Choose a model...</option>
                            {models.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedModel && schema.fields?.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            {schema.fields.map(field => (
                                <div key={field.name} className="form-group">
                                    <label className="label">{field.label || field.name}</label>
                                    {renderField(field)}
                                </div>
                            ))}

                            <button
                                type="submit"
                                className="btn btn-primary submit-btn"
                                disabled={predictMutation.isPending}
                            >
                                {predictMutation.isPending ? (
                                    <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Predict
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {selectedModel && schema.fields?.length === 0 && (
                        <div className="no-schema">
                            <AlertCircle size={24} />
                            <p>No input schema available for this model</p>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="results-panel">
                    {prediction ? (
                        <div className="prediction-result card">
                            <div className="result-header">
                                <Sparkles size={24} className="text-primary" />
                                <h2>Prediction Result</h2>
                            </div>

                            <div className="result-value">
                                {prediction.prediction !== null ? (
                                    <>
                                        <span className="value">{String(prediction.prediction)}</span>
                                        {prediction.probability && (
                                            <span className="confidence">
                                                {(prediction.probability * 100).toFixed(1)}% confidence
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="value">Prediction will appear here</span>
                                )}
                            </div>

                            <button
                                className="btn btn-outline explain-btn"
                                onClick={handleExplain}
                                disabled={explainMutation.isPending}
                            >
                                <Info size={18} />
                                Explain Prediction
                            </button>

                            {explanation && (
                                <div className="explanation">
                                    <h3>Explanation</h3>
                                    {explanation.explanation?.feature_importance && (
                                        <div className="feature-importance">
                                            {Object.entries(explanation.explanation.feature_importance)
                                                .slice(0, 5)
                                                .map(([feature, importance]) => (
                                                    <div key={feature} className="importance-item">
                                                        <span className="feature-name">{feature}</span>
                                                        <div className="importance-bar">
                                                            <div
                                                                className="importance-fill"
                                                                style={{
                                                                    width: `${Math.abs(importance) * 100}%`,
                                                                    background: importance > 0 ? 'var(--color-success)' : 'var(--color-error)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="placeholder-result card">
                            <Sparkles size={48} className="placeholder-icon" />
                            <h3>Your prediction will appear here</h3>
                            <p>Fill in the input values and click Predict</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
