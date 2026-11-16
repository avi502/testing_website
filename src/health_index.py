"""
src/health_index.py
Domain rule-based checks, composite Risk Index (0-100), and Health Status classification.
"""

from typing import Dict, List, Tuple
import numpy as np
import pandas as pd


# Industrial Motor Thresholds (based on ISO 10816 vibration severity and motor thermal/electrical ratings)
THRESHOLDS = {
    "vibration": {
        "warning": 4.5,   # mm/s (ISO 10816-3 Zone B/C boundary)
        "critical": 7.1,  # mm/s (ISO 10816-3 Zone C/D boundary: unrestricted operation may cause damage)
    },
    "temperature": {
        "warning": 75.0,  # °C (approaching Class B insulation temperature rise limit)
        "critical": 90.0, # °C (severe overheating risk to winding insulation)
    },
    "current": {
        "warning": 15.0,  # A (mild electrical overload)
        "critical": 20.0, # A (severe overcurrent / stalled rotor risk)
    },
    "voltage": {
        "min_warning": 370.0, # V (nominal 400V - 7.5%)
        "max_warning": 430.0, # V (nominal 400V + 7.5%)
        "min_critical": 350.0,# V (under-voltage trip hazard)
        "max_critical": 450.0,# V (over-voltage stress)
    },
    "rotational_speed": {
        "min_warning": 1420.0, # RPM (excess slip under heavy load)
        "min_critical": 1370.0,# RPM (severe load drag / mechanical jam)
    },
}


def evaluate_sensor_rules(row: pd.Series) -> Dict[str, str]:
    """
    Evaluates individual sensor values against standard engineering threshold rules.
    Returns a dict mapping parameter name to its status: 'Healthy', 'Warning', or 'Critical'.
    """
    statuses = {}

    # 1. Vibration
    vib = row["vibration"]
    if vib >= THRESHOLDS["vibration"]["critical"]:
        statuses["vibration"] = "Critical"
    elif vib >= THRESHOLDS["vibration"]["warning"]:
        statuses["vibration"] = "Warning"
    else:
        statuses["vibration"] = "Healthy"

    # 2. Temperature
    temp = row["temperature"]
    if temp >= THRESHOLDS["temperature"]["critical"]:
        statuses["temperature"] = "Critical"
    elif temp >= THRESHOLDS["temperature"]["warning"]:
        statuses["temperature"] = "Warning"
    else:
        statuses["temperature"] = "Healthy"

    # 3. Current
    curr = row["current"]
    if curr >= THRESHOLDS["current"]["critical"]:
        statuses["current"] = "Critical"
    elif curr >= THRESHOLDS["current"]["warning"]:
        statuses["current"] = "Warning"
    else:
        statuses["current"] = "Healthy"

    # 4. Voltage
    volt = row["voltage"]
    if volt <= THRESHOLDS["voltage"]["min_critical"] or volt >= THRESHOLDS["voltage"]["max_critical"]:
        statuses["voltage"] = "Critical"
    elif volt <= THRESHOLDS["voltage"]["min_warning"] or volt >= THRESHOLDS["voltage"]["max_warning"]:
        statuses["voltage"] = "Warning"
    else:
        statuses["voltage"] = "Healthy"

    # 5. Rotational speed
    rpm = row["rotational_speed"]
    if rpm <= THRESHOLDS["rotational_speed"]["min_critical"]:
        statuses["rotational_speed"] = "Critical"
    elif rpm <= THRESHOLDS["rotational_speed"]["min_warning"]:
        statuses["rotational_speed"] = "Warning"
    else:
        statuses["rotational_speed"] = "Healthy"

    return statuses


