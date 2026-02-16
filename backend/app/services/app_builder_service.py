"""
App Builder Service - Orchestrates OpenCode AI Agent for app generation
"""
import os
import uuid
import json
import subprocess
import shutil
import tempfile
from datetime import datetime
from pathlib import Path
from app.models.experiment import Experiment
from app.services.minio_service import get_minio_service
import zipfile

# Store project states in memory (TODO: move to database for persistence)
_projects = {}

# Directory for generated apps
GENERATED_APPS_DIR = os.environ.get('GENERATED_APPS_DIR', '/tmp/generated_apps')
os.makedirs(GENERATED_APPS_DIR, exist_ok=True)


class AppBuilderService:
    """Service to manage app generation using OpenCode AI Agent in Docker."""
    
    def __init__(self):
        self.docker_image = 'opencode-agent'
    
    def generate_app(self, prompt: str, model: str = None, api_key: str = None, provider: str = None, model_id: int = None) -> dict:
        """
        Start a new app generation task.
        
        Args:
            prompt: Natural language description of the app to create
            model: Optional LLM model to use (e.g., 'gpt-4o', 'claude-3-5-sonnet')
            api_key: User's API key for the LLM provider
            provider: LLM provider ('openai', 'anthropic', 'google') - auto-detected if not provided
            model_id: Optional ID of a trained model to integrate
        
        Returns:
            Dict with project_id and initial status
        """
        # Auto-detect provider from API key format
        if not provider and api_key:
            if api_key.startswith('sk-'):
                provider = 'openai'
            elif api_key.startswith('sk-ant-'):
                provider = 'anthropic'
            elif api_key.startswith('AIza'):
                provider = 'google'
            else:
                provider = 'openai'  # Default to OpenAI
        
        project_id = str(uuid.uuid4())[:8]
        workspace_dir = os.path.join(GENERATED_APPS_DIR, project_id)
        os.makedirs(workspace_dir, exist_ok=True)
        
        # Handle Model Integration
        model_context = ""
        model_files_instruction = ""
        
        if model_id:
            try:
                experiment = Experiment.query.get(model_id)
                if experiment and experiment.status == 'completed':
                    # Get model details
                    model_context = f"""
## Integrated Model Details
- **Model Name**: {experiment.name}
- **Type**: {experiment.problem_type}
- **Target Column**: {experiment.target_column}
- **Metrics**: Best Score {experiment.best_score:.4f}

This app MUST include a prediction form for this model.
The model artifact is located at `model/model.zip` (or similar).
You must write a backend endpoint that loads this model and performs predictions.
"""
                    # Download model artifact
                    results = experiment.results or {}
                    pkg_path = results.get('model_package_path')
                    if pkg_path:
                        minio = get_minio_service()
                        # Fix path prefix if needed
                        remote_path = pkg_path[7:] if pkg_path.startswith('models/') else pkg_path
                        data = minio.download_bytes('models', remote_path)
                        
                        if data:
                            model_dir = os.path.join(workspace_dir, 'model')
                            os.makedirs(model_dir, exist_ok=True)
                            zip_path = os.path.join(model_dir, 'model.zip')
                            with open(zip_path, 'wb') as f:
                                f.write(data)
                            
                            # Extract schema if possible to give better instructions
                            try:
                                with zipfile.ZipFile(zip_path, 'r') as z:
                                    z.extractall(model_dir)
                                    if 'ui_schema.json' in z.namelist():
                                        with open(os.path.join(model_dir, 'ui_schema.json'), 'r') as f:
                                            schema = json.load(f)
                                            fields = schema.get('fields', [])
                                            field_desc = "\n".join([f"- {field['name']} ({field['type']})" for field in fields])
                                            model_context += f"\n### Input Features Required:\n{field_desc}\n"
                            except:
                                pass
                                
                            model_files_instruction = "The trained model files have been placed in the `model/` directory. Load the model from there."
            except Exception as e:
                print(f"Error integrating model {model_id}: {e}")
                model_context += f"\n(Error loading model details: {e})"
        
        # Create task description file for OpenCode
        task_file = os.path.join(workspace_dir, 'task.md')
        task_content = f"""# App Generation Task

## Requirements
{prompt}

{model_context}

## Constraints
- Frontend: React.js with modern styling (Tailwind or CSS)
- Backend: Python Flask with RESTful API
- Include a README with setup instructions
- Create a proper project structure
- Add basic error handling
{model_files_instruction}
"""
        with open(task_file, 'w', encoding='utf-8') as f:
            f.write(task_content)
        
        # Store project state
        _projects[project_id] = {
            'project_id': project_id,
            'prompt': prompt,
            'model': model,
            'api_key': api_key,
            'provider': provider,
            'model_id': model_id,
            'status': 'queued',
            'progress': 0,
            'message': 'Queued for generation',
            'workspace_dir': workspace_dir,
            'created_at': datetime.utcnow().isoformat(),
            'logs': [],
            'container_id': None
        }
        
        # Start the generation process asynchronously
        self._start_generation(project_id)
        
        return {
            'project_id': project_id,
            'status': 'queued',
            'message': 'App generation started'
        }
    
    def _start_generation(self, project_id: str):
        """Start OpenCode Docker container for app generation."""
        project = _projects.get(project_id)
        if not project:
            return
        
        workspace_dir = project['workspace_dir']
        model = project.get('model') or 'gpt-4o'
        api_key = project.get('api_key')
        provider = project.get('provider', 'openai')
        
        # Build Docker run command with user's API key
        env_vars = []
        
        # Set the appropriate API key based on provider
        if api_key:
            if provider == 'openai':
                env_vars.extend(['-e', f'OPENAI_API_KEY={api_key}'])
            elif provider == 'anthropic':
                env_vars.extend(['-e', f'ANTHROPIC_API_KEY={api_key}'])
            elif provider == 'google' or provider == 'google-flash':
                env_vars.extend(['-e', f'GOOGLE_API_KEY={api_key}'])
                env_vars.extend(['-e', f'GEMINI_API_KEY={api_key}'])
                
        # Handle specific models for providers
        if provider == 'google-flash' and not model:
            model = 'gemini-2.0-flash-exp'
        
        # Assign random ports for live preview
        import random
        frontend_port = random.randint(20000, 29000)
        backend_port = frontend_port + 1
        
        # Store assigned ports in project state
        _projects[project_id]['frontend_port'] = frontend_port
        _projects[project_id]['backend_port'] = backend_port
        
        cmd = [
            'docker', 'run', '-d',
            '-v', f'{workspace_dir}:/workspace',
            '-w', '/workspace',
            '-p', f'{frontend_port}:3000',  # Expose React app
            '-p', f'{backend_port}:5000',   # Expose Flask API
            *env_vars,
            self.docker_image,
            'run',  # Use 'run' command for headless execution
            '--headless',
            '--task', '/workspace/task.md'
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                container_id = result.stdout.strip()
                _projects[project_id]['container_id'] = container_id
                _projects[project_id]['status'] = 'in_progress'
                _projects[project_id]['message'] = 'OpenCode agent started'
                _projects[project_id]['logs'].append(f'Container started: {container_id[:12]}')
            else:
                _projects[project_id]['status'] = 'failed'
                _projects[project_id]['message'] = f'Failed to start: {result.stderr}'
                _projects[project_id]['logs'].append(result.stderr)
        except subprocess.TimeoutExpired:
            _projects[project_id]['status'] = 'failed'
            _projects[project_id]['message'] = 'Docker command timed out'
        except Exception as e:
            _projects[project_id]['status'] = 'failed'
            _projects[project_id]['message'] = str(e)
    
    def get_status(self, project_id: str) -> dict:
        """Get current status of a project."""
        project = _projects.get(project_id)
        if not project:
            return None
        
        # Check if container is still running
        container_id = project.get('container_id')
        if container_id and project['status'] == 'in_progress':
            try:
                result = subprocess.run(
                    ['docker', 'inspect', '-f', '{{.State.Running}}', container_id],
                    capture_output=True, text=True, timeout=10
                )
                is_running = result.stdout.strip() == 'true'
                
                if not is_running:
                    # Container finished - check if successful
                    workspace_dir = project['workspace_dir']
                    if self._has_generated_files(workspace_dir):
                        project['status'] = 'completed'
                        project['progress'] = 100
                        project['message'] = 'App generation completed!'
                    else:
                        project['status'] = 'failed'
                        project['message'] = 'Generation completed but no files generated'
            except Exception as e:
                project['logs'].append(f'Status check error: {str(e)}')
        
        # Construct response
        response = {
            'project_id': project['project_id'],
            'status': project['status'],
            'progress': project['progress'],
            'message': project['message'],
            'logs': project['logs'][-50:]  # Return last 50 logs to avoid huge payloads
        }

        # Add preview info if available
        frontend_port = project.get('frontend_port')
        if frontend_port and project.get('preview_active'):
             # Assume running on localhost for now, or use configured domain
             base_url = 'http://localhost' 
             response['preview_url'] = f'{base_url}:{frontend_port}'
             
        return response
    
    def preview_app(self, project_id: str) -> dict:
        """Start a temporary container to serve the generated app."""
        project = _projects.get(project_id)
        if not project:
            return {'error': 'Project not found'}
        
        if project['status'] != 'completed':
            return {'error': 'Project not completed yet'}
            
        workspace_dir = project['workspace_dir']
        frontend_port = project.get('frontend_port')
        backend_port = project.get('backend_port')
        
        if not frontend_port or not backend_port:
            return {'error': 'No ports assigned for this project'}
            
        # Check if already running
        preview_container = project.get('preview_container_id')
        if preview_container:
            try:
                subprocess.run(['docker', 'inspect', preview_container], check=True, capture_output=True)
                # Already running
                return {'message': 'Preview already running', 'preview_url': f'http://localhost:{frontend_port}'}
            except:
                pass # Not running, clean up
        
        # Start new preview container
        # We use a combined command to start both frontend and backend
        # Note: This assumes the generated structure follows the instructions
        cmd = [
            'docker', 'run', '-d',
            '-v', f'{workspace_dir}:/workspace',
            '-w', '/workspace',
            '-p', f'{frontend_port}:3000',
            '-p', f'{backend_port}:5000',
            self.docker_image,
            'sh', '-c',
            """
            echo "Starting Preview..."
            
            # Start Backend
            if [ -d "backend" ]; then
                cd backend
                if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi
                python app.py &
                cd ..
            fi
            
            # Start Frontend
            if [ -d "frontend" ]; then
                cd frontend
                if [ -f "package.json" ]; then npm install; fi
                npm run dev -- --host 0.0.0.0 --port 3000
            fi
            
            # Keep alive if nothing started (fallback)
            tail -f /dev/null
            """
        ]
        
        try:
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                container_id = res.stdout.strip()
                _projects[project_id]['preview_container_id'] = container_id
                _projects[project_id]['preview_active'] = True
                return {
                    'message': 'Preview started', 
                    'preview_url': f'http://localhost:{frontend_port}'
                }
            else:
                return {'error': f'Failed to start preview: {res.stderr}'}
        except Exception as e:
            return {'error': f'Preview error: {str(e)}'}
    
    def _has_generated_files(self, workspace_dir: str) -> bool:
        """Check if the workspace has generated files beyond the task.md."""
        try:
            files = os.listdir(workspace_dir)
            # Exclude task.md and check for other files
            generated_files = [f for f in files if f != 'task.md']
            return len(generated_files) > 0
        except:
            return False
    
    def get_download(self, project_id: str) -> dict:
        """Get download info for a completed project."""
        project = _projects.get(project_id)
        if not project:
            return None
        
        if project['status'] != 'completed':
            return {'error': 'Project is not completed yet', 'status': project['status']}
        
        workspace_dir = project['workspace_dir']
        zip_path = os.path.join(GENERATED_APPS_DIR, f'{project_id}.zip')
        
        # Create ZIP archive if not exists
        if not os.path.exists(zip_path):
            try:
                shutil.make_archive(
                    os.path.join(GENERATED_APPS_DIR, project_id),
                    'zip',
                    workspace_dir
                )
            except Exception as e:
                return {'error': f'Failed to create archive: {str(e)}'}
        
        return {'zip_path': zip_path}
    
    def cancel_project(self, project_id: str) -> dict:
        """Cancel or delete a project."""
        project = _projects.get(project_id)
        if not project:
            return None
        
        # Stop container if running
        container_id = project.get('container_id')
        if container_id:
            try:
                subprocess.run(['docker', 'stop', container_id], timeout=10)
                subprocess.run(['docker', 'rm', container_id], timeout=10)
            except:
                pass
        
        # Clean up workspace
        workspace_dir = project.get('workspace_dir')
        if workspace_dir and os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir)
            except:
                pass
        
        # Remove from projects
        del _projects[project_id]
        
        return {'message': f'Project {project_id} deleted'}
    
    def list_files(self, project_id: str) -> list:
        """List all generated files for a project recursively."""
        project = _projects.get(project_id)
        if not project:
            return None
        
        workspace_dir = project['workspace_dir']
        file_list = []
        
        for root, dirs, files in os.walk(workspace_dir):
            # Skip hidden directories and the model directory if it's large
            if '.git' in root or '__pycache__' in root:
                continue
                
            for file in files:
                if file == 'task.md' or file.endswith('.pyc') or file.startswith('.'):
                    continue
                    
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, workspace_dir)
                size = os.path.getsize(full_path)
                
                # Convert backslashes to forward slashes for consistent API
                rel_path = rel_path.replace(os.sep, '/')
                
                file_list.append({
                    'path': rel_path,
                    'name': file,
                    'size': size,
                    'type': 'file'
                })
                
        # Sort by path
        return sorted(file_list, key=lambda x: x['path'])

    def read_file(self, project_id: str, file_path: str) -> dict:
        """Read content of a specific file."""
        project = _projects.get(project_id)
        if not project:
            return {'error': 'Project not found'}
            
        workspace_dir = project['workspace_dir']
        # Prevent path traversal
        safe_path = os.path.normpath(os.path.join(workspace_dir, file_path))
        if not safe_path.startswith(os.path.abspath(workspace_dir)):
            return {'error': 'Invalid file path'}
            
        if not os.path.exists(safe_path):
            return {'error': 'File not found'}
            
        try:
            with open(safe_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {'content': content, 'path': file_path}
        except UnicodeDecodeError:
            return {'error': 'Binary file cannot be read'}
        except Exception as e:
            return {'error': f'Error reading file: {str(e)}'}

    def update_file(self, project_id: str, file_path: str, content: str) -> dict:
        """Update content of a specific file."""
        project = _projects.get(project_id)
        if not project:
            return {'error': 'Project not found'}
            
        workspace_dir = project['workspace_dir']
        safe_path = os.path.normpath(os.path.join(workspace_dir, file_path))
        if not safe_path.startswith(os.path.abspath(workspace_dir)):
            return {'error': 'Invalid file path'}
            
        try:
            with open(safe_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return {'success': True, 'message': 'File updated', 'path': file_path}
        except Exception as e:
            return {'error': f'Error writing file: {str(e)}'}

    def list_projects(self) -> list:
        """List all projects."""
        return [
            {
                'project_id': p['project_id'],
                'status': p['status'],
                'prompt': p['prompt'][:100] + '...' if len(p['prompt']) > 100 else p['prompt'],
                'created_at': p['created_at']
            }
            for p in _projects.values()
        ]
