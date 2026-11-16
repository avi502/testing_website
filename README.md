# ⚡ MotorGuard AI: Industrial IoT Predictive Maintenance & Prognostics
### Industrial Induction Motor Condition-Monitoring Suite (B.Tech Final Year Capstone Project)

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Deploy-10b981?logo=github&logoColor=white)](https://pages.github.com/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](index.html)
[![CSS3](https://img.shields.io/badge/CSS3-Dark%20Mode-1572B6?logo=css3&logoColor=white)](style.css)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](app.js)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4+-FF6384?logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![Engineering Level](https://img.shields.io/badge/Level-Final%20Year%20Capstone-38bdf8)](index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade **Dark Mode** industrial predictive maintenance and prognostics web suite with a **Left Sidebar Multi-View Navigation Menu**, designed specifically for **GitHub Pages deployment**. It monitors and predicts motor degradation across 5 core channels (**Vibration, Temperature, Current, Voltage, Speed**) using:
- **Sleek Left Sidebar Navigation Menu:** 11 operational views with live motor status widget, system uptime counter, and mobile responsive drawer.
- **ISO 13373-1 Fast Fourier Transform (FFT) Frequency Spectrum:** Real-time harmonic breakdown (1X, 2X, 3X, BPFO, BPFI) for bearing race and shaft misalignment detection.
- **Weibull Remaining Useful Life (RUL) Prognostics:** Health Index degradation curves (100% to 0% HI) with 95% confidence bounds and hours-to-failure prediction.
- **Maintenance Economics & Financial ROI Calculator:** Quantified cost-benefit comparison between corrective breakdowns ($13,700) and predictive AI interventions ($850) with interactive facility sliders.
- **Digital Twin Subsystems:** Live real-time health progress bars for Stator Insulation, Bearings Assembly, Rotor Air Gap, and 3-Phase Electrical Supply.
- **Multi-Model ML Benchmarks:** Hybrid Ensemble (98.4% Acc, 0.991 ROC-AUC), Autoencoder Neural Network, and Support Vector Machine with 3×3 Confusion Matrix.
- **Interactive Manual Sensor Studio:** Dual-bound sliders for custom parameter testing, instant AI diagnosis, and live SCADA injection.

---

## 🌐 Live GitHub Pages Deployment (Zero Server Required!)

Because this dashboard is built with pure **HTML5, CSS3, and JavaScript (`index.html`, `style.css`, `app.js`)**, it runs **100% inside any browser** with zero backend server required!

### How to Deploy on GitHub Pages:
1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
   git push -u origin main
   ```
2. On GitHub, go to your repository **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
4. Set Branch to **`main`** and folder to **`/(root)`**, then click **Save**.
5. Within 60 seconds, your site is live at:  
   👉 **`https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPOSITORY_NAME>/`**

*(An automated GitHub Actions workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) is also included for automatic deployment on every push!)*

---

## 🚀 Running Locally with NPM

```bash
# 1. Install & configure
npm install

# 2. Start the Dark Mode local dev server (auto-opens in browser)
npm run dev

# 3. Run automated tests
npm test
```

> **Local URL:** **`http://localhost:3000`**

---

## 🎨 UI & Dark Mode Color Theory

Built strictly according to the **60-30-10 Color Theory Rule** for industrial SCADA control room ergonomics:

| Ratio | Tone | Hex Code | Visual Application |
| :--- | :--- | :--- | :--- |
| **60% Dominant Base** | Deep Space Pitch Black | `#080c14` | Ultra-dark eye-comfort background |
| **30% Structure** | Elevated Dark Slate | `#111a2e` / `#16223d` | Elevated card surfaces, borders, and sticky headers |
| **10% Cyber Accents** | Electric Cyan & Indigo | `#38bdf8` / `#6366f1` | Action buttons, telemetry splines, dial pointers |
| **🟢 Healthy State** | Cyber Emerald | `#10b981` | Optimal operational envelope (ISO 10816 Zone A/B) |
| **🟡 Warning State** | Electric Amber | `#f59e0b` | Advisory alerts, scheduled maintenance trigger |
| **🔴 Critical State** | Neon Crimson | `#ef4444` | Emergency trip limit, bearing failure, overload |

---

## 🎛️ Interactive Features

1. **🔬 Advanced Engineering Diagnostics & Prognostics Suite (Intermediate Level):**
   - **📊 ISO 13373-1 FFT Spectral Harmonics:** Real-time fast Fourier transform frequency spectrum (0 to 300 Hz) breaking down 1X shaft speed ($f_{1\times} = \text{RPM}/60 \approx 24.6\text{ Hz}$), 2X misalignment harmonic ($49.2\text{ Hz}$), 3X looseness ($73.8\text{ Hz}$), and BPFO ($178.4\text{ Hz}$) / BPFI ($232.1\text{ Hz}$) bearing race defect signatures.
   - **⏳ Weibull Remaining Useful Life (RUL) & Prognostics:** Computes real-time dynamic Health Index (0–100% HI), estimated operating hours to failure, wear acceleration rate, and projects future degradation curves with 95% upper/lower confidence bounds.
   - **🧠 Machine Learning Benchmark Matrix:** Comparative benchmark evaluating Hybrid Ensemble (98.4% Acc, 0.991 ROC-AUC), Autoencoder Neural Network, Support Vector Machine, and Isolation Forest. Includes an interactive 3×3 Confusion Matrix across Healthy, Warning, and Critical classes.
   - **🏷️ Motor Technical Nameplate & ISO 10816-3 Severity Standards:** Comprehensive engineering specifications for a 7.5 kW / 10 HP industrial squirrel cage induction motor (IEC 132M, IP55, Class F rise) and Group 2 machine vibration severity zones (Zone A, B, C, D).
2. **Manual Sensor Input & AI Fault Predictor Studio:** Custom interactive input panel with dual-bound sliders and number boxes for Vibration, Temperature, Current, Voltage, and Speed. Includes:
   - **Instant AI Calculations:** Real-time 0–100 composite risk score, ISO 10816-3 vibration severity classification, Class B/F thermal limits, and multivariate anomaly detection.
   - **PCA 2D Projection:** Mathematically projects the custom input point onto PC1 and PC2 axes.
   - **Prescriptive Maintenance Action:** Generates root-cause diagnosis and actionable industrial advice (greasing, alignment, thermal fin cleaning, or emergency trip).
   - **Quick Test Presets:** 1-click test scenarios for *Healthy Baseline*, *Bearing Damage*, *High Overheating*, and *Electrical Voltage Sag*.
   - **Send to Live SCADA Dials & Audit Table:** Injects the custom user reading directly into the live dials, time-series charts, and audit table.
3. **5 SCADA Radial Dial Instruments:** Custom HTML5 Canvas gauges showing live needles sweeping across ISO 10816-3 threshold arcs.
4. **Interactive Fault Injection:** Dropdown on top bar allowing you to simulate:
   - 🟢 *Normal Baseline*
   - 🔴 *Bearing Damage* (High Vibration surge)
   - 🟡 *Thermal Overheating* (Stator coil heat runaway)
   - 🔴 *Electrical Overload* (Voltage dip with high surge current)
5. **Live 1Hz Telemetry Timeline:** Chart.js streaming chart with multi-sensor toggle chips.
6. **5×5 Pearson Cross-Correlation Grid:** Color-coded coefficient heatmap (-1.0 to +1.0) with interactive tooltips.
7. **PCA 2D Cluster Scatter Plot:** JavaScript matrix engine calculating covariance, eigenvalues, eigenvectors, and projecting readings onto PC1 vs PC2.
8. **Diagnostic Audit Table:** Real-time log with search bar and filter dropdown.
9. **Instant CSV Report:** One-click **"Export CSV"** button generating downloadable telemetry reports on the fly.

---

## 📁 Repository Structure
```
Intelegent_predictive_maintenance/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # Automated test pipeline
│   │   └── pages.yml            # Automatic GitHub Pages deployment workflow
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── cpp_simulator/
│   ├── simulator.cpp            # C++17 motor sensor generator
│   └── README.md
├── data/
│   └── motor_sensors.csv        # Preloaded sample dataset
├── scripts/
│   ├── serve.js                 # Local static HTTP dev server for 'npm run dev'
│   ├── test.js                  # Test runner for 'npm test'
│   └── generate_sample_data.py  # Python sensor generation utility
├── src/
│   ├── data_loader.py           # Python data cleaning & Z-score scaling
│   ├── analytics.py             # Python correlation & PCA
│   ├── anomaly_detector.py      # Python Isolation Forest model
│   └── health_index.py          # Python ISO rules & 0-100 Risk Index
├── tests/
│   ├── test_data_loader.py
│   ├── test_analytics.py
│   ├── test_anomaly_detector.py
│   └── test_health_index.py
├── .gitignore                   # Production Git ignore
├── app.js                       # ⚡ Client-side JavaScript AI & Math Engine
├── app.py                       # Python Streamlit alternative application
├── index.html                   # 🌐 Main GitHub Pages Entrypoint
├── LICENSE                      # MIT Open Source License
├── package.json                 # NPM scripts (npm install, npm run dev, npm test)
├── README.md                    # Complete GitHub documentation
├── requirements.txt             # Python dependencies
├── run_dashboard.bat            # Windows 1-click launcher
└── style.css                    # 🎨 High-Tech Industrial Dark Mode Stylesheet
```

---

## 📄 License
Released under the [MIT License](LICENSE).
