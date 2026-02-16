import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { ContainerScroll } from '../components/ui/ContainerScroll'
import { BentoGrid, BentoCard } from '../components/ui/BentoGrid'
import { AnimatedTestimonials } from '../components/ui/AnimatedTestimonials'
import {
    Sparkles,
    Database,
    Cpu,
    Brain,
    Target,
    Terminal,
    Package,
    ArrowRight,
    Upload,
    BarChart3,
    Zap,
    Shield,
    Clock,
    Code2,
    ChevronRight,
    Github,
    BookOpen,
    ExternalLink
} from 'lucide-react'
import './LandingPage.css'

/* ═══════════════════════════════════
   Fade-in wrapper for scroll reveal
   ═══════════════════════════════════ */
function FadeIn({ children, delay = 0, className = '' }) {
    const ref = React.useRef(null)
    const isInView = useInView(ref, { once: true, margin: '-80px' })

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/* ═══════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════ */
const features = [
    {
        Icon: Database,
        name: 'Smart Data Profiling',
        description: 'Upload CSV, Excel, or images — instant schema detection, stats, and quality checks.',
        href: '#',
        cta: 'Learn more',
        className: 'bento-wide',
    },
    {
        Icon: Brain,
        name: 'AutoML Training',
        description: 'Automatic model selection, hyperparameter tuning, and cross-validation across 10+ algorithms.',
        href: '#',
        cta: 'Learn more',
        className: '',
    },
    {
        Icon: Sparkles,
        name: 'Explainable AI',
        description: 'Real-time learning timeline shows what the model learned, why it chose each step.',
        href: '#',
        cta: 'Learn more',
        className: '',
    },
    {
        Icon: Target,
        name: 'AI Goal Analysis',
        description: 'Describe your goal in plain English — AI suggests the right target and approach.',
        href: '#',
        cta: 'Learn more',
        className: '',
    },
    {
        Icon: Terminal,
        name: 'Live Developer Logs',
        description: 'Watch training in real time with streaming logs, progress bars, and status updates.',
        href: '#',
        cta: 'Learn more',
        className: 'bento-wide',
    },
    {
        Icon: Shield,
        name: 'Auto Preprocessing',
        description: 'Missing values, encoding, scaling, outlier removal — all handled automatically before training.',
        href: '#',
        cta: 'Learn more',
        className: '',
    },
    {
        Icon: Package,
        name: 'One-Click Export',
        description: 'Download trained models as production-ready packages. Deploy anywhere.',
        href: '#',
        cta: 'Learn more',
        className: '',
    },
]

/* ═══════════════════════════════════
   STEPS DATA
   ═══════════════════════════════════ */
const steps = [
    {
        num: '01',
        icon: Upload,
        title: 'Upload',
        desc: 'Drop your CSV, Excel, or image dataset. We profile it instantly.',
    },
    {
        num: '02',
        icon: Cpu,
        title: 'Train',
        desc: 'AI picks the best model, trains it, explains every decision.',
    },
    {
        num: '03',
        icon: BarChart3,
        title: 'Predict',
        desc: 'Use your model via the built-in Streamlit UI. No deployment needed.',
    },
]

/* ═══════════════════════════════════
   STATS DATA
   ═══════════════════════════════════ */
const stats = [
    { value: '10+', label: 'ML Models per run', icon: Zap },
    { value: '<5min', label: 'Avg training time', icon: Clock },
    { value: '100%', label: 'Open source', icon: Shield },
    { value: '0', label: 'Lines of code needed', icon: Code2 },
]

/* ═══════════════════════════════════
   TEAM DATA
   ═══════════════════════════════════ */
const team = [
    {
        quote: "Building a platform that makes machine learning accessible to everyone is a dream come true.",
        name: "Alok Gupta",
        designation: "Lead Developer",
        src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=3560&auto=format&fit=crop",
    },
    {
        quote: "Ensuring our AI models are explainable and transparent is key to user trust.",
        name: "Om Babar",
        designation: "AI Engineer",
        src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=3540&auto=format&fit=crop",
    },
    {
        quote: "Optimizing the training pipeline for speed and efficiency was a fun challenge.",
        name: "Bharatkumar Gungoman",
        designation: "Backend Engineer",
        src: "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=3540&auto=format&fit=crop",
    },
]

/* ═══════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate()
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToSection = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }

    return (
        <div className="landing-page">

            {/* ═══ NAVBAR ═══ */}
            <nav className={`landing-nav ${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="nav-inner">
                    <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <Sparkles size={22} className="brand-icon" />
                        <span className="brand-text">InferX-ML</span>
                    </div>

                    <div className="nav-links">
                        <button onClick={() => scrollToSection('features')} className="nav-link">Features</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="nav-link">How it Works</button>
                    </div>

                    <div className="nav-actions">
                        <button onClick={() => navigate('/login')} className="nav-link">Login</button>
                        <button onClick={() => navigate('/login')} className="nav-cta">
                            Get Started
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══ HERO with ContainerScroll ═══ */}
            <section className="hero-section">
                {/* Animated gradient orbs */}
                <div className="hero-orb orb-1" />
                <div className="hero-orb orb-2" />
                <div className="hero-orb orb-3" />
                <div className="hero-grid-bg" />

                <ContainerScroll
                    titleComponent={
                        <div className="hero-text">
                            <motion.div
                                className="hero-badge"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                            >
                                <Zap size={14} />
                                <span>No-Code ML Platform</span>
                            </motion.div>
                            <h1 className="hero-title">
                                Build ML Models.
                                <br />
                                <span className="hero-gradient-text">No Code. No Limits.</span>
                            </h1>
                            <p className="hero-subtitle">
                                Upload your data, describe your goal — InferX trains, explains,
                                and deploys models for you. Powered by AutoML and AI explainability.
                            </p>
                            <div className="hero-actions">
                                <button onClick={() => navigate('/login')} className="btn-hero-primary">
                                    <Sparkles size={18} />
                                    Get Started Free
                                    <ArrowRight size={18} />
                                </button>
                                <button onClick={() => scrollToSection('how-it-works')} className="btn-hero-secondary">
                                    See How It Works
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>
                    }
                >
                    {/* Mock dashboard inside the 3D card */}
                    <div className="hero-dashboard-mock">
                        <div className="mock-header">
                            <div className="mock-dots">
                                <span className="dot dot-red" />
                                <span className="dot dot-yellow" />
                                <span className="dot dot-green" />
                            </div>
                            <span className="mock-title">InferX-ML — Training</span>
                        </div>
                        <div className="mock-body">
                            <div className="mock-sidebar">
                                <div className="mock-nav-item active"><Database size={14} /> Datasets</div>
                                <div className="mock-nav-item"><Cpu size={14} /> Training</div>
                                <div className="mock-nav-item"><Package size={14} /> Models</div>
                                <div className="mock-nav-item"><BarChart3 size={14} /> Predictions</div>
                            </div>
                            <div className="mock-content">
                                <div className="mock-terminal">
                                    <div className="term-line"><span className="term-green">✓</span> Preprocessing complete</div>
                                    <div className="term-line"><span className="term-blue">⟳</span> Training RandomForest...</div>
                                    <div className="term-line"><span className="term-blue">⟳</span> Training XGBoost...</div>
                                    <div className="term-line"><span className="term-green">✓</span> Best model: XGBoost — 94.7%</div>
                                    <div className="term-line term-dim">█████████████░░ 87%</div>
                                </div>
                                <div className="mock-score-ring">
                                    <svg viewBox="0 0 120 120" className="ring-svg">
                                        <circle cx="60" cy="60" r="52" className="ring-bg" />
                                        <circle cx="60" cy="60" r="52" className="ring-fill" />
                                    </svg>
                                    <div className="ring-label">
                                        <span className="ring-value">94.7%</span>
                                        <span className="ring-text">Accuracy</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ContainerScroll>
            </section>

            {/* ═══ FEATURES (Bento Grid) ═══ */}
            <section id="features" className="features-section">
                <FadeIn>
                    <div className="section-label">
                        <Sparkles size={14} />
                        <span>Capabilities</span>
                    </div>
                    <h2 className="section-title">Everything you need to ship ML</h2>
                    <p className="section-subtitle">From raw data to production-ready models — without writing a single line of code.</p>
                </FadeIn>

                <FadeIn delay={0.1}>
                    <BentoGrid className="bento-3-rows">
                        {features.map((feature) => (
                            <BentoCard key={feature.name} {...feature} />
                        ))}
                    </BentoGrid>
                </FadeIn>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section id="how-it-works" className="steps-section">
                <FadeIn>
                    <div className="section-label">
                        <Zap size={14} />
                        <span>Workflow</span>
                    </div>
                    <h2 className="section-title">Three steps. That's it.</h2>
                    <p className="section-subtitle">No pipelines to configure. No infrastructure to manage.</p>
                </FadeIn>

                <div className="steps-row">
                    {steps.map((s, i) => (
                        <React.Fragment key={s.num}>
                            <FadeIn delay={i * 0.15}>
                                <div className="step-card">
                                    <span className="step-num">{s.num}</span>
                                    <div className="step-icon-wrap">
                                        <s.icon size={28} />
                                    </div>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            </FadeIn>
                            {i < steps.length - 1 && (
                                <div className="step-connector">
                                    <ArrowRight size={20} />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </section>

            {/* ═══ STATS STRIP ═══ */}
            <section className="stats-section">
                <div className="stats-row">
                    {stats.map((s, i) => (
                        <FadeIn key={s.label} delay={i * 0.1}>
                            <div className="stat-card">
                                <s.icon size={20} className="stat-icon" />
                                <span className="stat-value">{s.value}</span>
                                <span className="stat-label">{s.label}</span>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ═══ FINAL CTA ═══ */}
            <section className="cta-section">
                <FadeIn>
                    <div className="cta-content">
                        <h2>Ready to build smarter models?</h2>
                        <p>Start training in under 5 minutes. No credit card required.</p>
                        <button onClick={() => navigate('/login')} className="btn-hero-primary btn-lg">
                            <Sparkles size={20} />
                            Get Started Free
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </FadeIn>
                <div className="cta-orb cta-orb-1" />
                <div className="cta-orb cta-orb-2" />
            </section>

            {/* ═══ DEVELOPED BY ═══ */}
            <section className="team-section">
                <FadeIn>
                    <div className="section-label">
                        <Code2 size={14} />
                        <span>The Team</span>
                    </div>
                    <h2 className="section-title">Developed By</h2>
                    <p className="section-subtitle">The minds behind InferX-ML.</p>
                </FadeIn>

                <FadeIn delay={0.2}>
                    <AnimatedTestimonials testimonials={team} autoplay={true} />
                </FadeIn>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <Sparkles size={18} />
                        <span>InferX-ML</span>
                    </div>
                    <div className="footer-links">
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                            <Github size={16} /> GitHub
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('features') }}>
                            <BookOpen size={16} /> Docs
                        </a>
                    </div>
                    <span className="footer-copy">© 2026 InferX-ML. Made with ❤️</span>
                </div>
            </footer>
        </div>
    )
}
