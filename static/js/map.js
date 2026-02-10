// ========================================
// 🗺️ راه‌اندازی نقشه
// ========================================
var map = L.map('map').setView([35.6892, 51.3890], 11);

// لایه پایه OSM
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// لایه تصویر ماهواره‌ای (Esri)
var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
});

// لایه توپوگرافی
var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenTopoMap contributors'
});

// ========================================
// 🌐 لایه‌های WMS از GeoServer
// ========================================
var wmsLayers = {};

// ۱. لایه پلی‌گونی عراق (مرزها)
var iraqPoly = L.tileLayer.wms('https://ahocevar.com/geoserver/wms', {
    layers: 'ne:ne_10m_admin_0_countries',
    format: 'image/png',
    transparent: true,
    cql_filter: "name='Iraq'",
    attribution: 'Natural Earth'
});



wmsLayers['مرزهای عراق (پلی‌گون)'] = iraqPoly;


// ========================================
// 🎛️ Layer Control
// ========================================
var baseLayers = {
    "OpenStreetMap": osmLayer,
    "Satellite": satelliteLayer,      
    "Topography": topoLayer   
};

var overlayLayers = {
    "مرزهای عراق (پلی‌گون)": iraqPoly
   
};

var layerControl = L.control.layers(baseLayers, overlayLayers, {
    position: 'bottomright',
    collapsed: false
}).addTo(map);

// ========================================
// ✏️ ابزارهای رسم (Draw Control)
// ========================================
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
        polygon: {
            allowIntersection: false,
            showArea: true
        },
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: {
            radius: 4  
        }
    },
    edit: {
        featureGroup: drawnItems,
        remove: true
    }
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer);
});

// ========================================
// 🗑️ پاک کردن رسم‌ها
// ========================================
function clearDrawnItems() {
    drawnItems.clearLayers();
}

// ========================================
// 📋 منوی کشویی (Toolbar)
// ========================================
function toggleMenu() {
    var menu = document.getElementById('dropdown-menu');
    menu.classList.toggle('show');
}

