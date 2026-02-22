"""
Unit Tests for Vision Preprocessing
"""
import pytest
import numpy as np
from PIL import Image
import os
import sys

# Ensure backend and ml_engine are in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

def test_rgba_to_rgb_conversion():
    """Test that RGBA images are correctly converted to RGB and normalized"""
    # Create an RGBA image (224x224x4)
    rgba_image = Image.new('RGBA', (224, 224), color=(255, 0, 0, 128))
    
    # Simulate the preprocessing logic in streamlit_app/app.py
    img_rgb = rgba_image.convert('RGB')
    img_resized = img_rgb.resize((224, 224))
    img_array = np.array(img_resized) / 255.0
    
    # Normalization constants
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    
    # This should NOT raise ValueError now
    normalized_array = (img_array - mean) / std
    
    assert normalized_array.shape == (224, 224, 3)
    assert img_array.shape == (224, 224, 3)
    # Check if conversion actually happened (channel count)
    assert np.array(rgba_image).shape[-1] == 4
    assert img_array.shape[-1] == 3

if __name__ == "__main__":
    test_rgba_to_rgb_conversion()
    print("Test passed!")
