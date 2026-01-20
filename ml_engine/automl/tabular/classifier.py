"""
Tabular Classification Module
Supports: Logistic Regression, Random Forest, XGBoost, Gradient Boosting, SVM, KNN, Decision Tree, AdaBoost, Extra Trees, LightGBM
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import (
    RandomForestClassifier, 
    GradientBoostingClassifier, 
    AdaBoostClassifier, 
    ExtraTreesClassifier
)
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
import joblib

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    from lightgbm import LGBMClassifier
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False


class TabularClassifier:
    """AutoML for tabular classification tasks"""
    
    MODELS = {
        'logistic_regression': {
            'class': LogisticRegression,
            'params': {'max_iter': 1000, 'random_state': 42}
        },
        'random_forest': {
            'class': RandomForestClassifier,
            'params': {'n_estimators': 100, 'random_state': 42, 'n_jobs': -1}
        },
        'gradient_boosting': {
            'class': GradientBoostingClassifier,
            'params': {'n_estimators': 100, 'random_state': 42, 'max_depth': 5}
        },
        'svm': {
            'class': SVC,
            'params': {'kernel': 'rbf', 'probability': True, 'random_state': 42}
        },
        'knn': {
            'class': KNeighborsClassifier,
            'params': {'n_neighbors': 5, 'n_jobs': -1}
        },
        'decision_tree': {
            'class': DecisionTreeClassifier,
            'params': {'random_state': 42, 'max_depth': 10}
        },
        'adaboost': {
            'class': AdaBoostClassifier,
            'params': {'n_estimators': 100, 'random_state': 42}
        },
        'extra_trees': {
            'class': ExtraTreesClassifier,
            'params': {'n_estimators': 100, 'random_state': 42, 'n_jobs': -1}
        }
    }
    
    def __init__(self):
        if XGBOOST_AVAILABLE:
            self.MODELS['xgboost'] = {
                'class': XGBClassifier,
                'params': {'n_estimators': 100, 'random_state': 42, 'use_label_encoder': False, 'eval_metric': 'logloss'}
            }
        
        if LIGHTGBM_AVAILABLE:
            self.MODELS['lightgbm'] = {
                'class': LGBMClassifier,
                'params': {'n_estimators': 100, 'random_state': 42, 'verbose': -1}
            }
        
        self.trained_models = {}
        self.best_model = None
        self.best_model_name = None
        self.best_score = 0
        self.results = []

    
    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        models_to_train: Optional[List[str]] = None,
        cv_folds: int = 5
    ) -> Dict[str, Any]:
        """Train multiple models and select the best one"""
        
        if models_to_train is None:
            models_to_train = list(self.MODELS.keys())
        
        print(f"[TabularClassifier] Starting training with {len(models_to_train)} algorithms:", flush=True)
        for i, name in enumerate(models_to_train, 1):
            print(f"  {i}. {name}", flush=True)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        self.results = []
        
        for model_name in models_to_train:
            if model_name not in self.MODELS:
                continue
            
            try:
                print(f"[TabularClassifier] Training {model_name}...", flush=True)
                result = self._train_single_model(
                    model_name, X_train, X_test, y_train, y_test, cv_folds
                )
                self.results.append(result)
                print(f"[TabularClassifier] {model_name} completed - CV Score: {result['cv_score_mean']:.4f}", flush=True)
                
                # Track best model
                if result['cv_score_mean'] > self.best_score:
                    self.best_score = result['cv_score_mean']
                    self.best_model = self.trained_models[model_name]
                    self.best_model_name = model_name
                    
            except Exception as e:
                print(f"[TabularClassifier] {model_name} FAILED: {str(e)}", flush=True)
                self.results.append({
                    'model_name': model_name,
                    'status': 'failed',
                    'error': str(e)
                })
        
        print(f"[TabularClassifier] Training complete! Best model: {self.best_model_name} (score: {self.best_score:.4f})", flush=True)
        
        return {
            'results': self.results,
            'best_model': self.best_model_name,
            'best_score': self.best_score
        }

    
    def _train_single_model(
        self,
        model_name: str,
        X_train: pd.DataFrame,
        X_test: pd.DataFrame,
        y_train: pd.Series,
        y_test: pd.Series,
        cv_folds: int
    ) -> Dict[str, Any]:
        """Train a single model and compute metrics"""
        
        model_config = self.MODELS[model_name]
        model = model_config['class'](**model_config['params'])
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring='accuracy')
        
        # Fit on full training data
        model.fit(X_train, y_train)
        self.trained_models[model_name] = model
        
        # Predictions
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
        
        # Compute metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'f1_weighted': f1_score(y_test, y_pred, average='weighted'),
            'precision_weighted': precision_score(y_test, y_pred, average='weighted'),
            'recall_weighted': recall_score(y_test, y_pred, average='weighted')
        }
        
        # AUC for binary classification
        if len(np.unique(y_test)) == 2 and y_proba is not None:
            metrics['roc_auc'] = roc_auc_score(y_test, y_proba[:, 1])
        
        return {
            'model_name': model_name,
            'status': 'completed',
            'cv_scores': cv_scores.tolist(),
            'cv_score_mean': cv_scores.mean(),
            'cv_score_std': cv_scores.std(),
            'test_metrics': metrics
        }
    
    def predict(self, X: pd.DataFrame, model_name: Optional[str] = None) -> np.ndarray:
        """Make predictions using trained model"""
        model = self.trained_models.get(model_name) if model_name else self.best_model
        if model is None:
            raise ValueError("No model trained. Call train() first.")
        return model.predict(X)
    
    def predict_proba(self, X: pd.DataFrame, model_name: Optional[str] = None) -> np.ndarray:
        """Get prediction probabilities"""
        model = self.trained_models.get(model_name) if model_name else self.best_model
        if model is None:
            raise ValueError("No model trained. Call train() first.")
        return model.predict_proba(X)
    
    def save_model(self, path: str, model_name: Optional[str] = None):
        """Save model to file"""
        model = self.trained_models.get(model_name) if model_name else self.best_model
        if model is None:
            raise ValueError("No model to save. Call train() first.")
        joblib.dump(model, path)
    
    def load_model(self, path: str):
        """Load model from file"""
        self.best_model = joblib.load(path)
        return self.best_model
