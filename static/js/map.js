// ==================== متغیرهای سراسری ====================
let map;
let drawControl;
let drawnItems = new L.FeatureGroup();
let currentBasemap = 'osm';
let measureControl;
let routingControl = null;
let heatmapLayer = null;
let geoserverLayer = null;
let sidebarVisible = true;
let routingMode = false;
let routingPoints = [];
let routingMarkers = [];

// ==================== مقداردهی اولیه نقشه ====================
function initMap() {
    // ایجاد نقشه با مرکز تهران
    map = L.map('map').setView([35.6892, 51.3890], 11);

    // لایه‌های پایه
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
        maxZoom: 17
    });

    // افزودن لایه پیش‌فرض
    osmLayer.addTo(map);

    // کنترل لایه‌ها
    const baseMaps = {
        "🗺️ نقشه استاندارد": osmLayer,
        "🛰️ تصویر ماهواره‌ای": satelliteLayer,
        "⛰️ توپوگرافی": topoLayer
    };

    L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

    // افزودن drawnItems به نقشه
    map.addLayer(drawnItems);

    // افزودن کنترل رسم
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

    // رویداد رسم شکل جدید
    map.on(L.Draw.Event.CREATED, function (event) {
        const layer = event.layer;
        drawnItems.addLayer(layer);
        
        // محاسبه مساحت برای polygon و rectangle
        if (event.layerType === 'polygon' || event.layerType === 'rectangle') {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            const areaInHectares = (area / 10000).toFixed(2);
            layer.bindPopup(`مساحت: ${areaInHectares} هکتار`).openPopup();
        }
        
        // محاسبه طول برای polyline
        if (event.layerType === 'polyline') {
            const length = getPolylineLength(layer);
            layer.bindPopup(`طول: ${length.toFixed(2)} کیلومتر`).openPopup();
        }
    });

    // اضافه کردن کنترل مختصات
    L.control.coordinates({
        position: "bottomleft",
        decimals: 6,
        decimalSeperator: ".",
        labelTemplateLat: "عرض: {y}",
        labelTemplateLng: "طول: {x}",
        useLatLngOrder: true
    }).addTo(map);

    // نمایش مختصات با کلیک
    map.on('click', function(e) {
        // اگر در حالت مسیریابی باشیم
        if (routingMode) {
            handleRoutingClick(e);
            return;
        }
        
        // نمایش عادی مختصات
        const coords = `عرض: ${e.latlng.lat.toFixed(6)}, طول: ${e.latlng.lng.toFixed(6)}`;
        L.popup()
            .setLatLng(e.latlng)
            .setContent(coords)
            .openOn(map);
    });
}

// ==================== توابع کمکی ====================
function getPolylineLength(layer) {
    const latlngs = layer.getLatLngs();
    let length = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        length += latlngs[i].distanceTo(latlngs[i + 1]);
    }
    return length / 1000; // تبدیل به کیلومتر
}

// ==================== 1. تعویض نقشه پایه ====================
function changeBasemap(type) {
    alert('از منوی لایه‌ها در گوشه راست پائین استفاده کنید');
}

// ==================== 2. اندازه‌گیری مسافت ====================
function toggleMeasure() {
    if (measureControl) {
        map.removeControl(measureControl);
        measureControl = null;
    } else {
        measureControl = L.control.measure({
            position: 'topleft',
            primaryLengthUnit: 'kilometers',
            secondaryLengthUnit: 'meters',
            primaryAreaUnit: 'hectares',
            secondaryAreaUnit: 'sqmeters',
            activeColor: '#ff0000',
            completedColor: '#0066ff'
        });
        measureControl.addTo(map);
    }
}

