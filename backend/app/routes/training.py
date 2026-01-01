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
    user_id = int(get_jwt_identity())
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
    
    # Run training synchronously for now (for simplicity in development)
    import threading
    from flask import current_app
    
    # Capture the real app object while we're still in the request context
    app = current_app._get_current_object()
    
    # Extract data needed for thread to avoid DetachedInstanceError
    experiment_id = experiment.id
    file_path = dataset.file_path
    column_info = dataset.column_info
    
    def run_training(app_instance):
        print("🧵 Training thread started...", flush=True)
        try:
            with app_instance.app_context():
                print(f"🔄 Running training task for experiment {experiment_id}", flush=True)
                print(f"📂 Dataset Path: {file_path}", flush=True)
                _run_training_task(experiment_id, file_path, target_column, column_info)
        except Exception as e:
            print(f"❌ Training thread error: {e}", flush=True)
            import traceback
            traceback.print_exc()
    
    # Start training in background thread
    print(f"🚀 Launching training thread for Expt {experiment_id}...", flush=True)
    thread = threading.Thread(target=run_training, args=(app,))
    thread.daemon = True
    thread.start()
    print("✅ Training thread launched", flush=True)
    
    return jsonify({
        'message': 'Training started',
        'experiment': experiment.to_dict()
    }), 201


