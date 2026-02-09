// ==================== مقداردهی اولیه ====================
let map, drawControl, drawnItems;
let searchMarker = null;
let measureControl = null;
let featuresData = [];
let featureIdCounter = 1;

// ==================== تابع اصلی ====================
function initMap() {
    // لایه‌های نقشه
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap',
        maxZoom: 17
    });

    // ایجاد نقشه
    map = L.map('map', {
        center: [32.4279, 53.6880],
        zoom: 6,
        layers: [osmLayer]
    });

    // کنترل لایه‌ها - پایین راست
    const baseMaps = {
        "🗺️ نقشه پایه": osmLayer,
        "🛰️ تصویر ماهواره‌ای": satelliteLayer,
        "🏔️ توپوگرافی": topoLayer
    };
    
    L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

    // لایه رسم
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // کنترل رسم
    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems,
            remove: true
        },
        draw: {
            polygon: true,
            polyline: true,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: false
        }
    });
    map.addControl(drawControl);

    // رویداد ایجاد عارضه
    map.on(L.Draw.Event.CREATED, function(e) {
        const layer = e.layer;
        const type = e.layerType;
        
        drawnItems.addLayer(layer);
        openAttributeDialog(layer, type);
    });

    // رویداد ویرایش
    map.on(L.Draw.Event.EDITED, function(e) {
        e.layers.eachLayer(function(layer) {
            updateGeometryAttributes(layer);
        });
    });

    // رویداد حذف
    map.on(L.Draw.Event.DELETED, function(e) {
        e.layers.eachLayer(function(layer) {
            removeFeatureData(layer);
        });
    });
}

// ==================== جستجو ====================
function searchLocation() {
    const query = document.getElementById('searchInput').value;
    if (!query) {
        alert('لطفاً آدرس یا مکان را وارد کنید');
        return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                
                if (searchMarker) map.removeLayer(searchMarker);
                
                searchMarker = L.marker([lat, lon]).addTo(map);
                searchMarker.bindPopup(`<b>${data[0].display_name}</b>`).openPopup();
                map.setView([lat, lon], 15);
            } else {
                alert('موقعیت مکانی یافت نشد');
            }
        })
        .catch(() => alert('خطا در جستجو'));
}

// ==================== اندازه‌گیری ====================
function toggleMeasure() {
    const btn = document.getElementById('measureBtn');
    if (measureControl) {
        map.removeControl(measureControl);
        measureControl = null;
        btn.classList.remove('active');
    } else {
        measureControl = L.control.measure({
            position: 'topleft',
            primaryLengthUnit: 'meters',
            secondaryLengthUnit: 'kilometers',
            primaryAreaUnit: 'sqmeters',
            secondaryAreaUnit: 'hectares'
        });
        measureControl.addTo(map);
        btn.classList.add('active');
    }
}

// ==================== مسیریابی ====================
let routingMode = false;
let routingPoints = [];
let routingMarkers = [];
let routeLine = null;

function startRouting() {
    const btn = document.getElementById('routingBtn');
    if (routingMode) {
        routingMode = false;
        routingPoints = [];
        routingMarkers.forEach(m => map.removeLayer(m));
        routingMarkers = [];
        if (routeLine) map.removeLayer(routeLine);
        routeLine = null;
        map.getContainer().style.cursor = '';
        btn.classList.remove('active');
    } else {
        routingMode = true;
        routingPoints = [];
        map.getContainer().style.cursor = 'crosshair';
        btn.classList.add('active');
        alert('روی نقشه کلیک کنید: اول مبدأ، بعد مقصد');
    }
}

map.on('click', function(e) {
    if (routingMode && routingPoints.length < 2) {
        routingPoints.push(e.latlng);
        
        const icon = routingPoints.length === 1 ? '🚀' : '🎯';
        const marker = L.marker(e.latlng, {
            icon: L.divIcon({
                html: icon,
                className: 'route-marker',
                iconSize: [30, 30]
            })
        }).addTo(map);
        routingMarkers.push(marker);
        
        if (routingPoints.length === 2) calculateRoute();
    }
});

function calculateRoute() {
    const start = routingPoints[0];
    const end = routingPoints[1];
    
    fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                
                if (routeLine) map.removeLayer(routeLine);
                
                routeLine = L.polyline(coords, {
                    color: '#0066ff',
                    weight: 6,
                    opacity: 0.8
                }).addTo(map);
                
                const distance = (data.routes[0].distance / 1000).toFixed(2);
                const duration = Math.round(data.routes[0].duration / 60);
                
                routeLine.bindPopup(`<b>مسافت:</b> ${distance} کیلومتر<br><b>زمان:</b> ${duration} دقیقه`).openPopup();
                map.fitBounds(routeLine.getBounds());
                
                routingMode = false;
                map.getContainer().style.cursor = '';
                document.getElementById('routingBtn').classList.remove('active');
            }
        })
        .catch(() => alert('خطا در محاسبه مسیر'));
}

