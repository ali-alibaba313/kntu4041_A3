import sqlite3
from flask import render_template, request, redirect, url_for
from flask_login import login_user, logout_user, login_required, UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

DB = "users.db"

def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT
    )
    """)
    conn.commit()
    conn.close()

class User(UserMixin):
    def __init__(self, id_, username):
        self.id = str(id_)
        self.username = username

    @staticmethod
    def get(user_id):
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        c.execute("SELECT id, username FROM users WHERE id=?", (user_id,))
        row = c.fetchone()
        conn.close()
        if row:
            return User(row[0], row[1])
        return None

def setup_routes(app):

    init_db()

    @app.route("/")
    def home():
        return redirect(url_for("login"))

    # ---------- REGISTER ----------
    @app.route("/register", methods=["GET","POST"])
    def register():
        if request.method == "POST":
            u = request.form["username"]
            e = request.form["email"]
            p = generate_password_hash(request.form["password"])

            conn = sqlite3.connect(DB)
            c = conn.cursor()

            try:
                c.execute("INSERT INTO users(username,email,password) VALUES(?,?,?)",(u,e,p))
                conn.commit()
            except:
                return render_template("register.html", error="User exists")

            conn.close()
            return redirect(url_for("login"))

        return render_template("register.html")

    # ---------- LOGIN ----------
    @app.route("/login", methods=["GET","POST"])
    def login():
        if request.method == "POST":
            u = request.form["username"]
            p = request.form["password"]

            conn = sqlite3.connect(DB)
            c = conn.cursor()
            c.execute("SELECT id,username,password FROM users WHERE username=?",(u,))
            row = c.fetchone()
            conn.close()

            if row and check_password_hash(row[2], p):
                login_user(User(row[0],row[1]))
                return redirect(url_for("map_page"))

            return render_template("login.html", error="Invalid credentials")

        return render_template("login.html")

    # ---------- MAP ----------
    @app.route("/map")
    @login_required
    def map_page():
        return render_template("map.html")

    # ---------- LOGOUT ----------
    @app.route("/logout")
    @login_required
    def logout():
        logout_user()
        return redirect(url_for("login"))
