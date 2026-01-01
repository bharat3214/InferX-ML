"""
Model Packaging Module
Creates self-contained model packages with preprocessing, schema, and metadata
"""
import json
import os
import shutil
import tempfile
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
import joblib


class ModelPackager:
    """Package trained models with all dependencies for deployment"""
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def package(
        self,
        model: Any,
        preprocessor: Any,
        feature_schema: Dict[str, Any],
        metadata: Dict[str, Any],
        model_format: str = 'pkl'
    ) -> str:
        """
        Create a complete model package
        
        Args:
            model: Trained model object
            preprocessor: Fitted preprocessing pipeline
            feature_schema: Schema describing input features
            metadata: Model metadata (name, version, metrics, etc.)
            model_format: 'pkl' for sklearn, 'h5' for keras
            
        Returns:
            Path to the package directory
        """
        # Create package directory
        package_name = f"{metadata.get('name', 'model')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        package_dir = os.path.join(self.output_dir, package_name)
        os.makedirs(package_dir, exist_ok=True)
        
        # Save model
        model_path = os.path.join(package_dir, f'model.{model_format}')
        if model_format == 'pkl':
            joblib.dump(model, model_path)
        elif model_format == 'h5':
            model.save(model_path)
        
        # Save preprocessor
        if preprocessor is not None:
            preprocessor_path = os.path.join(package_dir, 'preprocessor.pkl')
            joblib.dump(preprocessor, preprocessor_path)
        
        # Save feature schema
        feature_schema_path = os.path.join(package_dir, 'feature_schema.json')
        with open(feature_schema_path, 'w') as f:
            json.dump(feature_schema, f, indent=2)
        
        # Generate and save UI schema
        ui_schema = self._generate_ui_schema(feature_schema, metadata)
        ui_schema_path = os.path.join(package_dir, 'ui_schema.json')
        with open(ui_schema_path, 'w') as f:
            json.dump(ui_schema, f, indent=2)
        
        # Save metadata
        metadata['packaged_at'] = datetime.now().isoformat()
        metadata['package_version'] = '1.0.0'
        metadata_path = os.path.join(package_dir, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Generate requirements.txt
        self._generate_requirements(package_dir, model_format)
        
        return package_dir
    
    def _generate_ui_schema(
        self,
        feature_schema: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate UI schema for automatic form generation"""
        
        ui_schema = {
            'model_name': metadata.get('name', 'Unnamed Model'),
            'version': metadata.get('version', '1.0.0'),
            'target_column': metadata.get('target_column'),
            'problem_type': metadata.get('problem_type'),
            'fields': []
        }
        
        for feature_name, feature_info in feature_schema.get('features', {}).items():
            field = self._create_ui_field(feature_name, feature_info)
            ui_schema['fields'].append(field)
        
        return ui_schema
    
    def _create_ui_field(self, name: str, info: Dict[str, Any]) -> Dict[str, Any]:
        """Create UI field definition from feature info"""
        
        field = {
            'name': name,
            'label': name.replace('_', ' ').title(),
            'required': True
        }
        
        dtype = info.get('dtype', 'object')
        semantic_type = info.get('semantic_type', 'unknown')
        
        if semantic_type == 'categorical' or dtype in ['object', 'category']:
            field['type'] = 'categorical'
            field['input_type'] = 'dropdown'
            field['options'] = info.get('categories', [])
        
        elif semantic_type == 'numeric' or dtype in ['int64', 'float64', 'int32', 'float32']:
            field['type'] = 'number'
            field['input_type'] = 'number'
            field['min'] = info.get('min')
            field['max'] = info.get('max')
            field['default'] = info.get('mean') or info.get('median')
        
        elif semantic_type == 'boolean':
            field['type'] = 'boolean'
            field['input_type'] = 'checkbox'
        
        else:
            field['type'] = 'text'
            field['input_type'] = 'text'
        
        return field
    
    def _generate_requirements(self, package_dir: str, model_format: str):
        """Generate requirements.txt for the package"""
        
        requirements = [
            'pandas>=2.0.0',
            'numpy>=1.24.0',
            'scikit-learn>=1.3.0',
            'joblib>=1.3.0'
        ]
        
        if model_format == 'h5':
            requirements.append('tensorflow>=2.15.0')
        
        requirements_path = os.path.join(package_dir, 'requirements.txt')
        with open(requirements_path, 'w') as f:
            f.write('\n'.join(requirements))
    
    def create_zip(self, package_dir: str) -> str:
        """Create a zip file of the package"""
        zip_path = shutil.make_archive(package_dir, 'zip', package_dir)
        return zip_path


def create_feature_schema(df: pd.DataFrame, target_column: str) -> Dict[str, Any]:
    """
    Create feature schema from a DataFrame
    
    Args:
        df: Training DataFrame
        target_column: Name of the target column
        
    Returns:
        Feature schema dictionary
    """
    schema = {
        'target_column': target_column,
        'features': {}
    }
    
    for col in df.columns:
        if col == target_column:
            continue
        
        series = df[col]
        feature_info = {
            'dtype': str(series.dtype),
            'missing_count': int(series.isna().sum())
        }
        
        # Determine semantic type and add relevant stats
        if series.dtype in ['object', 'category']:
            feature_info['semantic_type'] = 'categorical'
            feature_info['categories'] = series.dropna().unique().tolist()[:50]
        
        elif np.issubdtype(series.dtype, np.number):
            feature_info['semantic_type'] = 'numeric'
            feature_info['min'] = float(series.min()) if not pd.isna(series.min()) else None
            feature_info['max'] = float(series.max()) if not pd.isna(series.max()) else None
            feature_info['mean'] = float(series.mean()) if not pd.isna(series.mean()) else None
            feature_info['median'] = float(series.median()) if not pd.isna(series.median()) else None
        
        elif np.issubdtype(series.dtype, np.bool_):
            feature_info['semantic_type'] = 'boolean'
        
        else:
            feature_info['semantic_type'] = 'unknown'
        
        schema['features'][col] = feature_info
    
    return schema
