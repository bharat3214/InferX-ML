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
    user_id = int(get_jwt_identity())
    datasets = Dataset.query.filter_by(user_id=user_id).order_by(Dataset.created_at.desc()).all()
    
    return jsonify({
        'datasets': [d.to_dict() for d in datasets],
        'total': len(datasets)
    }), 200


@datasets_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_dataset():
    """Upload a new dataset"""
    user_id = int(get_jwt_identity())
    
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
    
    file_type = filename.rsplit('.', 1)[1].lower()
    
    # Read file content for size calculation
    file_content = file.read()
    file_size = len(file_content)
    file.seek(0)  # Reset file pointer
    
    # Upload to MinIO
    try:
        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()
        
        file_path = f'{user_id}/{filename}'
        minio_service.upload_bytes(
            bucket='datasets',
            object_name=file_path,
            data=file_content,
            content_type=file.content_type or 'application/octet-stream'
        )
    except Exception as e:
        # If MinIO fails, continue without it (for development)
        print(f"MinIO upload failed: {e}")
        file_path = f'local/{user_id}/{filename}'
    
    # Create database record
    dataset = Dataset(
        name=name,
        description=description,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        user_id=user_id,
        profile_status='pending'
    )
    
    db.session.add(dataset)
    db.session.commit()
    
    # For tabular data, do quick profiling synchronously (for small files)
    if file_type in ['csv', 'xlsx', 'xls'] and file_size < 10 * 1024 * 1024:  # < 10MB
        try:
            import pandas as pd
            import io
            
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_excel(io.BytesIO(file_content))
            
            # Basic profiling
            dataset.num_rows = len(df)
            dataset.num_columns = len(df.columns)
            dataset.data_type = 'tabular'
            dataset.column_info = {
                col: {'dtype': str(df[col].dtype), 'null_count': int(df[col].isnull().sum())}
                for col in df.columns
            }
            dataset.profile_status = 'completed'
            db.session.commit()
        except Exception as e:
            print(f"Profiling failed: {e}")
            dataset.profile_status = 'failed'
            db.session.commit()
    
    # For ZIP files, check if it's an image dataset (folder-per-class structure)
    elif file_type == 'zip':
        try:
            import zipfile
            import io
            
            IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.tiff'}
            
            with zipfile.ZipFile(io.BytesIO(file_content), 'r') as zf:
                # Get all file entries (skip directories and hidden files)
                all_entries = [
                    name for name in zf.namelist()
                    if not name.endswith('/') and not name.split('/')[-1].startswith('.')
                ]
                
                # Detect folder-per-class structure:
                # Expected: root_folder/class_name/image.jpg OR class_name/image.jpg
                class_counts = {}
                class_samples = {}
                
                for entry in all_entries:
                    parts = entry.split('/')
                    # Skip files not in a subfolder
                    if len(parts) < 2:
                        continue
                    
                    # Get file extension
                    ext = '.' + parts[-1].rsplit('.', 1)[-1].lower() if '.' in parts[-1] else ''
                    if ext not in IMAGE_EXTENSIONS:
                        continue
                    
                    # Determine class name (handle optional root folder)
                    # If structure is root/class/img.jpg → class is parts[-2]
                    # If structure is class/img.jpg → class is parts[0]
                    if len(parts) == 2:
                        class_name = parts[0]
                    elif len(parts) == 3:
                        class_name = parts[1]
                    else:
                        # Deeper nesting — use second-to-last folder
                        class_name = parts[-2]
                    
                    # Skip __MACOSX and other system folders
                    if class_name.startswith('__') or class_name.startswith('.'):
                        continue
                    
                    class_counts[class_name] = class_counts.get(class_name, 0) + 1
                    if class_name not in class_samples:
                        class_samples[class_name] = []
                    if len(class_samples[class_name]) < 3:
                        class_samples[class_name].append(parts[-1])
                
                if class_counts and len(class_counts) >= 2:
                    # It's an image classification dataset
                    total_images = sum(class_counts.values())
                    dataset.data_type = 'image'
                    dataset.file_type = 'image_zip'
                    dataset.num_rows = total_images
                    dataset.num_columns = len(class_counts)  # num classes
                    dataset.column_info = {
                        'classes': list(class_counts.keys()),
                        'counts': class_counts,
                        'total_images': total_images,
                        'num_classes': len(class_counts),
                        'samples': class_samples,
                    }
                    dataset.profile_status = 'completed'
                    print(f"📸 Image dataset detected: {len(class_counts)} classes, {total_images} images")
                else:
                    # ZIP but not a recognized image dataset
                    dataset.data_type = 'unknown'
                    dataset.profile_status = 'completed'
                    print(f"📦 ZIP uploaded but not recognized as image dataset")
                
                db.session.commit()
        except Exception as e:
            print(f"ZIP profiling failed: {e}")
            dataset.profile_status = 'failed'
            db.session.commit()
    
    return jsonify({
        'message': 'Dataset uploaded successfully',
        'dataset': dataset.to_dict()
    }), 201


@datasets_bp.route('/<int:dataset_id>', methods=['GET'])
@jwt_required()
def get_dataset(dataset_id):
    """Get dataset details"""
    user_id = int(get_jwt_identity())
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    return jsonify({'dataset': dataset.to_dict()}), 200


@datasets_bp.route('/<int:dataset_id>/profile', methods=['GET'])
@jwt_required()
def get_dataset_profile(dataset_id):
    """Get dataset profile (stats, types, distributions)"""
    user_id = int(get_jwt_identity())
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
    user_id = int(get_jwt_identity())
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
    
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    
    # TODO: Delete from MinIO
    
    db.session.delete(dataset)
    db.session.commit()
    
    return jsonify({'message': 'Dataset deleted successfully'}), 200
