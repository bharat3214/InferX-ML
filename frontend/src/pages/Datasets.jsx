import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Upload,
    FileSpreadsheet,
    Image,
    Trash2,
    X,
    CheckCircle,
    AlertCircle,
    Clock,
    Heart,
    Sprout,
    DollarSign,
    ShoppingCart,
    GraduationCap,
    Truck,
    BarChart3,
    Gamepad2,
    Layers,
    Download,
    Database,
    FolderUp,
    Microscope,
    TrendingUp,
    Users,
    Stethoscope,
    Wheat,
    PiggyBank,
    Package,
    BookOpen,
    MapPin,
    Activity,
    Dna,
    Brain,
    Pill,
    Bug,
    CloudRain,
    Landmark,
    CreditCard,
    BarChart2,
    Store,
    Star,
    ShoppingBag,
    School,
    FileText,
    Car,
    Shield,
    Plane,
    Film,
    Trophy,
    ExternalLink,
    Zap,
    Info
} from 'lucide-react'
import { datasetsApi } from '../services/api'
import './Datasets.css'

// ═══════════════════════════════════════════════════════
// IDs for which the backend has a working direct-download URL
// Keep in sync with backend SAMPLE_SOURCES keys
// ═══════════════════════════════════════════════════════
const DIRECT_DOWNLOAD_IDS = new Set([
    's-med-2', 's-med-3', 's-med-4',
    's-agr-1',
    's-fin-5',
    's-log-2',
    's-ana-1', 's-ana-2', 's-ana-3', 's-ana-4', 's-ana-5',
])

// ═══════════════════════════════════════════════════════
// Platform-provided sample datasets (categorized)
// ═══════════════════════════════════════════════════════
const CATEGORIES = [
    {
        id: 'medical',
        label: 'Medical & Health',
        icon: Heart,
        color: '#ef4468',
        glow: 'rgba(239, 68, 104, 0.16)',
        description: 'Healthcare, diagnostics & clinical datasets'
    },
    {
        id: 'agriculture',
        label: 'Agriculture',
        icon: Sprout,
        color: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.14)',
        description: 'Farming, crop & soil datasets'
    },
    {
        id: 'finance',
        label: 'Finance',
        icon: DollarSign,
        color: '#f5a623',
        glow: 'rgba(245, 166, 35, 0.14)',
        description: 'Banking, stocks & financial datasets'
    },
    {
        id: 'ecommerce',
        label: 'E-Commerce',
        icon: ShoppingCart,
        color: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.14)',
        description: 'Retail, products & customer datasets'
    },
    {
        id: 'education',
        label: 'Education',
        icon: GraduationCap,
        color: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.14)',
        description: 'Academic & student performance datasets'
    },
    {
        id: 'logistics',
        label: 'Logistics',
        icon: Truck,
        color: '#f97316',
        glow: 'rgba(249, 115, 22, 0.14)',
        description: 'Transportation & supply chain datasets'
    },
    {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        color: '#0ea5e9',
        glow: 'rgba(14, 165, 233, 0.14)',
        description: 'General purpose analytical datasets'
    },
    {
        id: 'entertainment',
        label: 'Entertainment',
        icon: Gamepad2,
        color: '#e839a0',
        glow: 'rgba(232, 57, 160, 0.14)',
        description: 'Movies, games & media datasets'
    }
]

