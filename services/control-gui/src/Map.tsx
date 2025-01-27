
// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
import Map, {NavigationControl, useControl, Popup, Source} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {GeoJsonLayer, ArcLayer, PointCloudLayer, COORDINATE_SYSTEM} from 'deck.gl';
import {MapboxOverlay as DeckOverlay} from '@deck.gl/mapbox';
import { useState } from 'react';

const token = process.env.VITE_MAPBOX_TOKEN;
if (!token){
  throw new Error('mapbox token not passed as env var VITE_MAPBOX_TOKEN')
}



// source: Natural Earth http://www.naturalearthdata.com/ via geojson.xyz
const AIR_PORTS =
  'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_10m_airports.geojson';

// Set your Mapbox token here or via environment variable

const INITIAL_VIEW_STATE = {
  latitude: 51.47,
  longitude: 0.45,
  zoom: 4,
  bearing: 0,
  pitch: 30
};

const MAP_STYLE = 'mapbox://styles/mapbox/light-v9';
function DeckGLOverlay(props) {
  const overlay = useControl(() => new DeckOverlay(props));
  overlay.setProps(props);
  return null;
}



export default function Map() {

  const [selected, setSelected] = useState<any>(null);


  const pointTest = new PointCloudLayer({
    id: 'PointCloudLayer',
    data: [{"position":[0,0,1000000],"normal":[0,0,-1],"color":[0,128,0]}],
    
    getColor: d => d.color,
    getNormal: d => d.normal,
    getPosition: d => d.position,
    pointSize: 100,
    // coordinateOrigin: [-122.4, 37.74],
    coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
    pickable: true
  });

  const layers = [
    // new GeoJsonLayer({
    //   id: 'airports',
    //   data: AIR_PORTS,
    //   // Styles
    //   filled: true,
    //   pointRadiusMinPixels: 2,
    //   pointRadiusScale: 2000,
    //   getPointRadius: f => 11 - f.properties.scalerank,
    //   getFillColor: [200, 0, 80, 180],
    //   // Interactive props
    //   pickable: true,
    //   autoHighlight: true,
    //   onClick: info => setSelected(info.object)
    //   // beforeId: 'waterway-label' // In interleaved mode render the layer under map labels
    // }),
    pointTest
    // new ArcLayer({
    //   id: 'arcs',
    //   data: AIR_PORTS,
    //   dataTransform: d => d.features.filter(f => f.properties.scalerank < 4),
    //   // Styles
    //   getSourcePosition: f => [-0.4531566, 51.4709959], // London
    //   getTargetPosition: f => f.geometry.coordinates,
    //   getSourceColor: [0, 128, 200],
    //   getTargetColor: [200, 0, 80],
    //   getWidth: 1
    // })
  ];

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{
        longitude: -100,
        latitude: 40,
        zoom: 3.5
      }}
      style={{width: '100vw', height: '100vh'}}
      mapStyle="mapbox://styles/mapbox/streets-v9"
      // terrain={{source: 'mapbox-dem', exaggeration: 5}}
    >
        {/* <Source
          id="mapbox-dem"
          type="raster-dem"
          // url="mapbox://mapbox.mapbox-bathymetry-v2"
          url="mapbox://mapbox.mapbox-bathymetry-v2"
          tileSize={512}
          maxzoom={14}
        /> */}
      {selected && (
        <Popup
          key={selected.properties.name}
          anchor="bottom"
          style={{zIndex: 10}} /* position above deck.gl canvas */
          longitude={selected.geometry.coordinates[0]}
          latitude={selected.geometry.coordinates[1]}
        >
          {selected.properties.name} ({selected.properties.abbrev})
        </Popup>
      )}
      <DeckGLOverlay layers={layers} /* interleaved*/ />   
      <NavigationControl position="top-left" />

    </Map>
    
  );
}