// ==================== دیالوگ Attributes ====================
function openAttributeDialog(layer, type) {
    const dialog = document.getElementById('attributeDialog');
    const fields = document.getElementById('dynamicFields');
    
    fields.innerHTML = `
        <div class="form-group">
            <label>نام * (الزامی)</label>
            <input type="text" id="featureName" required placeholder="نام عارضه را وارد کنید">
        </div>
        <div class="form-group">
            <label>توضیحات (اختیاری)</label>
            <textarea id="featureDesc" rows="3" placeholder="توضیحات اضافی..."></textarea>
        </div>
    `;
    
    // فیلدهای هندسی
    fields.innerHTML += generateGeometryFields(layer, type);
    
    dialog.style.display = 'block';
    
    window.currentTempLayer = layer;
    window.currentTempType = type;
}

function generateGeometryFields(layer, type) {
    let fields = '';
    let geomData = {};
    
    if (type === 'marker') {
        const ll = layer.getLatLng();
        geomData.lat = ll.lat.toFixed(6);
        geomData.lng = ll.lng.toFixed(6);
        
        fields = `
            <div class="form-group">
                <label>عرض جغرافیایی (Latitude)</label>
                <input type="text" value="${geomData.lat}" readonly>
            </div>
            <div class="form-group">
                <label>طول جغرافیایی (Longitude)</label>
                <input type="text" value="${geomData.lng}" readonly>
            </div>
        `;
    } else if (type === 'polyline') {
        const length = calculateLength(layer);
        geomData.length = length;
        
        fields = `
            <div class="form-group">
                <label>طول خط (متر)</label>
                <input type="text" value="${length}" readonly>
            </div>
        `;
    } else if (type === 'polygon' || type === 'rectangle') {
        const area = calculateArea(layer);
        const perimeter = calculatePerimeter(layer);
        const centroid = layer.getBounds().getCenter();
        
        geomData.area = area;
        geomData.perimeter = perimeter;
        geomData.centroid = `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`;
        
        fields = `
            <div class="form-group">
                <label>مساحت (متر مربع)</label>
                <input type="text" value="${area}" readonly>
            </div>
            <div class="form-group">
                <label>محیط (متر)</label>
                <input type="text" value="${perimeter}" readonly>
            </div>
            <div class="form-group">
                <label>مختصات مرکز (سنتروئید)</label>
                <input type="text" value="${geomData.centroid}" readonly>
            </div>
        `;
    } else if (type === 'circle') {
        const radius = layer.getRadius();
        const area = (Math.PI * radius * radius).toFixed(2);
        const center = layer.getLatLng();
        
        geomData.radius = radius.toFixed(2);
        geomData.area = area;
        geomData.center = `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`;
        
        fields = `
            <div class="form-group">
                <label>شعاع (متر)</label>
                <input type="text" value="${geomData.radius}" readonly>
            </div>
            <div class="form-group">
                <label>مساحت (متر مربع)</label>
                <input type="text" value="${geomData.area}" readonly>
            </div>
            <div class="form-group">
                <label>مختصات مرکز</label>
                <input type="text" value="${geomData.center}" readonly>
            </div>
        `;
    }
    
    layer.geometryData = geomData;
    return fields;
}

function saveFeatureAttributes() {
    const name = document.getElementById('featureName').value.trim();
    const desc = document.getElementById('featureDesc').value.trim();
    
    if (!name) {
        alert('نام الزامی است! لطفاً نام عارضه را وارد کنید.');
        return;
    }
    
    const layer = window.currentTempLayer;
    const type = window.currentTempType;
    
    const featureData = {
        id: featureIdCounter,
        name: name,
        description: desc,
        type: type,
        geometry: layer.geometryData,
        layer: layer // ذخیره reference به layer برای export
    };
    
    layer.featureId = featureIdCounter;
    featureIdCounter++;
    
    featuresData.push(featureData);
    
    layer.bindPopup(`<b>${name}</b><br>${desc || ''}`);
    
    closeAttributeDialog();
    updateAttributeTable();
    
    // باز کردن خودکار جدول در اولین عارضه
    if (featuresData.length === 1) {
        document.getElementById('attributeTable').style.display = 'block';
    }
}

function closeAttributeDialog() {
    document.getElementById('attributeDialog').style.display = 'none';
    document.getElementById('attributeForm').reset();
}

