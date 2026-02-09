from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import bcrypt
import json
import os

app = Flask(__name__)
app.secret_key = 'kntu-webgis-project-2026-secret-key'

# فایل ذخیره‌سازی کاربران
USERS_FILE = 'users.json'

# بارگذاری کاربران از فایل
def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

# ذخیره کاربران در فایل
def save_users():
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

# بارگذاری اولیه کاربران
users = load_users()

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form['username']
    password = request.form['password']
    email = request.form.get('email', '')
    
    if username in users:
        return redirect(url_for('index'))
    
    # هش کردن پسورد
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    # ذخیره کاربر
    users[username] = {
        'password': hashed.decode('utf-8'),
        'email': email
    }
    
    # ذخیره در فایل
    save_users()
    
    session['username'] = username
    return redirect(url_for('map_view'))

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    
    if username in users:
        user_data = users[username]
        stored_hash = user_data['password'].encode('utf-8')
        
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            session['username'] = username
            return redirect(url_for('map_view'))
    
    return redirect(url_for('index'))

@app.route('/map')
def map_view():
    if 'username' not in session:
        return redirect(url_for('index'))
    return render_template('map.html', username=session['username'])

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/api/export-map', methods=['POST'])
def export_map():
    # دریافت داده‌های نقشه برای export
    data = request.get_json()
    # در اینجا می‌تونی لاجیک export رو پیاده کنی
    return jsonify({'status': 'success', 'message': 'Map exported successfully'})

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
