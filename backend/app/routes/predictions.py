"""
Prediction Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.experiment import Experiment

predictions_bp = Blueprint('predictions', __name__)


@predictions_bp.route('/<int:model_id>', methods=['POST'])
@jwt_required()
def predict(model_id):
    """Make a single prediction"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Find the experiment/model
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    if experiment.status != 'completed':
        return jsonify({'error': 'Model training not completed'}), 400
    
    input_data = data.get('input')
    if not input_data:
        return jsonify({'error': 'Input data is required'}), 400
    
    # TODO: Load model from MinIO and make prediction
    # For now, return mock response
    
    return jsonify({
        'prediction': None,  # TODO: Actual prediction
        'probability': None,  # For classification
        'model_name': experiment.best_model_name,
        'input': input_data
    }), 200


@predictions_bp.route('/<int:model_id>/batch', methods=['POST'])
@jwt_required()
def batch_predict(model_id):
    """Make batch predictions from uploaded file"""
    user_id = int(get_jwt_identity())
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    # Find the experiment/model
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    if experiment.status != 'completed':
        return jsonify({'error': 'Model training not completed'}), 400
    
    # TODO: Process file and make batch predictions
    
    return jsonify({
        'message': 'Batch prediction started',
        'model_id': model_id
    }), 202


@predictions_bp.route('/<int:model_id>/explain', methods=['POST'])
@jwt_required()
def explain_prediction(model_id):
    """Get explanation for a prediction"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Find the experiment/model
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    input_data = data.get('input')
    if not input_data:
        return jsonify({'error': 'Input data is required'}), 400
    
    # TODO: Generate SHAP explanation
    
    return jsonify({
        'prediction': None,
        'explanation': {
            'feature_importance': {},  # TODO: SHAP values
            'summary': ''  # TODO: Text explanation
        }
    }), 200