function updateGeometryAttributes(layer) {
    const feature = featuresData.find(f => f.id === layer.featureId);
    if (!feature) return;
    
    if (layer instanceof L.Marker) {
        const ll = layer.getLatLng();
        layer.geometryData.lat = ll.lat.toFixed(6);
        layer.geometryData.lng = ll.lng.toFixed(6);
    } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        layer.geometryData.length = calculateLength(layer);
    } else if (layer instanceof L.Polygon) {
        layer.geometryData.area = calculateArea(layer);
        layer.geometryData.perimeter = calculatePerimeter(layer);
        const centroid = layer.getBounds().getCenter();
        layer.geometryData.centroid = `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`;
    }
    
    feature.geometry = layer.geometryData;
    updateAttributeTable();
}

function removeFeatureData(layer) {
    const index = featuresData.findIndex(f => f.id === layer.featureId);
    if (index > -1) {
        featuresData.splice(index, 1);
        updateAttributeTable();
    }
}

// ==================== جدول Attributes ====================
function toggleAttributeTable() {
    const table = document.getElementById('attributeTable');
    table.style.display = table.style.display === 'none' ? 'block' : 'none';
    if (table.style.display === 'block') updateAttributeTable();
}

function updateAttributeTable() {
    const tbody = document.getElementById('attributeTableBody');
    tbody.innerHTML = '';
    
    featuresData.forEach(feature => {
        const row = tbody.insertRow();
        
        let geomStr = '';
        const g = feature.geometry;
        if (g.lat && g.lng) {
            geomStr = `عرض: ${g.lat}°, طول: ${g.lng}°`;
        } else if (g.length) {
            geomStr = `طول: ${g.length} متر`;
        } else if (g.area && g.perimeter) {
            geomStr = `مساحت: ${g.area} م²، محیط: ${g.perimeter} م، مرکز: ${g.centroid}`;
        } else if (g.radius) {
            geomStr = `شعاع: ${g.radius} م، مساحت: ${g.area} م²`;
        }
        
        row.innerHTML = `
            <td style="width: 8%;">${feature.id}</td>
            <td style="width: 20%;">${feature.name}</td>
            <td style="width: 25%;">${feature.description || '-'}</td>
            <td style="width: 12%;">${feature.type}</td>
            <td style="width: 35%;">${geomStr}</td>
        `;
    });
}

function closeAttributeTable() {
    document.getElementById('attributeTable').style.display = 'none';
}

// ==================== محاسبات هندسی ====================
function calculateLength(layer) {
    let length = 0;
    const lls = layer.getLatLngs();
    for (let i = 0; i < lls.length - 1; i++) {
        length += lls[i].distanceTo(lls[i + 1]);
    }
    return length.toFixed(2);
}

function calculatePerimeter(layer) {
    let perimeter = 0;
    const lls = layer.getLatLngs()[0];
    for (let i = 0; i < lls.length; i++) {
        const next = (i + 1) % lls.length;
        perimeter += lls[i].distanceTo(lls[next]);
    }
    return perimeter.toFixed(2);
}

function calculateArea(layer) {
    const lls = layer.getLatLngs()[0];
    let area = 0;
    
    for (let i = 0; i < lls.length; i++) {
        const j = (i + 1) % lls.length;
        area += lls[i].lng * lls[j].lat;
        area -= lls[j].lng * lls[i].lat;
    }
    
    area = Math.abs(area / 2) * 111320 * 111320;
    return area.toFixed(2);
}

// ==================== جابجایی عارضه (Move) ====================
let moveMode = false;
let selectedLayer = null;

function toggleMoveMode() {
    const btn = document.getElementById('moveBtn');
    if (moveMode) {
        moveMode = false;
        selectedLayer = null;
        map.getContainer().style.cursor = '';
        btn.classList.remove('active');
    } else {
        moveMode = true;
        map.getContainer().style.cursor = 'move';
        btn.classList.add('active');
        alert('روی عارضه‌ای که می‌خواهید جابجا کنید کلیک کنید');
    }
}

drawnItems.on('click', function(e) {
    if (moveMode) {
        selectedLayer = e.layer;
        
        if (selectedLayer instanceof L.Marker || selectedLayer instanceof L.Circle) {
            selectedLayer.dragging.enable();
        } else if (selectedLayer instanceof L.Polyline || selectedLayer instanceof L.Polygon) {
            enablePolyDrag(selectedLayer);
        }
        
        alert('حالا می‌توانید عارضه را بکشید و جابجا کنید');
    }
});

