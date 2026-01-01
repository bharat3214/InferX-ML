"""
Training Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.dataset import Dataset
from app.models.experiment import Experiment, TrainingJob

training_bp = Blueprint('training', __name__)


@training_bp.route('/start', methods=['POST'])
@jwt_required()
def start_training():
    """Start a new training job"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    dataset_id = data.get('dataset_id')
    name = data.get('name', 'Untitled Experiment')
    target_column = data.get('target_column')
    goal_description = data.get('goal_description', '')
    
    if not dataset_id:
        return jsonify({'error': 'Dataset ID is required'}), 400
    
    # Verify dataset exists and belongs to user
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    # Create experiment
    experiment = Experiment(
        name=name,
        target_column=target_column,
        goal_description=goal_description,
        status='training',
        user_id=user_id,
        dataset_id=dataset_id,
        config=data.get('config', {})
    )
    
    db.session.add(experiment)
    db.session.commit()
    
    # TODO: Trigger Celery task for actual training
    # task = train_model.delay(experiment.id)
    
    return jsonify({
        'message': 'Training started',
        'experiment': experiment.to_dict()
    }), 201


@training_bp.route('/<int:job_id>/status', methods=['GET'])
@jwt_required()
def get_training_status(job_id):
    """Get training job status"""
    user_id = get_jwt_identity()
    
    experiment = Experiment.query.filter_by(id=job_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    
    # Get all training jobs for this experiment
    jobs = TrainingJob.query.filter_by(experiment_id=experiment.id).all()
    
    return jsonify({
        'experiment': experiment.to_dict(),
        'jobs': [j.to_dict() for j in jobs]
    }), 200


@training_bp.route('/<int:job_id>/logs', methods=['GET'])
@jwt_required()
def get_training_logs(job_id):
    """Get training logs"""
    user_id = get_jwt_identity()
    
    experiment = Experiment.query.filter_by(id=job_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    
    jobs = TrainingJob.query.filter_by(experiment_id=experiment.id).all()
    
    logs = []
    for job in jobs:
        logs.append({
            'model_name': job.model_name,
            'status': job.status,
            'logs': job.logs,
            'error': job.error_message
        })
    
    return jsonify({'logs': logs}), 200


@training_bp.route('/<int:job_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_training(job_id):
    """Cancel a training job"""
    user_id = get_jwt_identity()
    
    experiment = Experiment.query.filter_by(id=job_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    
    if experiment.status != 'training':
        return jsonify({'error': 'Experiment is not currently training'}), 400
    
    # TODO: Cancel Celery task
    
    experiment.status = 'cancelled'
    db.session.commit()
    
    return jsonify({'message': 'Training cancelled'}), 200
