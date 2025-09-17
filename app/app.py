from flask import Flask, render_template

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

if __name__ == '__main__':
    app.run(debug=True)

# # to make it available outside the container
# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000)