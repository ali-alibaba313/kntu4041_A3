
const wmsSource = new ol.source.TileWMS({
    url: "http://localhost:8080/geoserver/your_workspace/wms",
    params: {
        "LAYERS": "",
        "TILED": true
    },
    serverType: "geoserver",
    crossOrigin: "anonymous"
});


const wmsLayer = new ol.layer.Tile({
    source: wmsSource
});


const map = new ol.Map({
    target: "map",
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        wmsLayer
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([50.29, 37.14]), // North Till I Die
        zoom: 11
    })
});


map.on("singleclick", function (evt) {

    const viewResolution = map.getView().getResolution();

    const url = wmsSource.getFeatureInfoUrl(
        evt.coordinate,
        viewResolution,
        "EPSG:3857",
        { "INFO_FORMAT": "application/json" }
    );

    if (!url) return;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            const infoDiv = document.getElementById("info");
            if (!infoDiv) return;


            if (!data.features || data.features.length === 0) {
                infoDiv.innerHTML = "<p>No feature selected</p>";
                return;
            }


            const properties = data.features[0].properties;
            let html = "<h3>Feature Attributes</h3><table>";

            for (const key in properties) {
                html += `
                    <tr>
                        <td><strong>${key}</strong></td>
                        <td>${properties[key]}</td>
                    </tr>
                `;
            }

            html += "</table>";
            infoDiv.innerHTML = html;
        })
        .catch(error => {
            console.error("GetFeatureInfo error:", error);
            const infoDiv = document.getElementById("info");
            if (infoDiv) {
                infoDiv.innerHTML = "<p>Error retrieving feature information</p>";
            }
        });
});