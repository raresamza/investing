"""
Hyperparameter optimization using Optuna.

Finds the best XGBoost parameters for the dataset by maximizing
the walk-forward cross-validation accuracy.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import optuna
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score
from sklearn.utils.class_weight import compute_sample_weight

from src.training.dataset import build_dataset
from src.training.features import FEATURE_COLUMNS

logger = logging.getLogger(__name__)


def _objective(
    trial: optuna.Trial,
    X: np.ndarray,
    y: np.ndarray,
    use_gpu: bool = False,
    n_splits: int = 3,
) -> float:
    """Optuna objective function for XGBoost tuning."""
    params: dict[str, Any] = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000, step=100),
        "max_depth": trial.suggest_int("max_depth", 3, 10),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
        "subsample": trial.suggest_float("subsample", 0.5, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
        "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
        "gamma": trial.suggest_float("gamma", 1e-8, 1.0, log=True),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
        "objective": "multi:softprob",
        "num_class": 3,
        "eval_metric": "mlogloss",
        "random_state": 42,
        "n_jobs": -1,
        "verbosity": 0,
        "tree_method": "hist",
    }

    if use_gpu:
        params["device"] = "cuda"

    tscv = TimeSeriesSplit(n_splits=n_splits)
    fold_accs = []

    for train_idx, val_idx in tscv.split(X):
        X_train, X_val = X[train_idx], X[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        sample_weights = compute_sample_weight("balanced", y_train)

        model = XGBClassifier(**params)
        model.fit(
            X_train, y_train,
            sample_weight=sample_weights,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        y_pred = model.predict(X_val)
        acc = accuracy_score(y_val, y_pred)
        fold_accs.append(acc)

    return float(np.mean(fold_accs))


def optimize_hyperparameters(
    n_trials: int = 20,
    universe: str = "sp500",
    period: str = "5y",
    forward_days: int = 126,
    max_tickers: int | None = None,
    use_gpu: bool = False,
) -> dict[str, Any]:
    """Run Optuna study to find best XGBoost params."""
    dataset = build_dataset(
        universe=universe,
        period=period,
        forward_days=forward_days,
        max_tickers=max_tickers,
    )

    if dataset.empty:
        raise ValueError("Empty dataset")

    X = dataset[FEATURE_COLUMNS].values
    y = dataset["label"].values.astype(int)

    logger.info("Starting hyperparameter tuning with %d trials...", n_trials)

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="maximize")
    
    study.optimize(
        lambda trial: _objective(trial, X, y, use_gpu=use_gpu, n_splits=3),
        n_trials=n_trials,
    )

    logger.info("Best trial accuracy: %.4f", study.best_value)
    logger.info("Best params: %s", study.best_params)

    return study.best_params