const SAMPLE_DATASETS = [
    // ══════════════════════════════════════
    // Medical & Health (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-med-1', name: 'Lung Cancer Dataset', category: 'medical',
        description: 'Survey-based lung cancer data with 16 attributes — smoking, anxiety, fatigue, allergy & more',
        rows: 309, columns: 16, fileType: 'CSV', size: '6 KB', icon: Stethoscope,
        tags: ['classification', 'tabular'],
        source: 'kaggle.com/datasets/mysarahmadbhat/lung-cancer'
    },
    {
        id: 's-med-2', name: 'Pima Indians Diabetes', category: 'medical',
        description: 'NIDDK diagnostic data — glucose, BMI, insulin & 5 more features for diabetes prediction',
        rows: 768, columns: 9, fileType: 'CSV', size: '24 KB', icon: Activity,
        tags: ['classification', 'health'],
        source: 'kaggle.com/datasets/uciml/pima-indians-diabetes-database'
    },
    {
        id: 's-med-3', name: 'Breast Cancer Wisconsin (Diagnostic)', category: 'medical',
        description: 'FNA cell nuclei features — radius, texture, perimeter, area — for malignant/benign classification',
        rows: 569, columns: 32, fileType: 'CSV', size: '124 KB', icon: Dna,
        tags: ['classification', 'research'],
        source: 'kaggle.com/datasets/uciml/breast-cancer-wisconsin-data'
    },
    {
        id: 's-med-4', name: 'Drug Classification', category: 'medical',
        description: 'Patient age, sex, BP, cholesterol & Na/K ratio to classify suitable drug type (A/B/C/X/Y)',
        rows: 200, columns: 6, fileType: 'CSV', size: '5 KB', icon: Pill,
        tags: ['classification', 'pharma'],
        source: 'kaggle.com/datasets/prathamtripathi/drug-classification'
    },
    {
        id: 's-med-5', name: 'Stroke Prediction Dataset', category: 'medical',
        description: 'Patient demographics, hypertension, heart disease, glucose & BMI for stroke risk prediction',
        rows: 5110, columns: 12, fileType: 'CSV', size: '312 KB', icon: Brain,
        tags: ['classification', 'risk'],
        source: 'kaggle.com/datasets/fedesoriano/stroke-prediction-dataset'
    },

    // ══════════════════════════════════════
    // Agriculture (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-agr-1', name: 'Crop Recommendation Dataset', category: 'agriculture',
        description: 'N, P, K, temperature, humidity, pH & rainfall measurements for 22 crop recommendations',
        rows: 2200, columns: 8, fileType: 'CSV', size: '146 KB', icon: Wheat,
        tags: ['classification', 'soil'],
        source: 'kaggle.com/datasets/atharvaingle/crop-recommendation-dataset'
    },
    {
        id: 's-agr-2', name: 'Crop Yield Prediction', category: 'agriculture',
        description: 'FAO historical crop yield data with pesticides, rainfall & temperature across 101 countries',
        rows: 28242, columns: 10, fileType: 'CSV', size: '1.8 MB', icon: TrendingUp,
        tags: ['regression', 'forecast'],
        source: 'kaggle.com/datasets/patelris/crop-yield-prediction-dataset'
    },
    {
        id: 's-agr-3', name: 'New Plant Diseases Dataset', category: 'agriculture',
        description: '87K RGB leaf images across 38 disease classes — apple, corn, tomato, potato & more',
        rows: 87000, columns: 3, fileType: 'ZIP', size: '2.6 GB', icon: Bug,
        tags: ['image', 'deep-learning'],
        source: 'kaggle.com/datasets/vipoooool/new-plant-diseases-dataset'
    },
    {
        id: 's-agr-4', name: 'Rainfall in India (1901-2015)', category: 'agriculture',
        description: '115 years of monthly rainfall data across 36 Indian subdivisions for climate analysis',
        rows: 4116, columns: 19, fileType: 'CSV', size: '350 KB', icon: CloudRain,
        tags: ['timeseries', 'climate'],
        source: 'kaggle.com/datasets/rajanand/rainfall-in-india'
    },
    {
        id: 's-agr-5', name: 'Fertilizer Prediction Dataset', category: 'agriculture',
        description: 'Soil type, crop type, temperature, humidity, moisture, nitrogen, potassium & phosphorus data',
        rows: 99, columns: 8, fileType: 'CSV', size: '3 KB', icon: Sprout,
        tags: ['classification', 'soil'],
        source: 'kaggle.com/datasets/gdabhishek/fertilizer-prediction'
    },

    // ══════════════════════════════════════
    // Finance (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-fin-1', name: 'Loan Approval Prediction', category: 'finance',
        description: 'CIBIL score, income, employment status, loan amount & assets for loan approval modeling',
        rows: 4269, columns: 13, fileType: 'CSV', size: '290 KB', icon: Landmark,
        tags: ['classification', 'risk'],
        source: 'kaggle.com/datasets/architsharma01/loan-approval-prediction-dataset'
    },
    {
        id: 's-fin-2', name: 'Credit Card Fraud Detection', category: 'finance',
        description: 'European cardholder Sept 2013 transactions — 284,807 records, 492 frauds (0.17%), PCA features',
        rows: 284807, columns: 31, fileType: 'CSV', size: '144 MB', icon: CreditCard,
        tags: ['anomaly-detection', 'imbalanced'],
        source: 'kaggle.com/datasets/mlg-ulb/creditcardfraud'
    },
    {
        id: 's-fin-3', name: 'Stock Market Dataset', category: 'finance',
        description: 'Daily open/high/low/close prices & volume for predictive analysis in financial markets',
        rows: 13647, columns: 7, fileType: 'CSV', size: '1.2 MB', icon: BarChart2,
        tags: ['timeseries', 'LSTM'],
        source: 'kaggle.com/datasets/jacksoncrow/stock-market-dataset'
    },
    {
        id: 's-fin-4', name: 'Bank Customer Churn', category: 'finance',
        description: 'Customer demographics, credit score, balance, tenure & product usage for churn prediction',
        rows: 10000, columns: 14, fileType: 'CSV', size: '820 KB', icon: PiggyBank,
        tags: ['classification', 'retention'],
        source: 'kaggle.com/datasets/mathchi/churn-for-bank-customers'
    },
    {
        id: 's-fin-5', name: 'Medical Insurance Charges', category: 'finance',
        description: 'Age, sex, BMI, children, smoker status & region for predicting individual medical costs',
        rows: 1338, columns: 7, fileType: 'CSV', size: '16 KB', icon: Shield,
        tags: ['regression', 'insurance'],
        source: 'kaggle.com/datasets/mirichoi0218/insurance'
    },

    // ══════════════════════════════════════
    // E-Commerce (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-eco-1', name: 'Amazon Fine Food Reviews', category: 'ecommerce',
        description: '568K+ consumer reviews for Amazon products with ratings, review text & helpfulness scores',
        rows: 568454, columns: 10, fileType: 'CSV', size: '74 MB', icon: Star,
        tags: ['NLP', 'sentiment'],
        source: 'kaggle.com/datasets/snap/amazon-fine-food-reviews'
    },
    {
        id: 's-eco-2', name: 'Online Shoppers Intention', category: 'ecommerce',
        description: '12,330 browsing sessions — page values, bounce rates, special day proximity for purchase intent',
        rows: 12330, columns: 18, fileType: 'CSV', size: '1.1 MB', icon: ShoppingBag,
        tags: ['classification', 'behavior'],
        source: 'kaggle.com/datasets/imakash3011/online-shoppers-purchasing-intention-dataset'
    },
    {
        id: 's-eco-3', name: 'E-Commerce Customer Churn', category: 'ecommerce',
        description: 'Customer tenure, login devices, order frequency, cashback & complaint data for churn analysis',
        rows: 5630, columns: 20, fileType: 'XLSX', size: '690 KB', icon: Package,
        tags: ['classification', 'churn'],
        source: 'kaggle.com/datasets/ankitverma2010/ecommerce-customer-churn-analysis-and-prediction'
    },
    {
        id: 's-eco-4', name: 'Store Sales — Time Series', category: 'ecommerce',
        description: 'Corporación Favorita grocery sales: 54 stores, 33 product families, oil prices & holidays',
        rows: 3000888, columns: 6, fileType: 'CSV', size: '120 MB', icon: Store,
        tags: ['timeseries', 'regression'],
        source: 'kaggle.com/competitions/store-sales-time-series-forecasting'
    },
    {
        id: 's-eco-5', name: 'Brazilian E-Commerce (Olist)', category: 'ecommerce',
        description: '100K orders from Olist marketplace — customer reviews, geolocation, payments & seller data',
        rows: 99441, columns: 8, fileType: 'CSV', size: '45 MB', icon: ShoppingCart,
        tags: ['analysis', 'multi-table'],
        source: 'kaggle.com/datasets/olistbr/brazilian-ecommerce'
    },

    // ══════════════════════════════════════
    // Education (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-edu-1', name: 'Students Performance in Exams', category: 'education',
        description: 'Student marks in math, reading & writing with gender, ethnicity, parental education & test prep',
        rows: 1000, columns: 8, fileType: 'CSV', size: '58 KB', icon: School,
        tags: ['regression', 'analysis'],
        source: 'kaggle.com/datasets/spscientist/students-performance-in-exams'
    },
    {
        id: 's-edu-2', name: 'Student Performance (Portuguese Schools)', category: 'education',
        description: 'Math & Portuguese grades with family, social & school features from two secondary schools',
        rows: 649, columns: 33, fileType: 'CSV', size: '42 KB', icon: BookOpen,
        tags: ['classification', 'regression'],
        source: 'kaggle.com/datasets/dipam7/student-grade-prediction'
    },
    {
        id: 's-edu-3', name: 'xAPI Educational Mining Dataset', category: 'education',
        description: '480 students with behavior features — raised hands, visited resources, discussion for grade prediction',
        rows: 480, columns: 17, fileType: 'CSV', size: '28 KB', icon: Users,
        tags: ['classification', 'behavior'],
        source: 'kaggle.com/datasets/aljarah/xAPI-Edu-Data'
    },
    {
        id: 's-edu-4', name: 'Graduate Admissions Prediction', category: 'education',
        description: 'GRE, TOEFL, university rating, SOP, LOR, CGPA & research experience for admit chance prediction',
        rows: 500, columns: 9, fileType: 'CSV', size: '10 KB', icon: GraduationCap,
        tags: ['regression', 'admissions'],
        source: 'kaggle.com/datasets/mohansacharya/graduate-admissions'
    },
    {
        id: 's-edu-5', name: 'World University Rankings', category: 'education',
        description: 'THE, CWUR & Shanghai rankings with scores for teaching, research, citations & industry income',
        rows: 2603, columns: 14, fileType: 'CSV', size: '800 KB', icon: FileText,
        tags: ['analysis', 'ranking'],
        source: 'kaggle.com/datasets/mylesoneill/world-university-rankings'
    },

    // ══════════════════════════════════════
    // Logistics (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-log-1', name: 'Delivery Logistics Dataset', category: 'logistics',
        description: 'Partner, vehicle, region, distance, weather, congestion & cost data for delay prediction',
        rows: 45000, columns: 12, fileType: 'CSV', size: '5.2 MB', icon: MapPin,
        tags: ['classification', 'delay'],
        source: 'kaggle.com/datasets/ramakrishnanthiyagu/delivery-logistics-dataset'
    },
    {
        id: 's-log-2', name: 'Auto MPG Dataset', category: 'logistics',
        description: 'Car displacement, horsepower, weight & acceleration for miles-per-gallon fuel efficiency prediction',
        rows: 398, columns: 9, fileType: 'CSV', size: '18 KB', icon: Car,
        tags: ['regression', 'classic'],
        source: 'kaggle.com/datasets/uciml/autompg-dataset'
    },
    {
        id: 's-log-3', name: 'Flight Price Prediction', category: 'logistics',
        description: 'Airline, source, destination, stops, departure & arrival for domestic flight price forecasting',
        rows: 300153, columns: 12, fileType: 'CSV', size: '25 MB', icon: Plane,
        tags: ['regression', 'travel'],
        source: 'kaggle.com/datasets/shubhambathwal/flight-price-prediction'
    },
    {
        id: 's-log-4', name: 'Supply Chain Shipment Dataset', category: 'logistics',
        description: 'DataCo supply chain — order info, shipping mode, delivery status, profit & late delivery risk',
        rows: 180519, columns: 53, fileType: 'CSV', size: '34 MB', icon: Package,
        tags: ['classification', 'supply-chain'],
        source: 'kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis'
    },
    {
        id: 's-log-5', name: 'Vehicle Dataset (CarDekho)', category: 'logistics',
        description: 'Used car listings — year, fuel type, seller type, transmission, km driven for resale price prediction',
        rows: 15411, columns: 13, fileType: 'CSV', size: '1.1 MB', icon: Truck,
        tags: ['regression', 'pricing'],
        source: 'kaggle.com/datasets/nehalbirla/vehicle-dataset-from-cardekho'
    },

    // ══════════════════════════════════════
    // Analytics (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-ana-1', name: 'Mall Customer Segmentation', category: 'analytics',
        description: 'Customer ID, age, gender, annual income & spending score for unsupervised clustering',
        rows: 200, columns: 5, fileType: 'CSV', size: '4 KB', icon: Users,
        tags: ['clustering', 'unsupervised'],
        source: 'kaggle.com/datasets/vjchoudhary7/customer-segmentation-tutorial-in-python'
    },
    {
        id: 's-ana-2', name: 'Iris Flower Dataset', category: 'analytics',
        description: 'Classic Fisher dataset — sepal/petal length & width for 3 iris species classification',
        rows: 150, columns: 5, fileType: 'CSV', size: '4 KB', icon: Microscope,
        tags: ['classification', 'beginner'],
        source: 'kaggle.com/datasets/uciml/iris'
    },
    {
        id: 's-ana-3', name: 'Titanic — Machine Learning', category: 'analytics',
        description: 'Passenger class, age, sex, fare, cabin & embarkation data for survival prediction',
        rows: 891, columns: 12, fileType: 'CSV', size: '60 KB', icon: FileText,
        tags: ['classification', 'beginner'],
        source: 'kaggle.com/competitions/titanic'
    },
    {
        id: 's-ana-4', name: 'California Housing Prices', category: 'analytics',
        description: '1990 census block-group data — median income, ocean proximity & house values for price regression',
        rows: 20640, columns: 10, fileType: 'CSV', size: '1.3 MB', icon: TrendingUp,
        tags: ['regression', 'geo'],
        source: 'kaggle.com/datasets/camnugent/california-housing-prices'
    },
    {
        id: 's-ana-5', name: 'Red Wine Quality', category: 'analytics',
        description: 'Physicochemical inputs — acidity, sugar, chlorides, sulfur, pH, alcohol — for quality score prediction',
        rows: 1599, columns: 12, fileType: 'CSV', size: '84 KB', icon: BarChart3,
        tags: ['regression', 'classification'],
        source: 'kaggle.com/datasets/uciml/red-wine-quality-cortez-et-al-2009'
    },

    // ══════════════════════════════════════
    // Entertainment (5 real Kaggle datasets)
    // ══════════════════════════════════════
    {
        id: 's-ent-1', name: 'IMDB 50K Movie Reviews', category: 'entertainment',
        description: '50,000 movie reviews with binary sentiment labels (25K positive, 25K negative) for NLP',
        rows: 50000, columns: 2, fileType: 'CSV', size: '63 MB', icon: Star,
        tags: ['NLP', 'sentiment'],
        source: 'kaggle.com/datasets/lakshmi25npathi/imdb-dataset-of-50k-movie-reviews'
    },
    {
        id: 's-ent-2', name: 'Spotify Tracks Dataset', category: 'entertainment',
        description: 'Audio features — danceability, energy, tempo, valence — across 125 genres for music analysis',
        rows: 114000, columns: 21, fileType: 'CSV', size: '19 MB', icon: Activity,
        tags: ['classification', 'audio'],
        source: 'kaggle.com/datasets/maharshipandya/spotify-tracks-dataset'
    },
    {
        id: 's-ent-3', name: 'Netflix Movies and TV Shows', category: 'entertainment',
        description: '8,800+ titles with cast, country, rating, duration & genre — content analysis & recommendation',
        rows: 8807, columns: 12, fileType: 'CSV', size: '3.3 MB', icon: Film,
        tags: ['analysis', 'NLP'],
        source: 'kaggle.com/datasets/shivamb/netflix-shows'
    },
    {
        id: 's-ent-4', name: 'Video Game Sales', category: 'entertainment',
        description: '16,500+ video games with platform, year, genre, publisher & global regional sales data',
        rows: 16598, columns: 11, fileType: 'CSV', size: '1.4 MB', icon: Trophy,
        tags: ['analysis', 'regression'],
        source: 'kaggle.com/datasets/gregorut/videogamesales'
    },
    {
        id: 's-ent-5', name: 'TMDB 5000 Movie Dataset', category: 'entertainment',
        description: '5,000 movies with budget, revenue, genres, keywords, cast & crew for box office prediction',
        rows: 4803, columns: 20, fileType: 'CSV', size: '5.4 MB', icon: Film,
        tags: ['regression', 'NLP'],
        source: 'kaggle.com/datasets/tmdb/tmdb-movie-metadata'
    },
]

