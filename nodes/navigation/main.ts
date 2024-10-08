import { Node } from '../../lib/node-services.js';
import { imuData, gpsData, speedEstimate, depth, positionEstimate } from '../../topics/generated/topics/topics.js';
import {State, EKFPositionEstimator} from './ekf.js'

interface PositionEstimate {
  local: State;
  global: { latitude: number; longitude: number; altitude: number; };
  timestamp: number;
}

async function main() {
  console.log('Initializing EKF Position Estimator node');
  const node = await Node.create({
      name: 'position',
  });

  const imuTopic = await node.createTopicSubscriber('auv.hardware.imu', imuData);
  const gpsTopic = await node.createTopicSubscriber('auv.hardware.gps', gpsData);
  const speedTopic = await node.createTopicSubscriber('auv.position.speed_estimate', speedEstimate);
  const depthTopic = await node.createTopicSubscriber('auv.hardware.depth', depth); 

  const positionTopic = await node.createTopicPublisher('auv.position.estimate', positionEstimate);

  // Wait for first fix before starting position estimating
  const firstFix = new Promise<gpsData>((resolve, reject) => {
    const fixListener = (msg: gpsData) => {
      console.log('gps msg received')
      const goodFix = EKFPositionEstimator.fixSufficient(msg);
      if (!goodFix) {
        console.log('Waiting for good GPS fix...');
        return;
      }
      // stop listening, we got what we were waiting for
      console.log('gps fix ready')
      gpsTopic.off('message', fixListener);
      resolve(msg);
    }
    gpsTopic.on('message', fixListener);
    console.log('waiting for good GPS fix to begin position estimation')
  })

  let imuWaitCount = 0;
  // also wait for IMU calibrated
  const imuCalibrated = new Promise<void>((res, rej) => {
    const imuListener = (msg: imuData) => {
      if (msg.calibrationStatus?.sys !== 3) {
        //quieter logging
        imuWaitCount++;
        if (imuWaitCount % 100 === 0) {
          console.log('waiting for IMU calibration: ', msg.calibrationStatus)
        }
        return
      }
      console.log('imu calibrated')
      imuTopic.off('message', imuListener);
      res()
    }
    imuTopic.on('message', imuListener);
    console.log('Waiting for good IMU calibration to begin position estimation')
  })

  const [fixReceived, _] = await Promise.all([firstFix, imuCalibrated])

  const ekf = new EKFPositionEstimator(await fixReceived)



  // When IMU comes in, we run "predict" which advances time in the EKF, and then emit a new estimate
  imuTopic.on('message', (msg) => {
    ekf.predict(msg);
    // Get the current state estimate
    const state = ekf.getState();
    const globalPosition = ekf.getGlobalPosition();

    // Publish the position estimate
    const positionEstimate: PositionEstimate = {
        local: state,
        global: globalPosition,
        timestamp: Date.now()
    };

    positionTopic.sendMsg(positionEstimate);
  })
  
  // The rest of these messages are "updates" which adjust the EKF's state estimate but dont advance time or emit any predictions
  gpsTopic.on('message', (msg) => {
    ekf.updateGPS( msg);
  })

  speedTopic.on('message', (msg) => {
    ekf.updateVelocity(msg.speed);
  })


  depthTopic.on('message', (msg) => {
    ekf.updateDepth(msg.depth);
  })

  
  
}

main().catch((error) => {
  console.error('Error in EKF Position Estimator:', error);
  process.exit(1);
});