// بستن منو با کلیک بیرون
window.onclick = function(event) {
    if (!event.target.matches('.menu-btn')) {
        var menu = document.getElementById('dropdown-menu');
        if (menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
}

// ========================================
// ➕ افزودن لایه WMS از GeoServer
// ========================================
function showAddLayerDialog() {
    document.getElementById('add-layer-dialog').style.display = 'flex';
}

function closeAddLayerDialog() {
    document.getElementById('add-layer-dialog').style.display = 'none';
}

function addCustomWMSLayer() {
    var wmsUrl = document.getElementById('wms-url').value.trim();
    var layerName = document.getElementById('layer-name').value.trim();
    var displayName = document.getElementById('layer-display-name').value.trim() || layerName;
    
    if (!wmsUrl || !layerName) {
        alert('لطفاً آدرس WMS و نام لایه را وارد کنید');
        return;
    }
    
    // ساخت لایه WMS جدید
    var newWMSLayer = L.tileLayer.wms(wmsUrl, {
        layers: layerName,
        format: 'image/png',
        transparent: true,
        attribution: 'GeoServer'
    });
    
    // افزودن به نقشه
    newWMSLayer.addTo(map);
    
    // افزودن به Layer Control
    layerControl.addOverlay(newWMSLayer, displayName);
    
    // ذخیره در لیست
    wmsLayers[displayName] = newWMSLayer;
    
    // بستن دیالوگ و پاک کردن فرم
    closeAddLayerDialog();
    document.getElementById('layer-name').value = '';
    document.getElementById('layer-display-name').value = '';
    
    alert('✅ لایه "' + displayName + '" با موفقیت اضافه شد');
}

// ========================================
// 🔍 حالت Identify (GetFeatureInfo)
// ========================================
var identifyMode = false; // آیا ابزار Identify فعال است؟

// تابع فعال/غیرفعال کردن Identify
function toggleIdentify() {
    identifyMode = !identifyMode;
    
    var btn = document.getElementById('identify-btn');
    
    if (identifyMode) {
        btn.classList.add('active');
        map.getContainer().style.cursor = 'help'; // تغییر نشانگر موس
        document.getElementById('feature-info-content').innerHTML = 
            '<p class="hint">🔍 روی یک لایه وکتوری کلیک کنید</p>';
        document.getElementById('feature-info-panel').classList.add('show');
    } else {
        btn.classList.remove('active');
        map.getContainer().style.cursor = ''; // برگشت به حالت عادی
        closeFeatureInfo();
    }
}

// ========================================
// 🖱️ رویداد کلیک روی نقشه (فقط در حالت Identify)
// ========================================
map.on('click', function(e) {
    // اگر Identify فعال نیست، هیچ کاری نکن
    if (!identifyMode) {
        return;
    }
    
    var activeWMSLayers = [];
    
    // پیدا کردن لایه‌های WMS فعال
    map.eachLayer(function(layer) {
        if (layer.wmsParams) {
            activeWMSLayers.push(layer);
        }
    });
    
    // اگر هیچ لایه WMS فعال نیست
    if (activeWMSLayers.length === 0) {
        document.getElementById('feature-info-content').innerHTML = 
            '<p class="error">⚠️ لطفاً ابتدا یک لایه وکتوری را فعال کنید</p>';
        document.getElementById('feature-info-panel').classList.add('show');
        return;
    }
    
    // برای اولین لایه WMS فعال درخواست بفرست
    var wmsLayer = activeWMSLayers[0];
    var latlng = e.latlng;
    
    // ساخت URL برای GetFeatureInfo
    var point = map.latLngToContainerPoint(latlng);
    var size = map.getSize();
    var bounds = map.getBounds();
    var sw = bounds.getSouthWest();
    var ne = bounds.getNorthEast();
    
    var params = {
        request: 'GetFeatureInfo',
        service: 'WMS',
        version: '1.1.1',
        layers: wmsLayer.wmsParams.layers,
        query_layers: wmsLayer.wmsParams.layers,
        styles: '',
        bbox: sw.lng + ',' + sw.lat + ',' + ne.lng + ',' + ne.lat,
        height: size.y,
        width: size.x,
        srs: 'EPSG:4326',
        format: 'image/png',
        info_format: 'application/json',
        x: Math.floor(point.x),
        y: Math.floor(point.y)
    };
    
    var url = wmsLayer._url + L.Util.getParamString(params, wmsLayer._url);
    
    // نمایش لودینگ
    document.getElementById('feature-info-content').innerHTML = 
        '<p class="hint">⏳ در حال دریافت اطلاعات...</p>';
    document.getElementById('feature-info-panel').classList.add('show');
    
    // استفاده از Proxy برای دور زدن CORS
    var proxyUrl = '/api/geoserver-proxy?url=' + encodeURIComponent(url);
    
    fetch(proxyUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('خطا در ارتباط با Proxy');
            }
            return response.json();
        })
        .then(data => {
            console.log('پاسخ GetFeatureInfo:', data);
            displayFeatureInfo(data);
        })
        .catch(error => {
            console.error('خطا در Proxy:', error);
            document.getElementById('feature-info-content').innerHTML = 
                '<p class="error">⚠️ خطا در دریافت اطلاعات از سرور<br>' +
                'لطفاً مطمئن شوید GeoServer روشن است و لایه مورد نظر در دسترس است.</p>';
        });
});

// ========================================
// 📊 نمایش اطلاعات عارضه در Panel
// ========================================
function displayFeatureInfo(data) {
    var panel = document.getElementById('feature-info-panel');
    var content = document.getElementById('feature-info-content');
    
    console.log('داده دریافت شده:', data);
    
    // بررسی ساختار داده
    if (!data || (!data.features && !data.properties)) {
        content.innerHTML = '<p class="hint">⚠️ هیچ عارضه‌ای در این نقطه یافت نشد.<br>لطفاً روی یک لایه وکتوری کلیک کنید.</p>';
        panel.classList.add('show');
        return;
    }
    
    var properties = null;
    
    // شناسایی نوع پاسخ
    if (data.features && data.features.length > 0) {
        // فرمت GeoJSON استاندارد
        properties = data.features[0].properties;
    } else if (data.properties) {
        // فرمت مستقیم properties
        properties = data.properties;
    }
    
    if (!properties || Object.keys(properties).length === 0) {
        content.innerHTML = '<p class="hint">⚠️ هیچ اطلاعاتی برای این عارضه یافت نشد.</p>';
        panel.classList.add('show');
        return;
    }
    
    var html = '<table class="feature-table">';
    html += '<thead><tr><th>ویژگی</th><th>مقدار</th></tr></thead>';
    html += '<tbody>';
    
    for (var key in properties) {
        if (properties.hasOwnProperty(key)) {
            var value = properties[key];
            
            // تبدیل مقادیر null/undefined به خط تیره
            if (value === null || value === undefined || value === '') {
                value = '-';
            }
            
            html += '<tr>';
            html += '<td><strong>' + key + '</strong></td>';
            html += '<td>' + value + '</td>';
            html += '</tr>';
        }
    }
    
    html += '</tbody></table>';
    
    content.innerHTML = html;
    panel.classList.add('show');
}

// ========================================
// ❌ بستن Feature Info Panel
// ========================================
function closeFeatureInfo() {
    document.getElementById('feature-info-panel').classList.remove('show');
}
