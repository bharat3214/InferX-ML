# InferX-ML: No-Code AI/ML Platform

InferX-ML is a comprehensive, no-code machine learning platform designed to allow users to build predictive, forecasting, and computer vision models without writing a single line of code. Users can upload datasets, describe their goals in natural language, and the system automatically trains, evaluates, and packages the best model with an auto-generated Streamlit UI for instant predictions.

## 🚀 Key Features

- **No-Code Web Interface:** Intuitive React.js frontend for managing datasets, training jobs, and viewing models.
- **Natural Language AI Analysis:** Integration with Gemini/Groq APIs to automatically suggest target columns and problem types based on natural language prompts.
- **AutoML Pipeline:** Rule-based model selection. The platform handles classification, regression, clustering, time-series forecasting, and image classification behind the scenes.
- **Advanced Preprocessing Engine:**
  - **Tabular:** Robust scaling, missing value imputation, constant feature removal.
  - **Time-Series:** Cyclical feature encoding (sine/cosine waves), outlier clipping (Winsorization).
  - **Image:** Robust augmentations (random rotations and zooms), balanced class weighting.
- **Dynamic Prediction Apps:** Generates a personalized Streamlit UI from a JSON schema for each trained model, allowing instant inference.
- **Model Explainability:** Integrates SHAP & LIME for understanding model decisions.
- **CPU-Optimized Setup:** Completely Dockerized and configured for CPU-only training and inference.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Tailwind CSS, Zustand, Recharts, Framer Motion
- **Backend:** Python 3.10+, Flask, Celery, SQLAlchemy
- **Database & Storage:** PostgreSQL, MinIO, Redis
- **ML Engine:** scikit-learn, XGBoost, LightGBM, Prophet, TensorFlow-CPU, OpenCV, imbalanced-learn
- **Machine Learning UI:** Streamlit
- **DevOps:** Docker, Docker Compose

## 📁 Project Structure

```text
InferX-ML/
├── frontend/          # React + Vite frontend application
├── backend/           # Flask API, Celery Tasks, DB Models
├── ml_engine/         # Core ML & AutoML pipelines (tabular, timeseries, vision, explainability)
├── streamlit_app/     # Dynamic model prediction and evaluation UI
├── docker/            # Dockerfiles for each service
└── docker-compose.yml # Orchestration configuration
```

## ⚙️ Setup and Installation

### Prerequisites
- Docker and Docker Compose
- Gemini API Key (or Groq API Key) for the AI-powered goal analysis

### Step-by-Step Guide

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd InferX-ML
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and add your API keys.
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to include:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   DEVICE_TYPE=cpu
   ```

3. **Start the Services:**
   Run the full stack using Docker Compose. This will spin up PostgreSQL, Redis, MinIO, the Flask Backend, Celery Worker, React Frontend, and the Streamlit App.
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Application:**
   - **Frontend Dashboard:** `http://localhost:3000`
   - **Backend API:** `http://localhost:5000`
   - **Streamlit Predictions App:** `http://localhost:8501`
   - **MinIO Console:** `http://localhost:9001` (Credentials: `minioadmin` / `minioadmin`)

## 📊 Supported Data & Tasks

| Data Type | Supported Formats | Example Tasks | Models Used |
|-----------|------------------|---------------|-------------|
| **Tabular** | `.csv`, `.xlsx` | Classification, Regression, Clustering | Random Forest, XGBoost, LightGBM, Logistic Regression, K-Means |
| **Time-Series** | `.csv` (date columns) | Forecasting, Anomaly Detection | Prophet, statsmodels (ARIMA) |
| **Image** | `.jpg`, `.png`, `.zip` | Image Classification (Object Detection) | TensorFlow-CPU, ultralytics (YOLOv8) |

## 🔄 User Journey

1. **Upload Dataset:** Upload your tabular data or organized image folders as ZIP.
2. **Describe Goal:** Tell the AI what you want to achieve (e.g., "Predict customer churn"). The AI will identify the target column and task type.
3. **Train Model:** The AutoML engine trains multiple algorithms, applies advanced preprocessing, and selects the best performer.
4. **Predict & Export:** Load the model directly in the integrated Streamlit app to test predictions interactively, or download the complete model package (`.pkl`/`.h5` + `feature_schema.json` + `ui_schema.json`).

## 🛡️ Architecture & Components
- **API Orchestrator:** Flask handles user requests, MinIO uploads, and dispatches training jobs to Redis/Celery.
- **ML Engine:** A scalable Python engine that dynamically determines the optimal preprocessing strategy (e.g., sine/cosine transformations for dates).
- **Dynamic UI Generation:** The engine creates a `ui_schema.json` which the Streamlit app reads to build interactive forms out of the box dynamically via the internal network.