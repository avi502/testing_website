"""
src/anomaly_detector.py
Machine Learning anomaly detection using Scikit-Learn's Isolation Forest algorithm.
"""

from typing import Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from src.data_loader import SENSOR_COLUMNS


class MotorAnomalyDetector:
    """
    Wraps Scikit-Learn's IsolationForest for detecting anomalous motor operating states.
    Trains on baseline/normal observations if labelled, or fits on the dataset.
    """

    def __init__(
        self,
        contamination: float = 0.15,
        random_state: int = 42,
        n_estimators: int = 150,
    ):
        """
        Parameters:
            contamination: Expected proportion of outliers in the data (default: 0.15).
            random_state: Random seed for reproducibility.
            n_estimators: Number of decision trees in the ensemble.
        """
        self.contamination = contamination
        self.random_state = random_state
        self.n_estimators = n_estimators
        self.model: Optional[IsolationForest] = None
        self.is_fitted: bool = False

    def fit(self, standardized_df: pd.DataFrame, state_series: Optional[pd.Series] = None) -> "MotorAnomalyDetector":
        """
        Fit Isolation Forest model.
        If state labels are available and enough 'Normal' examples exist, train on normal baseline.
        Otherwise, train on the entire standardized dataset.
        """
        X = standardized_df[SENSOR_COLUMNS].values

        if state_series is not None and "Normal" in state_series.values:
            normal_mask = state_series == "Normal"
            if normal_mask.sum() >= 20:
                X_train = X[normal_mask]
            else:
                X_train = X
        else:
            X_train = X

        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_estimators=self.n_estimators,
        )
        self.model.fit(X_train)
        self.is_fitted = True
        return self

    def predict(self, standardized_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Predict anomaly flags and scores for sensor data.

        Returns:
            Tuple[np.ndarray, np.ndarray, np.ndarray]:
                - raw_flags: 1 for normal, -1 for anomaly (standard scikit-learn format)
                - is_anomaly: True if anomalous, False if normal
                - normalized_scores: continuous anomaly severity score from 0.0 (normal) to 1.0 (highly abnormal)
        """
        if not self.is_fitted or self.model is None:
            raise RuntimeError("MotorAnomalyDetector must be fitted before calling predict().")

        X = standardized_df[SENSOR_COLUMNS].values
        raw_flags = self.model.predict(X)
        is_anomaly = raw_flags == -1

        # score_samples returns opposite of anomaly score (lower means more abnormal)
        # Decision function: negative values indicate outliers, positive indicate inliers
        decision_scores = self.model.decision_function(X)

        # Normalize score into [0.0, 1.0] range where 1.0 is highest anomaly severity
        min_s = decision_scores.min()
        max_s = decision_scores.max()
        if max_s > min_s:
            # Invert so higher score = higher severity
            normalized_scores = (max_s - decision_scores) / (max_s - min_s)
        else:
            normalized_scores = np.zeros(len(decision_scores))

        return raw_flags, is_anomaly, np.round(normalized_scores, 4)
