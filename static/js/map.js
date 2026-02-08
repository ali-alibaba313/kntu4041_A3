/**
 * WebGIS Final Project - Map JavaScript
 * OpenLayers Map with WMS Layer and GetFeatureInfo
 */

// ============= Configuration =============
const CONFIG = {
    // GeoServer WMS Configuration
    // IMPORTANT: Change these values to match your GeoServer setup
    geoserver: {
        url: 'http://localhost:8080/geoserver/wms',
        workspace: 'topp',
        layerName: 'states',  // Change to your layer name
        fullLayerName: 'topp:states'  // workspace:layerName
    },
    
    // Map Initial View
    mapView: {
        center: [-100, 40],  // Longitude, Latitude (US center)
        zoom: 4,
        projection: 'EPSG:3857'
    }
};

// ============= Map Initialization =============

// Create base layer (OpenStreetMap)
const baseLayer = new ol.layer.Tile({
    source: new ol.source.OSM(),
    title: 'OpenStreetMap'
});

// Create WMS layer from GeoServer
const wmsLayer = new ol.layer.Tile({
    source: new ol.source.TileWMS({
        url: CONFIG.geoserver.url,
        params: {
            'LAYERS': CONFIG.geoserver.fullLayerName,
            'TILED': true,
            'VERSION': '1.1.1'
        },
        serverType: 'geoserver',
        transition: 0
    }),
    title: 'WMS Layer',
    opacity: 0.7
});

// Initialize the map
const map = new ol.Map({
    target: 'map',
    layers: [baseLayer, wmsLayer],
    view: new ol.View({
        center: ol.proj.fromLonLat(CONFIG.mapView.center),
        zoom: CONFIG.mapView.zoom,
        projection: CONFIG.mapView.projection
    })
});

// Add map controls
map.addControl(new ol.control.FullScreen());
map.addControl(new ol.control.ScaleLine());
map.addControl(new ol.control.ZoomSlider());

// ============= GetFeatureInfo Functionality =============

// Get DOM elements
const featureInfoDiv = document.getElementById('featureInfo');
const loadingOverlay = document.getElementById('loadingOverlay');
const closePanel = document.getElementById('closePanel');

/**
 * Show loading state
 */
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading state
 */
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

/**
 * Display feature information in the panel
 */
function displayFeatureInfo(features) {
    if (!features || features.length === 0) {
        featureInfoDiv.innerHTML = `
            <div class="info-placeholder">
                <div class="placeholder-icon">❌</div>
                <p>عارضه‌ای یافت نشد</p>
                <small>در این موقعیت اطلاعاتی موجود نیست</small>
            </div>
        `;
        closePanel.style.display = 'none';
        return;
    }
    
    let html = '';
    
    features.forEach((feature, index) => {
        const properties = feature.properties || feature;
        
        html += `<div class="feature-item">`;
        html += `<h4>🗺️ عارضه ${index + 1}</h4>`;
        
        // Display all properties except geometry and bbox
        for (let key in properties) {
            if (properties.hasOwnProperty(key) && 
                key !== 'bbox' && 
                key !== 'geometry' &&
                key !== 'the_geom') {
                
                const value = properties[key] !== null && properties[key] !== undefined 
                    ? properties[key] 
                    : 'N/A';
                
                html += `
                    <div class="feature-property">
                        <strong>${formatPropertyName(key)}:</strong>
                        <span>${value}</span>
                    </div>
                `;
            }
        }
        
        html += `</div>`;
        
        // Add divider between features
        if (index < features.length - 1) {
            html += `<div class="feature-divider"></div>`;
        }
    });
    
    featureInfoDiv.innerHTML = html;
    closePanel.style.display = 'block';
}

/**
 * Format property name (convert snake_case to readable format)
 */
