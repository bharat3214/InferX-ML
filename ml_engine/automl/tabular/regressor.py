"""
Tabular Regression Module
Supports: Linear Regression, Random Forest, XGBoost
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

try:
    from xgboost import XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


class TabularRegressor:
    """AutoML for tabular regression tasks"""
    
    MODELS = {
        'linear_regression': {
            'class': LinearRegression,
            'params': {}
        },
        'ridge': {
            'class': Ridge,
            'params': {'random_state': 42}
        },
        'random_forest': {
            'class': RandomForestRegressor,
            'params': {'n_estimators': 100, 'random_state': 42, 'n_jobs': -1}
        }
    }
    
    def __init__(self):
        if XGBOOST_AVAILABLE:
            self.MODELS['xgboost'] = {
                'class': XGBRegressor,
                'params': {'n_estimators': 100, 'random_state': 42}
            }
        
        self.trained_models = {}
        self.best_model = None
        self.best_model_name = None
        self.best_score = float('-inf')
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
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        self.results = []
        
        for model_name in models_to_train:
            if model_name not in self.MODELS:
                continue
            
            try:
                result = self._train_single_model(
                    model_name, X_train, X_test, y_train, y_test, cv_folds
                )
                self.results.append(result)
                
                # Track best model (using R2 score)
                if result['cv_score_mean'] > self.best_score:
                    self.best_score = result['cv_score_mean']
                    self.best_model = self.trained_models[model_name]
                    self.best_model_name = model_name
                    
            except Exception as e:
                self.results.append({
                    'model_name': model_name,
                    'status': 'failed',
                    'error': str(e)
                })
        
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
        
        # Cross-validation (using R2 score)
        cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring='r2')
        
        # Fit on full training data
        model.fit(X_train, y_train)
        self.trained_models[model_name] = model
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Compute metrics
        metrics = {
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'mae': mean_absolute_error(y_test, y_pred),
            'r2': r2_score(y_test, y_pred),
            'mape': np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100
        }
        
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
