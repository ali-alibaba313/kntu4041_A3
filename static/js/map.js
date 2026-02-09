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
        "نقشه استاندارد": osmLayer,
        "تصویر ماهواره‌ای": satelliteLayer,
        "توپوگرافی": topoLayer
    };

    L.control.layers(baseMaps).addTo(map);

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
    // این تابع با control.layers جایگزین شده
    alert('از منوی لایه‌ها در گوشه راست بالا استفاده کنید');
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

// ==================== 5. مسیریابی (Routing) ====================
function calculateRoute() {
    const start = prompt('مختصات مبدأ (lat,lng):', '35.6892,51.3890');
    const end = prompt('مختصات مقصد (lat,lng):', '35.7219,51.4114');
    
    if (!start || !end) return;

    const [startLat, startLng] = start.split(',').map(Number);
    const [endLat, endLng] = end.split(',').map(Number);

    if (routingControl) {
        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(endLat, endLng)
        ],
        routeWhileDragging: true,
        language: 'fa',
        lineOptions: {
            styles: [{ color: 'blue', weight: 6 }]
        }
    }).addTo(map);
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
