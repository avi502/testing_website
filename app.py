"""
app.py
Intelligent Predictive Maintenance and Fault Detection System
Industrial-Grade Condition-Monitoring Dashboard for Induction Motors.
"""

import os
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from src.analytics import (
    compute_correlation_matrix,
    explain_correlations,
    perform_pca_analysis,
)
from src.anomaly_detector import MotorAnomalyDetector
from src.data_loader import (
    SENSOR_COLUMNS,
    SENSOR_METADATA,
    compute_summary_statistics,
    load_sensor_data,
    standardize_sensor_data,
    validate_and_clean_data,
)
from src.health_index import THRESHOLDS, compute_risk_index_and_status
from scripts.generate_sample_data import generate_motor_data

# =============================================================================
# COLOR PALETTE & DESIGN SYSTEM (60-30-10 Rule)
# =============================================================================
# Primary Dominant (60%): Slate 50 (#f8fafc), Pure White (#ffffff), Slate 100 (#f1f5f9)
# Secondary Structure (30%): Deep Slate (#0f172a, #1e293b), Border Slate (#e2e8f0)
# Accent / Semantic (10%):
#   - Tech Brand: Electric Blue (#2563eb), Indigo (#4f46e5), Cyan (#06b6d4)
#   - Healthy: Emerald (#10b981)
#   - Warning: Amber (#f59e0b)
#   - Critical: Crimson Rose (#ef4444)
# =============================================================================