function enablePolyDrag(layer) {
    let isDragging = false;
    let startLatLng;
    
    layer.on('mousedown', function(e) {
        if (!moveMode) return;
        isDragging = true;
        startLatLng = e.latlng;
        map.dragging.disable();
    });
    
    map.on('mousemove', function(e) {
        if (isDragging && selectedLayer === layer) {
            const deltaLat = e.latlng.lat - startLatLng.lat;
            const deltaLng = e.latlng.lng - startLatLng.lng;
            
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                const newLatLngs = layer.getLatLngs().map(ll => 
                    L.latLng(ll.lat + deltaLat, ll.lng + deltaLng)
                );
                layer.setLatLngs(newLatLngs);
            } else if (layer instanceof L.Polygon) {
                const newLatLngs = layer.getLatLngs()[0].map(ll => 
                    L.latLng(ll.lat + deltaLat, ll.lng + deltaLng)
                );
                layer.setLatLngs([newLatLngs]);
            }
            
            startLatLng = e.latlng;
        }
    });
    
    map.on('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            map.dragging.enable();
            updateGeometryAttributes(layer);
        }
    });
}

// ==================== اکسپورت نقشه ====================
function exportMap() {
    document.getElementById('exportDialog').style.display = 'block';
}

function closeExportDialog() {
    document.getElementById('exportDialog').style.display = 'none';
}

function performExport() {
    const format = document.getElementById('exportFormat').value;
    const extent = document.getElementById('exportExtent').value;
    
    // تنظیم محدوده
    if (extent === 'full' && featuresData.length > 0) {
        map.fitBounds(drawnItems.getBounds());
    }
    
    // مخفی کردن UI
    const sidebar = document.querySelector('.sidebar');
    const dialogs = document.querySelectorAll('.dialog');
    const table = document.getElementById('attributeTable');
    
    sidebar.style.display = 'none';
    dialogs.forEach(d => d.style.display = 'none');
    table.style.display = 'none';
    
    setTimeout(() => {
        html2canvas(document.getElementById('map'), {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            if (format === 'png' || format === 'jpg') {
                canvas.toBlob(blob => {
                    const link = document.createElement('a');
                    link.download = `map_export.${format}`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    restoreUI(sidebar);
                    closeExportDialog();
                }, format === 'jpg' ? 'image/jpeg' : 'image/png');
            } else if (format === 'pdf') {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('l', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save('map_export.pdf');
                restoreUI(sidebar);
                closeExportDialog();
            }
        });
    }, 500);
}

function restoreUI(sidebar) {
    sidebar.style.display = 'block';
}

// ==================== اکسپورت Shapefile ====================
function exportShapefile() {
    if (featuresData.length === 0) {
        alert('❌ هیچ عارضه‌ای برای اکسپورت وجود ندارد!');
        return;
    }

    // تبدیل داده‌ها به فرمت GeoJSON
    const geojson = {
        type: "FeatureCollection",
        features: featuresData.map(feature => {
            let geometry;
            const layer = feature.layer;

            if (feature.type === 'marker') {
                const ll = layer.getLatLng();
                geometry = {
                    type: "Point",
                    coordinates: [ll.lng, ll.lat]
                };
            } else if (feature.type === 'polyline') {
                const coords = layer.getLatLngs().map(ll => [ll.lng, ll.lat]);
                geometry = {
                    type: "LineString",
                    coordinates: coords
                };
            } else if (feature.type === 'polygon' || feature.type === 'rectangle') {
                const coords = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
                coords.push(coords[0]); // بستن پلیگون
                geometry = {
                    type: "Polygon",
                    coordinates: [coords]
                };
            } else if (feature.type === 'circle') {
                // برای دایره، یک پلیگون تقریبی می‌سازیم
                const center = layer.getLatLng();
                const radius = layer.getRadius();
                const points = 32; // تعداد نقاط برای تقریب دایره
                const coords = [];
                
                for (let i = 0; i <= points; i++) {
                    const angle = (i / points) * 2 * Math.PI;
                    const dx = radius * Math.cos(angle);
                    const dy = radius * Math.sin(angle);
                    
                    // تبدیل متر به درجه (تقریبی)
                    const lat = center.lat + (dy / 111320);
                    const lng = center.lng + (dx / (111320 * Math.cos(center.lat * Math.PI / 180)));
                    coords.push([lng, lat]);
                }
                
                geometry = {
                    type: "Polygon",
                    coordinates: [coords]
                };
            }

            return {
                type: "Feature",
                properties: {
                    id: feature.id,
                    name: feature.name,
                    description: feature.description || '',
                    type: feature.type,
                    ...feature.geometry
                },
                geometry: geometry
            };
        })
    };

    // دانلود فایل GeoJSON
    const dataStr = JSON.stringify(geojson, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'map_features.geojson';
    link.click();
    URL.revokeObjectURL(url);

    alert('✅ فایل GeoJSON با موفقیت دانلود شد!\n\nتوجه: فایل GeoJSON را می‌توانید در نرم‌افزارهایی مانند QGIS, ArcGIS و یا ابزارهای آنلاین به Shapefile تبدیل کنید.');
}

// ==================== بارگذاری ====================
window.onload = initMap;
