from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import bcrypt
import json
import os
import requests

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'

USERS_FILE = 'users.json'

# Initialize users.json if not exists
if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, 'w') as f:
        json.dump({}, f)

def load_users():
    """Load users from JSON file"""
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

def save_users(users):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('map_view'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        users = load_users()
        
        if username in users:
            flash('این نام کاربری قبلاً ثبت شده است', 'error')
            return redirect(url_for('register'))
        
        # Hash password with bcrypt
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        users[username] = hashed.decode('utf-8')
        save_users(users)
        
        flash('ثبت‌نام با موفقیت انجام شد. لطفاً وارد شوید', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        users = load_users()
        
        if username not in users:
            flash('نام کاربری یا رمز عبور اشتباه است', 'error')
            return redirect(url_for('login'))
        
        # Verify password with bcrypt
        stored_hash = users[username].encode('utf-8')
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            session['username'] = username
            flash('خوش آمدید!', 'success')
            return redirect(url_for('map_view'))
        else:
            flash('نام کاربری یا رمز عبور اشتباه است', 'error')
            return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    flash('با موفقیت خارج شدید', 'info')
    return redirect(url_for('login'))

@app.route('/map')
def map_view():
    if 'username' not in session:
        flash('لطفاً ابتدا وارد شوید', 'warning')
        return redirect(url_for('login'))
    return render_template('map.html', username=session['username'])

@app.route('/api/geoserver-proxy')
def geoserver_proxy():
    """Proxy for GeoServer WMS GetFeatureInfo requests"""
    # Change this URL to your GeoServer instance
    geoserver_url = 'http://localhost:8080/geoserver/wms'
    
    try:
        # Forward all query parameters to GeoServer
        response = requests.get(geoserver_url, params=request.args, timeout=5)
        return response.content, response.status_code, response.headers.items()
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
