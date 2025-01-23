import React, {useEffect, useRef, useState} from 'react';
import { Viewer, Entity, CameraFlyTo , CesiumComponentRef, PointGraphics} from 'resium';
import { Cartesian3, Color, createWorldTerrainAsync, Ion , TerrainProvider, CesiumTerrainProvider, Viewer as CesiumViewer, OpenStreetMapImageryProvider} from 'cesium';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'; // Import Cesium's default CSS

Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_API_KEY as string;

const App =   () => {
  // Coordinates for a 3D waypoint (example: New York City)
  const waypoint = Cartesian3.fromDegrees(-155, 19.89, 50000); // Longitude, Latitude, Altitude

  const osmImageryProvider = new OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/',
  });


  const [bathymetry, setBathymetry] = useState<CesiumTerrainProvider>();

  useEffect(() => {
    const fetchData = async () => {

      const bath = await CesiumTerrainProvider.fromIonAssetId(2426648, { requestVertexNormals: true } )
      setBathymetry(bath);
    };
    fetchData();
  }, []); // Empty dependency array ensures it runs once after mount


  const viewerRefCallback = (node: CesiumComponentRef<CesiumViewer>) => {
    console.log('useeffect cesium update thing called and ref is ', node)
    if (node?.cesiumElement) {
      console.log("REF EXISTS NOW")


      
      // console.log("CHANGING UP THE VIEWER REF")
      // // ref.current.cesiumElement is Cesium's Viewer
      // // DO SOMETHING

      
      const viewer = node.cesiumElement;
      const scene = viewer.scene;   

      const globe = scene.globe;
      const camera = scene.camera;

      scene.fog.enabled = false;
      globe.showGroundAtmosphere = false;

      globe.enableLighting = true;

      // const imageryLayers = viewer.scene.imageryLayers;

      // // Remove the default imagery layer
      console.log('layers are!!!',scene.imageryLayers);
  
      // // Add the OpenStreetMap imagery provider
      // imageryLayers.addImageryProvider(
      //   createTile({
      //     url: Cesium.buildModuleUrl('/node_modules/cesium/Build/Cesium/Assets/Textures/NaturalEarthII')
      // }
      // );

      // baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      //   Cesium.TileMapServiceImageryProvider.fromUrl(
      //     Cesium.buildModuleUrl("/node_modules/Assets/Textures/NaturalEarthII"),
      //   ),
      // ),

    

      scene.light = new Cesium.DirectionalLight({
        direction: new Cesium.Cartesian3(1, 0, 0), // Updated every frame
      });

      // Update the light direction every frame to match the current camera view
      const scratchNormal = new Cesium.Cartesian3();
      scene.preRender.addEventListener(function (scene, time) {
        const surfaceNormal = globe.ellipsoid.geodeticSurfaceNormal(
          camera.positionWC,
          scratchNormal
        );
        const negativeNormal = Cesium.Cartesian3.negate(
          surfaceNormal,
          surfaceNormal
        );
        scene.light.direction = Cesium.Cartesian3.normalize(
          Cesium.Cartesian3.add(
            negativeNormal,
            camera.rightWC,
            surfaceNormal
          ),
          scene.light.direction
        );
      });

      globe.maximumScreenSpaceError = 1.0; // Load higher resolution tiles for better seafloor shading



          
      // viewer.baseLayerPicker.viewModel.selectedImagery =
      // viewer.baseLayerPicker.viewModel.imageryProviderViewModels[11];


      // prevent aliasing from countour lines
      scene.msaaSamples = 4;


      // //   Sandcastle.addToggleButton("Lighting enabled", true, function (
      // //     checked
      // //   ) {
      // //     globe.enableLighting = checked;
      // //   });

      // Light the scene with a hillshade effect similar to https://pro.arcgis.com/en/pro-app/latest/tool-reference/3d-analyst/how-hillshade-works.htm
      scene.light = new Cesium.DirectionalLight({
      direction: new Cesium.Cartesian3(1, 0, 0), // Updated every frame
      });

      const cameraMaxHeight = globe.ellipsoid.maximumRadius * 2;
      scene.preRender.addEventListener(function (scene, time) {
      const surfaceNormal = globe.ellipsoid.geodeticSurfaceNormal(
        camera.positionWC,
        scratchNormal
      );
      const negativeNormal = Cesium.Cartesian3.negate(
        surfaceNormal,
        surfaceNormal
      );
      scene.light.direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.add(
          negativeNormal,
          camera.rightWC,
          surfaceNormal
        ),
        scene.light.direction
      );

      const zoomMagnitude = 
          Cesium.Cartesian3.magnitude(camera.positionWC) / cameraMaxHeight;

      // updateGlobeMaterialUniforms(zoomMagnitude);
      });

      // //   Sandcastle.addToggleButton("Fog enabled", true, (checked) => {
      // //     scene.fog.enabled = checked;
      // //     globe.showGroundAtmosphere = checked;
      // //   });

      // Globe materials
      let showContourLines = true;
      let showElevationColorRamp = true;
      let invertContourLines = false;

      const minHeight = -10000.0;
      const seaLevel = 0.0;
      const maxHeight = 2000.0;
      const countourLineSpacing = 500.0;

      const range = maxHeight - minHeight;
      const d = (height: number) => (height - minHeight) / range;

      // Create a color ramp based on https://matplotlib.org/cmocean/#deep
      function getColorRamp() {
       const ramp = document.getElementById("colorRamp");
       ramp.width = 100;
       ramp.height = 15;
       const ctx = ramp.getContext("2d");
       const grd = ctx.createLinearGradient(0, 0, 100, 0);

       grd.addColorStop(d(maxHeight), "#B79E6C");
       grd.addColorStop(d(100.0), "#FBFFEE");
       grd.addColorStop(d(0.0), "#F9FCCA");
       grd.addColorStop(d(-500.0), "#BDE7AD");
       grd.addColorStop(d(-1000.0), "#81D2A3");
       grd.addColorStop(d(-1500.0), "#5AB7A4");
       grd.addColorStop(d(-2000.0), "#4C9AA0");
       grd.addColorStop(d(-2500.0), "#437D9A");
       grd.addColorStop(d(-4000.0), "#3E6194");
       grd.addColorStop(d(-5000.0), "#424380");
       grd.addColorStop(d(-8000.0), "#392D52");
       grd.addColorStop(d(minHeight), "#291C2F");

       ctx.fillStyle = grd;
       ctx.fillRect(0, 0, ramp.width, ramp.height);

       return ramp;
      }

      scene.camera.setView({
        destination: new Cesium.Cartesian3(-3877002.181627189, 5147948.256341475, 864384.3423478723),
        orientation: new Cesium.HeadingPitchRoll(5.914830423853524, -0.7139104486007932, 0.00017507632714419685),
      });




      // function getElevationContourMaterial() {
      // // Creates a composite material with both elevation shading and contour lines
      // return new Cesium.Material({
      //   fabric: {
      //     type: "ElevationColorContour",
      //     materials: {
      //       contourMaterial: {
      //         type: "ElevationContour",
      //       },
      //       elevationRampMaterial: {
      //         type: "ElevationRamp",
      //       },
      //     },
      //     components: {
      //       diffuse:
      //         "(1.0 - contourMaterial.alpha) * elevationRampMaterial.diffuse + contourMaterial.alpha * contourMaterial.diffuse",
      //       alpha:
      //         "max(contourMaterial.alpha, elevationRampMaterial.alpha)",
      //     },
      //   },
      //   translucent: false,
      // });
      // }

      // function updateGlobeMaterialUniforms(zoomMagnitude) {
      // const material = globe.material;
      // if (!Cesium.defined(material)) {
      //   return;
      // }

      // const spacing = 5.0 * Math.pow(10, Math.floor(4 * zoomMagnitude));
      // if (showContourLines) {
      //   const uniforms = showElevationColorRamp
      //     ? material.materials.contourMaterial.uniforms
      //     : material.uniforms;
        
      //   uniforms.spacing = spacing * scene.verticalExaggeration;
      // }

      // if (showElevationColorRamp) {
      //   const uniforms = showContourLines
      //     ? material.materials.elevationRampMaterial.uniforms
      //     : material.uniforms;
      //   uniforms.spacing = spacing * scene.verticalExaggeration;
      //   uniforms.minimumHeight = minHeight * scene.verticalExaggeration;
      //   uniforms.maximumHeight = maxHeight * scene.verticalExaggeration;
      // }
      // }

      // function updateGlobeMaterial() {
      // let material;
      // if (showContourLines) {
      //   if (showElevationColorRamp) {
      //     material = getElevationContourMaterial();
      //     let shadingUniforms =
      //       material.materials.elevationRampMaterial.uniforms;
      //     //  shadingUniforms.image = getColorRamp();
      //     shadingUniforms.minimumHeight =
      //       minHeight * scene.verticalExaggeration;
      //     shadingUniforms.maximumHeight =
      //       maxHeight * scene.verticalExaggeration;
      //     shadingUniforms = material.materials.contourMaterial.uniforms;
      //     shadingUniforms.width = 1.0;
      //     shadingUniforms.spacing =
      //       countourLineSpacing * scene.verticalExaggeration;
      //     shadingUniforms.color = invertContourLines ? Cesium.Color.WHITE.withAlpha(0.5) : Cesium.Color.BLACK.withAlpha(0.5);
      //     globe.material = material;
      //     return;
      //   }

      //   material = Cesium.Material.fromType("ElevationContour");
      //   const shadingUniforms = material.uniforms;
      //   shadingUniforms.width = 1.0;
      //   shadingUniforms.spacing =
      //     countourLineSpacing * scene.verticalExaggeration;
      //   shadingUniforms.color = invertContourLines ? Cesium.Color.WHITE : Cesium.Color.BLACK;
      //   globe.material = material;
      //   return;
      // }

      // if (showElevationColorRamp) {
      //   material = Cesium.Material.fromType("ElevationRamp");
      //   const shadingUniforms = material.uniforms;
      //   //  shadingUniforms.image = getColorRamp();
      //   shadingUniforms.minimumHeight =
      //     minHeight * scene.verticalExaggeration;
      //   shadingUniforms.maximumHeight =
      //     maxHeight * scene.verticalExaggeration;
      //   globe.material = material;
      //   return;
      // }

      // globe.material = material;
      

      // updateGlobeMaterial();

      // //   Sandcastle.addToggleButton(
      // //     "Color ramp enabled",
      // //     showElevationColorRamp,
      // //     function (checked) {
      // //       showElevationColorRamp = checked;
      // //       updateGlobeMaterial();
      // //     }
      // //   );

      // //   Sandcastle.addToggleButton(
      // //     "Contour lines enabled",
      // //     showContourLines,
      // //     function (checked) {
      // //       showContourLines = checked;
      // //       updateGlobeMaterial();
      // //     }
      // //   );

      // //   Sandcastle.addToggleButton(
      // //     "Invert contour line color",
      // //     invertContourLines,
      // //     function (checked) {
      // //       invertContourLines = checked;
      // //       updateGlobeMaterial();
      // //     }
      // //   );

      // // Vertical exaggeration
      // const viewModel = {
      // exaggeration: scene.verticalExaggeration,
      // minHeight: minHeight,
      // maxHeight: maxHeight
      // };

      // function updateExaggeration() {
      // scene.verticalExaggeration = Number(viewModel.exaggeration);
      // }

      // //   Cesium.knockout.track(viewModel);
      // //   const toolbar = document.getElementById("toolbar");
      // //   Cesium.knockout.applyBindings(viewModel, toolbar);
      // //   for (const name in viewModel) {
      // //     if (viewModel.hasOwnProperty(name)) {
      // //       Cesium.knockout
      // //         .getObservable(viewModel, name)
      // //         .subscribe(updateExaggeration);
      // //     }
      // //   }

      // scene.camera.setView({
      //   destination: new Cesium.Cartesian3(-3877002.181627189, 5147948.256341475, 864384.3423478723),
      //   orientation: new Cesium.HeadingPitchRoll(5.914830423853524, -0.7139104486007932, 0.00017507632714419685),
      // });
    }
  }

  const newYorkPos = Cartesian3.fromDegrees(-74.0707383, 40.7117244, 100);

  if (!bathymetry){
    return <div>Loading...</div>
  }
  return (
    
    <div style={{ height: '100vh', width: '100vw' }}>
      <Viewer ref={viewerRefCallback}
        full
        // terrainProvider={bathymetry} // Load Cesium World Terrain, includes bathymetry
        // imageryProvider={osmImageryProvider}
        terrainProvider={bathymetry}
        timeline={false}
        animation={false}
        
        >
          {/* Camera flies to the waypoint location on load */}
          {/* <CameraFlyTo
            duration={1}
            destination={waypoint}
          /> */}
          <Entity
            name="Bay Area"
            position={Cesium.Cartesian3.fromDegrees(-122.4, 37.8, 500)} // San Francisco Bay area
            point={{
              pixelSize: 20,
              color: Cesium.Color.PURPLE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY // Always render on top
            }}
            description="what the hell is this"
          />
          <Entity position={newYorkPos} name="Tokyo" description="Hello, world.">
            <PointGraphics pixelSize={10} />
          </Entity>



        

        {/* Entity for the 3D waypoint marker */}
        {/* <Entity
          position={waypoint}
          point={{ pixelSize: 10, color: Color.RED }} // Marker style
          description="New York City"
        /> */}
      </Viewer>
    </div>
  );
};

export default App;
