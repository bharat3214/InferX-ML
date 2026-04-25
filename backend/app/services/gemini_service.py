"""
AI Service (Groq-powered)
Integrates with Groq API for intelligent dataset analysis and report generation
"""
import os
import json
from typing import Dict, Any, List, Optional

try:
    from groq import Groq
except ImportError:
    Groq = None


class AIService:
    """
    Service for interacting with Groq API (or fallback to Gemini).
    Used for:
    1. Analyzing datasets with natural language prompts to suggest target columns
    2. Generating order reports based on predictions
    3. AI-powered synthetic dataset generation
    """

    def __init__(self):
        # Try Groq first, then Gemini
        self.groq_key = os.environ.get('GROQ_API_KEY')
        self.gemini_key = os.environ.get('GEMINI_API_KEY')

        self.client = None
        self.provider = None
        self.gemini_model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

        if self.groq_key and Groq:
            self.client = Groq(api_key=self.groq_key)
            self.provider = 'groq'
            self.model = 'llama-3.3-70b-versatile'  # Fast and capable
            print("Using Groq API for AI analysis")
        elif self.gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_key)
                self.client = genai.GenerativeModel(self.gemini_model)
                self.provider = 'gemini'
                print("Using Gemini API for AI analysis")
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")

        if not self.client:
            raise ValueError("No AI API key configured. Set GROQ_API_KEY or GEMINI_API_KEY")

    def _call_llm(self, system_prompt: str, user_message: str) -> str:
        """Call the LLM (Groq or Gemini) and return the response text"""

        if self.provider == 'groq':
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
                max_tokens=4000
            )
            return response.choices[0].message.content

        elif self.provider == 'gemini':
            response = self.client.generate_content([
                {"role": "user", "parts": [system_prompt]},
                {"role": "model", "parts": ["I understand. I will respond with valid JSON only."]},
                {"role": "user", "parts": [user_message]}
            ])
            return response.text

        raise ValueError("No AI provider configured")

    def analyze_dataset_with_prompt(
        self,
        columns: List[str],
        column_types: Dict[str, str],
        sample_data: List[Dict[str, Any]],
        user_prompt: str
    ) -> Dict[str, Any]:
        """
        Analyze a dataset with a user's natural language prompt to suggest
        the best target column for prediction.
        """

        system_prompt = """You are an expert data scientist assistant. Your task is to analyze a dataset
and determine the best target column for machine learning based on the user's goal.

You must respond with valid JSON only, no markdown formatting. Use this exact structure:
{
    "suggested_target": "column_name",
    "problem_type": "classification|regression|timeseries",
    "reasoning": "Explanation of why this target column was chosen",
    "confidence": 0.85,
    "preprocessing_suggestions": [
        "suggestion 1",
        "suggestion 2"
    ],
    "environmental_factors": [
        "Any columns that appear to be environmental/external factors"
    ]
}"""

        # Format column info
        column_info = "\n".join([
            f"- {col} ({column_types.get(col, 'unknown')})"
            for col in columns
        ])

        # Format sample data
        sample_str = json.dumps(sample_data[:5], indent=2, default=str)

        user_message = f"""## User's Goal
{user_prompt}

## Dataset Columns
{column_info}

## Sample Data (first 5 rows)
{sample_str}

Based on the user's goal and the dataset structure, determine:
1. Which column should be the target for prediction
2. What type of ML problem this is (classification for categories, regression for numbers, timeseries for forecasting)
3. Your reasoning
4. Any preprocessing suggestions
5. Any columns that look like environmental/external factors (weather, holidays, etc.)

Respond with JSON only."""

        try:
            response_text = self._call_llm(system_prompt, user_message)

            # Clean up response if it has markdown code blocks
            response_text = response_text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # Remove first and last lines (```json and ```)
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)

            # Validate required fields
            required_fields = ['suggested_target', 'problem_type', 'reasoning']
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")

            # Validate suggested target exists in columns
            if result['suggested_target'] not in columns:
                # Try to find a close match
                suggested = result['suggested_target'].lower()
                for col in columns:
                    if col.lower() == suggested or suggested in col.lower():
                        result['suggested_target'] = col
                        break

            return result

        except json.JSONDecodeError as e:
            return {
                'suggested_target': None,
                'problem_type': 'unknown',
                'reasoning': f'Failed to parse AI response: {str(e)}',
                'confidence': 0.0,
                'preprocessing_suggestions': [],
                'error': str(e)
            }
        except Exception as e:
            return {
                'suggested_target': None,
                'problem_type': 'unknown',
                'reasoning': f'AI API error: {str(e)}',
                'confidence': 0.0,
                'preprocessing_suggestions': [],
                'error': str(e)
            }

    # ── AI Synthetic Data Generation ──

    def generate_dataset_schema(self, prompt, num_columns=8):
        """Generate a dataset schema from a natural language description."""

        system_prompt = """You are an expert data engineer. Given a user's description of a dataset they need,
generate a complete schema with realistic column definitions.

You MUST respond with valid JSON only, no markdown. Use this exact structure:
{
    "name": "suggested_dataset_name",
    "description": "One-line description of the dataset",
    "columns": [
        {
            "name": "column_name_snake_case",
            "type": "numeric|integer|categorical|boolean|date|text|id",
            "description": "What this column represents",
            "sample_values": ["example1", "example2", "example3"],
            "config": {}
        }
    ]
}

Rules:
- Use snake_case for column names
- Choose realistic column types (not everything should be text)
- Include 1 ID column at the start
- sample_values should be realistic examples
- config should match the type:
  numeric/integer: {"min": N, "max": N}
  categorical: {"categories": ["val1", "val2", ...]}
  boolean: {"true_probability": 0.5}
  date: {}
  text: {"length": 20}
  id: {"prefix": "PREFIX"}
- Generate between 5 and 15 columns"""

        user_message = (
            f"Create a dataset schema for: {prompt}\n\n"
            f"Generate approximately {num_columns} columns. "
            f"Make columns realistic and domain-appropriate. Respond with JSON only."
        )

        try:
            response_text = self._call_llm(system_prompt, user_message)
            response_text = response_text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            result = json.loads(response_text)
            if 'columns' not in result or not result['columns']:
                raise ValueError("No columns in response")
            return result
        except json.JSONDecodeError as e:
            return {'error': f'Failed to parse AI schema: {str(e)}'}
        except Exception as e:
            return {'error': f'AI schema generation failed: {str(e)}'}

    def generate_dataset_rows(self, schema, num_sample=30):
        """Generate realistic sample data rows from an approved schema."""

        col_descriptions = "\n".join([
            f"- {c['name']} ({c['type']}): {c.get('description', 'no description')}"
            for c in schema
        ])

        system_prompt = (
            "You are a data generator. Produce realistic sample data rows.\n"
            "Respond with valid JSON only — an array of objects. No markdown.\n\n"
            f"Column definitions:\n{col_descriptions}\n\n"
            "Rules:\n"
            "- Values must be realistic and internally consistent\n"
            "- Numeric values should be numbers not strings\n"
            "- Boolean values should be true/false not strings\n"
            "- Dates should be YYYY-MM-DD strings\n"
            "- IDs should be sequential with the column prefix\n"
            "- Create diversity — don't repeat the same values"
        )

        col_keys = ', '.join([c['name'] for c in schema])
        user_message = (
            f"Generate exactly {num_sample} realistic data rows as a JSON array.\n"
            f"Keys: {col_keys}\n"
            f"Respond with ONLY a JSON array."
        )

        try:
            response_text = self._call_llm(system_prompt, user_message)
            response_text = response_text.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            rows = json.loads(response_text)
            if not isinstance(rows, list):
                raise ValueError("Response is not an array")
            return rows
        except (json.JSONDecodeError, Exception):
            return []


# Singleton instance
_ai_service = None


def get_ai_service() -> AIService:
    """Get or create the AI service singleton"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service


# Backward compatibility aliases
GeminiService = AIService
get_gemini_service = get_ai_service
