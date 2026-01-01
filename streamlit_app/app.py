"""
InferX-ML Streamlit Application
Main entry point for the prediction and visualization UI
"""
import streamlit as st
import pandas as pd
import requests
import json
from typing import Dict, Any

# Page configuration
st.set_page_config(
    page_title="InferX-ML",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 10px;
        color: white;
        text-align: center;
    }
    .stButton>button {
        width: 100%;
        border-radius: 20px;
        height: 3rem;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)


def main():
    """Main application entry point"""
    
    st.markdown('<h1 class="main-header">🤖 InferX-ML</h1>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; color: #666;">No-Code AI/ML Platform</p>', unsafe_allow_html=True)
    
    # Sidebar navigation
    with st.sidebar:
        st.image("https://via.placeholder.com/150x50?text=InferX-ML", use_container_width=True)
        st.markdown("---")
        
        page = st.radio(
            "Navigation",
            ["🏠 Dashboard", "📊 Predictions", "📈 Model Insights", "⚙️ Settings"],
            index=0
        )
    
    # Page routing
    if page == "🏠 Dashboard":
        show_dashboard()
    elif page == "📊 Predictions":
        show_predictions()
    elif page == "📈 Model Insights":
        show_model_insights()
    elif page == "⚙️ Settings":
        show_settings()


def show_dashboard():
    """Dashboard page"""
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Models", "5", "+2")
    with col2:
        st.metric("Predictions Today", "127", "+23")
    with col3:
        st.metric("Avg Accuracy", "94.5%", "+1.2%")
    with col4:
        st.metric("Active Users", "12", "+3")
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 Recent Models")
        st.info("No models trained yet. Upload a dataset to get started!")
    
    with col2:
        st.subheader("📈 Recent Predictions")
        st.info("No predictions made yet.")


def show_predictions():
    """Predictions page with dynamic form"""
    
    st.subheader("🔮 Make Predictions")
    
    # Model selection
    model_options = ["Select a model..."]  # TODO: Fetch from API
    selected_model = st.selectbox("Choose Model", model_options)
    
    if selected_model == "Select a model...":
        st.info("Please select a trained model to make predictions.")
        return
    
    # TODO: Load UI schema from selected model and generate form
    st.markdown("### Input Features")
    
    # Placeholder form - will be dynamically generated from UI schema
    with st.form("prediction_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            feature1 = st.number_input("Feature 1", value=0.0)
            feature2 = st.text_input("Feature 2")
        
        with col2:
            feature3 = st.selectbox("Feature 3", ["Option A", "Option B", "Option C"])
            feature4 = st.slider("Feature 4", 0, 100, 50)
        
        submitted = st.form_submit_button("🚀 Predict", use_container_width=True)
        
        if submitted:
            with st.spinner("Making prediction..."):
                # TODO: Call prediction API
                st.success("Prediction: **Class A** (Confidence: 95.2%)")


def show_model_insights():
    """Model insights and explainability page"""
    
    st.subheader("📈 Model Insights")
    
    tab1, tab2, tab3 = st.tabs(["Feature Importance", "SHAP Values", "Performance Metrics"])
    
    with tab1:
        st.info("Feature importance visualization will appear here after model training.")
    
    with tab2:
        st.info("SHAP explanation plots will appear here.")
    
    with tab3:
        st.info("Model performance metrics will be displayed here.")


def show_settings():
    """Settings page"""
    
    st.subheader("⚙️ Settings")
    
    with st.expander("🔗 API Configuration", expanded=True):
        api_url = st.text_input("Backend API URL", value="http://localhost:5000")
        st.button("Test Connection")
    
    with st.expander("🎨 Appearance"):
        theme = st.selectbox("Theme", ["Light", "Dark", "Auto"])
    
    with st.expander("📧 Notifications"):
        email_notifications = st.checkbox("Email notifications for completed training")
        training_alerts = st.checkbox("Alert when training takes longer than expected")


def generate_form_from_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate Streamlit form elements from UI schema
    
    Args:
        schema: UI schema dictionary from model package
        
    Returns:
        Dictionary of form values
    """
    form_values = {}
    
    for field in schema.get('fields', []):
        name = field['name']
        label = field.get('label', name)
        input_type = field.get('input_type', 'text')
        
        if input_type == 'number':
            form_values[name] = st.number_input(
                label,
                min_value=field.get('min'),
                max_value=field.get('max'),
                value=field.get('default', 0.0)
            )
        
        elif input_type == 'dropdown':
            options = field.get('options', [])
            form_values[name] = st.selectbox(label, options)
        
        elif input_type == 'slider':
            form_values[name] = st.slider(
                label,
                min_value=field.get('min', 0),
                max_value=field.get('max', 100),
                value=field.get('default', 50)
            )
        
        elif input_type == 'checkbox':
            form_values[name] = st.checkbox(label, value=field.get('default', False))
        
        elif input_type == 'radio':
            options = field.get('options', [])
            form_values[name] = st.radio(label, options)
        
        else:  # text input
            form_values[name] = st.text_input(label, value=field.get('default', ''))
    
    return form_values


if __name__ == "__main__":
    main()
