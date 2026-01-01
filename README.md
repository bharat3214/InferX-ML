

# InferX ML

## Overview

**InferX ML** is a no-code machine learning platform designed to simplify the end-to-end ML workflow for **structured, time-series, and image data**. The platform enables users to upload datasets, automatically train predictive models, and generate insights and predictions **without writing any machine learning code**.

InferX ML follows a **rule-based AutoML approach**, where the system automatically performs data profiling, preprocessing, model selection, training, evaluation, and explainability. Instead of deploying models as external services, predictions are executed internally and displayed directly through an interactive user interface, keeping the system **simple, efficient, and easy to use**.

The platform is built entirely on **open-source technologies**, including **Streamlit** for the no-code interface, **Pandas and scikit-learn** for data processing and model training, and **MinIO** for scalable object storage of datasets, models, and artifacts. InferX ML is optimized for **educational use, rapid prototyping, and small-to-medium scale analytics**, while being architecturally ready to scale to distributed systems in future iterations.

---

## Key Highlights

* 🚀 **No-code, user-friendly ML workflow**
* 📊 **Supports tabular (CSV/Excel), time-series, and image datasets**
* ⚙️ **Automated data profiling, preprocessing, and model training**
* 📈 **Built-in model evaluation and explainability**
* 🧩 **Open-source, lightweight, and scalable-by-design**

---




Got it — thanks for clarifying.
You now have a **hybrid frontend architecture**, which is actually **very solid and realistic**.

I’ll give you a **clear architecture** and **end-to-end flow**, aligned exactly with:

* ✅ **React.js** → main product frontend
* ✅ **Flask** → backend API
* ✅ **PostgreSQL** → metadata / user / job tracking
* ✅ **Streamlit** → ML results & prediction UI
* ✅ **MinIO** → datasets, models, artifacts
* ✅ **Pandas-based AutoML (MVP)**

No confusion, no overlap.

---

# 🏗️ System Architecture (React + Flask + Streamlit + MinIO)

## High-Level Architecture

```
┌────────────────────────────────────────────┐
│              User Browser                  │
└───────────────┬───────────────┬────────────┘
                │               │
                │               │
                ▼               ▼
┌────────────────────────┐  ┌────────────────────────┐
│     React Frontend     │  │    Streamlit Frontend  │
│   (Main Application)   │  │   (Prediction & ML UI) │
│                        │  │                        │
│ • Login / Dashboard    │  │ • Training progress    │
│ • Dataset management   │  │ • Predictions          │
│ • Job history          │  │ • Charts & insights    │
└───────────────┬────────┘  └───────────────┬────────┘
                │ REST API                  │ REST / Python
                ▼                           ▼
┌────────────────────────────────────────────┐
│              Flask Backend                 │
│          (Core Orchestrator API)           │
│                                            │
│ • Auth & user management                   │
│ • Dataset registration                    │
│ • AutoML workflow control                 │
│ • Prediction orchestration                │
└───────────────┬───────────────┬────────────┘
                │               │
                │               │
                ▼               ▼
┌────────────────────────┐  ┌────────────────────────┐
│      PostgreSQL        │  │        MinIO            │
│   (Metadata Store)    │  │  (Object Storage)       │
│                        │  │                        │
│ • Users                │  │ • Raw datasets         │
│ • Experiments          │  │ • Processed data       │
│ • Job status           │  │ • Trained models       │
│ • Configs              │  │ • Pipelines            │
└────────────────────────┘  │ • Metrics & artifacts  │
                              └────────────────────────┘
```




# 🔄 Flow Summary

```
React UI
   ↓
Flask API
   ↓
MinIO (store data)
   ↓
Pandas AutoML
   ↓
Model + Artifacts → MinIO
   ↓
Streamlit UI
   ↓
Predictions in Browser
```



