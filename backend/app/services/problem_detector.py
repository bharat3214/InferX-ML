"""
Problem Detector Service
Automatically detects the ML problem type from data and goals
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Tuple


class ProblemDetector:
    """Detect ML problem type from data characteristics"""
    
    def __init__(self, df: pd.DataFrame, target_column: Optional[str] = None):
        self.df = df
        self.target_column = target_column
        self.target = self.df[target_column] if target_column else None
    
    def detect(self) -> Dict[str, Any]:
        """Detect problem type and return recommendations"""
        if self.target_column is None:
            # No target = clustering or unsupervised
            return {
                'problem_type': 'clustering',
                'confidence': 0.8,
                'reason': 'No target column specified',
                'recommended_algorithms': ['kmeans', 'dbscan']
            }
        
        problem_type, confidence = self._determine_problem_type()
        
        return {
            'problem_type': problem_type,
            'confidence': confidence,
            'target_column': self.target_column,
            'target_info': self._analyze_target(),
            'recommended_algorithms': self._get_recommended_algorithms(problem_type),
            'preprocessing_suggestions': self._get_preprocessing_suggestions()
        }
    
    def _determine_problem_type(self) -> Tuple[str, float]:
        """Determine if classification, regression, or timeseries"""
        target = self.target
        
        # Check for timeseries
        if self._is_timeseries():
            return 'timeseries', 0.9
        
        # Check target column characteristics
        unique_count = target.nunique()
        unique_ratio = unique_count / len(target)
        
        # Classification: few unique values
        if unique_count <= 20 and unique_ratio < 0.05:
            if unique_count == 2:
                return 'binary_classification', 0.95
            return 'multiclass_classification', 0.9
        
        # Regression: numeric with many unique values
        if np.issubdtype(target.dtype, np.number):
            return 'regression', 0.9
        
        # Text target might be classification
        if target.dtype == 'object':
            if unique_count <= 50:
                return 'multiclass_classification', 0.7
        
        return 'regression', 0.5  # Default fallback
    
    def _is_timeseries(self) -> bool:
        """Check if data is timeseries"""
        for col in self.df.columns:
            col_lower = col.lower()
            if any(kw in col_lower for kw in ['date', 'time', 'datetime', 'timestamp']):
                try:
                    pd.to_datetime(self.df[col].head(100))
                    return True
                except:
                    pass
        return False
    
    def _analyze_target(self) -> Dict[str, Any]:
        """Analyze target column"""
        if self.target is None:
            return {}
        
        analysis = {
            'dtype': str(self.target.dtype),
            'unique_count': int(self.target.nunique()),
            'missing_count': int(self.target.isna().sum()),
            'value_distribution': self.target.value_counts().head(10).to_dict()
        }
        
        if np.issubdtype(self.target.dtype, np.number):
            analysis.update({
                'min': float(self.target.min()),
                'max': float(self.target.max()),
                'mean': float(self.target.mean()),
                'std': float(self.target.std())
            })
        
        return analysis
    
    def _get_recommended_algorithms(self, problem_type: str) -> list:
        """Get recommended algorithms based on problem type"""
        algorithms = {
            'binary_classification': ['logistic_regression', 'random_forest', 'xgboost'],
            'multiclass_classification': ['random_forest', 'xgboost', 'logistic_regression'],
            'regression': ['linear_regression', 'random_forest', 'xgboost'],
            'clustering': ['kmeans', 'dbscan'],
            'timeseries': ['arima', 'prophet', 'lstm']
        }
        return algorithms.get(problem_type, ['random_forest'])
    
    def _get_preprocessing_suggestions(self) -> list:
        """Get preprocessing suggestions based on data"""
        suggestions = []
        
        # Check for missing values
        missing = self.df.isna().sum().sum()
        if missing > 0:
            suggestions.append('Handle missing values (imputation or removal)')
        
        # Check for categorical columns
        cat_cols = self.df.select_dtypes(include=['object', 'category']).columns
        if len(cat_cols) > 0:
            suggestions.append(f'Encode categorical columns: {list(cat_cols)}')
        
        # Check for numeric scaling
        num_cols = self.df.select_dtypes(include=[np.number]).columns
        if len(num_cols) > 0:
            ranges = self.df[num_cols].max() - self.df[num_cols].min()
            if ranges.max() > 1000:
                suggestions.append('Consider feature scaling for numeric columns')
        
        # Check for high cardinality
        for col in cat_cols:
            if self.df[col].nunique() > 50:
                suggestions.append(f'High cardinality in {col} - consider grouping or target encoding')
        
        return suggestions
