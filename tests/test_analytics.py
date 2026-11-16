"""
tests/test_analytics.py
Unit tests for correlation matrix and PCA eigenvalue decomposition.
"""

import numpy as np
import pandas as pd
import pytest

from src.analytics import (
    compute_correlation_matrix,
    explain_correlations,
    perform_pca_analysis,
)
from src.data_loader import (
    load_sensor_data,
    standardize_sensor_data,
    validate_and_clean_data,
)
from scripts.generate_sample_data import generate_motor_data


@pytest.fixture
def sample_dataframe(tmp_path):
    out_file = str(tmp_path / "test_sensors.csv")
    generate_motor_data(num_samples=150, output_path=out_file, seed=42)
    raw_df = load_sensor_data(out_file)
    cleaned, _ = validate_and_clean_data(raw_df)
    return cleaned


def test_correlation_matrix(sample_dataframe):
    """Test 5x5 correlation matrix shape, range (-1 to 1), and unit diagonal."""
    corr = compute_correlation_matrix(sample_dataframe)
    assert corr.shape == (5, 5)

    # Diagonal must be 1.0
    for col in corr.columns:
        assert np.isclose(corr.loc[col, col], 1.0)

    # All values between -1 and 1
    assert (corr.values >= -1.0).all()
    assert (corr.values <= 1.0).all()

    explanations = explain_correlations(corr)
    assert len(explanations) == 10  # 5 * 4 / 2 pairs


def test_pca_analysis(sample_dataframe):
    """Test PCA coordinates, eigenvalues, and explained variance."""
    standardized_df, _, _ = standardize_sensor_data(sample_dataframe)
    coords_df, summary_df, loadings_df = perform_pca_analysis(standardized_df, n_components=5)

    # 1. Coordinates shape
    assert coords_df.shape == (150, 5)
    assert "PC1" in coords_df.columns
    assert "PC2" in coords_df.columns

    # 2. Summary table
    assert len(summary_df) == 5
    assert "Eigenvalue" in summary_df.columns
    assert "Explained_Variance_Pct" in summary_df.columns

    # Cumulative variance of all 5 components should equal ~100%
    assert np.isclose(summary_df["Cumulative_Variance_Pct"].iloc[-1], 100.0, atol=0.1)

    # Eigenvalues should be sorted in descending order
    eigenvalues = summary_df["Eigenvalue"].values
    assert (np.diff(eigenvalues) <= 0).all()

    # 3. Loadings table
    assert loadings_df.shape == (5, 5)
