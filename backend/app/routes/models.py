"""
Models Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.experiment import Experiment

models_bp = Blueprint('models', __name__)


@models_bp.route('', methods=['GET'])
@jwt_required()
def list_models():
    """List all trained models for current user"""
    user_id = int(get_jwt_identity())
    
    # Get completed experiments (trained models)
    experiments = Experiment.query.filter_by(
        user_id=user_id,
        status='completed'
    ).order_by(Experiment.completed_at.desc()).all()
    
    return jsonify({
        'models': [e.to_dict() for e in experiments],
        'total': len(experiments)
    }), 200


@models_bp.route('/<int:model_id>', methods=['GET'])
@jwt_required()
def get_model(model_id):
    """Get model details"""
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    return jsonify({'model': experiment.to_dict()}), 200


@models_bp.route('/<int:model_id>/download', methods=['GET'])
@jwt_required()
def download_model(model_id):
    """Download model package"""
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    if experiment.status != 'completed':
        return jsonify({'error': 'Model training not completed'}), 400
    
    # TODO: Generate download URL from MinIO
    
    return jsonify({
        'download_url': None,  # TODO: MinIO presigned URL
        'model_name': experiment.best_model_name,
        'expires_in': 3600  # 1 hour
    }), 200


@models_bp.route('/<int:model_id>/schema', methods=['GET'])
@jwt_required()
def get_model_schema(model_id):
    """Get model UI schema for prediction form generation"""
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    # TODO: Load UI schema from model package
    
    return jsonify({
        'model_id': model_id,
        'model_name': experiment.name,
        'target_column': experiment.target_column,
        'ui_schema': {
            'fields': []  # TODO: Load from saved schema
        }
    }), 200


@models_bp.route('/<int:model_id>', methods=['DELETE'])
@jwt_required()
def delete_model(model_id):
    """Delete a model"""
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    # TODO: Delete model files from MinIO
    
    db.session.delete(experiment)
    db.session.commit()
    
    return jsonify({'message': 'Model deleted successfully'}), 200
