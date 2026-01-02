import { NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Database,
    Cpu,
    Box,
    Sparkles,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import './Layout.css'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/datasets', icon: Database, label: 'Datasets' },
    { path: '/training', icon: Cpu, label: 'Training' },
    { path: '/models', icon: Box, label: 'Models' },
    { path: '/predictions', icon: Sparkles, label: 'Predictions' },
]

export default function Layout({ children }) {
    const [collapsed, setCollapsed] = useState(false)
    const { user, logout } = useAuthStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo">
                        <Sparkles className="logo-icon" />
                        {!collapsed && <span className="logo-text">InferX-ML</span>}
                    </div>
                    <button
                        className="collapse-btn"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                            end={item.path === '/'}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {!collapsed && user && (
                        <div className="user-info">
                            <div className="avatar">
                                {user.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="user-details">
                                <span className="username">{user.username}</span>
                                <span className="email">{user.email}</span>
                            </div>
                        </div>
                    )}
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
