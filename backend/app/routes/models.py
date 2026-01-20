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
    """Download model package as ZIP file"""
    from flask import Response
    from app.services.minio_service import get_minio_service
    
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    if experiment.status != 'completed':
        return jsonify({'error': 'Model training not completed'}), 400
    
    # Get model package path from results
    results = experiment.results or {}
    model_package_path = results.get('model_package_path')
    
    print(f"📥 Download request for model {model_id}", flush=True)
    print(f"   Results: {results}", flush=True)
    print(f"   Package path: {model_package_path}", flush=True)
    
    if not model_package_path:
        print(f"   ❌ No model_package_path in results", flush=True)
        return jsonify({'error': 'Model package not available. Please train a new model.'}), 404
    
    try:
        # Download from MinIO
        minio_service = get_minio_service()
        print(f"   📦 Downloading from MinIO: {model_package_path}", flush=True)
        
        # Handle legacy paths that might have incorrect 'models/' prefix
        if model_package_path.startswith('models/'):
            corrected_path = model_package_path[7:]  # Remove 'models/' prefix
            print(f"   🔄 Corrected path (removed 'models/' prefix): {corrected_path}", flush=True)
        else:
            corrected_path = model_package_path
        
        zip_content = minio_service.download_bytes('models', corrected_path)
        
        if not zip_content:
            print(f"   ❌ download_bytes returned None", flush=True)
            return jsonify({'error': 'Failed to download model package'}), 500
        
        # Return as downloadable file
        filename = f"{experiment.name.replace(' ', '_')}_model.zip"
        
        return Response(
            zip_content,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(zip_content))
            }
        )
        
    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


@models_bp.route('/<int:model_id>/schema', methods=['GET'])
@jwt_required()
def get_model_schema(model_id):
    """Get model UI schema for prediction form generation"""
    from app.services.minio_service import get_minio_service
    import zipfile
    import tempfile
    
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    # Get schema from model package
    results = experiment.results or {}
    model_package_path = results.get('model_package_path')
    
    ui_schema = {'fields': []}
    
    if model_package_path:
        try:
            minio_service = get_minio_service()
            # Handle legacy paths with incorrect 'models/' prefix
            corrected_path = model_package_path[7:] if model_package_path.startswith('models/') else model_package_path
            zip_content = minio_service.download_bytes('models', corrected_path)
            
            if zip_content:
                import io
                import json
                
                zip_buffer = io.BytesIO(zip_content)
                with zipfile.ZipFile(zip_buffer, 'r') as zip_ref:
                    # Try to read ui_schema.json
                    if 'ui_schema.json' in zip_ref.namelist():
                        with zip_ref.open('ui_schema.json') as f:
                            ui_schema = json.load(f)
        except Exception as e:
            print(f"Error loading schema: {e}")
    
    return jsonify({
        'model_id': model_id,
        'model_name': experiment.name,
        'target_column': experiment.target_column,
        'ui_schema': ui_schema
    }), 200


@models_bp.route('/<int:model_id>', methods=['DELETE'])
@jwt_required()
def delete_model(model_id):
    """Delete a model and all related records"""
    from app.models.order import Order
    from app.models.experiment import TrainingJob
    
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=model_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    try:
        # Delete related orders first (foreign key constraint)
        Order.query.filter_by(experiment_id=model_id).delete()
        
        # Delete related training jobs
        TrainingJob.query.filter_by(experiment_id=model_id).delete()
        
        # TODO: Delete model files from MinIO
        
        # Now delete the experiment
        db.session.delete(experiment)
        db.session.commit()
        
        return jsonify({'message': 'Model deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting model {model_id}: {e}", flush=True)
        return jsonify({'error': f'Failed to delete model: {str(e)}'}), 500


# ============ Internal Endpoints (for Streamlit) ============

@models_bp.route('/internal/<int:model_id>/download', methods=['GET'])
def internal_download_model(model_id):
    """Internal endpoint for Streamlit to download model package (no auth required within Docker network)"""
    from flask import Response, request
    from app.services.minio_service import get_minio_service
    import os
    
    # Only allow internal access (from within Docker network)
    # Check for internal secret or allow any Docker internal request
    internal_secret = os.environ.get('INTERNAL_API_SECRET', 'inferx-internal-2024')
    provided_secret = request.headers.get('X-Internal-Secret', '')
    
    # Allow if correct secret or if coming from Docker network (streamlit container)
    remote_addr = request.remote_addr
    is_internal = remote_addr.startswith('172.') or remote_addr == '127.0.0.1' or provided_secret == internal_secret
    
    if not is_internal:
        return jsonify({'error': 'Unauthorized'}), 403
    
    experiment = Experiment.query.filter_by(id=model_id).first()
    if not experiment:
        return jsonify({'error': 'Model not found'}), 404
    
    if experiment.status != 'completed':
        return jsonify({'error': 'Model training not completed'}), 400
    
    results = experiment.results or {}
    model_package_path = results.get('model_package_path')
    
    if not model_package_path:
        return jsonify({'error': 'Model package not available'}), 404
    
    try:
        minio_service = get_minio_service()
        # Handle legacy paths with incorrect 'models/' prefix
        corrected_path = model_package_path[7:] if model_package_path.startswith('models/') else model_package_path
        zip_content = minio_service.download_bytes('models', corrected_path)
        
        if not zip_content:
            return jsonify({'error': 'Failed to download model package'}), 500
        
        filename = f"{experiment.name.replace(' ', '_')}_model.zip"
        
        return Response(
            zip_content,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': str(len(zip_content))
            }
        )
        
    except Exception as e:
        return jsonify({'error': f'Download failed: {str(e)}'}), 500


@models_bp.route('/internal/list', methods=['GET'])
def internal_list_models():
    """Internal endpoint to list all models (for Streamlit model selector)"""
    from flask import request
    import os
    
    # Same internal access check
    internal_secret = os.environ.get('INTERNAL_API_SECRET', 'inferx-internal-2024')
    provided_secret = request.headers.get('X-Internal-Secret', '')
    remote_addr = request.remote_addr
    is_internal = remote_addr.startswith('172.') or remote_addr == '127.0.0.1' or provided_secret == internal_secret
    
    if not is_internal:
        return jsonify({'error': 'Unauthorized'}), 403
    
    experiments = Experiment.query.filter_by(status='completed').all()
    
    return jsonify({
        'models': [
            {
                'id': e.id,
                'name': e.name,
                'problem_type': e.problem_type,
                'target_column': e.target_column,
                'best_model_name': e.best_model_name,
                'best_score': e.best_score,
                'has_package': bool((e.results or {}).get('model_package_path'))
            }
            for e in experiments
        ]
    }), 200
