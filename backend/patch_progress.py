"""
Patch script to fix progress calculation in explanation_engine.py
"""

import sys

# Read the file
with open('/app/app/services/explanation_engine.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Update _calculate_progress to check for summary first
old_calculate = '''    @classmethod
    def _calculate_progress(cls, data):
        """Calculate overall progress percentage based on phases"""
        total_phases = 6  # understanding, learning, testing, comparing, choosing, ready
        completed_phases = sum(1 for p in data.get('phases', []) if p.get('completed_at'))
        
        # Base progress on completed phases
        base_progress = int((completed_phases / total_phases) * 100)
        
        # If currently in a phase, add partial progress
        current_phase = data.get('current_phase')
        if current_phase and completed_phases < total_phases:
            # Add 50% of current phase progress
            base_progress += int((1 / total_phases) * 50)
        
        return min(base_progress, 100)'''

new_calculate = '''    @classmethod
    def _calculate_progress(cls, data):
        """Calculate overall progress percentage based on phases"""
        # If summary exists, training is 100% complete
        if data.get('summary'):
            return 100
        
        total_phases = 6  # understanding, learning, testing, comparing, choosing, ready
        completed_phases = sum(1 for p in data.get('phases', []) if p.get('completed_at'))
        
        # Base progress on completed phases
        base_progress = int((completed_phases / total_phases) * 100)
        
        # If currently in a phase, add partial progress
        current_phase = data.get('current_phase')
        if current_phase and completed_phases < total_phases:
            # Add 50% of current phase progress
            base_progress += int((1 / total_phases) * 50)
        
        return min(base_progress, 100)'''

content = content.replace(old_calculate, new_calculate)

# Fix 2: Add flag_modified to emit_final_summary
old_commit = '''            # Set progress to 100%
            data['progress'] = 100
            
            experiment.explanation_data = data
            db.session.commit()'''

new_commit = '''            # Set progress to 100%
            data['progress'] = 100
            
            experiment.explanation_data = data
            
            # Force SQLAlchemy to detect the JSON change
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(experiment, 'explanation_data')
            
            db.session.commit()'''

content = content.replace(old_commit, new_commit)

# Write back
with open('/app/app/services/explanation_engine.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ explanation_engine.py patched successfully")