st.set_page_config(
    page_title="MotorGuard | Induction Motor Predictive Maintenance",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom High-End Industrial Styling
st.markdown(
    """
    <style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
    }

    code, pre {
        font-family: 'JetBrains Mono', monospace;
    }

    /* Main Container Padding */
    .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2.5rem;
        max-width: 1400px;
    }

    /* Hero Header Container */
    .hero-banner {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a8a 100%);
        border-radius: 16px;
        padding: 24px 32px;
        color: #ffffff;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.2);
        margin-bottom: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
        overflow: hidden;
    }

    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(14, 165, 233, 0.18);
        border: 1px solid rgba(56, 189, 248, 0.35);
        color: #38bdf8;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 4px 12px;
        border-radius: 9999px;
        margin-bottom: 12px;
    }

    .hero-title {
        font-size: 1.85rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        margin: 0;
        color: #f8fafc;
    }

    .hero-subtitle {
        font-size: 0.95rem;
        color: #94a3b8;
        margin-top: 6px;
        margin-bottom: 0;
        line-height: 1.45;
    }

    /* Status Pulse Animation */
    .pulse-dot {
        width: 8px;
        height: 8px;
        background-color: #10b981;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
        animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* Stat Cards */
    .stat-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px 20px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px -4px rgba(15, 23, 42, 0.08);
    }

    .stat-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #64748b;
        margin-bottom: 4px;
    }

    .stat-value {
        font-size: 1.7rem;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.2;
    }

    .stat-subtext {
        font-size: 0.78rem;
        color: #64748b;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* Health Badges */
    .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.02em;
    }

    .badge-healthy {
        background-color: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }

    .badge-warning {
        background-color: #fffbeb;
        color: #92400e;
        border: 1px solid #fde68a;
    }

    .badge-critical {
        background-color: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 6px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 4px;
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px 8px 0 0;
        padding: 10px 18px;
        font-weight: 600;
        font-size: 0.9rem;
        color: #64748b;
        transition: all 0.2s ease;
    }

    .stTabs [aria-selected="true"] {
        background-color: #eff6ff !important;
        color: #1d4ed8 !important;
        border-bottom: 2px solid #2563eb !important;
    }

    /* Sidebar Clean styling */
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def render_table(
    df: pd.DataFrame,
    max_height: int = 350,
    include_index: bool = False,
    precision: int = 2,
):
    """
    Renders a table safely without crashing if pyarrow is unavailable.
    Tries native st.dataframe first; if pyarrow is missing, renders an ultra-clean,
    scrollable HTML table with sticky headers, zebra rows, and pill badge highlights.
    """
    try:
        import pyarrow  # Test if pyarrow can be imported
        if include_index:
            st.dataframe(df, use_container_width=True, height=max_height)
        else:
            st.dataframe(df.reset_index(drop=True), use_container_width=True, height=max_height)
        return
    except (ImportError, ModuleNotFoundError):
        pass  # Gracefully fall back to styled HTML table

    # --- HIGH-END HTML TABLE FALLBACK (Zero-dependency, SmartAppControl compatible) ---
    display_df = df.copy()

    # Format numeric columns cleanly
    for col in display_df.select_dtypes(include=[np.number]).columns:
        display_df[col] = display_df[col].apply(
            lambda v: f"{v:.{precision}f}" if pd.notna(v) else "-"
        )

    # Format health_status into HTML pill badges if present
    if "health_status" in display_df.columns:
        display_df["health_status"] = display_df["health_status"].apply(
            lambda s: (
                '<span class="badge-pill badge-healthy">🟢 HEALTHY</span>'
                if s == "Healthy"
                else (
                    '<span class="badge-pill badge-warning">🟡 WARNING</span>'
                    if s == "Warning"
                    else '<span class="badge-pill badge-critical">🔴 CRITICAL</span>'
                )
            )
        )

    if "is_anomaly" in display_df.columns:
        display_df["is_anomaly"] = display_df["is_anomaly"].apply(
            lambda a: (
                '<span style="color: #ef4444; font-weight: 700;">⚠️ Yes</span>'
                if a in [True, 1, "True"]
                else '<span style="color: #10b981; font-weight: 600;">✓ No</span>'
            )
        )

    if "risk_index" in display_df.columns:
        display_df["risk_index"] = display_df["risk_index"].apply(
            lambda r: (
                f'<span style="font-weight: 800; color: #ef4444;">{r}</span>'
                if float(r) >= 70
                else (
                    f'<span style="font-weight: 800; color: #f59e0b;">{r}</span>'
                    if float(r) >= 35
                    else f'<span style="font-weight: 800; color: #10b981;">{r}</span>'
                )
            )
        )

    # Format column names for display
    display_df.columns = [
        col.replace("_", " ").title() for col in display_df.columns
    ]

    html_table = display_df.to_html(
        index=include_index,
        classes="custom-table",
        escape=False,
    )

    styled_wrapper = f"""
    <div style="max-height: {max_height}px; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 12px;">
        <style>
        .custom-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 0.83rem;
            color: #1e293b;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }}
        .custom-table thead th {{
            position: sticky;
            top: 0;
            background: #f8fafc;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
            padding: 10px 14px;
            border-bottom: 2px solid #cbd5e1;
            text-align: left;
            z-index: 2;
        }}
        .custom-table tbody td {{
            padding: 9px 14px;
            border-bottom: 1px solid #f1f5f9;
            white-space: nowrap;
        }}
        .custom-table tbody tr:nth-child(even) {{
            background-color: #f8fafc;
        }}
        .custom-table tbody tr:hover {{
            background-color: #eff6ff;
            transition: background-color 0.15s ease;
        }}
        .custom-table th:first-child, .custom-table td:first-child {{
            padding-left: 16px;
        }}
        .custom-table th:last-child, .custom-table td:last-child {{
            padding-right: 16px;
        }}
        </style>
        {html_table}
    </div>
    """
    st.markdown(styled_wrapper, unsafe_allow_html=True)


@st.cache_data
def run_pipeline(raw_df: pd.DataFrame, contamination: float) -> Dict[str, Any]:
    """Runs the 6-stage predictive maintenance analytics pipeline."""
    cleaned_df, val_summary = validate_and_clean_data(raw_df)
    standardized_df, means, stds = standardize_sensor_data(cleaned_df)

    corr_matrix = compute_correlation_matrix(cleaned_df)
    corr_explanations = explain_correlations(corr_matrix)

    pca_coords_df, pca_summary_df, loadings_df = perform_pca_analysis(
        standardized_df, n_components=5
    )

    state_col = (
        cleaned_df["simulated_state"]
        if "simulated_state" in cleaned_df.columns
        else None
    )
    detector = MotorAnomalyDetector(contamination=contamination, random_state=42)
    detector.fit(standardized_df, state_series=state_col)
    raw_flags, is_anomaly, anomaly_scores = detector.predict(standardized_df)

    risk_index, health_status, reasons = compute_risk_index_and_status(
        cleaned_df, is_anomaly, anomaly_scores
    )

    analyzed_df = cleaned_df.copy()
    analyzed_df["anomaly_flag"] = raw_flags
    analyzed_df["is_anomaly"] = is_anomaly
    analyzed_df["anomaly_score"] = anomaly_scores
    analyzed_df["risk_index"] = risk_index
    analyzed_df["health_status"] = health_status
    analyzed_df["diagnosis_reason"] = reasons
    analyzed_df["PC1"] = pca_coords_df["PC1"]
    analyzed_df["PC2"] = pca_coords_df["PC2"]

    return {
        "analyzed_df": analyzed_df,
        "standardized_df": standardized_df,
        "val_summary": val_summary,
        "corr_matrix": corr_matrix,
        "corr_explanations": corr_explanations,
        "pca_coords_df": pca_coords_df,
        "pca_summary_df": pca_summary_df,
        "loadings_df": loadings_df,
        "means": means,
        "stds": stds,
    }


def create_radial_gauge(
    title: str,
    value: float,
    unit: str,
    min_val: float,
    max_val: float,
    warn_val: float,
    crit_val: float,
    is_lower_better: bool = True,
) -> go.Figure:
    """Creates a modern semi-circular radial gauge with colored thresholds."""
    if is_lower_better:
        steps = [
            {"range": [min_val, warn_val], "color": "#ecfdf5"},
            {"range": [warn_val, crit_val], "color": "#fef3c7"},
            {"range": [crit_val, max_val], "color": "#fee2e2"},
        ]
        bar_color = (
            "#10b981"
            if value < warn_val
            else ("#f59e0b" if value < crit_val else "#ef4444")
        )
    else:
        steps = [
            {"range": [min_val, crit_val], "color": "#fee2e2"},
            {"range": [crit_val, warn_val], "color": "#fef3c7"},
            {"range": [warn_val, max_val], "color": "#ecfdf5"},
        ]
        bar_color = (
            "#ef4444"
            if value < crit_val
            else ("#f59e0b" if value < warn_val else "#10b981")
        )

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value,
            number={"suffix": f" {unit}", "font": {"size": 22, "family": "Plus Jakarta Sans, sans-serif"}},
            title={"text": f"<b>{title}</b>", "font": {"size": 14, "color": "#334155"}},
            gauge={
                "axis": {"range": [min_val, max_val], "tickwidth": 1, "tickcolor": "#94a3b8"},
                "bar": {"color": bar_color, "thickness": 0.28},
                "bgcolor": "#ffffff",
                "borderwidth": 1,
                "bordercolor": "#e2e8f0",
                "steps": steps,
            },
        )
    )
    fig.update_layout(
        height=180,
        margin=dict(l=15, r=15, t=35, b=10),
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#0f172a"),
    )
    return fig


def main():
    # --- HERO HEADER ---
    st.markdown(
        """
        <div class="hero-banner">
            <div class="hero-badge">
                <span class="pulse-dot"></span>
                <span>System Active &bull; Real-Time Telemetry</span>
            </div>
            <h1 class="hero-title">⚡ Intelligent Induction Motor Condition Monitor</h1>
            <p class="hero-subtitle">
                Software-based predictive maintenance prototype evaluating <b>Vibration, Temperature, Current, Voltage, and Speed</b>
                using <b>Z-score Normalization, Pearson Correlation, PCA,</b> and <b>Isolation Forest Machine Learning</b>.
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # --- SIDEBAR CONTROLS ---
    with st.sidebar:
        st.markdown("### 🎛️ Control Panel")
        data_source = st.radio(
            "Telemetry Stream Source:",
            ["Demo Induction Motor Dataset", "Generate Custom Scenario", "Upload CSV Telemetry"],
        )

        sample_file_path = os.path.join("data", "motor_sensors.csv")
        raw_df = None

        if data_source == "Demo Induction Motor Dataset":
            if os.path.exists(sample_file_path):
                raw_df = load_sensor_data(sample_file_path)
            else:
                generate_motor_data(num_samples=600, output_path=sample_file_path)
                raw_df = load_sensor_data(sample_file_path)
            st.success(f"✓ Streaming active ({len(raw_df)} readings)")

        elif data_source == "Generate Custom Scenario":
            sample_count = st.slider("Sample Readings:", 150, 1500, 600, step=50)
            seed_val = st.number_input("Random Seed:", value=42, step=1)
            if st.button("🔄 Generate Fresh Run", use_container_width=True):
                generate_motor_data(
                    num_samples=sample_count,
                    output_path=sample_file_path,
                    seed=int(seed_val),
                )
                st.success(f"Generated {sample_count} readings!")
            raw_df = load_sensor_data(sample_file_path)

        elif data_source == "Upload CSV Telemetry":
            uploaded = st.file_uploader("Upload Sensor Log (CSV):", type=["csv"])
            if uploaded is not None:
                raw_df = load_sensor_data(uploaded)
                st.success(f"Loaded {len(raw_df)} rows")
            else:
                st.info("Upload a CSV file with: `vibration, temperature, current, voltage, rotational_speed`.")
                return

        st.markdown("---")
        st.markdown("### 🤖 Anomaly Sensitivity")
        contamination = st.slider(
            "Outlier Contamination Ratio:",
            min_value=0.01,
            max_value=0.25,
            value=0.15,
            step=0.01,
            help="Expected proportion of anomalies in the operational cycle.",
        )

        st.markdown("---")
        st.caption("⚙️ **Engine:** Scikit-Learn + Plotly + Streamlit")
        st.caption("📐 **Standard:** ISO 10816-3 Vibration Severity")

    if raw_df is None or len(raw_df) == 0:
        st.warning("No sensor telemetry available.")
        return

    # Run analysis pipeline
    results = run_pipeline(raw_df, contamination)
    df = results["analyzed_df"]
    pca_summary = results["pca_summary_df"]
    loadings = results["loadings_df"]
    corr_matrix = results["corr_matrix"]
    corr_explanations = results["corr_explanations"]

    # --- TOP KPI METRICS BAR ---
    total_samples = len(df)
    healthy_count = (df["health_status"] == "Healthy").sum()
    warning_count = (df["health_status"] == "Warning").sum()
    critical_count = (df["health_status"] == "Critical").sum()

    latest_row = df.iloc[-1]
    latest_status = latest_row["health_status"]
    latest_risk = latest_row["risk_index"]

    status_badge_class = (
        "badge-healthy"
        if latest_status == "Healthy"
        else ("badge-warning" if latest_status == "Warning" else "badge-critical")
    )
    status_icon = "🟢" if latest_status == "Healthy" else ("🟡" if latest_status == "Warning" else "🔴")

    kpi1, kpi2, kpi3, kpi4, kpi5 = st.columns(5)
    with kpi1:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="stat-label">Total Readings</div>
                <div class="stat-value">{total_samples:,}</div>
                <div class="stat-subtext">Telemetry points</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with kpi2:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="stat-label">Healthy States</div>
                <div class="stat-value" style="color: #10b981;">{healthy_count}</div>
                <div class="stat-subtext">{(healthy_count/total_samples)*100:.1f}% of total</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with kpi3:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="stat-label">Warning States</div>
                <div class="stat-value" style="color: #f59e0b;">{warning_count}</div>
                <div class="stat-subtext">{(warning_count/total_samples)*100:.1f}% of total</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with kpi4:
        st.markdown(
            f"""
            <div class="stat-card">
                <div class="stat-label">Critical States</div>
                <div class="stat-value" style="color: #ef4444;">{critical_count}</div>
                <div class="stat-subtext">{(critical_count/total_samples)*100:.1f}% of total</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with kpi5:
        st.markdown(
            f"""
            <div class="stat-card" style="border-left: 4px solid {'#10b981' if latest_status == 'Healthy' else ('#f59e0b' if latest_status == 'Warning' else '#ef4444')};">
                <div class="stat-label">Current Motor Status</div>
                <div class="stat-value" style="font-size: 1.35rem;">
                    <span class="badge-pill {status_badge_class}">{status_icon} {latest_status.upper()}</span>
                </div>
                <div class="stat-subtext">Risk Score: <b>{latest_risk}/100</b></div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

    # --- MAIN NAVIGATION TABS ---
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "🧭 Real-Time Gauges",
        "📈 Sensor Telemetry",
        "🔗 Correlation Heatmap",
        "🎯 PCA Decomposition",
        "🛡️ AI Anomaly & Risk",
        "📋 Diagnostic Audit Log",
    ])

    # =========================================================================
    # TAB 1: REAL-TIME GAUGES
    # =========================================================================
    with tab1:
        st.markdown("### 🎛️ Real-Time Induction Motor Dial Instruments")
        st.caption("Visual dials monitoring operating limits based on ISO 10816-3 and thermal insulation boundaries.")

        g1, g2, g3, g4, g5 = st.columns(5)

        with g1:
            fig_g1 = create_radial_gauge(
                title="Vibration",
                value=float(latest_row["vibration"]),
                unit="mm/s",
                min_val=0.0,
                max_val=12.0,
                warn_val=4.5,
                crit_val=7.1,
            )
            st.plotly_chart(fig_g1, use_container_width=True)
            st.caption("🟢 <4.5 | 🟡 4.5–7.1 | 🔴 >7.1 mm/s")

        with g2:
            fig_g2 = create_radial_gauge(
                title="Temperature",
                value=float(latest_row["temperature"]),
                unit="°C",
                min_val=20.0,
                max_val=120.0,
                warn_val=75.0,
                crit_val=90.0,
            )
            st.plotly_chart(fig_g2, use_container_width=True)
            st.caption("🟢 <75 | 🟡 75–90 | 🔴 >90 °C")

        with g3:
            fig_g3 = create_radial_gauge(
                title="Phase Current",
                value=float(latest_row["current"]),
                unit="A",
                min_val=0.0,
                max_val=30.0,
                warn_val=15.0,
                crit_val=20.0,
            )
            st.plotly_chart(fig_g3, use_container_width=True)
            st.caption("🟢 <15 | 🟡 15–20 | 🔴 >20 A")

        with g4:
            fig_g4 = create_radial_gauge(
                title="Line Voltage",
                value=float(latest_row["voltage"]),
                unit="V",
                min_val=320.0,
                max_val=460.0,
                warn_val=370.0,
                crit_val=350.0,
                is_lower_better=False,
            )
            st.plotly_chart(fig_g4, use_container_width=True)
            st.caption("🟢 380–420 | 🟡 370–380 | 🔴 <350 V")

        with g5:
            fig_g5 = create_radial_gauge(
                title="Rotor Speed",
                value=float(latest_row["rotational_speed"]),
                unit="RPM",
                min_val=1200.0,
                max_val=1550.0,
                warn_val=1420.0,
                crit_val=1370.0,
                is_lower_better=False,
            )
            st.plotly_chart(fig_g5, use_container_width=True)
            st.caption("🟢 1450–1490 | 🟡 1420–1450 | 🔴 <1370 RPM")

        st.markdown("<hr style='margin: 16px 0; border: none; border-top: 1px solid #e2e8f0;'/>", unsafe_allow_html=True)

        col_diag_left, col_diag_right = st.columns([1.3, 1.2])

        with col_diag_left:
            st.markdown("#### 🩺 Instant Health Verdict & Diagnostic Explanation")
            st.info(f"**Latest Observation Assessment:** {latest_row['diagnosis_reason']}")
            st.markdown(
                """
                * **Mechanical Subsystem:** Evaluates rotor unbalance, bearing misalignment, and mechanical looseness via vibration amplitude.
                * **Thermal Subsystem:** Tracks stator winding and bearing casing thermal accumulation.
                * **Electrical Subsystem:** Monitors phase balance, voltage dip, and stator coil current surges.
                """
            )

        with col_diag_right:
            st.markdown("#### 📊 Statistical Summary Table")
            summary_stats = compute_summary_statistics(df)
            render_table(summary_stats, max_height=200, include_index=True, precision=2)

    # =========================================================================
    # TAB 2: SENSOR TELEMETRY & TRENDS
    # =========================================================================
    with tab2:
        st.markdown("### 📈 Time-Series Sensor Telemetry Trajectories")

        col_sel1, col_sel2 = st.columns([1.5, 1])
        with col_sel1:
            chosen_param = st.selectbox(
                "Select Motor Parameter to Examine:",
                SENSOR_COLUMNS,
                format_func=lambda x: f"{x.replace('_', ' ').title()} ({SENSOR_METADATA[x]['unit']})",
            )
        with col_sel2:
            st.caption(f"**Description:** {SENSOR_METADATA[chosen_param]['description']}")
            st.caption(f"**Nominal Operating Baseline:** {SENSOR_METADATA[chosen_param]['nominal']}")

        x_series = df["timestamp"] if "timestamp" in df.columns else df.index

        fig_single = go.Figure()

        # Add shaded background for warning/critical where applicable
        if chosen_param in THRESHOLDS and "warning" in THRESHOLDS[chosen_param]:
            warn_limit = THRESHOLDS[chosen_param]["warning"]
            crit_limit = THRESHOLDS[chosen_param]["critical"]
            max_y = max(float(df[chosen_param].max()) * 1.15, crit_limit * 1.2)

            fig_single.add_hrect(
                y0=warn_limit,
                y1=crit_limit,
                fillcolor="rgba(245, 158, 11, 0.12)",
                line_width=0,
                annotation_text="Warning Zone",
                annotation_position="top left",
            )
            fig_single.add_hrect(
                y0=crit_limit,
                y1=max_y,
                fillcolor="rgba(239, 68, 68, 0.12)",
                line_width=0,
                annotation_text="Critical Zone",
                annotation_position="top left",
            )

        fig_single.add_trace(
            go.Scatter(
                x=x_series,
                y=df[chosen_param],
                mode="lines",
                name=chosen_param.title(),
                line=dict(color="#2563eb", width=2.5, shape="spline"),
                fill="tozeroy",
                fillcolor="rgba(37, 99, 235, 0.08)",
            )
        )

        fig_single.update_layout(
            title=f"{chosen_param.replace('_', ' ').title()} Telemetry Timeline",
            xaxis_title="Reading Timestamp / Sequence Index",
            yaxis_title=f"{chosen_param.title()} ({SENSOR_METADATA[chosen_param]['unit']})",
            template="plotly_white",
            height=380,
            margin=dict(l=20, r=20, t=45, b=20),
        )
        st.plotly_chart(fig_single, use_container_width=True)

        st.markdown("#### 🌐 Multi-Parameter Standardized Comparison (Z-Scores)")
        st.caption("All 5 sensor parameters mapped onto a shared zero-centered normalized scale to observe co-movement and drift.")

        norm_df = results["standardized_df"].copy()
        norm_df["timestamp"] = x_series

        color_palette = ["#2563eb", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"]
        fig_multi = px.line(
            norm_df,
            x="timestamp",
            y=SENSOR_COLUMNS,
            color_discrete_sequence=color_palette,
            labels={"value": "Standardized Value (Z-Score)", "variable": "Sensor Parameter"},
            template="plotly_white",
        )
        fig_multi.update_layout(
            height=340,
            margin=dict(l=20, r=20, t=35, b=20),
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        )
        st.plotly_chart(fig_multi, use_container_width=True)

    # =========================================================================
    # TAB 3: CORRELATION HEATMAP
    # =========================================================================
    with tab3:
        st.markdown("### 🔗 Statistical Sensor Cross-Correlation (Pearson Matrix)")
        st.caption("Quantifies linear dependency between parameter pairs (-1.0 to +1.0).")

        c_left, c_right = st.columns([1.1, 1])

        with c_left:
            fig_heatmap = px.imshow(
                corr_matrix,
                text_auto=".2f",
                color_continuous_scale="RdBu_r",
                zmin=-1,
                zmax=1,
                aspect="auto",
            )
            fig_heatmap.update_layout(
                template="plotly_white",
                height=380,
                margin=dict(l=20, r=20, t=30, b=20),
            )
            st.plotly_chart(fig_heatmap, use_container_width=True)

        with c_right:
            st.markdown("#### 💡 Grounded Engineering Explanations")
            for item in corr_explanations[:4]:
                st.markdown(
                    f"""
                    <div style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 10px 14px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; color: #0f172a;">{item['pair']}</span>
                            <span class="badge-pill" style="background: #eff6ff; color: #1d4ed8;">r = {item['correlation']:.2f}</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #64748b; margin-top: 4px;">{item['context']}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    # =========================================================================
    # TAB 4: PCA DECOMPOSITION
    # =========================================================================
    with tab4:
        st.markdown("### 🎯 Principal Component Analysis (PCA) & Eigenvalues")
        st.caption("Dimensionality reduction transforming 5 correlated variables into orthogonal variance vectors.")

        pca_col1, pca_col2 = st.columns([1.2, 1])

        with pca_col1:
            color_map = {"Healthy": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"}
            fig_pca = px.scatter(
                df,
                x="PC1",
                y="PC2",
                color="health_status",
                color_discrete_map=color_map,
                hover_data=["vibration", "temperature", "current", "risk_index", "diagnosis_reason"],
                labels={
                    "PC1": f"PC1 ({pca_summary.loc[0, 'Explained_Variance_Pct']}% Variance)",
                    "PC2": f"PC2 ({pca_summary.loc[1, 'Explained_Variance_Pct']}% Variance)",
                },
                template="plotly_white",
            )
            fig_pca.update_traces(marker=dict(size=8, opacity=0.85, line=dict(width=0.5, color="#ffffff")))
            fig_pca.update_layout(
                height=380,
                margin=dict(l=20, r=20, t=30, b=20),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            )
            st.plotly_chart(fig_pca, use_container_width=True)

        with pca_col2:
            st.markdown("#### 📊 Eigenvalues & Explained Variance")
            render_table(pca_summary, max_height=190, include_index=False, precision=2)

            fig_bar_pca = px.bar(
                pca_summary,
                x="Component",
                y="Explained_Variance_Pct",
                text="Explained_Variance_Pct",
                color_discrete_sequence=["#2563eb"],
                template="plotly_white",
            )
            fig_bar_pca.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
            fig_bar_pca.update_layout(
                height=180,
                margin=dict(l=20, r=20, t=10, b=10),
                yaxis_title="Variance (%)",
            )
            st.plotly_chart(fig_bar_pca, use_container_width=True)

        st.markdown("#### 🧮 Component Loadings Matrix (Eigenvectors)")
        render_table(loadings, max_height=220, include_index=True, precision=4)

    # =========================================================================
    # TAB 5: AI ANOMALY & RISK
    # =========================================================================
    with tab5:
        st.markdown("### 🛡️ Isolation Forest AI Anomaly Detection & Composite Risk Index")
        st.caption("Combines continuous machine learning decision scores with deterministic industrial thresholds.")

        x_series = df["timestamp"] if "timestamp" in df.columns else df.index

        fig_risk = go.Figure()

        # Background risk zones
        fig_risk.add_hrect(y0=0, y1=35, fillcolor="rgba(16, 185, 129, 0.12)", line_width=0, annotation_text="Safe Operating Zone (0-35)")
        fig_risk.add_hrect(y0=35, y1=70, fillcolor="rgba(245, 158, 11, 0.12)", line_width=0, annotation_text="Advisory Warning Zone (35-70)")
        fig_risk.add_hrect(y0=70, y1=100, fillcolor="rgba(239, 68, 68, 0.12)", line_width=0, annotation_text="Critical Action Zone (70-100)")

        fig_risk.add_trace(
            go.Scatter(
                x=x_series,
                y=df["risk_index"],
                mode="lines+markers",
                name="Risk Index",
                line=dict(color="#1e293b", width=2),
                marker=dict(
                    size=6,
                    color=df["health_status"].map({"Healthy": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"}),
                ),
                text=df["diagnosis_reason"],
                hoverinfo="x+y+text",
            )
        )

        fig_risk.update_layout(
            title="Composite Risk Index (0–100) Trajectory",
            xaxis_title="Reading Timestamp / Index",
            yaxis_title="Risk Index",
            yaxis=dict(range=[0, 105]),
            template="plotly_white",
            height=370,
            margin=dict(l=20, r=20, t=40, b=20),
        )
        st.plotly_chart(fig_risk, use_container_width=True)

        r_col1, r_col2 = st.columns(2)
        with r_col1:
            st.markdown("#### 🤖 Machine Learning Anomaly Score Distribution")
            fig_hist = px.histogram(
                df,
                x="anomaly_score",
                color="health_status",
                color_discrete_map={"Healthy": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"},
                nbins=30,
                template="plotly_white",
                labels={"anomaly_score": "Isolation Forest Normalized Severity"},
            )
            fig_hist.update_layout(height=260, margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig_hist, use_container_width=True)

        with r_col2:
            st.markdown("#### 🎯 Fleet Health Distribution")
            fig_donut = px.pie(
                df,
                names="health_status",
                color="health_status",
                color_discrete_map={"Healthy": "#10b981", "Warning": "#f59e0b", "Critical": "#ef4444"},
                hole=0.45,
            )
            fig_donut.update_layout(height=260, margin=dict(l=20, r=20, t=20, b=20))
            st.plotly_chart(fig_donut, use_container_width=True)

    # =========================================================================
    # TAB 6: DIAGNOSTIC AUDIT LOG & EXPORT
    # =========================================================================
    with tab6:
        st.markdown("### 📋 Diagnostic Telemetry Audit Log & Report Export")

        filter_status = st.multiselect(
            "Filter Records by Status:",
            ["Healthy", "Warning", "Critical"],
            default=["Healthy", "Warning", "Critical"],
        )

        sub_df = df[df["health_status"].isin(filter_status)]

        st.caption(f"Showing **{len(sub_df):,}** of {len(df):,} logged events.")

        cols_to_show = [
            c for c in [
                "timestamp",
                "vibration",
                "temperature",
                "current",
                "voltage",
                "rotational_speed",
                "is_anomaly",
                "risk_index",
                "health_status",
                "diagnosis_reason",
            ] if c in sub_df.columns
        ]

        render_table(sub_df[cols_to_show], max_height=380, include_index=False, precision=2)

        csv_bytes = sub_df.to_csv(index=False).encode("utf-8")
        st.download_button(
            label="📥 Download Full Condition-Monitoring CSV Report",
            data=csv_bytes,
            file_name="induction_motor_health_report.csv",
            mime="text/csv",
            use_container_width=True,
        )


if __name__ == "__main__":
    main()
