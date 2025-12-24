import sys
import os

# Ensure current directory is in python path
sys.path.append(os.getcwd())

print("Attempting to import app.main...")
try:
    from app.main import app
    print("SUCCESS: app.main imported successfully.")
except Exception as e:
    print(f"FAILURE: Failed to import app.main")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
