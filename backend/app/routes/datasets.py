"""
Dataset Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models.dataset import Dataset
import io
import requests as http_requests

datasets_bp = Blueprint('datasets', __name__)

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'zip'}

# ── Public download URLs for sample datasets ──
# These are free, auth-free CSV links (GitHub raw, UCI, etc.)
# Datasets NOT listed here will return 404 — the frontend handles this
# by opening the Kaggle page for manual download.
SAMPLE_SOURCES = {
    # ══════════════════════════════════════
    # Medical & Health
    # ══════════════════════════════════════
    # s-med-1 (Lung Cancer): no reliable public CSV mirror — Kaggle only
    's-med-2': {
        'url': 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv',
        'filename': 'pima_indians_diabetes.csv',
        'name': 'Pima Indians Diabetes',
        'description': 'NIDDK diagnostic data for diabetes prediction',
    },
    's-med-3': {
        'url': 'https://raw.githubusercontent.com/jbrownlee/Datasets/master/breast-cancer-wisconsin.csv',
        'filename': 'breast_cancer_wisconsin.csv',
        'name': 'Breast Cancer Wisconsin (Diagnostic)',
        'description': 'FNA cell nuclei features for malignant/benign classification',
    },
    's-med-4': {
        'url': 'https://raw.githubusercontent.com/MainakRepositor/Datasets/master/drug200.csv',
        'filename': 'drug_classification.csv',
        'name': 'Drug Classification',
        'description': 'Patient data to classify suitable drug type',
    },
    # s-med-5 (Stroke Prediction): no reliable public CSV mirror — Kaggle only

    # ══════════════════════════════════════
    # Agriculture
    # ══════════════════════════════════════
    's-agr-1': {
        'url': 'https://raw.githubusercontent.com/AbhishekKandoi/Crop-Yield-Prediction-based-on-Indian-Agriculture/main/Crop%20Recommendation%20dataset.csv',
        'filename': 'crop_recommendation.csv',
        'name': 'Crop Recommendation Dataset',
        'description': 'N, P, K, temperature, humidity, pH & rainfall for 22 crop recommendations',
    },
    # s-agr-2 (Crop Yield): no public CSV mirror — Kaggle only
    # s-agr-3 (Plant Diseases): image dataset / ZIP — Kaggle only
    # s-agr-4 (Rainfall India): no public CSV mirror — Kaggle only
    # s-agr-5 (Fertilizer): no public CSV mirror — Kaggle only

    # ══════════════════════════════════════
    # Finance
    # ══════════════════════════════════════
    # s-fin-1 (Loan Approval): no public CSV mirror — Kaggle only
    # s-fin-2 (Credit Card Fraud): 144 MB — too large, Kaggle only
    # s-fin-3 (Stock Market): no public CSV mirror — Kaggle only
    # s-fin-4 (Bank Churn): no public CSV mirror — Kaggle only
    's-fin-5': {
        'url': 'https://raw.githubusercontent.com/stedy/Machine-Learning-with-R-datasets/master/insurance.csv',
        'filename': 'insurance_charges.csv',
        'name': 'Medical Insurance Charges',
        'description': 'Age, sex, BMI, children, smoker & region for medical cost prediction',
    },

    # ══════════════════════════════════════
    # E-Commerce
    # ══════════════════════════════════════
    # All e-commerce datasets are Kaggle-only (large or proprietary)

    # ══════════════════════════════════════
    # Education
    # ══════════════════════════════════════
    # All education datasets: no verified public CSV mirrors — Kaggle only

    # ══════════════════════════════════════
    # Logistics
    # ══════════════════════════════════════
    's-log-2': {
        'url': 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/mpg.csv',
        'filename': 'auto_mpg.csv',
        'name': 'Auto MPG Dataset',
        'description': 'Car displacement, horsepower, weight & acceleration for miles-per-gallon prediction',
    },
    # s-log-1 (Delivery Logistics): no public CSV mirror — Kaggle only
    # s-log-3 (Flight Price): no public CSV mirror — Kaggle only
    # s-log-4 (Supply Chain): no public CSV mirror — Kaggle only
    # s-log-5 (Vehicle CarDekho): no public CSV mirror — Kaggle only

    # ══════════════════════════════════════
    # Analytics
    # ══════════════════════════════════════
    's-ana-1': {
        'url': 'https://raw.githubusercontent.com/MainakRepositor/Datasets/master/Mall_Customers.csv',
        'filename': 'mall_customers.csv',
        'name': 'Mall Customer Segmentation',
        'description': 'Customer ID, age, gender, annual income & spending score for clustering',
    },
    's-ana-2': {
        'url': 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
        'filename': 'iris_flower_dataset.csv',
        'name': 'Iris Flower Dataset',
        'description': 'Classic Fisher dataset for 3 iris species classification',
    },
    's-ana-3': {
        'url': 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
        'filename': 'titanic.csv',
        'name': 'Titanic — Machine Learning',
        'description': 'Passenger data for survival prediction',
    },
    's-ana-4': {
        'url': 'https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv',
        'filename': 'california_housing.csv',
        'name': 'California Housing Prices',
        'description': '1990 census block-group data for median house value regression',
    },
    's-ana-5': {
        'url': 'https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv',
        'filename': 'red_wine_quality.csv',
        'name': 'Red Wine Quality',
        'description': 'Physicochemical inputs for quality score prediction',
    },

    # ══════════════════════════════════════
    # Entertainment
    # ══════════════════════════════════════
    # All entertainment datasets: large or Kaggle-only
}

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
            
            # Trigger advanced profiling in background for Visual Insights
            from app.tasks.training_tasks import profile_dataset_task
            profile_dataset_task.delay(dataset.id)
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


@datasets_bp.route('/use-sample', methods=['POST'])
@jwt_required()
def use_sample_dataset():
    """Download a sample dataset and add it to the user's account"""
    user_id = int(get_jwt_identity())
    
    data = request.get_json()
    sample_id = data.get('sample_id')
    
    if not sample_id:
        return jsonify({'error': 'sample_id is required'}), 400
    
    # Look up the sample source
    source = SAMPLE_SOURCES.get(sample_id)
    if not source:
        return jsonify({'error': f'Sample dataset "{sample_id}" is not available for direct download yet. Try "View on Kaggle" to download manually.'}), 404
    
    # Check if user already has this dataset
    existing = Dataset.query.filter_by(
        user_id=user_id,
        name=source['name']
    ).first()
    if existing:
        return jsonify({
            'message': 'Dataset already in your uploads',
            'dataset': existing.to_dict()
        }), 200
    
    # Download the CSV from public URL
    try:
        resp = http_requests.get(source['url'], timeout=60)
        resp.raise_for_status()
        file_content = resp.content
    except Exception as e:
        return jsonify({'error': f'Failed to download dataset: {str(e)}'}), 502
    
    filename = source['filename']
    file_type = filename.rsplit('.', 1)[1].lower()
    file_size = len(file_content)
    
    # Upload to MinIO
    try:
        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()
        
        file_path = f'{user_id}/{filename}'
        minio_service.upload_bytes(
            bucket='datasets',
            object_name=file_path,
            data=file_content,
            content_type='text/csv'
        )
    except Exception as e:
        print(f"MinIO upload failed: {e}")
        file_path = f'local/{user_id}/{filename}'
    
    # Create database record
    dataset = Dataset(
        name=source['name'],
        description=source.get('description', ''),
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        user_id=user_id,
        profile_status='pending'
    )
    
    db.session.add(dataset)
    db.session.commit()
    
    # Quick profiling for tabular data
    if file_type in ['csv', 'xlsx', 'xls'] and file_size < 50 * 1024 * 1024:
        try:
            import pandas as pd
            
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_excel(io.BytesIO(file_content))
            
            dataset.num_rows = len(df)
            dataset.num_columns = len(df.columns)
            dataset.data_type = 'tabular'
            dataset.column_info = {
                col: {'dtype': str(df[col].dtype), 'null_count': int(df[col].isnull().sum())}
                for col in df.columns
            }
            dataset.profile_status = 'completed'
            db.session.commit()
            
            # Trigger advanced profiling in background for Visual Insights
            from app.tasks.training_tasks import profile_dataset_task
            profile_dataset_task.delay(dataset.id)
        except Exception as e:
            print(f"Profiling failed: {e}")
            dataset.profile_status = 'failed'
            db.session.commit()
    
    return jsonify({
        'message': 'Sample dataset added to your uploads',
        'dataset': dataset.to_dict()
    }), 201


