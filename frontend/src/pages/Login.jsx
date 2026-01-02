import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import './Login.css'

export default function Login() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: ''
    })

    const { login, register } = useAuthStore()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isLogin) {
                const result = await login(formData.email, formData.password)
                if (result.success) {
                    navigate('/')
                } else {
                    setError(result.error)
                }
            } else {
                const result = await register(formData.email, formData.username, formData.password)
                if (result.success) {
                    // Auto login after registration
                    const loginResult = await login(formData.email, formData.password)
                    if (loginResult.success) {
                        navigate('/')
                    }
                } else {
                    setError(result.error)
                }
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-branding">
                    <div className="branding-content">
                        <div className="branding-logo">
                            <Sparkles size={48} />
                            <h1>InferX-ML</h1>
                        </div>
                        <p className="branding-tagline">
                            Build predictive, forecasting, and computer vision models
                            <span className="highlight"> without writing code.</span>
                        </p>
                        <div className="feature-list">
                            <div className="feature-item">
                                <div className="feature-icon">📊</div>
                                <span>Tabular, Time-Series & Image Data</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">🤖</div>
                                <span>Automatic Model Selection</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">🔍</div>
                                <span>Built-in Explainability</span>
                            </div>
                            <div className="feature-item">
                                <div className="feature-icon">📦</div>
                                <span>One-Click Model Export</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="login-form-container">
                    <div className="form-header">
                        <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
                        <p>
                            {isLogin
                                ? 'Sign in to continue to your dashboard'
                                : 'Start your AI journey today'}
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label className="label">Email</label>
                            <div className="input-wrapper">
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="form-group">
                                <label className="label">Username</label>
                                <div className="input-wrapper">
                                    <User size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="Choose a username"
                                        required={!isLogin}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="label">Password</label>
                            <div className="input-wrapper">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="form-footer">
                        <p>
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                type="button"
                                className="toggle-btn"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
