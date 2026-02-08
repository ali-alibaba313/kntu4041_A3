const wms = new ol.source.TileWMS({
    url:'https://ahocevar.com/geoserver/wms',
    params:{'LAYERS':'topp:states','TILED':true},
    serverType:'geoserver'
});

const map = new ol.Map({
    target:'map',
    layers:[
        new ol.layer.Tile({source:new ol.source.OSM()}),
        new ol.layer.Tile({source:wms})
    ],
    view:new ol.View({
        center:ol.proj.fromLonLat([-98,39]),
        zoom:4
    })
});

map.on('singleclick', function(evt){
    const view = map.getView();
    const url = wms.getFeatureInfoUrl(
        evt.coordinate,
        view.getResolution(),
        view.getProjection(),
        {'INFO_FORMAT':'application/json'}
    );

    if(url){
        fetch(url)
        .then(r=>r.json())
        .then(d=>{
            if(!d.features.length){
                info.innerHTML="No feature";
                return;
            }

            let props=d.features[0].properties;
            let html="<table border=1>";
            for(let k in props){
                html+=`<tr><td>${k}</td><td>${props[k]}</td></tr>`;
            }
            html+="</table>";
            info.innerHTML=html;
        })
        .catch(()=>info.innerHTML="Server error");
    }
});