// ==================== 3. Buffer (حریم) ====================
function createBuffer() {
    if (drawnItems.getLayers().length === 0) {
        alert('ابتدا یک شکل روی نقشه رسم کنید');
        return;
    }

    const distance = prompt('فاصله buffer را به متر وارد کنید:', '1000');
    if (!distance) return;

    const lastLayer = drawnItems.getLayers()[drawnItems.getLayers().length - 1];
    
    try {
        let buffered;
        if (lastLayer instanceof L.Marker) {
            const latlng = lastLayer.getLatLng();
            buffered = L.circle(latlng, {
                radius: parseFloat(distance),
                color: 'blue',
                fillColor: '#30f',
                fillOpacity: 0.3
            });
        } else {
            const turfPoly = turf.polygon([lastLayer.getLatLngs()[0].map(ll => [ll.lng, ll.lat])]);
            const bufferedPoly = turf.buffer(turfPoly, parseFloat(distance) / 1000, { units: 'kilometers' });
            buffered = L.geoJSON(bufferedPoly, {
                style: { color: 'blue', fillColor: '#30f', fillOpacity: 0.3 }
            });
        }
        
        buffered.addTo(map);
        drawnItems.addLayer(buffered);
        alert(`Buffer ${distance} متری ایجاد شد`);
    } catch (error) {
        alert('خطا در ایجاد buffer: ' + error.message);
    }
}

// ==================== 4. تقاطع (Intersection) ====================
function calculateIntersection() {
    const layers = drawnItems.getLayers();
    if (layers.length < 2) {
        alert('برای محاسبه تقاطع حداقل 2 شکل نیاز است');
        return;
    }

    try {
        const poly1 = turf.polygon([layers[layers.length - 1].getLatLngs()[0].map(ll => [ll.lng, ll.lat])]);
        const poly2 = turf.polygon([layers[layers.length - 2].getLatLngs()[0].map(ll => [ll.lng, ll.lat])]);
        
        const intersection = turf.intersect(poly1, poly2);
        
        if (intersection) {
            const intersectLayer = L.geoJSON(intersection, {
                style: { color: 'red', fillColor: '#f03', fillOpacity: 0.5 }
            });
            intersectLayer.addTo(map);
            drawnItems.addLayer(intersectLayer);
            alert('تقاطع محاسبه شد');
        } else {
            alert('این دو شکل تقاطعی ندارند');
        }
    } catch (error) {
        alert('خطا در محاسبه تقاطع: ' + error.message);
    }
}

// ==================== 5. مسیریابی (Routing) - نسخه بهبود یافته ====================
function startRouting() {
    if (routingMode) {
        // اگر در حالت مسیریابی باشیم، آن را لغو کن
        cancelRouting();
        alert('حالت مسیریابی لغو شد');
        return;
    }
    
    // فعال کردن حالت مسیریابی
    routingMode = true;
    routingPoints = [];
    routingMarkers = [];
    
    // تغییر استایل ماوس
    document.getElementById('map').style.cursor = 'crosshair';
    
    alert('✅ حالت مسیریابی فعال شد!\n\n1️⃣ مبدأ را روی نقشه کلیک کنید\n2️⃣ سپس مقصد را کلیک کنید\n\n❌ برای لغو، دوباره روی دکمه کلیک کنید');
}

