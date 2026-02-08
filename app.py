"""
WebGIS Final Project - Flask Application
Main application file with routing and authentication
"""

from flask import Flask, render_template, request, redirect, url_for, make_response, session
import hashlib
import secrets

app = Flask(__name__)

# Generate a secure secret key for session management
# In production, use environment variable: os.environ.get('SECRET_KEY')
app.secret_key = secrets.token_hex(32)

# In-memory user storage (for demonstration - use database in production)
users_db = {}


def hash_password(password):
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def check_authentication():
    """Check if user is authenticated via session/cookie"""
    return session.get('logged_in', False) and session.get('username')


@app.route('/')
def index():
    """Homepage - redirect to map if logged in, else to login"""
    if check_authentication():
        return redirect(url_for('map_page'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication handler"""
    # If already logged in, redirect to map
    if check_authentication():
        return redirect(url_for('map_page'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        # Validation
        if not username or not password:
            return render_template('login.html', 
                                 error='لطفاً نام کاربری و رمز عبور را وارد کنید')
        
        # Check credentials
        if username in users_db:
            hashed_password = hash_password(password)
            if users_db[username]['password'] == hashed_password:
                # Set session
                session['logged_in'] = True
                session['username'] = username
                session['email'] = users_db[username].get('email', '')
                
                return redirect(url_for('map_page'))
            else:
                return render_template('login.html', 
                                     error='رمز عبور اشتباه است')
        else:
            return render_template('login.html', 
                                 error='کاربری با این نام کاربری وجود ندارد')
    
    # GET request
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """Registration page and user creation handler"""
    # If already logged in, redirect to map
    if check_authentication():
        return redirect(url_for('map_page'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not all([username, email, password, confirm_password]):
            return render_template('register.html', 
                                 error='لطفاً تمام فیلدها را پر کنید')
        
        if len(username) < 3:
            return render_template('register.html', 
                                 error='نام کاربری باید حداقل 3 کاراکتر باشد')
        
        if len(password) < 6:
            return render_template('register.html', 
                                 error='رمز عبور باید حداقل 6 کاراکتر باشد')
        
        if password != confirm_password:
            return render_template('register.html', 
                                 error='رمز عبور و تکرار آن یکسان نیست')
        
        if '@' not in email or '.' not in email:
            return render_template('register.html', 
                                 error='لطفاً یک ایمیل معتبر وارد کنید')
        
        # Check if username already exists
        if username in users_db:
            return render_template('register.html', 
                                 error='این نام کاربری قبلاً ثبت شده است')
        
        # Register new user
        hashed_password = hash_password(password)
        users_db[username] = {
            'password': hashed_password,
            'email': email
        }
        
        return render_template('register.html', 
                             success=f'ثبت‌نام با موفقیت انجام شد! اکنون می‌توانید وارد شوید')
    
    # GET request
    return render_template('register.html')


@app.route('/map')
def map_page():
    """Protected map page - requires authentication"""
    if not check_authentication():
        return redirect(url_for('login'))
    
    username = session.get('username', 'کاربر')
    email = session.get('email', '')
    
    return render_template('map.html', username=username, email=email)


@app.route('/logout')
def logout():
    """Logout user and clear session"""
    session.clear()
    return redirect(url_for('login'))


@app.errorhandler(404)
def page_not_found(e):
    """404 error handler"""
    return render_template('login.html', error='صفحه مورد نظر یافت نشد'), 404


@app.errorhandler(500)
def internal_error(e):
    """500 error handler"""
    return render_template('login.html', error='خطای سرور رخ داد'), 500


if __name__ == '__main__':
    # Run Flask development server
    # In production, use a proper WSGI server like Gunicorn
    app.run(debug=True, host='127.0.0.1', port=5000)
