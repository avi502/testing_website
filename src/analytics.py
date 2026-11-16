"""
src/analytics.py
Statistical correlation and Principal Component Analysis (PCA) with eigenvalue decomposition.
"""

from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA

from src.data_loader import SENSOR_COLUMNS


def compute_correlation_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes the 5x5 Pearson correlation matrix between all sensor parameters.
    Values range from -1.0 (strong inverse relationship) to +1.0 (strong direct relationship).

    Parameters:
        df: DataFrame containing the 5 sensor columns.

    Returns:
        pd.DataFrame: 5x5 symmetric correlation matrix.
    """
    corr = df[SENSOR_COLUMNS].corr(method="pearson").round(4)
    return corr


def explain_correlations(corr_matrix: pd.DataFrame) -> List[Dict[str, str]]:
    """
    Extracts and explains the strongest relationships between motor parameters in simple English.
    """
    explanations = []
    columns = list(corr_matrix.columns)

    for i in range(len(columns)):
        for j in range(i + 1, len(columns)):
            col1 = columns[i]
            col2 = columns[j]
            val = corr_matrix.loc[col1, col2]

            strength = "weak"
            if abs(val) >= 0.7:
                strength = "very strong"
            elif abs(val) >= 0.4:
                strength = "moderate"

            direction = "positive (rise together)" if val > 0 else "negative (as one rises, the other falls)"

            # Plain English interpretation for typical motor dynamics
            if "vibration" in (col1, col2) and "temperature" in (col1, col2):
                context = "Mechanical friction and bearing degradation cause both shaking and heating."
            elif "current" in (col1, col2) and "rotational_speed" in (col1, col2):
                context = "As electrical load increases, motor slip causes rotational speed to drop slightly."
            elif "current" in (col1, col2) and "temperature" in (col1, col2):
                context = "Higher electric current generates internal resistive heating (I²R losses)."
            elif "voltage" in (col1, col2) and "current" in (col1, col2):
                context = "Voltage dips under heavy load, causing the motor to pull more current to compensate."
            else:
                context = f"Indicates a {strength} relationship between {col1} and {col2}."

            explanations.append({
                "pair": f"{col1.replace('_', ' ').title()} & {col2.replace('_', ' ').title()}",
                "correlation": round(val, 3),
                "strength": strength,
                "direction": direction,
                "context": context,
            })

    # Sort by absolute correlation magnitude
    explanations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return explanations


def perform_pca_analysis(
    standardized_df: pd.DataFrame, n_components: int = 5
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Performs Principal Component Analysis (PCA) on standardized sensor features.

    Calculates:
      - Principal components (PC1, PC2, ...)
      - Eigenvalues (variance along each principal direction)
      - Explained variance ratio & cumulative explained variance
      - Feature loadings (how each original sensor contributes to PC1 & PC2)

    Parameters:
        standardized_df: DataFrame of z-score normalized features.
        n_components: Number of components to compute (default: 5).

    Returns:
        Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
            1. pca_coordinates_df: PC1 and PC2 values for each row in the dataset
            2. pca_summary_df: Table showing eigenvalues, variance (%), and cumulative variance (%)
            3. loadings_df: Table showing how each sensor maps into the principal components
    """
    n_features = len(SENSOR_COLUMNS)
    n_components = min(n_components, n_features)

    pca = PCA(n_components=n_components)
    transformed = pca.fit_transform(standardized_df[SENSOR_COLUMNS])

    # Eigenvalues: In PCA on standardized data, eigenvalues equal explained variance * (N-1) / (N-1) = pca.explained_variance_
    eigenvalues = pca.explained_variance_
    explained_variance_ratio = pca.explained_variance_ratio_
    cumulative_variance_ratio = np.cumsum(explained_variance_ratio)

    # 1. Coordinates DataFrame (PC1, PC2, etc.)
    component_names = [f"PC{i+1}" for i in range(n_components)]
    pca_coordinates_df = pd.DataFrame(transformed, columns=component_names)

    # 2. Summary DataFrame (Eigenvalues & Variance Ratios)
    pca_summary_df = pd.DataFrame({
        "Component": component_names,
        "Eigenvalue": np.round(eigenvalues, 4),
        "Explained_Variance_Pct": np.round(explained_variance_ratio * 100, 2),
        "Cumulative_Variance_Pct": np.round(cumulative_variance_ratio * 100, 2),
    })

    # 3. Loadings DataFrame (Eigenvectors weighted by components)
    loadings_df = pd.DataFrame(
        pca.components_.T,
        index=SENSOR_COLUMNS,
        columns=component_names,
    ).round(4)

    return pca_coordinates_df, pca_summary_df, loadings_df
