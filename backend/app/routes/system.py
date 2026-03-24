"""
System Routes — System info and diagnostics
"""
import os
from flask import Blueprint, jsonify

system_bp = Blueprint('system', __name__)


@system_bp.route('/gpu-info', methods=['GET'])
def gpu_info():
    """
    Return device availability and system details.
    Reports CPU-only since GPU dependencies have been removed.
    Endpoint name kept for backward compatibility.
    """
    device_type = os.environ.get("DEVICE_TYPE", "cpu").lower()

    return jsonify({
        "gpu_available": False,
        "gpu_count": 0,
        "gpu_devices": [],
        "cuda_available": False,
        "tensorflow_gpu": False,
        "pytorch_gpu": False,
        "device_type": device_type,
    }), 200
