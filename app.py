from flask import Flask
from flask_login import LoginManager
from flask_wtf import CSRFProtect
from routing import setup_routes, User

app = Flask(__name__)

app.secret_key = "super_secret_key_123"

# Flask-Login
login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

# CSRF
csrf = CSRFProtect(app)

setup_routes(app)

if __name__ == "__main__":
    app.run(debug=True)
