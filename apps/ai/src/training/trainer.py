"""
XGBoost model trainer.

Trains a gradient-boosted classifier to predict BUY / HOLD / SELL from
the engineered feature set. Includes walk-forward validation, class
balancing, and model persistence.
"""

from __future__ import annotations

import logging
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from xgboost.core import XGBoostError
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, precision_score
from sklearn.utils.class_weight import compute_sample_weight

from src.training.features import FEATURE_COLUMNS
from src.training.dataset import build_dataset

logger = logging.getLogger(__name__)

_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


def _xgb_device_params(use_gpu: bool) -> dict:
    base = {
        "tree_method": "hist",
        "n_jobs": -1,
    }
    if use_gpu:
        base["device"] = "cuda"
    return base


def train(
    universe: str = "sp500",
    period: str = "5y",
    forward_days: int = 126,
    buy_threshold: float = 0.10,
    sell_threshold: float = -0.05,
    max_tickers: int | None = None,
    n_splits: int = 5,
    use_gpu: bool = False,
    cache: bool = True,
    save: bool = True,
) -> tuple[XGBClassifier, dict]:
    """
    Train XGBoost classifier with walk-forward time-series cross-validation.

    Returns
    -------
    model : XGBClassifier
        Trained model.
    metrics : dict
        Evaluation metrics from the final validation fold.
    """
    # ── 1. Build dataset ─────────────────────────────────────────────
    dataset = build_dataset(
        universe=universe,
        period=period,
        forward_days=forward_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        max_tickers=max_tickers,
        cache=cache,
    )

    if dataset.empty:
        raise ValueError("Empty dataset — cannot train")

    dataset = dataset.sort_values(["date", "ticker"]).reset_index(drop=True)

    X = dataset[FEATURE_COLUMNS].values
    y = dataset["label"].values.astype(int)
    forward_returns = dataset["forward_return"].values.astype(float)

    logger.info("Training on %d samples, %d features", X.shape[0], X.shape[1])

    # ── 2. Walk-forward cross-validation ─────────────────────────────
    tscv = TimeSeriesSplit(n_splits=n_splits)
    fold_metrics: list[dict[str, float]] = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X), 1):
        X_train, X_val = X[train_idx], X[val_idx]
        y_train, y_val = y[train_idx], y[val_idx]

        # Class weight balancing
        sample_weights = compute_sample_weight("balanced", y_train)

        model = XGBClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=5,
            reg_alpha=0.1,
            reg_lambda=1.0,
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss",
            early_stopping_rounds=30,
            random_state=42,
            verbosity=0,
            **_xgb_device_params(use_gpu),
        )

        model.fit(
            X_train, y_train,
            sample_weight=sample_weights,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        y_pred = model.predict(X_val)
        acc = accuracy_score(y_val, y_pred)
        bal_acc = balanced_accuracy_score(y_val, y_pred)
        f1_macro = f1_score(y_val, y_pred, average="macro", zero_division=0)
        buy_precision = precision_score((y_val == 2).astype(int), (y_pred == 2).astype(int), zero_division=0)

        fold_metrics.append(
            {
                "accuracy": float(acc),
                "balanced_accuracy": float(bal_acc),
                "f1_macro": float(f1_macro),
                "buy_precision": float(buy_precision),
            }
        )
        logger.info(
            "Fold %d/%d — acc=%.3f bal_acc=%.3f f1_macro=%.3f buy_precision=%.3f",
            fold, n_splits, acc, bal_acc, f1_macro, buy_precision,
        )

    logger.info(
        "Cross-validation accuracy: %.3f ± %.3f",
        np.mean([m["accuracy"] for m in fold_metrics]),
        np.std([m["accuracy"] for m in fold_metrics]),
    )

    # ── 2b. Out-of-sample holdout (final 15% by time) ───────────────
    split_idx = int(len(dataset) * 0.85)
    X_train_all, X_test = X[:split_idx], X[split_idx:]
    y_train_all, y_test = y[:split_idx], y[split_idx:]
    fwd_test = forward_returns[split_idx:]

    holdout_model = XGBClassifier(
        n_estimators=600,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=3,
        random_state=42,
        verbosity=0,
        **_xgb_device_params(use_gpu),
    )
    holdout_weights = compute_sample_weight("balanced", y_train_all)
    try:
        holdout_model.fit(X_train_all, y_train_all, sample_weight=holdout_weights)
    except XGBoostError as exc:
        if use_gpu:
            logger.warning("GPU training failed (%s). Falling back to CPU.", exc)
            use_gpu = False
            holdout_model = XGBClassifier(
                n_estimators=600,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=5,
                reg_alpha=0.1,
                reg_lambda=1.0,
                objective="multi:softprob",
                num_class=3,
                random_state=42,
                verbosity=0,
                **_xgb_device_params(False),
            )
            holdout_model.fit(X_train_all, y_train_all, sample_weight=holdout_weights)
        else:
            raise

    y_test_pred = holdout_model.predict(X_test)
    oos_accuracy = accuracy_score(y_test, y_test_pred)
    oos_balanced_accuracy = balanced_accuracy_score(y_test, y_test_pred)
    oos_f1_macro = f1_score(y_test, y_test_pred, average="macro", zero_division=0)
    oos_buy_precision = precision_score((y_test == 2).astype(int), (y_test_pred == 2).astype(int), zero_division=0)

    pred_buy_mask = y_test_pred == 2
    realized_buy_return_mean = float(np.mean(fwd_test[pred_buy_mask])) if np.any(pred_buy_mask) else 0.0
    market_return_mean = float(np.mean(fwd_test)) if len(fwd_test) else 0.0

    # ── 3. Final model — train on all data ───────────────────────────
    sample_weights = compute_sample_weight("balanced", y)

    final_model = XGBClassifier(
        n_estimators=600,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="multi:softprob",
        num_class=3,
        random_state=42,
        verbosity=0,
        **_xgb_device_params(use_gpu),
    )
    final_model.fit(X, y, sample_weight=sample_weights)

    # ── 4. Feature importance ────────────────────────────────────────
    importances = dict(zip(FEATURE_COLUMNS, final_model.feature_importances_))
    top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:10]
    logger.info("Top features: %s", [(f, round(v, 3)) for f, v in top_features])

    # ── 5. Save model ────────────────────────────────────────────────
    metrics = {
        "cv_accuracy_mean": round(float(np.mean([m["accuracy"] for m in fold_metrics])), 4),
        "cv_accuracy_std": round(float(np.std([m["accuracy"] for m in fold_metrics])), 4),
        "cv_balanced_accuracy_mean": round(float(np.mean([m["balanced_accuracy"] for m in fold_metrics])), 4),
        "cv_f1_macro_mean": round(float(np.mean([m["f1_macro"] for m in fold_metrics])), 4),
        "cv_buy_precision_mean": round(float(np.mean([m["buy_precision"] for m in fold_metrics])), 4),
        "oos_accuracy": round(float(oos_accuracy), 4),
        "oos_balanced_accuracy": round(float(oos_balanced_accuracy), 4),
        "oos_f1_macro": round(float(oos_f1_macro), 4),
        "oos_buy_precision": round(float(oos_buy_precision), 4),
        "oos_mean_forward_return_predicted_buy": round(realized_buy_return_mean, 4),
        "oos_mean_forward_return_all_samples": round(market_return_mean, 4),
        "n_samples": int(X.shape[0]),
        "n_features": int(X.shape[1]),
        "feature_importance": {k: round(float(v), 4) for k, v in top_features},
        "feature_columns": FEATURE_COLUMNS,
        "device": "cuda" if use_gpu else "cpu",
        "trained_at": datetime.now().isoformat(),
        "universe": universe,
        "period": period,
        "forward_days": forward_days,
        "buy_threshold": buy_threshold,
        "sell_threshold": sell_threshold,
        "class_distribution": {
            "SELL": int((y == 0).sum()),
            "HOLD": int((y == 1).sum()),
            "BUY": int((y == 2).sum()),
        },
    }

    if save:
        _MODELS_DIR.mkdir(parents=True, exist_ok=True)
        model_path = _MODELS_DIR / "xgboost_model.joblib"
        meta_path = _MODELS_DIR / "xgboost_meta.json"

        joblib.dump(final_model, model_path)

        import json
        meta_path.write_text(json.dumps(metrics, indent=2))

        logger.info("Model saved to %s", model_path)
        logger.info("Metadata saved to %s", meta_path)

    return final_model, metrics


def load_model() -> tuple[XGBClassifier, dict] | None:
    """Load a previously trained model from disk."""
    model_path = _MODELS_DIR / "xgboost_model.joblib"
    meta_path = _MODELS_DIR / "xgboost_meta.json"

    if not model_path.exists():
        logger.info("No trained model found at %s", model_path)
        return None

    model = joblib.load(model_path)

    import json
    meta = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())

    logger.info(
        "Loaded model trained at %s (CV accuracy: %s)",
        meta.get("trained_at", "unknown"),
        meta.get("cv_accuracy_mean", "unknown"),
    )

    return model, meta
