"""
Tabular Data Preprocessor
Automatic preprocessing pipeline for tabular data
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import StandardScaler, LabelEncoder, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib


class TabularPreprocessor(BaseEstimator, TransformerMixin):
    """
    Automatic preprocessing for tabular data
    Handles: missing values, scaling, encoding, type detection
    """
    
    def __init__(
        self,
        numeric_strategy: str = 'median',
        categorical_strategy: str = 'most_frequent',
        scale_numeric: bool = True,
        encode_categorical: str = 'onehot',  # 'onehot' or 'label'
        max_onehot_cardinality: int = 10
    ):
        """
        Initialize preprocessor
        
        Args:
            numeric_strategy: Imputation strategy for numeric columns
            categorical_strategy: Imputation strategy for categorical columns
            scale_numeric: Whether to standardize numeric columns
            encode_categorical: Encoding method for categorical columns
            max_onehot_cardinality: Max unique values for one-hot encoding
        """
        self.numeric_strategy = numeric_strategy
        self.categorical_strategy = categorical_strategy
        self.scale_numeric = scale_numeric
        self.encode_categorical = encode_categorical
        self.max_onehot_cardinality = max_onehot_cardinality
        
        # Fitted attributes
        self.numeric_columns_ = []
        self.categorical_columns_ = []
        self.column_transformer_ = None
        self.feature_names_out_ = []
        self.label_encoders_ = {}
        self.target_encoder_ = None
    
    def fit(self, X: pd.DataFrame, y: pd.Series = None):
        """
        Fit the preprocessor
        
        Args:
            X: Input features DataFrame
            y: Target variable (optional, for supervised preprocessing)
            
        Returns:
            self
        """
        # Identify column types
        self._identify_columns(X)
        
        # Build transformers
        transformers = []
        
        # Numeric transformer
        if self.numeric_columns_:
            numeric_steps = [
                ('imputer', SimpleImputer(strategy=self.numeric_strategy))
            ]
            if self.scale_numeric:
                numeric_steps.append(('scaler', StandardScaler()))
            
            numeric_pipeline = Pipeline(numeric_steps)
            transformers.append(('numeric', numeric_pipeline, self.numeric_columns_))
        
        # Categorical transformer
        if self.categorical_columns_:
            if self.encode_categorical == 'onehot':
                categorical_pipeline = Pipeline([
                    ('imputer', SimpleImputer(strategy=self.categorical_strategy, fill_value='missing')),
                    ('encoder', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
                ])
            else:
                categorical_pipeline = Pipeline([
                    ('imputer', SimpleImputer(strategy=self.categorical_strategy, fill_value='missing')),
                    ('encoder', OrdinalEncoderWithUnknown())
                ])
            
            transformers.append(('categorical', categorical_pipeline, self.categorical_columns_))
        
        # Create column transformer
        self.column_transformer_ = ColumnTransformer(
            transformers=transformers,
            remainder='passthrough'
        )
        
        # Fit transformer
        self.column_transformer_.fit(X)
        
        # Get feature names
        self._get_feature_names()
        
        return self
    
    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """
        Transform the data
        
        Args:
            X: Input features DataFrame
            
        Returns:
            Transformed numpy array
        """
        if self.column_transformer_ is None:
            raise ValueError("Preprocessor not fitted. Call fit() first.")
        
        return self.column_transformer_.transform(X)
    
    def fit_transform(self, X: pd.DataFrame, y: pd.Series = None) -> np.ndarray:
        """Fit and transform in one step"""
        self.fit(X, y)
        return self.transform(X)
    
    def inverse_transform(self, X: np.ndarray) -> pd.DataFrame:
        """
        Inverse transform back to original space (where possible)
        
        Args:
            X: Transformed array
            
        Returns:
            DataFrame with original column names
        """
        # Note: Full inverse transform is complex due to one-hot encoding
        # This is a simplified version
        if hasattr(self.column_transformer_, 'inverse_transform'):
            return pd.DataFrame(
                self.column_transformer_.inverse_transform(X),
                columns=self.numeric_columns_ + self.categorical_columns_
            )
        return pd.DataFrame(X, columns=self.feature_names_out_)
    
    def _identify_columns(self, X: pd.DataFrame):
        """Identify numeric and categorical columns"""
        self.numeric_columns_ = []
        self.categorical_columns_ = []
        
        for col in X.columns:
            if X[col].dtype in ['int64', 'int32', 'float64', 'float32']:
                # Check if it's actually categorical (few unique values)
                if X[col].nunique() <= self.max_onehot_cardinality and X[col].nunique() < len(X) * 0.05:
                    self.categorical_columns_.append(col)
                else:
                    self.numeric_columns_.append(col)
            else:
                self.categorical_columns_.append(col)
    
    def _get_feature_names(self):
        """Extract feature names after transformation"""
        try:
            self.feature_names_out_ = list(self.column_transformer_.get_feature_names_out())
        except:
            # Fallback for older sklearn versions
            feature_names = []
            
            for name, transformer, columns in self.column_transformer_.transformers_:
                if name == 'remainder':
                    continue
                    
                if hasattr(transformer, 'get_feature_names_out'):
                    feature_names.extend(transformer.get_feature_names_out(columns))
                else:
                    feature_names.extend(columns)
            
            self.feature_names_out_ = feature_names
    
    def transform_target(self, y: pd.Series) -> np.ndarray:
        """
        Transform target variable (for classification)
        
        Args:
            y: Target series
            
        Returns:
            Encoded target array
        """
        if y.dtype == 'object' or str(y.dtype) == 'category':
            self.target_encoder_ = LabelEncoder()
            return self.target_encoder_.fit_transform(y)
        return y.values
    
    def inverse_transform_target(self, y: np.ndarray) -> np.ndarray:
        """Inverse transform target variable"""
        if self.target_encoder_ is not None:
            return self.target_encoder_.inverse_transform(y)
        return y
    
    def get_preprocessing_info(self) -> Dict[str, Any]:
        """Get information about preprocessing applied"""
        return {
            'numeric_columns': self.numeric_columns_,
            'categorical_columns': self.categorical_columns_,
            'numeric_strategy': self.numeric_strategy,
            'categorical_strategy': self.categorical_strategy,
            'scale_numeric': self.scale_numeric,
            'encode_categorical': self.encode_categorical,
            'n_features_in': len(self.numeric_columns_) + len(self.categorical_columns_),
            'n_features_out': len(self.feature_names_out_),
            'feature_names_out': self.feature_names_out_
        }
    
    def save(self, path: str):
        """Save preprocessor to file"""
        joblib.dump(self, path)
    
    @classmethod
    def load(cls, path: str) -> 'TabularPreprocessor':
        """Load preprocessor from file"""
        return joblib.load(path)


class OrdinalEncoderWithUnknown(BaseEstimator, TransformerMixin):
    """Label encoder that handles unknown categories"""
    
    def __init__(self):
        self.encoders_ = {}
    
    def fit(self, X, y=None):
        if isinstance(X, pd.DataFrame):
            for col in X.columns:
                le = LabelEncoder()
                le.fit(X[col].astype(str))
                self.encoders_[col] = le
        else:
            X = np.asarray(X)
            for i in range(X.shape[1]):
                le = LabelEncoder()
                le.fit(X[:, i].astype(str))
                self.encoders_[i] = le
        return self
    
    def transform(self, X):
        result = []
        
        if isinstance(X, pd.DataFrame):
            for col in X.columns:
                le = self.encoders_.get(col)
                if le is not None:
                    values = X[col].astype(str)
                    # Handle unknown categories
                    unknown_mask = ~values.isin(le.classes_)
                    values_copy = values.copy()
                    values_copy[unknown_mask] = le.classes_[0]  # Map to first class
                    result.append(le.transform(values_copy))
                else:
                    result.append(X[col].values)
        else:
            X = np.asarray(X)
            for i in range(X.shape[1]):
                le = self.encoders_.get(i)
                if le is not None:
                    values = X[:, i].astype(str)
                    unknown_mask = ~np.isin(values, le.classes_)
                    values_copy = values.copy()
                    values_copy[unknown_mask] = le.classes_[0]
                    result.append(le.transform(values_copy))
                else:
                    result.append(X[:, i])
        
        return np.column_stack(result) if result else np.array([])
