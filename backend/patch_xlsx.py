"""
Patch to fix xlsx file handling in training.py
The analyze-prompt and training routes use pd.read_csv() which fails on .xlsx files.
This patch adds a helper that picks the right reader based on file extension.
"""

filepath = '/app/app/routes/training.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: In the analyze-prompt route (line ~125)
old_analyze = "        df = pd.read_csv(io.BytesIO(file_content))\n        \n        # Prepare data for Gemini"
new_analyze = """        # Support both CSV and Excel files
        if dataset.file_path.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            df = pd.read_csv(io.BytesIO(file_content))
        
        # Prepare data for Gemini"""

if old_analyze in content:
    content = content.replace(old_analyze, new_analyze)
    print("✅ Fixed analyze-prompt route")
else:
    print("⚠️ Could not find analyze-prompt pattern, trying alt...")
    # Try with \r\n
    old_analyze_crlf = old_analyze.replace('\n', '\r\n')
    if old_analyze_crlf in content:
        content = content.replace(old_analyze_crlf, new_analyze.replace('\n', '\r\n'))
        print("✅ Fixed analyze-prompt route (CRLF)")
    else:
        print("❌ Could not find analyze-prompt pattern at all")

# Fix 2: In the training task (line ~288)
old_training = """            print(f"📦 Downloaded {len(file_content)} bytes")
            df = pd.read_csv(io.BytesIO(file_content))"""

new_training = """            print(f"📦 Downloaded {len(file_content)} bytes")
            # Support both CSV and Excel files
            if file_path.lower().endswith(('.xlsx', '.xls')):
                df = pd.read_excel(io.BytesIO(file_content))
            else:
                df = pd.read_csv(io.BytesIO(file_content))"""

if old_training in content:
    content = content.replace(old_training, new_training)
    print("✅ Fixed training task route")
else:
    old_training_crlf = old_training.replace('\n', '\r\n')
    if old_training_crlf in content:
        content = content.replace(old_training_crlf, new_training.replace('\n', '\r\n'))
        print("✅ Fixed training task route (CRLF)")
    else:
        print("❌ Could not find training task pattern at all")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Training.py patched successfully!")
