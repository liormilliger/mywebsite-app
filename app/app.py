from flask import Flask, render_template

# Initialize the Flask application
app = Flask(__name__)

# Define the route for the homepage
@app.route('/')
def home():
    """Renders the homepage."""
    return render_template('index.html')

# This allows you to run the app directly
if __name__ == '__main__':
    app.run(debug=True)