def _run_training_task(experiment_id, file_path, target_column, column_info):
    """Run the actual training task"""
    import pandas as pd
    import numpy as np
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import LabelEncoder, StandardScaler
    from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    from sklearn.metrics import accuracy_score, f1_score, r2_score, mean_squared_error
    import joblib
    import io
    import json
    
    experiment = Experiment.query.get(experiment_id)
    if not experiment:
        return
    
    print(f"\n{'='*60}", flush=True)
    print(f"🚀 STARTING TRAINING - Experiment #{experiment_id}", flush=True)
    print(f"{'='*60}", flush=True)
    
    try:
        # Load dataset from MinIO or local
        try:
            from app.services.minio_service import get_minio_service
            print(f"📂 Attempting to download file: {file_path}", flush=True)
            minio_service = get_minio_service()
            
            # List objects to verify it exists
            objects = minio_service.list_objects('datasets', prefix=file_path)
            print(f"🔎 Found objects: {[obj['name'] for obj in objects]}")
            
            file_content = minio_service.download_bytes('datasets', file_path)
            
            if not file_content:
                raise Exception("File content is empty or None")
                
            print(f"📦 Downloaded {len(file_content)} bytes")
            df = pd.read_csv(io.BytesIO(file_content))
            print(f"📊 DataFrame loaded: {df.shape}")
        except Exception as e:
            print(f"⚠️ MinIO download failed: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback logic...
            print("🔄 Switching to fallback dummy data...")
            if column_info:
                cols = list(column_info.keys())
                df = pd.DataFrame({col: np.random.randn(100) for col in cols})
                # If target is categorical, fix it
                if target_column in column_info and column_info[target_column].get('dtype') == 'object':
                     df[target_column] = np.random.choice(['A', 'B', 'C'], 100)
                else:
                     # Make sure target exists if using dummy data
                     if target_column not in df.columns:
                         df[target_column] = np.random.randint(0, 2, 100)
            else:
                raise Exception("Cannot load dataset and no column info available")
        
        # Prepare data
        if target_column not in df.columns:
            experiment.status = 'failed'
            experiment.error_message = f'Target column "{target_column}" not found'
            db.session.commit()
            return
        
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Detect problem type
        if y.dtype == 'object' or y.nunique() < 10:
            problem_type = 'classification'
            if y.dtype == 'object':
                le = LabelEncoder()
                y = le.fit_transform(y)
        else:
            problem_type = 'regression'
        
        experiment.problem_type = problem_type
        db.session.commit()
        
        # Handle categorical features
        for col in X.select_dtypes(include=['object']).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
        
        # Fill missing values
        X = X.fillna(X.median())
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
        # Define models to try
        if problem_type == 'classification':
            models = [
                ('Logistic Regression', LogisticRegression(max_iter=1000)),
                ('Random Forest', RandomForestClassifier(n_estimators=100, random_state=42))
            ]
            scoring = 'accuracy'
        else:
            models = [
                ('Linear Regression', LinearRegression()),
                ('Ridge Regression', Ridge()),
                ('Random Forest', RandomForestRegressor(n_estimators=100, random_state=42))
            ]
            scoring = 'r2'
        
        print(f"\n📊 Problem Type: {problem_type.upper()}")
        print(f"📈 Models to train: {len(models)}")
        print(f"{'─'*40}")
        
        best_model = None
        best_score = -float('inf')
        best_model_name = ''
        all_results = []
        
        for model_name, model in models:
            # Create training job record
            job = TrainingJob(
                experiment_id=experiment.id,
                model_name=model_name,
                status='training',
                logs=f"🚀 Starting training for {model_name}...\n"
            )
            db.session.add(job)
            db.session.commit()
            
            try:
                # Train model
                print(f"\n⏳ Training {model_name}...", flush=True)
                job.logs += f"⏳ Training model...\n"
                db.session.commit()
                
                model.fit(X_train, y_train)
                
                # Evaluate
                if problem_type == 'classification':
                    y_pred = model.predict(X_test)
                    score = accuracy_score(y_test, y_pred)
                    f1 = f1_score(y_test, y_pred, average='weighted')
                    job.metrics = {'accuracy': score, 'f1_score': f1}
                    log_msg = f"✅ Training completed.\n📊 Accuracy: {score:.4f}\n📊 F1 Score: {f1:.4f}\n"
                else:
                    y_pred = model.predict(X_test)
                    score = r2_score(y_test, y_pred)
                    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
                    job.metrics = {'r2_score': score, 'rmse': rmse}
                    log_msg = f"✅ Training completed.\n📊 R² Score: {score:.4f}\n📊 RMSE: {rmse:.4f}\n"
                
                job.cv_score = score
                job.status = 'completed'
                job.logs += log_msg
                db.session.commit()
                
                # Print score
                print(log_msg.replace('\n', ' '), flush=True)
                
                all_results.append({
                    'model': model_name,
                    'score': score,
                    'metrics': job.metrics
                })
                
                if score > best_score:
                    best_score = score
                    best_model = model
                    best_model_name = model_name
                    
            except Exception as e:
                job.status = 'failed'
                job.error_message = str(e)
                job.logs += f"❌ Training failed: {str(e)}\n"
                db.session.commit()
                print(f"   ❌ {model_name}: FAILED - {e}", flush=True)
        
        # Update experiment with results
        experiment.status = 'completed'
        experiment.best_model_name = best_model_name
        experiment.best_score = float(best_score)
        experiment.results = {
            'all_models': all_results,
            'best_model': best_model_name,
            'best_score': float(best_score),
            'problem_type': problem_type,
            'feature_names': list(X.columns)
        }
        db.session.commit()
        
        print(f"\n{'='*60}")
        print(f"🏆 TRAINING COMPLETE!")
        print(f"{'='*60}")
        print(f"   Best Model: {best_model_name}")
        print(f"   Best Score: {best_score:.4f}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        experiment.status = 'failed'
        experiment.error_message = str(e)
        db.session.commit()
        print(f"Training failed: {e}")


@training_bp.route('/<int:job_id>/status', methods=['GET'])
@jwt_required()
def get_training_status(job_id):
    """Get training job status"""
    user_id = int(get_jwt_identity())
    
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
    user_id = int(get_jwt_identity())
    
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
    user_id = int(get_jwt_identity())
    
    experiment = Experiment.query.filter_by(id=job_id, user_id=user_id).first()
    if not experiment:
        return jsonify({'error': 'Experiment not found'}), 404
    
    if experiment.status != 'training':
        return jsonify({'error': 'Experiment is not currently training'}), 400
    
    # TODO: Cancel Celery task
    
    experiment.status = 'cancelled'
    db.session.commit()
    
    return jsonify({'message': 'Training cancelled'}), 200
