from flask import (Flask,
render_template, request, redirect, url_for, session)
from werkzeug.security import (
generate_password_hash, check_password_hash)
from flask_sqlalchemy import SQLAlchemy


#Main
app = Flask(__name__)
app.secret_key = ""
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db =SQLAlchemy(app)

#User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80),unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

with app.app_context():
    db.create_all()


# Login
@app.route("/", methods=["GET","POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password,password):
        session["user"] = username
        return redirect(url_for("map_page"))
    else:
        error = "Invalid username or password"

    return render_template("login.html", error=error)

# Register
@app.route("/register", methods=["GET","POST"])
def register():
    error = None
    if request.method == "POST":
        username = request.form["username"]
        email = request.form["email"]
        password = request.form["password"]
        confirm = request.form["confirm"]
        if password != confirm:
            error = "Passwords do not match"
        elif User.query.filter_by(username=username).first():
            error = "User already exists"
    else:
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, email=email, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return redirect(url_for("login"))

    return render_template("register.html", error=error)
                
# Map page
@app.route("/map")
def map_page():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("map.html")

# Logout
@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=True)