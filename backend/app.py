from flask import Flask
from flask_cors import CORS

from routes.students import students_bp


app = Flask(__name__)

# Allow React frontend to communicate with Flask
CORS(app)

# Register student routes
app.register_blueprint(students_bp)


@app.route("/")
def home():
    return {
        "message": "SkillBridge backend is running"
    }


if __name__ == "__main__":
    app.run(debug=True)