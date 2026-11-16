# ⚡ MotorGuard: Intelligent Predictive Maintenance System
### Software-Based Induction Motor Condition-Monitoring & Fault Detection Prototype

[![Python Version](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Streamlit App](https://img.shields.io/badge/Streamlit-1.40+-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![CI Status](https://img.shields.io/badge/Build-Passing-10b981?logo=github-actions&logoColor=white)](#-automated-testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An educational, industrial-grade software prototype demonstrating **real-time condition-monitoring, statistical analytics, dimensionality reduction, and unsupervised machine learning anomaly detection** for an electric induction motor.

---

## 🚀 Quick Start (Choose Your Preferred Workflow)

### Option A: Using NPM (Recommended for Web Developers)
```bash
# 1. Install & configure
npm install

# 2. Launch the interactive development dashboard
npm run dev

# 3. Run all unit tests
npm test
```

### Option B: Using Standard Python
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Launch Streamlit dashboard
streamlit run app.py

# 3. Run automated tests
pytest -v
```

### Option C: Using Docker Container
```bash
# Launch multi-platform container in one command
docker compose up --build
```

Access your dashboard at: **`http://localhost:8501`**

---

## 🎨 UI Design System & Color Theory

The user interface follows the **60-30-10 Color Theory Rule** to ensure high visual hierarchy, clean contrast, and an intuitive industrial dashboard feel:

| Proportion | Color Palette | Hex Code | Purpose in UI |
| :--- | :--- | :--- | :--- |
| **60% Dominant Base** | Slate 50 / Pure White | `#f8fafc` / `#ffffff` | Clean background canvas and elevated card surfaces |
| **30% Structural Secondary** | Deep Slate 900 / Cool Slate | `#0f172a` / `#1e293b` | Navigation headers, typography, and contrast elements |
| **10% Accent (Brand)** | Electric Indigo / Royal Blue | `#2563eb` / `#38bdf8` | Action buttons, active navigation tabs, telemetry splines |
| **Status: Healthy** | Emerald Green | `#10b981` (bg: `#ecfdf5`) | Optimal operating state, safe thresholds |
| **Status: Warning** | Amber Gold | `#f59e0b` (bg: `#fffbeb`) | Advisory alerts, scheduled inspection flags |
| **Status: Critical** | Crimson Rose | `#ef4444` (bg: `#fef2f2`) | Immediate danger, emergency trip threshold |

---

## 📐 The 5 Sensor Parameters & Standards

Monitored in accordance with standard **ISO 10816-3 (Mechanical Vibration Severity)** and Class B/F motor thermal insulation boundaries:

| Parameter | Unit | Normal Zone 🟢 | Warning Zone 🟡 | Critical Zone 🔴 | Engineering Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vibration** | mm/s | `< 4.5` | `4.5 – 7.1` | `> 7.1` | Bearing wear, mechanical looseness, rotor unbalance |
| **Temperature** | °C | `< 75.0` | `75.0 – 90.0` | `> 90.0` | Thermal accumulation in stator windings |
| **Current** | A | `< 15.0` | `15.0 – 20.0` | `> 20.0` | Phase current draw & electrical overload |
| **Voltage** | V | `380 – 420` | `370 – 380` | `< 350` or `> 450` | Supply voltage stability (400V 3-phase nominal) |
| **Speed** | RPM | `1450 – 1490` | `1420 – 1450` | `< 1370` | Shaft rotational speed & motor slip under load |

---

## ⚙️ System Architecture

```
┌─────────────────────────────────┐
│     C++17 Motor Simulator       │   (or Python Generator: scripts/generate_sample_data.py)
│  Generates Synthetic Telemetry  │
└────────────────┬────────────────┘
                 │ (CSV Dataset)
                 ▼
┌─────────────────────────────────┐
│       Python Data Pipeline      │
│  - Data Validation & Cleaning   │
│  - Z-Score Scaling: z=(x-μ)/σ   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Analytics & ML Engine       │
│  - 5x5 Pearson Correlation      │
│  - PCA & Eigenvalue Analysis    │
│  - Isolation Forest Outlier ML  │
│  - Composite 0-100 Risk Score   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Streamlit Web Dashboard       │
│  - SCADA Radial Dial Gauges     │
│  - Time-Series Spline Trends    │
│  - Correlation Matrix Heatmap   │
│  - PCA 2D Scatter Projection    │
│  - Zero-pyarrow HTML Tables     │
│  - Audit Log & CSV Export       │
└─────────────────────────────────┘
```

---

## 🧪 Automated Testing

The project includes an automated **Pytest** test suite covering all modules:
```bash
npm test
# OR
pytest -v
```

```text
tests/test_analytics.py::test_correlation_matrix PASSED                  [  8%]
tests/test_analytics.py::test_pca_analysis PASSED                        [ 16%]
tests/test_anomaly_detector.py::test_isolation_forest_predictions PASSED [ 25%]
tests/test_anomaly_detector.py::test_unfitted_detector_raises PASSED     [ 33%]
tests/test_data_loader.py::test_sample_data_generation PASSED            [ 41%]
tests/test_data_loader.py::test_data_validation_valid PASSED             [ 50%]
tests/test_data_loader.py::test_data_validation_missing_and_corrupt PASSED [ 58%]
tests/test_data_loader.py::test_standardization PASSED                   [ 66%]
tests/test_data_loader.py::test_summary_statistics PASSED                [ 75%]
tests/test_health_index.py::test_evaluate_sensor_rules_healthy PASSED    [ 83%]
tests/test_health_index.py::test_evaluate_sensor_rules_critical PASSED   [ 91%]
tests/test_health_index.py::test_compute_risk_index_and_status PASSED    [100%]

============================= 12 passed in 2.08s ==============================
```

---

## ☁️ Exact GitHub & Cloud Deployment Guide

This repository has the exact file structure pre-configured for **GitHub, Streamlit Community Cloud, Render, and Docker**:

### Step 1: Push to Your GitHub Repository
```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git push -u origin main
```

### Step 2: 1-Click Deploy on Streamlit Cloud (Free & Instant)
1. Go to **[share.streamlit.io](https://share.streamlit.io/)** and sign in with your GitHub account.
2. Click **"New App"**.
3. Select your repository: `<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>`.
4. Main file path: **`app.py`**.
5. Click **"Deploy!"** — Your dashboard goes live in ~60 seconds!

### Step 3: Deploy via Docker (Render, Hugging Face, Railway)
The included `Dockerfile` and `docker-compose.yml` build automatically on any container service without extra configuration.

---

## 📁 Exact File Structure for GitHub Deployment

```
Intelegent_predictive_maintenance/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md        # Issue tracking template
│   │   └── feature_request.md   # Feature tracking template
│   ├── workflows/
│   │   └── ci.yml               # GitHub Actions automated CI testing workflow
│   └── pull_request_template.md # PR review checklist
├── .streamlit/
│   └── config.toml              # Streamlit theme & cloud server settings
├── cpp_simulator/
│   ├── simulator.cpp            # C++17 motor sensor data generator
│   └── README.md                # C++ compilation instructions
├── data/
│   └── motor_sensors.csv        # Preloaded demonstration sensor telemetry
├── scripts/
│   ├── dev.js                   # Node launcher for 'npm run dev'
│   ├── test.js                  # Node runner for 'npm test'
│   └── generate_sample_data.py  # Python sensor generation script
├── src/
│   ├── __init__.py
│   ├── data_loader.py           # Ingestion, validation & Z-score scaling
│   ├── analytics.py             # Correlation matrix, PCA & Eigenvalues
│   ├── anomaly_detector.py      # Isolation Forest unsupervised ML model
│   └── health_index.py          # Industrial rule engine & composite Risk Index
├── tests/
│   ├── __init__.py
│   ├── test_data_loader.py
│   ├── test_analytics.py
│   ├── test_anomaly_detector.py
│   └── test_health_index.py
├── .dockerignore                # Docker ignore rules
├── .gitignore                   # Production Git ignore rules
├── app.py                       # Main Streamlit dashboard application
├── docker-compose.yml           # Container orchestration
├── Dockerfile                   # Multi-stage production container image
├── LICENSE                      # MIT Open Source License
├── package.json                 # NPM scripts (npm install, npm run dev, npm test)
├── README.md                    # Complete GitHub documentation
├── requirements.txt             # Verified Python dependencies
├── run_dashboard.bat            # 1-click Windows launcher
└── run_tests.bat                # 1-click Windows test runner
```

---

## 📄 License
This project is open-source and released under the [MIT License](LICENSE).
