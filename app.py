from flask import Flask, send_from_directory

# Initialize the Flask application
app = Flask(__name__)

# Define the route for the home page
@app.route('/')
def home():
    """
    Serves the index.html file from the current directory.
    """
    return send_from_directory('.', 'index.html')

# Main entry point to run the application
if __name__ == '__main__':
    # Runs the Flask app on http://0.0.0.0:5000/
    # The debug=True flag provides detailed error pages and auto-reloads the server on code changes.
    app.run(host='0.0.0.0', port=5000, debug=True)
