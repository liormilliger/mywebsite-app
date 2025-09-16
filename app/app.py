from flask import Flask, render_template

app = Flask(__name__)

# Route for the homepage
@app.route('/')
def home():
    return render_template('index.html')

# Route for "Tech in Action" page
@app.route('/tech-in-action')
def tech():
    return render_template('tech.html')

# Route for "My Projects" page
@app.route('/my-projects')
def projects():
    return render_template('projects.html')

# Route for "Education" page
@app.route('/education')
def education():
    return render_template('education.html')

if __name__ == '__main__':
    app.run(debug=True)