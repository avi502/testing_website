"""
tests/test_health_index.py
Unit tests for domain rule checks, composite Risk Index, and Health Status.
"""

import numpy as np
import pandas as pd
import pytest

from src.health_index import (
    evaluate_sensor_rules,
    compute_risk_index_and_status,
)


def test_evaluate_sensor_rules_healthy():
    """Test rule evaluation for optimal healthy motor parameters."""
    healthy_row = pd.Series({
        "vibration": 1.8,
        "temperature": 52.0,
        "current": 9.5,
        "voltage": 400.0,
        "rotational_speed": 1475.0,
    })
    statuses = evaluate_sensor_rules(healthy_row)
    assert all(status == "Healthy" for status in statuses.values())


def test_evaluate_sensor_rules_critical():
    """Test rule evaluation for severely degraded motor parameters."""
    critical_row = pd.Series({
        "vibration": 8.5,       # Critical > 7.1
        "temperature": 95.0,     # Critical > 90.0
        "current": 22.0,        # Critical > 20.0
        "voltage": 340.0,       # Critical < 350.0
        "rotational_speed": 1350.0, # Critical < 1370.0
    })
    statuses = evaluate_sensor_rules(critical_row)
    assert all(status == "Critical" for status in statuses.values())


def test_compute_risk_index_and_status():
    """Test risk index bounds (0 to 100) and status assignment."""
    test_df = pd.DataFrame([
        # Row 0: Completely healthy
        {"vibration": 1.5, "temperature": 50.0, "current": 9.0, "voltage": 400.0, "rotational_speed": 1480.0},
        # Row 1: Mild warning on vibration and temp
        {"vibration": 5.0, "temperature": 78.0, "current": 14.0, "voltage": 395.0, "rotational_speed": 1450.0},
        # Row 2: Severe critical fault
        {"vibration": 9.0, "temperature": 98.0, "current": 24.0, "voltage": 350.0, "rotational_speed": 1340.0},
    ])

    is_anomaly = np.array([False, False, True])
    anomaly_scores = np.array([0.05, 0.40, 0.95])

    risk_idx, health_status, reasons = compute_risk_index_and_status(
        test_df, is_anomaly, anomaly_scores
    )

    # 1. Bounds check
    assert (risk_idx >= 0).all() and (risk_idx <= 100).all()

    # 2. Status verification
    assert health_status.iloc[0] == "Healthy"
    assert health_status.iloc[1] == "Warning"
    assert health_status.iloc[2] == "Critical"

    # 3. Risk index ordering
    assert risk_idx.iloc[0] < risk_idx.iloc[1] < risk_idx.iloc[2]
