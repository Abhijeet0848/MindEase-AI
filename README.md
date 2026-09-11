# MindEase AI — Student Emotional Wellness & Habit Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel_App-000000.svg?style=for-the-badge&logo=vercel&logoColor=white)](https://mind-ease-ai-seven.vercel.app/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.3%2B-F7931E.svg)](https://scikit-learn.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.0-FF6384.svg)](https://www.chartjs.org/)

> 🌐 **Live Web Application**: [https://mind-ease-ai-seven.vercel.app/](https://mind-ease-ai-seven.vercel.app/)  
> 📖 **API Docs & Swagger**: [https://mind-ease-ai-seven.vercel.app/docs](https://mind-ease-ai-seven.vercel.app/docs)

An end-to-end Machine Learning web application designed to predict, evaluate, and optimize university student emotional wellness scores ($0.0 - 10.0$). Features real-time regression inference, **Explainable AI (XAI)** factor contributions, **"What-If" Counterfactual habit simulation**, **5-axis lifestyle radar equilibrium**, and **4-7-8 neuro-vagal breathing decompression**.

---

## 📌 1. Project Abstract & Objectives

University students experience complex interactions between academic demands, digital screen time, social media consumption, sleep disruption, and perceived stress. 

**MindEase AI** provides:
1. **Accurate Predictive Modeling**: Leverages an ensemble **Random Forest Regressor** trained on 5,000+ benchmarked student survey records.
2. **Transparent Explainability (XAI)**: Quantifies exact positive and negative factor contributions driving individual wellness scores.
3. **Actionable Counterfactual Simulation**: Allows students to simulate habit shifts (e.g. *+1.5h sleep*, *-2.0h screen time*) with 1-click auto-optimization.
4. **Tailored Habit Prescriptions**: Produces prioritized, science-backed behavioral recommendations.

---

## 🧠 2. Machine Learning Architecture & Pipeline

### A. Preprocessing Pipeline (`sklearn.compose.ColumnTransformer`)

The raw feature space is processed through a heterogeneous ColumnTransformer pipeline:

```
                                  ┌───────────────────────────────┐
                                  │   Raw Student Survey Input    │
                                  └───────────────┬───────────────┘
                                                  │
            ┌─────────────────────┬───────────────┴───────────────┬─────────────────────┐
            ▼                     ▼                               ▼                     ▼
┌───────────────────────┐ ┌───────────────┐             ┌───────────────────┐ ┌───────────────────┐
│     Study_Hours       │ │ Numeric Data  │             │   Stress_Level    │ │ Categorical Data  │
│ (Log1p + Scaler)      │ │ (Z-Score Scal)│             │ (Ordinal Encoder) │ │ (One-Hot Encoder) │
└───────────┬───────────┘ └───────┬───────┘             └─────────┬─────────┘ └─────────┬─────────┘
            │                     │                               │                     │
            └─────────────────────┼───────────────────────────────┴─────────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Transformed Feature Space │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   RandomForestRegressor   │
                    │      (n_estimators=100)   │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Emotional Wellness Score  │
                    │        (0.0 - 10.0)       │
                    └───────────────────────────┘
```

1. **Skew Correction Pipeline**:
   - Features: `Study_Hours`
   - Transformer: `FunctionTransformer(np.log1p)` followed by `StandardScaler` to normalize heavily right-skewed academic study loads.
2. **Standard Continuous Scaling**:
   - Features: `Age`, `Avg_Daily_Usage_Hours`, `Daily_Unlocks`, `Physical_Activity_Hours`, `Sleep_Hours_Per_Night`
   - Transformer: `StandardScaler` ($z = \frac{x - \mu}{\sigma}$).
3. **Ordinal Encoding**:
   - Feature: `Stress_Level`
   - Mapping: `['Low': 0, 'Medium': 1, 'High': 2, 'Very High': 3]`
4. **Categorical One-Hot Encoding**:
   - Features: `Gender`, `Academic_Level`, `Most_Used_Platform`, `Purpose_Of_Use`, `Grouped_country`
   - Transformer: `OneHotEncoder(handle_unknown='ignore')`

---

### B. Model Performance Metrics & Multi-Algorithm Benchmark

We conducted a 5-fold cross-validated benchmark across multiple machine learning architectures on the 5,000-student dataset:

| Model Architecture | 5-Fold CV $R^2$ | Holdout Test $R^2$ (Accuracy) | Test RMSE (points) | Test MAE (points) |
| :--- | :--- | :--- | :--- | :--- |
| 🏆 **Extra Trees Regressor (300 trees)** | **0.8844** | **0.9230 (92.30%)** | **0.3654** | **0.2611** |
| **Super Ensemble Blend (RF + ET + HistGB)** | 0.8647 | 0.8988 (89.88%) | 0.4190 | 0.3173 |
| **Baseline Random Forest (100 trees)** | 0.8645 | 0.8927 (89.27%) | 0.4313 | 0.3222 |
| **Optimized Random Forest (300 trees, d=16)** | 0.8516 | 0.8840 (88.40%) | 0.4485 | 0.3375 |
| **HistGradientBoosting Regressor** | 0.8369 | 0.8621 (86.21%) | 0.4890 | 0.3785 |
| **Gradient Boosting Regressor** | 0.8087 | 0.8348 (83.48%) | 0.5352 | 0.4144 |
| **Ridge Regularized Linear Regression** | 0.7162 | 0.7575 (75.75%) | 0.6485 | 0.5080 |

> **Key Findings**: The **Extra Trees Regressor** achieved the highest generalization accuracy by mitigating variance across non-linear feature interactions (e.g. logarithmic study loads interacting with ordinal stress signals), lowering the average absolute prediction error to just **$\pm 0.26$ points** on a 10-point scale.

---

## 💻 3. Technology Stack

- **Backend Framework**: Python 3.10+, FastAPI, Uvicorn
- **Data & ML**: Scikit-Learn, Pandas, NumPy, Joblib
- **Frontend Architecture**: HTML5, Vanilla JavaScript (ES6+), Chart.js
- **Styling & Design System**: Custom Wellness CSS Tokens, Tailwind CSS, FontAwesome 6, Google Fonts (Outfit & Plus Jakarta Sans)

---

## ⚡ 4. Setup & Execution

### 1. Environment & Dependencies
```bash
# Optional: Setup virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Start Application Server
```bash
python main.py
# or via uvicorn directly
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Application Access Points
- **🚀 Live Web UI (Vercel)**: [https://mind-ease-ai-seven.vercel.app/](https://mind-ease-ai-seven.vercel.app/)
- **📖 Live Swagger / OpenAPI Spec**: [https://mind-ease-ai-seven.vercel.app/docs](https://mind-ease-ai-seven.vercel.app/docs)
- **Local Web UI**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Local Swagger / OpenAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Local ReDoc API Spec**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## ☁️ 5. Cloud Deployment

### Option A: Vercel (Production)
- **Live URL**: [https://mind-ease-ai-seven.vercel.app/](https://mind-ease-ai-seven.vercel.app/)
- Configured via [vercel.json](file:///d:/ML/vercel.json) and [api/index.py](file:///d:/ML/api/index.py).

### Option B: Render Web Service
- Configured via [render.yaml](file:///d:/ML/render.yaml) blueprint:
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option C: Containerized Deployment (Docker)
```bash
# Build Docker image
docker build -t mindease-ai .

# Run container
docker run -p 8000:8000 mindease-ai
```

---

## 📡 6. REST API Specification

### `POST /predict`
Performs real-time regression inference for a student lifestyle profile.

#### Request Body
```json
{
  "age": 21,
  "gender": "Female",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Entertainment",
  "avg_daily_usage_hours": 3.5,
  "daily_unlocks": 65,
  "study_hours": 5.0,
  "physical_activity_hours": 1.5,
  "sleep_hours_per_night": 7.5,
  "stress_level": "Medium"
}
```

#### Response (HTTP 200 OK)
```json
{
  "predicted_mental_health_score": 7.42,
  "confidence_interval": {
    "low": 7.07,
    "high": 7.77,
    "margin": 0.35,
    "confidence_level": "95%"
  },
  "risk_level": "Balanced",
  "risk_color": "sky",
  "feature_attributions": [
    {
      "factor": "Sleep Hours",
      "icon": "🌙",
      "impact": 0.82,
      "is_positive": true,
      "description": "7.5h/night (baseline 6.5h)"
    },
    {
      "factor": "Screen Time",
      "icon": "⏳",
      "impact": -0.45,
      "is_positive": false,
      "description": "3.5h/day screen time (baseline 5.0h)"
    }
  ]
}
```

### `POST /predict/optimize`
Counterfactual goal solver computing the minimal lifestyle habit adjustments needed to reach a target wellness score.

### `POST /predict/batch`
Processes batch student cohort CSV uploads and returns aggregate distribution metrics (mean, median, risk tier breakdown) with preview.

### `GET /models/benchmark`
Retrieves standardized 5-fold cross-validated benchmark performance metrics across all 7 evaluated ML architectures.

---

## 📊 6. Key Application Features

1. **Calibrated Semicircular Arc Gauge**: Visualizes computed wellness index ($0.0 - 10.0$) and cohort percentile ranking.
2. **Explainable AI (XAI) Factor Impact**: Quantifies marginal positive and negative habit attributions against population baseline.
3. **"What-If" Counterfactual Habit Simulator**: Real-time slider adjustments with instant score delta computation and 1-click **Auto-Optimize**.
4. **Tailored AI Action Plan**: Color-coded micro-habit prescriptions tailored to sleep, digital hygiene, physical exercise, and stress buffering.
5. **5-Axis Lifestyle Radar Chart**: Visualizes equilibrium between sleep, exercise, study focus, screen moderation, and stress resistance.
6. **Cohort Analytics & Batch CSV Processor**: Upload class/institution datasets for automated risk stratification and summary statistics.
7. **4-7-8 Neuro-Vagal Breathing Coach**: Guided breathing pacer modal for anxiety reduction and parasympathetic reset.
8. **Export Assessment Report (PDF / Print)**: Generates a distraction-free executive assessment report for documentation and review.

---

## 📄 License
This project is submitted for Academic Machine Learning Project Assessment.
