import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import DatasetViewer from './pages/DatasetViewer'
import Training from './pages/Training'
import Models from './pages/Models'
import Predictions from './pages/Predictions'
import Login from './pages/Login'
import { useAuthStore } from './store/authStore'

function App() {
    const { isAuthenticated, checkAuth } = useAuthStore()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuth()
        setLoading(false)
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/landing" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/" />} />
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />

            {/* Protected routes */}
            <Route
                path="/*"
                element={
                    isAuthenticated ? (
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/datasets" element={<Datasets />} />
                                <Route path="/datasets/:datasetId/view" element={<DatasetViewer />} />
                                <Route path="/training" element={<Training />} />
                                <Route path="/models" element={<Models />} />
                                <Route path="/predictions/:modelId?" element={<Predictions />} />
                            </Routes>
                        </Layout>
                    ) : (
                        <LandingPage />
                    )
                }
            />
        </Routes>
    )
}

export default App
