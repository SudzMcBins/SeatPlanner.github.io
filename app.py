# app.py
import os
from flask import Flask, request, jsonify, send_from_directory, abort
from optimizer import SeatingChartOptimizer # Import your optimizer class
import numpy as np # Optimizer class likely uses numpy

# --- Configuration ---
# Assume static files (index.html, script.js, etc.) are in the same directory as app.py
# If you put them in a 'static' or 'templates' folder, adjust accordingly.
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')

# --- Routes ---

@app.route('/')
def index():
    """Serves the main HTML file."""
    print(f"Serving index.html from: {STATIC_DIR}")
    try:
        return send_from_directory(STATIC_DIR, 'index.html')
    except FileNotFoundError:
        abort(404, "index.html not found.")

@app.route('/<path:filename>')
def serve_static(filename):
    """Serves other static files like script.js or example_preferences.csv."""
    print(f"Serving static file: {filename} from: {STATIC_DIR}")
    # Basic security check: prevent accessing files outside the static directory
    if '..' in filename or filename.startswith('/'):
        print(f"Attempted directory traversal: {filename}")
        abort(403)
    try:
        return send_from_directory(STATIC_DIR, filename)
    except FileNotFoundError:
        # Don't abort for favicon.ico or other common requests browsers make
        if filename not in ['favicon.ico']:
             print(f"File not found: {filename}")
             abort(404, f"{filename} not found.")
        else:
            return '', 204 # No content for favicon if not present

@app.route('/optimize', methods=['POST'])
def optimize_seating():
    """API endpoint to run the seating chart optimization."""
    print("Received request at /optimize")
    if not request.is_json:
        print("Error: Request must be JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    print(f"Received data: { {k: type(v) for k,v in data.items()} }") # Log types to help debug

    # --- Data Validation ---
    required_keys = ['students', 'desks', 'preferences']
    if not all(key in data for key in required_keys):
        print(f"Error: Missing required keys. Got: {list(data.keys())}")
        return jsonify({"error": "Missing required data: students, desks, preferences"}), 400

    students = data.get('students')
    desks_data = data.get('desks') # Expecting list of [x, y, group_id]
    preferences = data.get('preferences')

    if not isinstance(students, list) or not isinstance(desks_data, list) or not isinstance(preferences, dict):
         print("Error: Invalid data types")
         return jsonify({"error": "Invalid data types for students, desks, or preferences"}), 400

    if len(students) == 0:
        print("Error: No students provided")
        return jsonify({"error": "No students provided"}), 400

    # Updated check: allow extra desks, but not fewer than students.
    if len(desks_data) < len(students):
        msg = f"Not enough desks: {len(students)} students but only {len(desks_data)} desks."
        print(f"Error: {msg}")
        return jsonify({"error": msg}), 400

    # Basic check on desk data format (list of lists/tuples with 3 numbers)
    if not all(isinstance(d, (list, tuple)) and len(d) == 3 and all(isinstance(n, (int, float)) for n in d) for d in desks_data):
        print("Error: Invalid desk data format. Expect list of [x, y, group_id].")
        return jsonify({"error": "Invalid desk data format"}), 400


    # --- Run Optimizer ---
    try:
        print("Initializing SeatingChartOptimizer...")
        # Ensure data types are correct if needed (optimizer should handle basic types)
        optimizer = SeatingChartOptimizer(
            students=students,
            desks=desks_data, # Pass the list directly
            preferences=preferences
        )
        print("Running optimizer.optimize()...")
        
        # Determine optimization type based on request; default to 'quick'
        optimization_type = data.get('optimization_type', 'quick')
        if optimization_type == 'quick':
            result = optimizer.optimize(
                population_size=1000,
                generations=200,
                mutation_rate=0.95,
                elite_size=500
            )
        else:
            result = optimizer.optimize(
                population_size=10000,
                generations=300,
                mutation_rate=0.95,
                elite_size=5000
            )

        print(f"Optimization finished. Result keys: {list(result.keys())}")
        # Ensure numpy types are converted to standard Python types for JSON serialization
        result_serializable = {
             'student_order': result.get('student_order', []),
             'overall_satisfaction': float(result.get('overall_satisfaction', 0.0)),
             'unfairness_score': float(result.get('unfairness_score', 0.0))
        }
        return jsonify(result_serializable)

    except ValueError as ve:
        print(f"ValueError during optimization setup: {ve}")
        return jsonify({"error": f"Configuration Error: {str(ve)}"}), 400
    except Exception as e:
        # Log the full error for debugging on the server
        print(f"Error during optimization: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An internal server error occurred during optimization: {str(e)}"}), 500

# --- Run the App ---
if __name__ == '__main__':
    # Host 0.0.0.0 makes it accessible on your network, use 127.0.0.1 for local only
    # Change port if 5000 is busy
    app.run(host='0.0.0.0', port=5000, debug=True)