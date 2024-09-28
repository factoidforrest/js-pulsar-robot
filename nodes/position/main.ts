import { Node } from '../../lib/node-services.js';
import { imuData, gpsData, speedEstimate, Vector3, Quaternion, depth, positionEstimate } from '../../topics/generated/topics/topics.js';
import {State, EKFPositionEstimator} from './ekf'

interface PositionEstimate {
  local: State;
  global: { latitude: number; longitude: number; altitude: number; } | null;
  timestamp: number;
}

async function main() {
  console.log('Initializing EKF Position Estimator node');
  const node = await Node.create({
      name: 'position',
  });

  const imuTopic = await node.createTopicSubscriber('imu_data', imuData);
  const gpsTopic = await node.createTopicSubscriber('gps_data', gpsData);
  const speedTopic = await node.createTopicSubscriber('speed_estimate', speedEstimate);
  const depthTopic = await node.createTopicSubscriber('depth_data', depth); // Assuming depth is published as a number

  const positionTopic = await node.createTopicPublisher('position_estimate', positionEstimate);

  // Wait for first fix before starting position estimating
  const firstFix = new Promise<gpsData>((resolve, reject) => {
    const fixListener = (msg: gpsData) => {
      const goodFix = EKFPositionEstimator.fixSufficient(msg);
      if (!goodFix) {
        console.log('Waiting for good GPS fix...');
        return;
      }
      // stop listening, we got what we were waiting for
      gpsTopic.off('message', fixListener);
      resolve(msg);
    }
    gpsTopic.on('message', fixListener);
    console.log('waiting for good GPS fix to begin position estimation')
  })

  const ekf = new EKFPositionEstimator(await firstFix)

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