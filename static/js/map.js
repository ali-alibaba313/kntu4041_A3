// ==========================================
// OpenLayers Map with 10 GIS Features
// ==========================================

let map;
let measureLayer, drawLayer;
let measureTooltip, measureTooltipElement;
let draw, snap;
let currentTool = null;

// Base Layers
const osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM(),
    title: 'OpenStreetMap'
});

const satelliteLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'ESRI'
    }),
    title: 'Satellite',
    visible: false
});

const darkLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attributions: 'CartoDB'
    }),
    title: 'Dark Mode',
    visible: false
});

const terrainLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
        url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
        attributions: 'Stamen'
    }),
    title: 'Terrain',
    visible: false
});

// Vector layers for drawing and measurement
measureLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.2)' }),
        stroke: new ol.style.Stroke({ color: '#ff0000', width: 3 }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: '#ff0000' })
        })
    })
});

drawLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
    style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(0, 123, 255, 0.2)' }),
        stroke: new ol.style.Stroke({ color: '#007bff', width: 2 }),
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({ color: '#007bff' })
        })
    })
});

// Initialize Map
map = new ol.Map({
    target: 'map',
    layers: [osmLayer, satelliteLayer, darkLayer, terrainLayer, measureLayer, drawLayer],
    view: new ol.View({
        center: ol.proj.fromLonLat([51.4, 35.7]), // Tehran
        zoom: 6
    })
});

// ==========================================
// Tool 1: Layer Switcher
// ==========================================
function switchBaseLayer(layerName) {
    const layers = [osmLayer, satelliteLayer, darkLayer, terrainLayer];
    layers.forEach(layer => {
        layer.setVisible(layer.get('title') === layerName);
    });
}

// ==========================================
// Tool 2: Measure Distance
// ==========================================
function measureDistance() {
    clearTools();
    currentTool = 'distance';
    
    draw = new ol.interaction.Draw({
        source: measureLayer.getSource(),
        type: 'LineString',
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#ff0000', width: 3 })
        })
    });
    
    draw.on('drawend', function(evt) {
        const geom = evt.feature.getGeometry();
        const length = ol.sphere.getLength(geom);
        alert(`فاصله: ${(length / 1000).toFixed(2)} کیلومتر`);
    });
    
    map.addInteraction(draw);
    snap = new ol.interaction.Snap({ source: measureLayer.getSource() });
    map.addInteraction(snap);
}

// ==========================================
// Tool 3: Measure Area
// ==========================================
function measureArea() {
    clearTools();
    currentTool = 'area';
    
    draw = new ol.interaction.Draw({
        source: measureLayer.getSource(),
        type: 'Polygon',
        style: new ol.style.Style({
            fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.2)' }),
            stroke: new ol.style.Stroke({ color: '#ff0000', width: 3 })
        })
    });
    
    draw.on('drawend', function(evt) {
        const geom = evt.feature.getGeometry();
        const area = ol.sphere.getArea(geom);
        alert(`مساحت: ${(area / 1000000).toFixed(2)} کیلومتر مربع`);
    });
    
    map.addInteraction(draw);
    snap = new ol.interaction.Snap({ source: measureLayer.getSource() });
    map.addInteraction(snap);
}

// ==========================================
// Tool 4: Draw Point
// ==========================================
function drawPoint() {
    clearTools();
    currentTool = 'point';
    
    draw = new ol.interaction.Draw({
        source: drawLayer.getSource(),
        type: 'Point'
    });
    
    map.addInteraction(draw);
}

// ==========================================
// Tool 5: Draw Line
// ==========================================
function drawLine() {
    clearTools();
    currentTool = 'line';
    
    draw = new ol.interaction.Draw({
        source: drawLayer.getSource(),
        type: 'LineString'
    });
    
    map.addInteraction(draw);
}

