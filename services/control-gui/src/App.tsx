import React from 'react';
import { Viewer, Entity, CameraFlyTo } from 'resium';
import { Cartesian3, Color, createWorldTerrainAsync, Ion , TerrainProvider} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'; // Import Cesium's default CSS

Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJjYjJjNjg3ZS05MzM4LTQzNmMtYjA5MS1lMjhjODk1OGIzODEiLCJpZCI6MjQ0ODEyLCJpYXQiOjE3Mjc4OTY5MTN9.cfpT63TYV7W-_0kRocNB5GoPYCuu03Gr0GQ71I8R1DQ"

const App = () => {
  // Coordinates for a 3D waypoint (example: New York City)
  const waypoint = Cartesian3.fromDegrees(-74.006, 40.7128, 500); // Longitude, Latitude, Altitude

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Viewer 
      full
      terrainProvider={createWorldTerrainAsync()} // Load Cesium World Terrain, includes bathymetry
      terrain={TerrainProvider.fromIonAssetId(2426648)}
      >
        {/* Camera flies to the waypoint location on load */}
        <CameraFlyTo
          duration={2}
          destination={waypoint}
        />
        

        {/* Entity for the 3D waypoint marker */}
        <Entity
          position={waypoint}
          point={{ pixelSize: 10, color: Color.RED }} // Marker style
          description="New York City"
        />
      </Viewer>
    </div>
  );
};

export default App;