function handleRoutingClick(e) {
    const latlng = e.latlng;
    
    // اضافه کردن marker آبی
    const marker = L.marker(latlng, {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map);
    
    const popupText = routingPoints.length === 0 ? '🚀 مبدأ' : '🎯 مقصد';
    marker.bindPopup(popupText).openPopup();
    
    routingPoints.push(latlng);
    routingMarkers.push(marker);
    
    // اگر دو نقطه انتخاب شد، مسیریابی را انجام بده
    if (routingPoints.length === 2) {
        calculateRouteFromPoints();
    } else {
        alert('✅ مبدأ انتخاب شد!\n\n🎯 حالا مقصد را روی نقشه کلیک کنید');
    }
}

function calculateRouteFromPoints() {
    if (routingPoints.length < 2) {
        alert('لطفاً ابتدا مبدأ و مقصد را مشخص کنید');
        return;
    }

    // حذف routing قبلی در صورت وجود
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // ایجاد مسیریابی جدید
    routingControl = L.Routing.control({
        waypoints: [
            routingPoints[0],
            routingPoints[1]
        ],
        routeWhileDragging: true,
        language: 'fa',
        lineOptions: {
            styles: [{ color: '#0066ff', weight: 6, opacity: 0.8 }]
        },
        createMarker: function() { return null; }, // استفاده از markerهای خودمون
        show: true,
        collapsible: true
    }).addTo(map);

    // بستن حالت مسیریابی
    routingMode = false;
    document.getElementById('map').style.cursor = '';
    
    alert('✅ مسیر با موفقیت محاسبه شد!\n\n🔄 برای مسیریابی جدید، دوباره روی دکمه کلیک کنید');
}

function cancelRouting() {
    routingMode = false;
    document.getElementById('map').style.cursor = '';
    
    // حذف markerها
    routingMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    
    routingPoints = [];
    routingMarkers = [];
}

// ==================== 6. نقشه حرارتی (Heatmap) ====================
function toggleHeatmap() {
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
        return;
    }

    // نقاط تصادفی برای نمایش
    const points = [];
    for (let i = 0; i < 100; i++) {
        points.push([
            35.6892 + (Math.random() - 0.5) * 0.1,
            51.3890 + (Math.random() - 0.5) * 0.1,
            Math.random()
        ]);
    }

    heatmapLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17
    }).addTo(map);
}

// ==================== 7. چاپ نقشه ====================
function printMap() {
    window.print();
}

// ==================== 8. Export GeoJSON ====================
function exportGeoJSON() {
    if (drawnItems.getLayers().length === 0) {
        alert('هیچ شکلی برای export وجود ندارد');
        return;
    }

    const data = drawnItems.toGeoJSON();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'map_data.geojson';
    link.click();
}

// ==================== 9. Import GeoJSON ====================
function importGeoJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.geojson,.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                const geojson = JSON.parse(event.target.result);
                const layer = L.geoJSON(geojson);
                layer.eachLayer(function(l) {
                    drawnItems.addLayer(l);
                });
                map.fitBounds(layer.getBounds());
                alert('فایل با موفقیت بارگذاری شد');
            } catch (error) {
                alert('خطا در خواندن فایل: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// ==================== 10. بارگذاری لایه از GeoServer ====================
function loadGeoServerLayer() {
    const layerName = prompt('نام لایه در GeoServer:', 'topp:states');
    if (!layerName) return;

    if (geoserverLayer) {
        map.removeLayer(geoserverLayer);
    }

    geoserverLayer = L.tileLayer.wms('/geoserver/wms', {
        layers: layerName,
        format: 'image/png',
        transparent: true,
        attribution: 'GeoServer'
    }).addTo(map);
    
    alert(`لایه ${layerName} بارگذاری شد`);
}

// ==================== پاک کردن تمام رسم‌ها ====================
function clearDrawings() {
    if (confirm('آیا مطمئن هستید که می‌خواهید تمام رسم‌ها پاک شوند؟')) {
        drawnItems.clearLayers();
        
        // حذف routing
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }
        
        // حذف markerهای مسیریابی
        routingMarkers.forEach(marker => {
            map.removeLayer(marker);
        });
        routingMarkers = [];
        routingPoints = [];
        routingMode = false;
        document.getElementById('map').style.cursor = '';
    }
}

// ==================== کنترل Sidebar ====================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleBtn');
    
    if (sidebarVisible) {
        sidebar.style.right = '-320px';
        toggleBtn.innerHTML = '☰ ابزارها';
        toggleBtn.style.right = '10px';
    } else {
        sidebar.style.right = '0';
        toggleBtn.innerHTML = '✖ بستن';
        toggleBtn.style.right = '330px';
    }
    sidebarVisible = !sidebarVisible;
}

// ==================== شروع برنامه ====================
document.addEventListener('DOMContentLoaded', function() {
    initMap();
});
