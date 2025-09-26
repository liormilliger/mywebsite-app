from flask import Flask, render_template, send_from_directory, request
from prometheus_flask_exporter import PrometheusMetrics
import os
import logging
import time

app = Flask(__name__)

# --- Prometheus Metrics Configuration ---
# This line creates a /metrics endpoint for Prometheus to scrape
metrics = PrometheusMetrics(app)

# You can also create custom metrics
# This creates a static metric with info about the application
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

@app.route('/')
def home():
    app.logger.info(f"[{request.path}] - Home page accessed.")
    # Example of a warning log
    app.logger.warning(f"[{request.path}] - This is a sample warning message for demonstration.")
    return render_template('index.html')

@app.route('/about-me')
def about():
    app.logger.info(f"[{request.path}] - About Me page accessed.")
    return render_template('about.html')

@app.route('/tech-in-action')
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
    # Construct the path to the 'static/files' directory
    directory = os.path.join(app.root_path, 'static', 'files')
    try:
        app.logger.info(f"[{request.path}] - Attempting to send file 'Jenkinsfile-demo'.")
        return send_from_directory(
            directory=directory,
            path='Jenkinsfile-demo',
            as_attachment=True  # This is the crucial part
        )
    except FileNotFoundError:
        # Example of an error log
        app.logger.error(f"[{request.path}] - File not found at path: {os.path.join(directory, 'Jenkinsfile-demo')}")
        return "File not found.", 404

@app.route('/github-actions-demo')
def download_github_actions():
    """Provides the GitHub Actions YAML file for download."""
    # The path to the 'static/files' directory
    directory = os.path.join(app.root_path, 'static', 'files')
    try:
        return send_from_directory(
            directory, 
            'githubactions-demo.yaml', 
            as_attachment=True,
            download_name='push-image.yaml' # Optional: suggest a different filename to the user
        )
    except FileNotFoundError:
        return "File not found.", 404
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
