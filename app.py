from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import json
import os
import bcrypt
from functools import wraps
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

# Path to users JSON file
USERS_FILE = 'users.json'

# Load users from JSON
def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

# Save users to JSON
def save_users(users):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=4, ensure_ascii=False)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def login():
    if 'user' in session:
        return redirect(url_for('map_view'))
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login_post():
    username = request.form.get('username')
    password = request.form.get('password')
    
    users = load_users()
    
    if username in users:
        stored_hash = users[username]['password'].encode('utf-8')
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            session['user'] = username
            flash('ورود موفق!', 'success')
            return redirect(url_for('map_view'))
    
    flash('نام کاربری یا رمز عبور اشتباه است', 'error')
    return redirect(url_for('login'))

@app.route('/register', methods=['GET'])
def register_page():
    """صفحه ثبت‌نام"""
    if 'user' in session:
        return redirect(url_for('map_view'))
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def register_post():
    username = request.form.get('username')
    password = request.form.get('password')
    email = request.form.get('email', '')
    
    users = load_users()
    
    if username in users:
        flash('این نام کاربری قبلاً ثبت شده است', 'error')
        return redirect(url_for('register_page'))
    
    # Hash password
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # Save new user
    users[username] = {
        'password': hashed.decode('utf-8'),
        'email': email,
        'created_at': datetime.now().isoformat()
    }
    save_users(users)
    
    flash('ثبت‌نام با موفقیت انجام شد! لطفاً وارد شوید', 'success')
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('با موفقیت خارج شدید', 'info')
    return redirect(url_for('login'))

@app.route('/map')
@login_required
def map_view():
    return render_template('map.html', username=session['user'])

@app.route('/api/geoserver-proxy')
@login_required
def geoserver_proxy():
    """Proxy for GeoServer GetFeatureInfo requests"""
    import requests
    
    # Get all query parameters
    params = request.args.to_dict()
    
    # GeoServer URL (change this to your GeoServer instance)
    geoserver_url = 'http://localhost:8080/geoserver/wms'
    
    try:
        response = requests.get(geoserver_url, params=params, timeout=5)
        return response.text, response.status_code, {'Content-Type': response.headers.get('Content-Type', 'text/plain')}
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Create users.json if not exists
    if not os.path.exists(USERS_FILE):
        save_users({})
    
    app.run(debug=True, host='0.0.0.0', port=5000)
