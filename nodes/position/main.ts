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
      name: 'ekf-position-estimator',
      rate: 10, // Update at 10 Hz
  });

  const ekf = new EKFPositionEstimator();

  const imuTopic = await node.createTopicSubscriber('imu_data', imuData);
  const gpsTopic = await node.createTopicSubscriber('gps_data', gpsData);
  const speedTopic = await node.createTopicSubscriber('speed_estimate', speedEstimate);
  const depthTopic = await node.createTopicSubscriber('depth_data', depth); // Assuming depth is published as a number

  const positionTopic = await node.createTopicPublisher('position_estimate', positionEstimate);

  let lastTimestamp: number | null = null;

  await node.loop(async () => {
      const currentTime = Date.now() / 1000; // Convert to seconds
      if (lastTimestamp !== null) {
          const dt = currentTime - lastTimestamp;

          imuTopic.on('message', (msg) => {
            ekf.predict(dt, msg.orientation!);
          })

          gpsTopic.on('message', (msg) => {
            ekf.updateGPS( msg);
          })


          speedTopic.on('message', (msg) => {
            ekf.updateSpeed(msg.speed);
          })


          depthTopic.on('message', (msg) => {
            ekf.updateDepth(msg.depth);
          })

          // Get the current state estimate
          const state = ekf.getState();
          const globalPosition = ekf.getGlobalPosition();

          // Publish the position estimate
          const positionEstimate: PositionEstimate = {
              local: state,
              global: globalPosition,
              timestamp: currentTime
          };

          await positionTopic.sendMsg(positionEstimate);
      }

      lastTimestamp = currentTime;
  });
}

main().catch((error) => {
  console.error('Error in EKF Position Estimator:', error);
  process.exit(1);
});