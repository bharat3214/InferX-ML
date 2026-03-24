"""
Device Utility Module for InferX-ML
CPU-only stubs. Device type is read from the DEVICE_TYPE environment variable.
All functions maintain their original signatures for backward compatibility.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Read device type from environment variable, default to 'cpu'
DEVICE_TYPE = os.environ.get("DEVICE_TYPE", "cpu").lower()


def detect_gpus() -> dict:
    """
    Return device availability summary.
    Always reports CPU-only since GPU dependencies have been removed.

    Returns:
        dict with keys matching the original GPU info structure.
    """
    return {
        "gpu_available": False,
        "gpu_count": 0,
        "gpu_devices": [],
        "cuda_available": False,
        "tensorflow_gpu": False,
        "pytorch_gpu": False,
        "device_type": DEVICE_TYPE,
    }


def configure_tensorflow_gpu():
    """
    No-op on CPU-only builds.
    Originally configured TensorFlow memory growth and mixed precision.
    """
    logger.info("[Device] Running TensorFlow on CPU (DEVICE_TYPE=%s)", DEVICE_TYPE)


def get_torch_device():
    """
    Return the torch device based on DEVICE_TYPE env var.

    Returns:
        torch.device  (always 'cpu' on this build)
    """
    try:
        import torch
        device = torch.device(DEVICE_TYPE)
        logger.info("[Device] PyTorch using %s", DEVICE_TYPE)
        return device
    except ImportError:
        logger.info("[Device] PyTorch not installed — returning None")
        return None


def get_xgboost_gpu_params() -> dict:
    """
    Return XGBoost device params.
    Returns empty dict on CPU builds (XGBoost defaults to CPU).
    """
    return {}


def get_lightgbm_gpu_params() -> dict:
    """
    Return LightGBM device params.
    Returns empty dict on CPU builds (LightGBM defaults to CPU).
    """
    return {}


def log_gpu_info():
    """
    Log device info. Always reports CPU on this build.
    """
    info = detect_gpus()
    print(f"[Device] Running on CPU (DEVICE_TYPE={DEVICE_TYPE})", flush=True)
    return info