# ══════════════════════════════════════════════════════════
# Kaggle API Integration — Search & Download
# ══════════════════════════════════════════════════════════
import os
import tempfile
import glob as _glob

def _get_kaggle_api():
    """Initialise and return an authenticated KaggleApi instance."""
    # Try standard Kaggle env vars first
    username = os.environ.get('KAGGLE_USERNAME')
    key = os.environ.get('KAGGLE_KEY')

    # If not found, try combined token username:key
    if not username or not key:
        token = os.environ.get('KAGGLE_API_TOKEN', '')
        if ':' in token:
            username, key = token.split(':', 1)
            os.environ['KAGGLE_USERNAME'] = username
            os.environ['KAGGLE_KEY'] = key
        else:
            # Fallback for dev if nothing else is provided
            os.environ['KAGGLE_USERNAME'] = 'alok920'
            os.environ['KAGGLE_KEY'] = '5547498f46540188897a92e3222effbe'

    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi()
    api.authenticate()
    return api


@datasets_bp.route('/kaggle/search', methods=['GET'])
@jwt_required()
def kaggle_search():
    """Search Kaggle datasets by query string.

    Query params:
        q   – search term (required)
        page – result page (optional, default 1)
    """
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Query parameter "q" is required'}), 400

    page = int(request.args.get('page', 1))

    try:
        api = _get_kaggle_api()
        results = api.dataset_list(search=query, page=page)
    except Exception as e:
        return jsonify({'error': f'Kaggle API error: {str(e)}'}), 502

    datasets_out = []
    for ds in results:
        # ds is a dict-like object from kaggle SDK
        ref = ds.ref if hasattr(ds, 'ref') else (ds.get('ref') if isinstance(ds, dict) else str(ds))
        title = ds.title if hasattr(ds, 'title') else (ds.get('title') if isinstance(ds, dict) else ref)
        subtitle = ds.subtitle if hasattr(ds, 'subtitle') else (ds.get('subtitle') if isinstance(ds, dict) else '')
        total_bytes = ds.totalBytes if hasattr(ds, 'totalBytes') else (ds.get('totalBytes') if isinstance(ds, dict) else 0)
        download_count = ds.downloadCount if hasattr(ds, 'downloadCount') else (ds.get('downloadCount') if isinstance(ds, dict) else 0)
        vote_count = ds.voteCount if hasattr(ds, 'voteCount') else (ds.get('voteCount') if isinstance(ds, dict) else 0)
        last_updated = ds.lastUpdated if hasattr(ds, 'lastUpdated') else (ds.get('lastUpdated') if isinstance(ds, dict) else '')
        usability = ds.usabilityRating if hasattr(ds, 'usabilityRating') else (ds.get('usabilityRating') if isinstance(ds, dict) else 0)

        datasets_out.append({
            'ref': ref,
            'title': title,
            'subtitle': subtitle or '',
            'totalBytes': total_bytes or 0,
            'downloadCount': download_count or 0,
            'voteCount': vote_count or 0,
            'lastUpdated': str(last_updated) if last_updated else '',
            'usabilityRating': round(float(usability or 0), 2),
            'url': f'https://www.kaggle.com/datasets/{ref}',
        })

    return jsonify({'datasets': datasets_out, 'query': query, 'page': page}), 200