// ==========================================
// Tool 6: Draw Polygon
// ==========================================
function drawPolygon() {
    clearTools();
    currentTool = 'polygon';
    
    draw = new ol.interaction.Draw({
        source: drawLayer.getSource(),
        type: 'Polygon'
    });
    
    map.addInteraction(draw);
}

// ==========================================
// Tool 7: GoTo XY
// ==========================================
function gotoXY() {
    const lon = parseFloat(prompt('طول جغرافیایی (Longitude):'));
    const lat = parseFloat(prompt('عرض جغرافیایی (Latitude):'));
    
    if (!isNaN(lon) && !isNaN(lat)) {
        const coords = ol.proj.fromLonLat([lon, lat]);
        map.getView().animate({
            center: coords,
            zoom: 12,
            duration: 1000
        });
        
        // Add marker
        const marker = new ol.Feature({
            geometry: new ol.geom.Point(coords)
        });
        drawLayer.getSource().addFeature(marker);
    }
}

// ==========================================
// Tool 8: Export PNG
// ==========================================
function exportPNG() {
    map.once('rendercomplete', function() {
        const mapCanvas = document.createElement('canvas');
        const size = map.getSize();
        mapCanvas.width = size[0];
        mapCanvas.height = size[1];
        const mapContext = mapCanvas.getContext('2d');
        
        Array.prototype.forEach.call(
            document.querySelectorAll('.ol-layer canvas'),
            function(canvas) {
                if (canvas.width > 0) {
                    const opacity = canvas.parentNode.style.opacity;
                    mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
                    const transform = canvas.style.transform;
                    const matrix = transform
                        .match(/^matrix\(([^\(]*)\)$/)[1]
                        .split(',')
                        .map(Number);
                    CanvasRenderingContext2D.prototype.setTransform.apply(
                        mapContext,
                        matrix
                    );
                    mapContext.drawImage(canvas, 0, 0);
                }
            }
        );
        
        const link = document.createElement('a');
        link.download = 'map.png';
        link.href = mapCanvas.toDataURL();
        link.click();
    });
    map.renderSync();
}

// ==========================================
// Tool 9: Print Map
// ==========================================
function printMap() {
    window.print();
}

// ==========================================
// Tool 10: GetFeatureInfo (GeoServer)
// ==========================================
map.on('singleclick', function(evt) {
    if (currentTool) return; // Don't query when drawing
    
    const viewResolution = map.getView().getResolution();
    const url = '/api/geoserver-proxy?' + new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.1.1',
        REQUEST: 'GetFeatureInfo',
        FORMAT: 'image/png',
        TRANSPARENT: true,
        QUERY_LAYERS: 'your:layer', // Change this!
        LAYERS: 'your:layer',
        INFO_FORMAT: 'application/json',
        FEATURE_COUNT: 50,
        X: Math.floor(evt.pixel[0]),
        Y: Math.floor(evt.pixel[1]),
        SRS: 'EPSG:3857',
        WIDTH: map.getSize()[0],
        HEIGHT: map.getSize()[1],
        BBOX: map.getView().calculateExtent(map.getSize()).join(',')
    });
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                let html = '<h4>اطلاعات عوارض:</h4>';
                for (let key in props) {
                    html += `<b>${key}:</b> ${props[key]}<br>`;
                }
                document.getElementById('info-content').innerHTML = html;
                document.getElementById('info-panel').style.display = 'block';
            }
        })
        .catch(err => console.error('GetFeatureInfo error:', err));
});

// ==========================================
// Clear Tools
// ==========================================
function clearTools() {
    if (draw) {
        map.removeInteraction(draw);
        draw = null;
    }
    if (snap) {
        map.removeInteraction(snap);
        snap = null;
    }
    currentTool = null;
}

function clearMeasure() {
    measureLayer.getSource().clear();
    clearTools();
}

function clearDrawing() {
    drawLayer.getSource().clear();
    clearTools();
}

// ==========================================
// Info Panel Close
// ==========================================
function closeInfo() {
    document.getElementById('info-panel').style.display = 'none';
}