function getCategoryById(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]
}

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════
export default function Datasets() {
    const [showUpload, setShowUpload] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [selectedDataset, setSelectedDataset] = useState(null)
    const [activeCategory, setActiveCategory] = useState('all')
    const [activeTab, setActiveTab] = useState('my-uploads') // 'my-uploads' | 'library'
    const [usingSampleId, setUsingSampleId] = useState(null)
    const [toast, setToast] = useState(null) // { type: 'success' | 'info' | 'error', message, link? }
    const fileInputRef = useRef()
    const queryClient = useQueryClient()
    const toastTimerRef = useRef(null)

    const showToast = useCallback((type, message, link = null, duration = 6000) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        setToast({ type, message, link })
        toastTimerRef.current = setTimeout(() => setToast(null), duration)
    }, [])

    useEffect(() => {
        return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }
    }, [])

    // ── User uploaded datasets ──
    const { data, isLoading } = useQuery({
        queryKey: ['datasets'],
        queryFn: () => datasetsApi.list()
    })
    const userDatasets = data?.data?.datasets || []

    // ── Mutations ──
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

    const useSampleMutation = useMutation({
        mutationFn: (sampleId) => datasetsApi.useSample(sampleId),
        onSuccess: (res) => {
            queryClient.invalidateQueries(['datasets'])
            setUsingSampleId(null)
            setActiveTab('my-uploads')
            const newDataset = res?.data?.dataset
            if (newDataset) {
                setSelectedDataset(newDataset)
                showToast('success', `"${newDataset.name}" added to your uploads!`)
            }
        },
        onError: (err) => {
            const failedId = usingSampleId
            setUsingSampleId(null)
            const status = err?.response?.status
            const msg = err?.response?.data?.error || 'Failed to add sample dataset'
            if (status === 404) {
                // Dataset not available for direct download — guide user to Kaggle
                const sample = SAMPLE_DATASETS.find(s => s.id === failedId)
                if (sample?.source) {
                    showToast(
                        'info',
                        `"${sample.name}" isn't available for instant download. Opening Kaggle so you can download it manually…`,
                        `https://${sample.source}`
                    )
                    setTimeout(() => window.open(`https://${sample.source}`, '_blank'), 1200)
                } else {
                    showToast('error', msg)
                }
            } else {
                showToast('error', msg)
            }
        }
    })

    const handleUseSample = (sample) => {
        // For Kaggle-only datasets, skip the API call entirely
        if (!DIRECT_DOWNLOAD_IDS.has(sample.id)) {
            if (sample.source) {
                showToast(
                    'info',
                    `"${sample.name}" requires manual download from Kaggle. Opening the page for you…`,
                    `https://${sample.source}`
                )
                setTimeout(() => window.open(`https://${sample.source}`, '_blank'), 800)
            }
            return
        }
        setUsingSampleId(sample.id)
        useSampleMutation.mutate(sample.id)
    }

    const handleFileSelect = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)
        setUploading(true)
        uploadMutation.mutate(formData)
    }

    // ── Filter sample datasets by category ──
    const filteredSamples = activeCategory === 'all'
        ? SAMPLE_DATASETS
        : SAMPLE_DATASETS.filter(d => d.category === activeCategory)

    // ── Helpers ──
    const getFileIcon = (fileType) => {
        if (['jpg', 'jpeg', 'png', 'zip'].includes(fileType)) return <Image size={20} />
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

    const formatNumber = (n) => {
        if (!n) return '—'
        return n.toLocaleString()
    }

    return (
        <div className="datasets-page">
            {/* ════════ Page Header ════════ */}
            <div className="ds-page-header">
                <div className="ds-header-left">
                    <h1 className="ds-title">
                        <Database size={28} className="ds-title-icon" />
                        Datasets
                    </h1>
                    <p className="ds-subtitle">Explore sample datasets or upload your own</p>
                </div>
                <button className="btn btn-primary ds-upload-btn" onClick={() => setShowUpload(true)}>
                    <Upload size={18} />
                    Upload Dataset
                </button>
            </div>

            {/* ════════ Tab Switcher ════════ */}
            <div className="ds-tabs">
                <button
                    className={`ds-tab ${activeTab === 'my-uploads' ? 'ds-tab-active' : ''}`}
                    onClick={() => setActiveTab('my-uploads')}
                >
                    <FolderUp size={16} />
                    My Uploads
                    <span className="ds-tab-count">{userDatasets.length}</span>
                </button>
                <button
                    className={`ds-tab ${activeTab === 'library' ? 'ds-tab-active' : ''}`}
                    onClick={() => setActiveTab('library')}
                >
                    <Layers size={16} />
                    Dataset Library
                    <span className="ds-tab-count">{SAMPLE_DATASETS.length}</span>
                </button>
            </div>

            {/* ════════════════════════════════════════════
                 TAB 1: Dataset Library (categorized samples)
                 ════════════════════════════════════════════ */}
            {activeTab === 'library' && (
                <div className="ds-library">
                    {/* Category Pills */}
                    <div className="ds-category-pills">
                        <button
                            className={`ds-pill ${activeCategory === 'all' ? 'ds-pill-active' : ''}`}
                            onClick={() => setActiveCategory('all')}
                            style={activeCategory === 'all' ? {
                                '--pill-color': '#10b981',
                                background: 'rgba(16, 185, 129, 0.15)',
                                borderColor: '#10b981',
                                color: '#10b981'
                            } : {}}
                        >
                            <Layers size={14} />
                            All
                            <span className="ds-pill-count">{SAMPLE_DATASETS.length}</span>
                        </button>
                        {CATEGORIES.map(cat => {
                            const count = SAMPLE_DATASETS.filter(d => d.category === cat.id).length
                            return (
                                <button
                                    key={cat.id}
                                    className={`ds-pill ${activeCategory === cat.id ? 'ds-pill-active' : ''}`}
                                    onClick={() => setActiveCategory(cat.id)}
                                    style={activeCategory === cat.id ? {
                                        '--pill-color': cat.color,
                                        background: cat.glow,
                                        borderColor: cat.color,
                                        color: cat.color
                                    } : {}}
                                >
                                    <cat.icon size={14} />
                                    {cat.label}
                                    <span className="ds-pill-count">{count}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Active category description */}
                    {activeCategory !== 'all' && (
                        <div className="ds-cat-desc" style={{ color: getCategoryById(activeCategory).color }}>
                            {getCategoryById(activeCategory).description}
                        </div>
                    )}

                    {/* Sample Dataset Cards */}
                    <div className="ds-sample-grid">
                        {filteredSamples.map((sample, i) => {
                            const cat = getCategoryById(sample.category)
                            const SampleIcon = sample.icon
                            return (
                                <div
                                    key={sample.id}
                                    className="ds-sample-card"
                                    style={{
                                        '--cat-color': cat.color,
                                        '--cat-glow': cat.glow
                                    }}
                                >
                                    <div className="ds-sample-body">
                                        <div className="ds-sample-top">
                                            <div className="ds-sample-icon" style={{ background: cat.glow, color: cat.color }}>
                                                <SampleIcon size={20} />
                                            </div>
                                            <div className="ds-sample-cat-badge" style={{ background: cat.glow, color: cat.color }}>
                                                <cat.icon size={11} />
                                                {cat.label}
                                            </div>
                                        </div>
                                        <h3 className="ds-sample-name">{sample.name}</h3>
                                        <p className="ds-sample-desc">{sample.description}</p>
                                        <div className="ds-sample-meta">
                                            <span>{formatNumber(sample.rows)} rows</span>
                                            <span className="ds-dot">•</span>
                                            <span>{sample.columns} cols</span>
                                            <span className="ds-dot">•</span>
                                            <span>{sample.size}</span>
                                        </div>
                                        <div className="ds-sample-tags">
                                            {sample.tags.map(tag => (
                                                <span key={tag} className="ds-tag">{tag}</span>
                                            ))}
                                        </div>

                                        <div className="ds-sample-actions">
                                            <button
                                                className="ds-use-btn"
                                                style={{ background: cat.color }}
                                                disabled={usingSampleId === sample.id}
                                                onClick={() => handleUseSample(sample)}
                                            >
                                                {usingSampleId === sample.id ? (
                                                    <><span className="ds-btn-spinner" /> Adding...</>
                                                ) : DIRECT_DOWNLOAD_IDS.has(sample.id) ? (
                                                    <><Download size={14} /> Use Dataset</>
                                                ) : (
                                                    <><ExternalLink size={14} /> Get from Kaggle</>
                                                )}
                                            </button>
                                            {sample.source && (
                                                <a
                                                    href={`https://${sample.source}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ds-kaggle-link"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    View on Kaggle ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════
                 TAB 2: My Uploads (user uploaded, no categories)
                 ════════════════════════════════════════════ */}
            {activeTab === 'my-uploads' && (
                <div className="ds-my-uploads">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading your datasets...</p>
                        </div>
                    ) : userDatasets.length > 0 ? (
                        <div className="ds-user-grid">
                            {userDatasets.map((dataset) => (
                                <div
                                    key={dataset.id}
                                    className="ds-user-card"
                                    onClick={() => setSelectedDataset(dataset)}
                                >
                                    <div className="ds-user-card-body">
                                        <div className="ds-user-card-top">
                                            <div className="ds-user-icon">
                                                {getFileIcon(dataset.file_type)}
                                            </div>
                                            <div className="ds-user-status">
                                                {getStatusBadge(dataset.profile_status)}
                                            </div>
                                        </div>
                                        <h3 className="ds-user-name" title={dataset.name}>{dataset.name}</h3>
                                        <p className="ds-user-meta">
                                            {dataset.file_type?.toUpperCase()} • {formatFileSize(dataset.file_size)}
                                        </p>
                                        {dataset.num_rows && (
                                            <p className="ds-user-stats">
                                                {dataset.num_rows.toLocaleString()} rows × {dataset.num_columns} columns
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="ds-empty card">
                            <FolderUp size={48} className="ds-empty-icon" />
                            <h3>No uploads yet</h3>
                            <p>Upload your own dataset to get started with training</p>
                            <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                                <Upload size={18} />
                                Upload Dataset
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ════════ Upload Modal ════════ */}
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
                                            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
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

            {/* ════════ Dataset Details Modal (user-uploaded) ════════ */}
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
                            <button
                                className="btn btn-outline"
                                onClick={() => window.open(`/datasets/${selectedDataset.id}/view`, '_blank')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    color: '#10b981'
                                }}
                            >
                                <ExternalLink size={16} />
                                View Dataset
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
            {/* ════════ Toast Notification ════════ */}
            {toast && (
                <div className={`ds-toast ds-toast-${toast.type}`}>
                    <div className="ds-toast-icon">
                        {toast.type === 'success' && <CheckCircle size={18} />}
                        {toast.type === 'info' && <Info size={18} />}
                        {toast.type === 'error' && <AlertCircle size={18} />}
                    </div>
                    <div className="ds-toast-content">
                        <span>{toast.message}</span>
                        {toast.link && (
                            <a href={toast.link} target="_blank" rel="noopener noreferrer" className="ds-toast-link">
                                Open Kaggle <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                    <button className="ds-toast-close" onClick={() => setToast(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    )
}