function formatPropertyName(name) {
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Display error message
 */
function displayError(message) {
    featureInfoDiv.innerHTML = `
        <div class="error-state">
            <p><strong>خطا در دریافت اطلاعات</strong></p>
            <small>${message}</small>
        </div>
    `;
    closePanel.style.display = 'none';
}

/**
 * Handle map click event for GetFeatureInfo
 */
map.on('singleclick', function(evt) {
    // Show loading
    showLoading();
    
    // Display loading state in panel
    featureInfoDiv.innerHTML = `
        <div class="loading-state">
            <p>در حال دریافت اطلاعات...</p>
        </div>
    `;
    
    // Get map view resolution and projection
    const viewResolution = map.getView().getResolution();
    const viewProjection = map.getView().getProjection();
    
    // Get WMS source
    const wmsSource = wmsLayer.getSource();
    
    // Build GetFeatureInfo URL
    const url = wmsSource.getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        viewProjection,
        {
            'INFO_FORMAT': 'application/json',
            'FEATURE_COUNT': 50,
            'QUERY_LAYERS': CONFIG.geoserver.fullLayerName
        }
    );
    
    if (!url) {
        hideLoading();
        displayError('خطا در ساخت URL درخواست');
        return;
    }
    
    // Fetch feature info
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            
            // Check if features exist
            if (data.features && data.features.length > 0) {
                displayFeatureInfo(data.features);
            } else {
                displayFeatureInfo([]);
            }
        })
        .catch(error => {
            hideLoading();
            console.error('GetFeatureInfo error:', error);
            
            // Provide helpful error message
            let errorMessage = 'لطفاً موارد زیر را بررسی کنید:<br>';
            errorMessage += '• GeoServer در حال اجرا باشد<br>';
            errorMessage += '• آدرس و نام لایه صحیح باشد<br>';
            errorMessage += '• اتصال شبکه برقرار باشد';
            
            displayError(errorMessage);
        });
});

// ============= Event Handlers =============

/**
 * Close info panel (mobile)
 */
if (closePanel) {
    closePanel.addEventListener('click', function() {
        featureInfoDiv.innerHTML = `
            <div class="info-placeholder">
                <div class="placeholder-icon">🖱️</div>
                <p>روی نقشه کلیک کنید</p>
                <small>اطلاعات عارضه در این بخش نمایش داده می‌شود</small>
            </div>
        `;
        closePanel.style.display = 'none';
    });
}

/**
 * Change cursor on hover over WMS layer
 */
map.on('pointermove', function(evt) {
    if (evt.dragging) {
        return;
    }
    
    const pixel = map.getEventPixel(evt.originalEvent);
    const hit = map.forEachLayerAtPixel(pixel, function(layer) {
        return layer === wmsLayer;
    });
    
    map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});

// ============= Map Events =============

/**
 * Log map ready
 */
map.once('rendercomplete', function() {
    console.log('✅ Map loaded successfully');
    console.log('📍 WMS Layer:', CONFIG.geoserver.fullLayerName);
    console.log('🌍 GeoServer URL:', CONFIG.geoserver.url);
});

/**
 * Handle map errors
 */
wmsLayer.getSource().on('tileloaderror', function() {
    console.error('❌ Error loading WMS tiles from GeoServer');
    console.error('Check GeoServer configuration in map.js');
});

// ============= Helper Functions =============

/**
 * Get map extent in degrees
 */
function getMapExtent() {
    const extent = map.getView().calculateExtent(map.getSize());
    const extentInDegrees = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
    return extentInDegrees;
}

/**
 * Zoom to coordinates
 */
function zoomToCoordinates(lon, lat, zoom = 12) {
    map.getView().animate({
        center: ol.proj.fromLonLat([lon, lat]),
        zoom: zoom,
        duration: 1000
    });
}

/**
 * Print map info to console
 */
function printMapInfo() {
    const view = map.getView();
    const center = ol.proj.toLonLat(view.getCenter());
    
    console.log('=== Map Information ===');
    console.log('Center:', center);
    console.log('Zoom:', view.getZoom());
    console.log('Extent:', getMapExtent());
    console.log('Layers:', map.getLayers().getArray().length);
}

// ============= Configuration Instructions =============

console.log(`
╔════════════════════════════════════════════════════════════╗
║           WebGIS Map Configuration Guide                   ║
╚════════════════════════════════════════════════════════════╝

📝 To configure the map for your GeoServer:

1. Open: static/js/map.js
2. Find the CONFIG object at the top
3. Update the following values:

   CONFIG = {
       geoserver: {
           url: 'http://localhost:8080/geoserver/wms',
           workspace: 'YOUR_WORKSPACE',
           layerName: 'YOUR_LAYER_NAME',
           fullLayerName: 'workspace:layer'
       },
       mapView: {
           center: [longitude, latitude],
           zoom: 4
       }
   }

4. Save and reload the page

📚 Common GeoServer Workspaces/Layers:
   - topp:states (Default sample)
   - tiger:roads
   - sf:streams
   - nurc:Arc_Sample

💡 Tip: Check your GeoServer Layer Preview to get the exact
         workspace and layer names.

═══════════════════════════════════════════════════════════════
`);

// Make helper functions available globally (for debugging)
window.mapHelpers = {
    getMapExtent,
    zoomToCoordinates,
    printMapInfo
};
