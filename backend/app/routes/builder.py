"""
App Builder Routes - API endpoints for OpenCode AI Agent integration
"""
from flask import Blueprint, request, jsonify, send_file
from app.services.app_builder_service import AppBuilderService
import os

bp = Blueprint('builder', __name__, url_prefix='/api/builder')
service = AppBuilderService()


@bp.route('/generate', methods=['POST'])
def generate_app():
    """
    Start app generation from a natural language prompt.
    
    Request body:
    {
        "prompt": "Create a todo list app with React frontend and Flask backend",
        "model": "gpt-4o" (optional, defaults to configured model),
        "api_key": "sk-..." (required - user's API key),
        "provider": "openai" | "anthropic" | "google" (optional, auto-detected from key)
    }
    
    Returns:
    {
        "project_id": "unique-project-id",
        "status": "queued",
        "message": "App generation started"
    }
    """
    data = request.get_json()
    
    if not data or 'prompt' not in data:
        return jsonify({'error': 'Missing required field: prompt'}), 400
    
    if not data.get('api_key'):
        return jsonify({'error': 'Missing required field: api_key'}), 400
    
    prompt = data['prompt']
    model = data.get('model')
    api_key = data['api_key']
    provider = data.get('provider')
    model_id = data.get('model_id')  # ID of trained model to integrate
    
    try:
        result = service.generate_app(
            prompt, 
            model=model, 
            api_key=api_key, 
            provider=provider,
            model_id=model_id
        )
        return jsonify(result), 202
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/status', methods=['GET'])
def get_status(project_id):
    """
    Get the current status of an app generation task.
    
    Returns:
    {
        "project_id": "...",
        "status": "queued|in_progress|completed|failed",
        "progress": 0-100,
        "message": "Current step description",
        "logs": ["log1", "log2", ...]
    }
    """
    try:
        result = service.get_status(project_id)
        if result is None:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/download', methods=['GET'])
def download_app(project_id):
    """
    Download the generated app as a ZIP file.
    Only available when status is 'completed'.
    """
    try:
        result = service.get_download(project_id)
        if result is None:
            return jsonify({'error': 'Project not found'}), 404
        if result.get('error'):
            return jsonify(result), 400
        
        zip_path = result.get('zip_path')
        if zip_path and os.path.exists(zip_path):
            return send_file(
                zip_path,
                mimetype='application/zip',
                as_attachment=True,
                download_name=f'{project_id}.zip'
            )
        return jsonify({'error': 'Download not available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/preview', methods=['POST'])
def preview_app(project_id):
    """
    Start a live preview of the generated app.
    Only available when status is 'completed'.
    """
    try:
        result = service.preview_app(project_id)
        if result.get('error'):
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>', methods=['DELETE'])
def cancel_project(project_id):
    """
    Cancel an in-progress generation or delete a completed project.
    """
    try:
        result = service.cancel_project(project_id)
        if result is None:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/projects', methods=['GET'])
def list_projects():
    """
    List all projects for the current user.
    """
    try:
        projects = service.list_projects()
        return jsonify({'projects': projects}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/files', methods=['GET'])
def list_files(project_id):
    """
    List all generated files for a project.
    """
    try:
        files = service.list_files(project_id)
        if files is None:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify({'files': files}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/files/read', methods=['GET'])
def read_file(project_id):
    """
    Read content of a specific file.
    """
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Missing path parameter'}), 400
        
    try:
        result = service.read_file(project_id, path)
        if result.get('error'):
            if result['error'] == 'Project not found':
                return jsonify(result), 404
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<project_id>/files/update', methods=['POST'])
def update_file(project_id):
    """
    Update content of a specific file.
    """
    data = request.get_json()
    if not data or 'path' not in data or 'content' not in data:
        return jsonify({'error': 'Missing path or content'}), 400
        
    try:
        result = service.update_file(project_id, data['path'], data['content'])
        if result.get('error'):
            return jsonify(result), 400
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
