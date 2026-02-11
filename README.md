# 🗺️ WebGIS System with Flask

A web-based Geographic Information System (WebGIS) developed using Flask, Leaflet, and GeoServer.

---

## 📋 Table of Contents

- About the Project  
- Features  
- Prerequisites  
- Installation and Setup  
- Project Structure  
- Usage Guide  
- GeoServer Information  
- Security  
- Technologies Used  
- Screenshots  
- Demo Video  

---

## About the Project

This project is a complete WebGIS system that provides the following capabilities:

- Secure user authentication using bcrypt  
- Visualization of WMS layers from GeoServer  
- Feature information querying (GetFeatureInfo)  
- Drawing tools on the map  
- Adding custom WMS layers  

This project was developed for the Advanced Geographic Information Systems course.

---

## Features

### Authentication
- User registration with input validation  
- Secure login using bcrypt password hashing  
- Session management  
- Protected routes with login required  

### Map
- Base map layers (OSM, Satellite, Topographic)  
- Display of WMS layers from GeoServer  
- Feature information retrieval on map click  
- Identify tool for querying features  
- Drawing tools  
- Adding custom WMS layers  

### User Interface
- Clean and responsive design  
- Custom error pages (404, 500)  

### Security
- Password hashing with bcrypt  
- Input validation  
- CSRF protection  
- Proxy endpoint for bypassing CORS limitations  

---

## Prerequisites

Before installation, ensure the following are installed:

- Python 3.8 or higher  
- pip  
- Git  
- A modern web browser (Chrome, Firefox, Edge)  

---
Screenshots
## Screenshots

login page:
![Login Page](https://github.com/ali-alibaba313/kntu4041_A3/blob/main/screenshots/login.jpg?raw=true)

registeration page :
![Register Page](https://github.com/ali-alibaba313/kntu4041_A3/blob/main/screenshots/register.jpg?raw=true)

map page: 
![Map Page](https://github.com/ali-alibaba313/kntu4041_A3/blob/main/screenshots/map.jpg?raw=true)

feature Info:
![Feature Info](https://github.com/ali-alibaba313/kntu4041_A3/blob/main/screenshots/feature-info.jpg?raw=true)


Demo: 
https://drive.google.com/file/d/1QRev0Uz13_w4gdnsx2lhM8WCeEgQW9xY/view

If the video link does not open correctly, the video is included in the project repository.

Click the file and select View Raw to download it.
## Installation and Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/ali-alibaba313/kntu4041_A3.git
cd kntu4041_A3
Step 2: Create a Virtual Environment
Windows

bash
python -m venv venv
venv\Scripts\activate
Linux / macOS

bash
python3 -m venv venv
source venv/bin/activate
Step 3: Install Dependencies
bash
pip install -r requirements.txt
Step 4: Run the Application
bash
python app.py
Step 5: Open in Browser
The application will be available at:

http://localhost:5000

or

http://127.0.0.1:5000

Project Structure
text
kntu4041_A3/
│
├── app.py
├── requirements.txt
├── users.json
├── .gitignore
├── README.md
│
├── templates/
│   ├── login.html
│   ├── register.html
│   ├── map.html
│   ├── 404.html
│   └── 500.html
│
└── static/
├── css/
│   └── style.css
└── js/
└── map.js
Usage Guide
1. Registration
Open http://localhost:5000
Click on the Register link
Enter a valid username and a strong password
Password requirements:

Minimum 8 characters
At least one uppercase letter
At least one lowercase letter
At least one number
At least one special character
2. Login
Open http://localhost:5000/login
Enter your username and password
You will be redirected to the map page
3. Working with the Map
Base Layer Switching

Use the layer control (top-right corner) to switch between OSM, Satellite, and Topographic layers.

Feature Information Query

Click the Identify tool
Click on the map
Feature information will be displayed in the side panel
Adding a WMS Layer

Select Add WMS Layer from the tools menu
Enter the WMS service URL
Enter the layer name
Click Add
Drawing Tools

Use the drawing controls to draw geometries on the map.

GeoServer Information
WMS Service Used
GeoServer Demo Server

https://ahocevar.com/geoserver/wms

Layers in Use
Layer	Technical Name	Description
Iraq Borders	ne:ne_10m_admin_0_boundary_lines_land	Country boundaries
Iraq Cities	ne:ne_10m_populated_places	Major cities
Iraq Roads	ne:ne_10m_roads	Road network
Sample GetFeatureInfo Request
text
https://ahocevar.com/geoserver/wms?
SERVICE=WMS&
VERSION=1.1.1&
REQUEST=GetFeatureInfo&
LAYERS=ne:ne_10m_admin_0_boundary_lines_land&
QUERY_LAYERS=ne:ne_10m_admin_0_boundary_lines_land&
INFO_FORMAT=application/json&
FEATURE_COUNT=10&
X=50&
Y=50&
SRS=EPSG:4326&
WIDTH=101&
HEIGHT=101&
BBOX=43.0,29.0,49.0,38.0
Security
Passwords are hashed using bcrypt
User inputs are validated
Protected routes require authentication
GeoServer requests are proxied to avoid CORS issues
Important:

Before deploying to production, update the Flask secret key in app.py.

Technologies Used
Backend
Flask 3.1.0
bcrypt 4.2.1
requests 2.32.3
Frontend
Leaflet 1.9.4
Leaflet.draw 1.0.4
HTML5 / CSS3
JavaScript
GeoServer
GeoServer Demo Server
OGC WMS 1.1.1



Acknowledgment
Special thanks to Dr. Nazari for guidance and support.