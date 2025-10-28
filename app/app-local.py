from flask import Flask, render_template, send_from_directory, request
from prometheus_flask_exporter import PrometheusMetrics
import os
import logging
import time

app = Flask(__name__)

metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.3')

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)