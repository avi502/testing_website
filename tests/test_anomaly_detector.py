"""
tests/test_anomaly_detector.py
Unit tests for Machine Learning Isolation Forest anomaly detector.
"""

import numpy as np
import pandas as pd
import pytest

from src.anomaly_detector import MotorAnomalyDetector
from src.data_loader import (
    load_sensor_data,
    standardize_sensor_data,
    validate_and_clean_data,
)
from scripts.generate_sample_data import generate_motor_data


@pytest.fixture
def sample_standardized_df(tmp_path):
    out_file = str(tmp_path / "test_sensors.csv")
    generate_motor_data(num_samples=120, output_path=out_file, seed=99)
    raw_df = load_sensor_data(out_file)
    cleaned, _ = validate_and_clean_data(raw_df)
    std_df, _, _ = standardize_sensor_data(cleaned)
    return std_df, cleaned


def test_isolation_forest_predictions(sample_standardized_df):
    """Test that Isolation Forest fits and outputs valid flags and normalized scores."""
    std_df, cleaned = sample_standardized_df
    detector = MotorAnomalyDetector(contamination=0.15, random_state=42)

    detector.fit(std_df, state_series=cleaned.get("simulated_state"))
    raw_flags, is_anomaly, normalized_scores = detector.predict(std_df)

    assert len(raw_flags) == len(std_df)
    assert len(is_anomaly) == len(std_df)
    assert len(normalized_scores) == len(std_df)

    # Raw flags must be only 1 (inlier) or -1 (outlier)
    assert set(np.unique(raw_flags)).issubset({1, -1})

    # Normalized score must be in [0.0, 1.0]
    assert (normalized_scores >= 0.0).all()
    assert (normalized_scores <= 1.0).all()

    # Some anomalies should be flagged at 15% contamination
    assert is_anomaly.sum() > 0


def test_unfitted_detector_raises():
    """Test that calling predict before fit raises RuntimeError."""
    detector = MotorAnomalyDetector()
    dummy_df = pd.DataFrame(columns=["vibration", "temperature", "current", "voltage", "rotational_speed"])
    with pytest.raises(RuntimeError):
        detector.predict(dummy_df)
