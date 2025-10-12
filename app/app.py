from flask import Flask, render_template, send_from_directory, request
from prometheus_flask_exporter import PrometheusMetrics
import os
import logging
import time
from db import log_visitor, get_db

app = Flask(__name__)

# --- Database Setup ---
# Initialize the database and register a command to run it from the command line if needed.
app.teardown_appcontext(lambda e: get_db().close())

# --- Prometheus Metrics Configuration ---
metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.3')


# --- Logging Configuration ---
handler = logging.StreamHandler()
formatter = logging.Formatter(
    '%(asctime)s UTC [%(levelname)s] - %(message)s'
)
formatter.converter = time.gmtime
handler.setFormatter(formatter)
app.logger.addHandler(handler)
app.logger.setLevel(logging.INFO)

# --- Middleware to Log Every Visit ---
@app.before_request
def log_request_info():
    """
    This function runs before every single request to the application.
    It calls our database logic to log the visitor's information.
    """
    # We don't want to log requests for static files (css, js, images)
    if not request.path.startswith('/static'):
        log_visitor()


# --- Application Routes ---

@app.route('/')
def home():
    app.logger.info(f"[{request.path}] - Home page accessed.")
    app.logger.warning(f"[{request.path}] - This is a sample warning message for demonstration.")
    return render_template('index.html')

@app.route('/about-me')
def about():
    app.logger.info(f"[{request.path}] - About Me page accessed.")
    return render_template('about.html')

@app.route('/tech-stack')
def tech():
    app.logger.info(f"[{request.path}] - Tech in Action page accessed.")
    return render_template('tech.html')

@app.route('/my-projects')
def projects():
    app.logger.info(f"[{request.path}] - My Projects page accessed.")
    return render_template('projects.html')

@app.route('/education')
def education():
    app.logger.info(f"[{request.path}] - Education page accessed.")
    return render_template('education.html')

@app.route('/contact')
def contact():
    app.logger.info(f"[{request.path}] - Contact page accessed.")
    return render_template('contact.html')

@app.route('/Jenkinsfile-demo')
def download_jenkinsfile():
    directory = os.path.join(app.root_path, 'static', 'files')
    try:
        app.logger.info(f"[{request.path}] - Attempting to send file 'Jenkinsfile-demo'.")
        return send_from_directory(
            directory=directory,
            path='Jenkinsfile-demo',
            as_attachment=True
        )
    except FileNotFoundError:
        app.logger.error(f"[{request.path}] - File not found at path: {os.path.join(directory, 'Jenkinsfile-demo')}")
        return "File not found.", 404

@app.route('/github-actions-demo')
def download_github_actions():
    """Provides the GitHub Actions YAML file for download."""
    directory = os.path.join(app.root_path, 'static', 'files')
    try:
        return send_from_directory(
            directory,
            'githubactions-demo.yaml',
            as_attachment=True,
            download_name='push-image.yaml'
        )
    except FileNotFoundError:
        return "File not found.", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
