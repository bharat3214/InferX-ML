"""
InferX-ML Backend Application Factory
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from .config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.datasets import datasets_bp
    from .routes.training import training_bp
    from .routes.predictions import predictions_bp
    from .routes.models import models_bp
    from .routes.system import system_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(datasets_bp, url_prefix='/api/datasets')
    app.register_blueprint(training_bp, url_prefix='/api/training')
    app.register_blueprint(predictions_bp, url_prefix='/api/predict')
    app.register_blueprint(models_bp, url_prefix='/api/models')
    app.register_blueprint(system_bp, url_prefix='/api/system')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': 'InferX-ML API'}
    
    return app
