from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about-me')
def about():
    return render_template('about.html')

@app.route('/tech-in-action')
def tech():
    return render_template('tech.html')

@app.route('/my-projects')
def projects():
    return render_template('projects.html')

@app.route('/education')
def education():
    return render_template('education.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/Jenkinsfile-demo')
def download_jenkinsfile():
    # Construct the path to the 'static/files' directory
    directory = os.path.join(app.root_path, 'static', 'files')
    try:
        return send_from_directory(
            directory=directory,
            path='Jenkinsfile-demo',
            as_attachment=True  # This is the crucial part
        )
    except FileNotFoundError:
        return "File not found.", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

