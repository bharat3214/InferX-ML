"""
Dataset Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.dataset import Dataset

datasets_bp = Blueprint('datasets', __name__)

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'zip'}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@datasets_bp.route('', methods=['GET'])
@jwt_required()
def list_datasets():
    """List all datasets for current user"""
    user_id = get_jwt_identity()
    datasets = Dataset.query.filter_by(user_id=user_id).order_by(Dataset.created_at.desc()).all()
    
    return jsonify({
        'datasets': [d.to_dict() for d in datasets],
        'total': len(datasets)
    }), 200


@datasets_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_dataset():
    """Upload a new dataset"""
    user_id = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Allowed: {ALLOWED_EXTENSIONS}'}), 400
    
    filename = secure_filename(file.filename)
    name = request.form.get('name', filename)
    description = request.form.get('description', '')
    
    # TODO: Upload to MinIO and get file path
    # For now, just create the database record
    file_type = filename.rsplit('.', 1)[1].lower()
    
    dataset = Dataset(
        name=name,
        description=description,
        file_path=f'datasets/{user_id}/{filename}',  # MinIO path
        file_type=file_type,
        file_size=0,  # TODO: Get actual file size
        user_id=user_id
    )
    
    db.session.add(dataset)
    db.session.commit()
    
    # TODO: Trigger async data profiling task
    
    return jsonify({
        'message': 'Dataset uploaded successfully',
        'dataset': dataset.to_dict()
    }), 201


@datasets_bp.route('/<int:dataset_id>', methods=['GET'])
@jwt_required()
def get_dataset(dataset_id):
    """Get dataset details"""
    user_id = get_jwt_identity()
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    return jsonify({'dataset': dataset.to_dict()}), 200


@datasets_bp.route('/<int:dataset_id>/profile', methods=['GET'])
@jwt_required()
def get_dataset_profile(dataset_id):
    """Get dataset profile (stats, types, distributions)"""
    user_id = get_jwt_identity()
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    return jsonify({
        'dataset_id': dataset.id,
        'profile_status': dataset.profile_status,
        'profile_data': dataset.profile_data,
        'column_info': dataset.column_info
    }), 200


@datasets_bp.route('/<int:dataset_id>', methods=['DELETE'])
@jwt_required()
def delete_dataset(dataset_id):
    """Delete a dataset"""
    user_id = get_jwt_identity()
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    # TODO: Delete from MinIO
    
    db.session.delete(dataset)
    db.session.commit()
    
    return jsonify({'message': 'Dataset deleted successfully'}), 200