@datasets_bp.route('/kaggle/download', methods=['POST'])
@jwt_required()
def kaggle_download():
    """Download a Kaggle dataset by ref and add it to the user's library.

    Body JSON:
        ref   – Kaggle dataset ref, e.g. "heptapod/titanic" (required)
        name  – optional display name
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()
    ref = data.get('ref', '').strip()

    if not ref:
        return jsonify({'error': 'Dataset "ref" is required'}), 400

    display_name = data.get('name', ref.split('/')[-1].replace('-', ' ').title())

    # Check duplicate
    existing = Dataset.query.filter_by(user_id=user_id, name=display_name).first()
    if existing:
        return jsonify({'message': 'Dataset already in your uploads', 'dataset': existing.to_dict()}), 200

    # Download to temp dir
    tmp_dir = tempfile.mkdtemp(prefix='kaggle_')
    try:
        api = _get_kaggle_api()
        api.dataset_download_files(ref, path=tmp_dir, unzip=True)
    except Exception as e:
        return jsonify({'error': f'Kaggle download failed: {str(e)}'}), 502

    # Find first CSV / Excel file in downloaded contents
    patterns = ['*.csv', '*.xlsx', '*.xls']
    found_file = None
    for pattern in patterns:
        matches = _glob.glob(os.path.join(tmp_dir, '**', pattern), recursive=True)
        if matches:
            # Prefer the largest file (likely the main dataset)
            found_file = max(matches, key=os.path.getsize)
            break

    if not found_file:
        # Cleanup
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return jsonify({'error': 'No CSV or Excel file found in the downloaded dataset'}), 422

    # Read file content
    with open(found_file, 'rb') as f:
        file_content = f.read()

    filename = secure_filename(os.path.basename(found_file))
    file_type = filename.rsplit('.', 1)[1].lower()
    file_size = len(file_content)

    # Upload to MinIO
    try:
        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()
        file_path = f'{user_id}/{filename}'
        minio_service.upload_bytes(
            bucket='datasets',
            object_name=file_path,
            data=file_content,
            content_type='text/csv' if file_type == 'csv' else 'application/octet-stream'
        )
    except Exception as e:
        print(f"MinIO upload failed: {e}")
        file_path = f'local/{user_id}/{filename}'

    # Create DB record
    dataset = Dataset(
        name=display_name,
        description=f'Imported from Kaggle: {ref}',
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        user_id=user_id,
        profile_status='pending'
    )
    db.session.add(dataset)
    db.session.commit()

    # Quick profiling
    if file_type in ['csv', 'xlsx', 'xls'] and file_size < 50 * 1024 * 1024:
        try:
            import pandas as pd
            if file_type == 'csv':
                df = pd.read_csv(io.BytesIO(file_content))
            else:
                df = pd.read_excel(io.BytesIO(file_content))

            dataset.num_rows = len(df)
            dataset.num_columns = len(df.columns)
            dataset.data_type = 'tabular'
            dataset.column_info = {
                col: {'dtype': str(df[col].dtype), 'null_count': int(df[col].isnull().sum())}
                for col in df.columns
            }
            dataset.profile_status = 'completed'
            db.session.commit()

            from app.tasks.training_tasks import profile_dataset_task
            profile_dataset_task.delay(dataset.id)
        except Exception as e:
            print(f"Profiling failed: {e}")
            dataset.profile_status = 'failed'
            db.session.commit()

    # Cleanup temp dir
    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return jsonify({
        'message': f'Kaggle dataset "{display_name}" added to your uploads',
        'dataset': dataset.to_dict()
    }), 201


# ═══════════════════════════════════════════════════════
# AI-POWERED SYNTHETIC DATA GENERATION
# ═══════════════════════════════════════════════════════

@datasets_bp.route('/ai/schema', methods=['POST'])
@jwt_required()
def ai_generate_schema():
    """Use AI to generate a dataset schema from a natural language prompt"""
    from app.services.gemini_service import get_ai_service

    data = request.get_json()
    prompt = data.get('prompt', '').strip()

    if not prompt:
        return jsonify({'error': 'Please describe the dataset you want to create'}), 400

    try:
        ai = get_ai_service()
        schema = ai.generate_dataset_schema(prompt, num_columns=data.get('num_columns', 8))

        if 'error' in schema:
            return jsonify({'error': schema['error']}), 500

        return jsonify({'schema': schema}), 200

    except Exception as e:
        print(f"AI schema generation error: {e}", flush=True)
        return jsonify({'error': f'AI service error: {str(e)}'}), 500


@datasets_bp.route('/ai/generate', methods=['POST'])
@jwt_required()
def ai_generate_data():
    """Generate realistic data using AI seed rows + programmatic extension"""
    import pandas as pd
    import numpy as np
    import random
    import string
    from datetime import datetime, timedelta

    user_id = int(get_jwt_identity())
    data = request.get_json()

    name = data.get('name', 'ai_dataset').strip()
    num_rows = min(int(data.get('num_rows', 1000)), 100000)
    columns = data.get('columns', [])
    save = data.get('save', False)

    if not columns:
        return jsonify({'error': 'Schema columns are required'}), 400

    # Step 1: Get AI seed rows (30 rows for pattern)
    try:
        from app.services.gemini_service import get_ai_service
        ai = get_ai_service()
        seed_rows = ai.generate_dataset_rows(columns, num_sample=min(30, num_rows))
    except Exception as e:
        print(f"AI row generation error: {e}", flush=True)
        seed_rows = []

    # Step 2: Build full dataset
    if seed_rows and len(seed_rows) >= 5:
        # Use AI seed data as base, extend programmatically if needed
        seed_df = pd.DataFrame(seed_rows)

        if num_rows <= len(seed_rows):
            df = seed_df.head(num_rows)
        else:
            # Extend by sampling distributions from seed data
            extended_rows = []
            for _ in range(num_rows - len(seed_rows)):
                row = {}
                for col_def in columns:
                    col_name = col_def['name']
                    col_type = col_def.get('type', 'text')
                    config = col_def.get('config', {})

                    if col_name in seed_df.columns:
                        seed_values = seed_df[col_name].dropna().tolist()
                    else:
                        seed_values = []

                    if col_type == 'id':
                        prefix = config.get('prefix', 'ID')
                        row[col_name] = f"{prefix}_{len(seed_rows) + len(extended_rows) + 1:05d}"
                    elif col_type in ('numeric', 'integer') and seed_values:
                        numeric_vals = [v for v in seed_values if isinstance(v, (int, float))]
                        if numeric_vals:
                            mean_val = np.mean(numeric_vals)
                            std_val = max(np.std(numeric_vals), 0.1)
                            val = np.random.normal(mean_val, std_val)
                            low = float(config.get('min', min(numeric_vals)))
                            high = float(config.get('max', max(numeric_vals)))
                            val = np.clip(val, low, high)
                            row[col_name] = int(round(val)) if col_type == 'integer' else round(float(val), 2)
                        else:
                            row[col_name] = 0
                    elif col_type == 'categorical' and seed_values:
                        row[col_name] = random.choice(seed_values)
                    elif col_type == 'boolean':
                        prob = float(config.get('true_probability', 0.5))
                        row[col_name] = random.random() < prob
                    elif col_type == 'date':
                        start = datetime(2020, 1, 1)
                        end = datetime(2025, 12, 31)
                        delta = (end - start).days
                        row[col_name] = (start + timedelta(days=random.randint(0, delta))).strftime('%Y-%m-%d')
                    elif seed_values:
                        row[col_name] = random.choice(seed_values)
                    else:
                        row[col_name] = ''

                extended_rows.append(row)

            df = pd.concat([seed_df, pd.DataFrame(extended_rows)], ignore_index=True)
    else:
        # Fallback: pure programmatic generation (no AI seed)
        generated = {}
        for col_def in columns:
            col_name = col_def['name']
            col_type = col_def.get('type', 'text')
            config = col_def.get('config', {})

            if col_type == 'numeric':
                low = float(config.get('min', 0))
                high = float(config.get('max', 100))
                generated[col_name] = np.round(np.random.uniform(low, high, num_rows), 2)
            elif col_type == 'integer':
                low = int(config.get('min', 0))
                high = int(config.get('max', 100))
                generated[col_name] = np.random.randint(low, high + 1, num_rows)
            elif col_type == 'categorical':
                cats = config.get('categories', ['A', 'B', 'C'])
                generated[col_name] = np.random.choice(cats, num_rows)
            elif col_type == 'boolean':
                prob = float(config.get('true_probability', 0.5))
                generated[col_name] = np.random.choice([True, False], num_rows, p=[prob, 1 - prob])
            elif col_type == 'date':
                start = datetime(2020, 1, 1)
                end = datetime(2025, 12, 31)
                delta = (end - start).days
                generated[col_name] = [(start + timedelta(days=random.randint(0, delta))).strftime('%Y-%m-%d') for _ in range(num_rows)]
            elif col_type == 'id':
                prefix = config.get('prefix', 'ID')
                generated[col_name] = [f'{prefix}_{i+1:05d}' for i in range(num_rows)]
            else:
                length = int(config.get('length', 10))
                generated[col_name] = [''.join(random.choices(string.ascii_lowercase + ' ', k=length)).strip() for _ in range(num_rows)]

        df = pd.DataFrame(generated)

    # Build preview (first 10 rows)
    preview = df.head(10).to_dict(orient='records')

    # If save=True, persist to MinIO + DB
    if save:
        csv_buffer = io.BytesIO()
        df.to_csv(csv_buffer, index=False)
        csv_bytes = csv_buffer.getvalue()
        file_size = len(csv_bytes)

        filename = f'{name.replace(" ", "_").lower()}.csv'
        file_path = f'{user_id}/ai_{filename}'

        try:
            from app.services.minio_service import get_minio_service
            minio_service = get_minio_service()
            minio_service.upload_bytes(
                bucket='datasets',
                object_name=file_path,
                data=csv_bytes,
                content_type='text/csv'
            )
        except Exception as e:
            print(f"MinIO upload failed: {e}")
            file_path = f'local/{user_id}/ai_{filename}'

        dataset_obj = Dataset(
            name=name,
            description=f'AI-generated dataset with {num_rows} rows and {len(columns)} columns',
            file_path=file_path,
            file_type='csv',
            file_size=file_size,
            data_type='tabular',
            num_rows=num_rows,
            num_columns=len(columns),
            column_info={
                col_name: {'dtype': str(df[col_name].dtype), 'null_count': 0}
                for col_name in df.columns
            },
            user_id=user_id,
            profile_status='completed'
        )

        db.session.add(dataset_obj)
        db.session.commit()

        return jsonify({
            'message': f'AI dataset "{name}" saved with {num_rows} rows',
            'dataset': dataset_obj.to_dict(),
            'preview': preview,
            'saved': True
        }), 201

    # Preview only (not saved yet)
    return jsonify({
        'preview': preview,
        'total_rows': num_rows,
        'columns': [c['name'] for c in columns],
        'saved': False
    }), 200


@datasets_bp.route('/generate-synthetic', methods=['POST'])
@jwt_required()
def generate_synthetic():
    """Generate a synthetic dataset from a user-defined schema"""
    import pandas as pd
    import numpy as np
    import io
    import random
    import string
    from datetime import datetime, timedelta

    user_id = int(get_jwt_identity())
    data = request.get_json()

    name = data.get('name', 'synthetic_data').strip()
    num_rows = min(int(data.get('num_rows', 1000)), 100000)  # Cap at 100k
    columns = data.get('columns', [])

    if not columns:
        return jsonify({'error': 'At least one column is required'}), 400
    if not name:
        return jsonify({'error': 'Dataset name is required'}), 400

    # Generate data for each column
    generated = {}
    for col in columns:
        col_name = col.get('name', 'column').strip()
        col_type = col.get('type', 'numeric')

        if col_type == 'numeric':
            low = float(col.get('min', 0))
            high = float(col.get('max', 100))
            decimals = int(col.get('decimals', 2))
            generated[col_name] = np.round(np.random.uniform(low, high, num_rows), decimals)

        elif col_type == 'integer':
            low = int(col.get('min', 0))
            high = int(col.get('max', 100))
            generated[col_name] = np.random.randint(low, high + 1, num_rows)

        elif col_type == 'categorical':
            categories = col.get('categories', ['A', 'B', 'C'])
            if isinstance(categories, str):
                categories = [c.strip() for c in categories.split(',')]
            generated[col_name] = np.random.choice(categories, num_rows)

        elif col_type == 'boolean':
            prob = float(col.get('true_probability', 0.5))
            generated[col_name] = np.random.choice([True, False], num_rows, p=[prob, 1 - prob])

        elif col_type == 'date':
            start = datetime(2020, 1, 1)
            end = datetime(2025, 12, 31)
            delta = (end - start).days
            dates = [start + timedelta(days=random.randint(0, delta)) for _ in range(num_rows)]
            generated[col_name] = [d.strftime('%Y-%m-%d') for d in dates]

        elif col_type == 'text':
            length = int(col.get('length', 10))
            generated[col_name] = [
                ''.join(random.choices(string.ascii_lowercase + ' ', k=length)).strip()
                for _ in range(num_rows)
            ]

        elif col_type == 'id':
            prefix = col.get('prefix', 'ID')
            generated[col_name] = [f'{prefix}_{i+1:05d}' for i in range(num_rows)]

        else:
            generated[col_name] = np.random.uniform(0, 100, num_rows)

    df = pd.DataFrame(generated)

    # Convert to CSV bytes
    csv_buffer = io.BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue()
    file_size = len(csv_bytes)

    filename = f'{name.replace(" ", "_").lower()}.csv'
    file_path = f'{user_id}/synthetic_{filename}'

    # Upload to MinIO
    try:
        from app.services.minio_service import get_minio_service
        minio_service = get_minio_service()
        minio_service.upload_bytes(
            bucket='datasets',
            object_name=file_path,
            data=csv_bytes,
            content_type='text/csv'
        )
    except Exception as e:
        print(f"MinIO upload failed: {e}")
        file_path = f'local/{user_id}/synthetic_{filename}'

    # Create database record
    dataset_obj = Dataset(
        name=name,
        description=f'Synthetic dataset with {num_rows} rows and {len(columns)} columns',
        file_path=file_path,
        file_type='csv',
        file_size=file_size,
        data_type='tabular',
        num_rows=num_rows,
        num_columns=len(columns),
        column_info={
            col_name: {'dtype': str(df[col_name].dtype), 'null_count': 0}
            for col_name in df.columns
        },
        user_id=user_id,
        profile_status='completed'
    )

    db.session.add(dataset_obj)
    db.session.commit()

    return jsonify({
        'message': f'Synthetic dataset "{name}" generated with {num_rows} rows',
        'dataset': dataset_obj.to_dict()
    }), 201
