from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import bcrypt
import json
import os
import requests
import re

app = Flask(__name__)
app.secret_key = 'ple@se_give_us_Full_Gr@de'

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

def validate_password(password):
    """
    اعتبارسنجی قدرت پسورد
    الزامات:
    - حداقل ۸ کاراکتر
    - حداقل یک حرف بزرگ
    - حداقل یک حرف کوچک
    - حداقل یک عدد
    - حداقل یک کاراکتر خاص
    """
    if len(password) < 8:
        return False, "رمز عبور باید حداقل ۸ کاراکتر باشد"
    
    if not re.search(r'[A-Z]', password):
        return False, "رمز عبور باید حداقل یک حرف بزرگ (A-Z) داشته باشد"
    
    if not re.search(r'[a-z]', password):
        return False, "رمز عبور باید حداقل یک حرف کوچک (a-z) داشته باشد"
    
    if not re.search(r'[0-9]', password):
        return False, "رمز عبور باید حداقل یک عدد (0-9) داشته باشد"
    
    if not re.search(r'[@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False, "رمز عبور باید حداقل یک کاراکتر خاص (@#$%...) داشته باشد"
    
    return True, "رمز عبور قوی است"

def validate_username(username):
    """
    اعتبارسنجی نام کاربری
    الزامات:
    - ۳ تا ۲۰ کاراکتر
    - فقط حروف انگلیسی، اعداد و _
    """
    if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
        return False, "نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد"
    
    return True, "نام کاربری معتبر است"

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('map_view'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        # بررسی خالی نبودن فیلدها
        if not username or not password:
            flash('❌ لطفاً تمام فیلدها را پر کنید', 'error')
            return redirect(url_for('register'))
        
        # اعتبارسنجی نام کاربری
        is_valid_username, username_msg = validate_username(username)
        if not is_valid_username:
            flash(f'❌ {username_msg}', 'error')
            return redirect(url_for('register'))
        
        # بررسی تکراری نبودن نام کاربری
        users = load_users()
        if username in users:
            flash('❌ این نام کاربری قبلاً ثبت شده است! لطفاً نام دیگری انتخاب کنید', 'error')
            return redirect(url_for('register'))
        
        # اعتبارسنجی قدرت پسورد
        is_valid_password, password_msg = validate_password(password)
        if not is_valid_password:
            flash(f'❌ {password_msg}', 'error')
            return redirect(url_for('register'))
        
        # Hash password with bcrypt
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        users[username] = hashed.decode('utf-8')
        save_users(users)
        
        flash('✅ ثبت‌نام با موفقیت انجام شد! اکنون می‌توانید وارد شوید', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        # بررسی خالی نبودن فیلدها
        if not username or not password:
            flash('❌ لطفاً تمام فیلدها را پر کنید', 'error')
            return redirect(url_for('login'))
        
        users = load_users()
        
        if username not in users:
            flash('❌ نام کاربری یا رمز عبور اشتباه است', 'error')
            return redirect(url_for('login'))
        
        # Verify password with bcrypt
        stored_hash = users[username].encode('utf-8')
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            session['username'] = username
            flash('✅ خوش آمدید!', 'success')
            return redirect(url_for('map_view'))
        else:
            flash('❌ نام کاربری یا رمز عبور اشتباه است', 'error')
            return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    flash('✅ با موفقیت خارج شدید', 'info')
    return redirect(url_for('login'))

@app.route('/map')
def map_view():
    if 'username' not in session:
        flash('⚠️ لطفاً ابتدا وارد شوید', 'warning')
        return redirect(url_for('login'))
    return render_template('map.html', username=session['username'])

@app.route('/api/geoserver-proxy')
def geoserver_proxy():
    """
    Proxy برای دور زدن CORS Policy
    دریافت URL کامل از پارامتر و فوروارد به GeoServer
    """
    target_url = request.args.get('url')
    
    if not target_url:
        return jsonify({'error': 'پارامتر URL الزامیه'}), 400
    
    try:
        # ارسال درخواست به GeoServer
        response = requests.get(target_url, timeout=10)
        
        # برگرداندن پاسخ به کلاینت
        return response.content, response.status_code, {
            'Content-Type': response.headers.get('Content-Type', 'application/json'),
            'Access-Control-Allow-Origin': '*'
        }
    except Exception as e:
        return jsonify({'error': f'خطا در ارتباط با GeoServer: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
