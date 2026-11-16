"""
tests/test_data_loader.py
Unit tests for data loading, validation, and z-score standardization.
"""

import os
import numpy as np
import pandas as pd
import pytest

from src.data_loader import (
    SENSOR_COLUMNS,
    compute_summary_statistics,
    load_sensor_data,
    standardize_sensor_data,
    validate_and_clean_data,
)
from scripts.generate_sample_data import generate_motor_data


@pytest.fixture
def sample_csv_path(tmp_path):
    out_file = str(tmp_path / "test_sensors.csv")
    generate_motor_data(num_samples=100, output_path=out_file, seed=123)
    return out_file


def test_sample_data_generation(sample_csv_path):
    """Test that generated CSV exists, has 100 rows, and includes all required columns."""
    assert os.path.exists(sample_csv_path)
    df = pd.read_csv(sample_csv_path)
    assert len(df) == 100
    for col in SENSOR_COLUMNS:
        assert col in df.columns


def test_data_validation_valid(sample_csv_path):
    """Test that clean data passes validation with 0 dropped rows."""
    df = load_sensor_data(sample_csv_path)
    cleaned, summary = validate_and_clean_data(df)
    assert len(cleaned) == 100
    assert summary["dropped_rows"] == 0
    assert summary["valid_rows"] == 100


def test_data_validation_missing_and_corrupt():
    """Test that corrupt, non-numeric, or missing sensor values are safely removed."""
    bad_data = pd.DataFrame({
        "vibration": [2.0, "INVALID", None, 3.5, -5.0],
        "temperature": [55.0, 60.0, 70.0, None, 45.0],
        "current": [10.0, 11.0, 12.0, 10.5, 9.0],
        "voltage": [400.0, 395.0, 405.0, 400.0, 400.0],
        "rotational_speed": [1470.0, 1465.0, 1480.0, 1475.0, 1470.0],
    })

    cleaned, summary = validate_and_clean_data(bad_data)
    # Row 0 is valid.
    # Row 1 has non-numeric "INVALID" vibration -> dropped
    # Row 2 has None vibration -> dropped
    # Row 3 has None temperature -> dropped
    # Row 4 has negative vibration (-5.0) -> dropped
    assert len(cleaned) == 1
    assert summary["dropped_rows"] == 4
    assert summary["valid_rows"] == 1


def test_standardization(sample_csv_path):
    """Test that z-score standardization yields approx mean 0 and std 1."""
    df = load_sensor_data(sample_csv_path)
    cleaned, _ = validate_and_clean_data(df)
    z_scores, means, stds = standardize_sensor_data(cleaned)

    assert z_scores.shape == (100, 5)
    for col in SENSOR_COLUMNS:
        assert np.isclose(z_scores[col].mean(), 0.0, atol=1e-2)
        assert np.isclose(z_scores[col].std(ddof=0), 1.0, atol=1e-2)


def test_summary_statistics(sample_csv_path):
    """Test summary statistics calculation."""
    df = load_sensor_data(sample_csv_path)
    cleaned, _ = validate_and_clean_data(df)
    stats = compute_summary_statistics(cleaned)

    assert len(stats) == 5
    assert "mean" in stats.columns
    assert "std" in stats.columns
    assert "median" in stats.columns
