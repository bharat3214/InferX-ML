import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    ArrowRight,
    KeyRound,
    Lock,
    Mail,
    ShieldCheck,
    Sparkles,
    User,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import './Login.css'

const modeCopy = {
    login: {
        title: 'Welcome back',
        subtitle: 'Sign in to continue to your workspace.',
    },
    register: {
        title: 'Create your account',
        subtitle: 'Set up secure access and verify your email before your first session.',
    },
    verify: {
        title: 'Verify your email',
        subtitle: 'Enter the one-time code we sent to finish activating your account.',
    },
    forgot: {
        title: 'Reset your password',
        subtitle: 'We will send a one-time reset code to your email.',
    },
    reset: {
        title: 'Choose a new password',
        subtitle: 'Use the reset code from your email and set a fresh password.',
    },
}

export default function Login() {
    const navigate = useNavigate()
    const {
        login,
        register,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
    } = useAuthStore()

    const [mode, setMode] = useState('login')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [emailLocked, setEmailLocked] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        otp: '',
        nextPassword: '',
        confirmPassword: '',
    })

    const copy = useMemo(() => modeCopy[mode], [mode])

    const switchMode = (nextMode) => {
        setMode(nextMode)
        setError('')
        setNotice('')
        if (nextMode === 'login' || nextMode === 'register' || nextMode === 'forgot') {
            setEmailLocked(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setNotice('')
        setLoading(true)

        try {
            if (mode === 'login') {
                const result = await login(formData.email, formData.password)
                if (result.success) {
                    navigate('/')
                    return
                }
                if (result.requiresVerification) {
                    setFormData((prev) => ({ ...prev, email: result.email || prev.email, otp: '' }))
                    setEmailLocked(true)
                    setMode('verify')
                    setNotice('Your account is almost ready. Enter the verification code from your email.')
                    return
                }
                setError(result.error)
                return
            }

            if (mode === 'register') {
                const result = await register(formData.email, formData.username, formData.password)
                if (result.success) {
                    setFormData((prev) => ({
                        ...prev,
                        email: result.data.email || prev.email,
                        otp: '',
                    }))
                    setEmailLocked(true)
                    setMode('verify')
                    setNotice(result.data.message)
                    return
                }
                setError(result.error)
                return
            }

            if (mode === 'verify') {
                const result = await verifyEmail(formData.email, formData.otp)
                if (result.success) {
                    navigate('/')
                    return
                }
                setError(result.error)
                return
            }

            if (mode === 'forgot') {
                const result = await forgotPassword(formData.email)
                if (result.success) {
                    setEmailLocked(true)
                    setMode('reset')
                    setNotice(result.message)
                } else {
                    setError(result.error)
                }
                return
            }

            if (mode === 'reset') {
                if (formData.nextPassword !== formData.confirmPassword) {
                    setError('Passwords do not match')
                    return
                }
                const result = await resetPassword(formData.email, formData.otp, formData.nextPassword)
                if (result.success) {
                    setMode('login')
                    setEmailLocked(false)
                    setFormData((prev) => ({
                        ...prev,
                        password: '',
                        otp: '',
                        nextPassword: '',
                        confirmPassword: '',
                    }))
                    setNotice(result.message)
                } else {
                    setError(result.error)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleResendVerification = async () => {
        setError('')
        setNotice('')
        setLoading(true)
        const result = await resendVerification(formData.email)
        setLoading(false)
        if (result.success) {
            setNotice(result.message)
        } else {
            setError(result.error)
        }
    }

    return (
        <div className="login-page">
            <div className="auth-background">
                <div className="auth-glow auth-glow-left" />
                <div className="auth-glow auth-glow-right" />
            </div>

            <div className="auth-modal">
                <div className="auth-side-panel">
                    <div className="auth-brand">
                        <div className="auth-brand-icon">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h1>InferX-ML</h1>
                            <p>Secure access for your model workspace</p>
                        </div>
                    </div>

                    <div className="auth-side-copy">
                        <span className="auth-side-badge">Industry-grade access</span>
                        <h2>Ship faster with safer authentication.</h2>
                        <p>
                            Email verification, one-time reset codes, and session-backed access keep the
                            platform ready for real teams.
                        </p>
                    </div>

                    <div className="auth-side-points">
                        <div className="auth-point">
                            <ShieldCheck size={18} />
                            <span>Verified email onboarding</span>
                        </div>
                        <div className="auth-point">
                            <KeyRound size={18} />
                            <span>OTP-based recovery flow</span>
                        </div>
                        <div className="auth-point">
                            <Lock size={18} />
                            <span>JWT session handling with protected routes</span>
                        </div>
                    </div>
                </div>

                <div className="auth-form-panel">
                    <div className="auth-header">
                        {(mode === 'login' || mode === 'register') && (
                            <div className="auth-mode-switch">
                                <button
                                    type="button"
                                    className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`}
                                    onClick={() => switchMode('login')}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`}
                                    onClick={() => switchMode('register')}
                                >
                                    Create Account
                                </button>
                            </div>
                        )}

                        <h2>{copy.title}</h2>
                        <p>{copy.subtitle}</p>
                    </div>

                    {notice && <div className="auth-message auth-message-info">{notice}</div>}
                    {error && <div className="auth-message auth-message-error">{error}</div>}

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
                                    placeholder="you@company.com"
                                    required
                                    disabled={emailLocked}
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
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
                                        placeholder="team_owner"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {(mode === 'login' || mode === 'register') && (
                            <div className="form-group">
                                <div className="label-row">
                                    <label className="label">Password</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            className="auth-link-button"
                                            onClick={() => switchMode('forgot')}
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
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
                                {mode === 'register' && (
                                    <p className="field-hint">Use at least 8 characters with letters and numbers.</p>
                                )}
                            </div>
                        )}

                        {(mode === 'verify' || mode === 'reset') && (
                            <div className="form-group">
                                <div className="label-row">
                                    <label className="label">One-time code</label>
                                    {mode === 'verify' && (
                                        <button
                                            type="button"
                                            className="auth-link-button"
                                            onClick={handleResendVerification}
                                            disabled={loading}
                                        >
                                            Resend code
                                        </button>
                                    )}
                                </div>
                                <div className="input-wrapper">
                                    <KeyRound size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        name="otp"
                                        value={formData.otp}
                                        onChange={handleChange}
                                        className="input auth-otp-input"
                                        placeholder="000000"
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'reset' && (
                            <>
                                <div className="form-group">
                                    <label className="label">New password</label>
                                    <div className="input-wrapper">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type="password"
                                            name="nextPassword"
                                            value={formData.nextPassword}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Create a new password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="label">Confirm password</label>
                                    <div className="input-wrapper">
                                        <Lock size={18} className="input-icon" />
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            className="input"
                                            placeholder="Repeat your new password"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <button type="submit" className="btn btn-primary submit-btn" disabled={loading}>
                            {loading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            ) : (
                                <>
                                    {mode === 'login' && 'Sign In'}
                                    {mode === 'register' && 'Create Account'}
                                    {mode === 'verify' && 'Verify Email'}
                                    {mode === 'forgot' && 'Send Reset Code'}
                                    {mode === 'reset' && 'Update Password'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="form-footer">
                        {mode === 'login' && (
                            <p>
                                New here?
                                <button type="button" className="toggle-btn" onClick={() => switchMode('register')}>
                                    Create an account
                                </button>
                            </p>
                        )}

                        {mode === 'register' && (
                            <p>
                                Already have an account?
                                <button type="button" className="toggle-btn" onClick={() => switchMode('login')}>
                                    Sign in
                                </button>
                            </p>
                        )}

                        {(mode === 'verify' || mode === 'forgot' || mode === 'reset') && (
                            <p>
                                Back to
                                <button type="button" className="toggle-btn" onClick={() => switchMode('login')}>
                                    Sign in
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
