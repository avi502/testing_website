"""
src/data_loader.py
Data loading, validation, cleaning, and z-score standardization for motor sensor data.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

# The 5 primary induction motor parameters specified in the project
SENSOR_COLUMNS: List[str] = [
    "vibration",
    "temperature",
    "current",
    "voltage",
    "rotational_speed",
]

SENSOR_METADATA: Dict[str, Dict[str, str]] = {
    "vibration": {
        "unit": "mm/s",
        "description": "Mechanical vibration behaviour (bearing & rotor vibration)",
        "nominal": "0.5 - 3.0 mm/s",
    },
    "temperature": {
        "unit": "°C",
        "description": "Thermal behaviour (stator winding & casing temperature)",
        "nominal": "45 - 65 °C",
    },
    "current": {
        "unit": "A",
        "description": "Electrical load behaviour (phase current draw)",
        "nominal": "8 - 12 A",
    },
    "voltage": {
        "unit": "V",
        "description": "Supply voltage behaviour (3-phase line voltage)",
        "nominal": "380 - 415 V",
    },
    "rotational_speed": {
        "unit": "RPM",
        "description": "Motor shaft rotational speed",
        "nominal": "1450 - 1490 RPM",
    },
}


def load_sensor_data(filepath_or_buffer) -> pd.DataFrame:
    """
    Load raw sensor data from a CSV file path or file-like buffer.

    Parameters:
        filepath_or_buffer: CSV file path or file-like buffer (e.g. from Streamlit uploader).

    Returns:
        pd.DataFrame: Raw loaded dataframe.
    """
    df = pd.read_csv(filepath_or_buffer)
    return df


def validate_and_clean_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
    """
    Validates required columns, converts values to numeric, and removes invalid/missing rows.

    Parameters:
        df: Input DataFrame.

    Returns:
        Tuple[pd.DataFrame, Dict[str, int]]:
            - Cleaned DataFrame
            - Validation summary dict (total rows, dropped rows, valid rows)
    """
    total_initial_rows = len(df)

    # Check that all 5 sensor columns are present (case-insensitive check and rename)
    col_mapping = {col.strip().lower(): col for col in df.columns}
    missing_cols = []
    for req in SENSOR_COLUMNS:
        if req not in col_mapping:
            missing_cols.append(req)

    if missing_cols:
        raise ValueError(
            f"Dataset is missing required sensor columns: {missing_cols}. "
            f"Expected columns: {SENSOR_COLUMNS}"
        )

    # Normalize column names to standard lowercase
    rename_dict = {col_mapping[req]: req for req in SENSOR_COLUMNS}
    cleaned_df = df.rename(columns=rename_dict).copy()

    # Convert sensor columns to numeric, replacing non-numeric characters with NaN
    for col in SENSOR_COLUMNS:
        cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors="coerce")

    # Physical validity constraints:
    # All parameters must be non-negative (vibration >= 0, temperature >= -20, current >= 0, voltage >= 0, speed >= 0)
    valid_mask = (
        cleaned_df[SENSOR_COLUMNS].notna().all(axis=1)
        & (cleaned_df["vibration"] >= 0)
        & (cleaned_df["temperature"] >= -20)
        & (cleaned_df["current"] >= 0)
        & (cleaned_df["voltage"] >= 0)
        & (cleaned_df["rotational_speed"] >= 0)
    )

    cleaned_df = cleaned_df[valid_mask].reset_index(drop=True)
    dropped_count = total_initial_rows - len(cleaned_df)

    summary = {
        "initial_rows": total_initial_rows,
        "valid_rows": len(cleaned_df),
        "dropped_rows": dropped_count,
    }

    return cleaned_df, summary


def standardize_sensor_data(
    df: pd.DataFrame,
    means: Optional[pd.Series] = None,
    stds: Optional[pd.Series] = None,
) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
    """
    Standardize sensor features using z-score: z = (x - mu) / sigma.
    Prevents high-magnitude variables (like RPM ~1500) from dominating PCA.

    Parameters:
        df: Cleaned sensor DataFrame containing SENSOR_COLUMNS.
        means: Optional pre-calculated means.
        stds: Optional pre-calculated standard deviations.

    Returns:
        Tuple[pd.DataFrame, pd.Series, pd.Series]:
            - DataFrame of z-score standardized features
            - Means of each feature
            - Standard deviations of each feature
    """
    sensor_df = df[SENSOR_COLUMNS].astype(float)

    if means is None:
        means = sensor_df.mean()
    if stds is None:
        stds = sensor_df.std(ddof=0)
        # Avoid division by zero if a feature has zero variance
        stds = stds.replace(0.0, 1.0)

    z_scores = (sensor_df - means) / stds
    return z_scores, means, stds


def compute_summary_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute readable statistical summary (Mean, Std, Min, 25%, Median, 75%, Max)
    for the 5 sensor parameters.
    """
    stats = df[SENSOR_COLUMNS].describe().T
    stats["unit"] = [SENSOR_METADATA[col]["unit"] for col in stats.index]
    stats = stats[["unit", "mean", "std", "min", "50%", "max"]].rename(
        columns={"50%": "median"}
    )
    return stats