def compute_risk_index_and_status(
    df: pd.DataFrame,
    is_anomaly: np.ndarray,
    anomaly_scores: np.ndarray,
) -> Tuple[pd.Series, pd.Series, List[str]]:
    """
    Computes a composite Risk Index (0-100) and assigns an operational Health Status
    (Healthy, Warning, Critical) combining Machine Learning anomaly output and engineering rules.

    Parameters:
        df: Cleaned sensor DataFrame.
        is_anomaly: Boolean array of anomaly flags from Isolation Forest.
        anomaly_scores: Normalized anomaly severity scores (0.0 to 1.0).

    Returns:
        Tuple[pd.Series, pd.Series, List[str]]:
            - risk_index: integer series from 0 (lowest risk) to 100 (imminent danger)
            - health_status: series of 'Healthy', 'Warning', or 'Critical'
            - primary_reasons: human-readable reason string explaining the status
    """
    risk_scores = []
    statuses = []
    reasons = []

    for i in range(len(df)):
        row = df.iloc[i]
        score_val = float(anomaly_scores[i])
        flag_val = bool(is_anomaly[i])

        # 1. Base ML risk contribution (0 to 40 points)
        base_ml_risk = score_val * 40.0
        rule_points = 0.0

        rule_results = evaluate_sensor_rules(row)
        active_reasons = []

        # Tally rule points
        if rule_results["vibration"] == "Critical":
            rule_points += 35.0
            active_reasons.append(f"Severe Vibration ({row['vibration']:.1f} mm/s)")
        elif rule_results["vibration"] == "Warning":
            rule_points += 15.0
            active_reasons.append(f"High Vibration ({row['vibration']:.1f} mm/s)")

        if rule_results["temperature"] == "Critical":
            rule_points += 30.0
            active_reasons.append(f"High Overheating ({row['temperature']:.1f} °C)")
        elif rule_results["temperature"] == "Warning":
            rule_points += 12.0
            active_reasons.append(f"Elevated Temperature ({row['temperature']:.1f} °C)")

        if rule_results["current"] == "Critical":
            rule_points += 25.0
            active_reasons.append(f"Severe Overcurrent ({row['current']:.1f} A)")
        elif rule_results["current"] == "Warning":
            rule_points += 10.0
            active_reasons.append(f"High Current Draw ({row['current']:.1f} A)")

        if rule_results["voltage"] == "Critical":
            rule_points += 15.0
            active_reasons.append(f"Abnormal Supply Voltage ({row['voltage']:.1f} V)")
        elif rule_results["voltage"] == "Warning":
            rule_points += 8.0
            active_reasons.append(f"Voltage Fluctuating ({row['voltage']:.1f} V)")

        if rule_results["rotational_speed"] == "Critical":
            rule_points += 15.0
            active_reasons.append(f"Severe Speed Drop ({row['rotational_speed']:.0f} RPM)")
        elif rule_results["rotational_speed"] == "Warning":
            rule_points += 8.0
            active_reasons.append(f"Speed Drag ({row['rotational_speed']:.0f} RPM)")

        # Additional nudge if ML flagged an anomaly even if individual rules didn't catch it
        if flag_val and len(active_reasons) == 0:
            rule_points += 18.0
            active_reasons.append("Multi-sensor pattern anomaly detected by ML")

        total_risk = min(100.0, max(0.0, base_ml_risk + rule_points))
        total_risk_int = int(round(total_risk))

        # Determine Health Status
        # Critical if risk >= 70 OR any individual parameter is in Critical state
        has_critical_param = any(s == "Critical" for s in rule_results.values())
        has_warning_param = any(s == "Warning" for s in rule_results.values())

        if total_risk_int >= 70 or has_critical_param:
            status = "Critical"
        elif total_risk_int >= 35 or has_warning_param or flag_val:
            status = "Warning"
        else:
            status = "Healthy"

        if not active_reasons:
            reason_text = "All sensor values within optimal baseline"
        else:
            reason_text = "; ".join(active_reasons)

        risk_scores.append(total_risk_int)
        statuses.append(status)
        reasons.append(reason_text)

    return pd.Series(risk_scores, name="risk_index"), pd.Series(statuses, name="health_status"), reasons
