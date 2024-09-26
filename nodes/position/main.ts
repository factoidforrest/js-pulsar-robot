import {Node} from '../../lib/node-services.js';
import {imuData} from '../../topics/generated/topics/topics.js';

async function listenToImu(node: Node) {
  let latestImuData: imuData;
  const topic = await node.createTopicSubscriber('auv.hardware.imu', imuData);

  topic.on('message', (message) => {
    console.log('message received is', message);
    latestImuData = message;
  });

  topic.on('error', (error) => {
    console.log('error is', error);
  });
}

async function main() {
  console.log('initializing node');
  const node = await Node.create({name: 'position', rate: Infinity});

  // Console.log('created topic')

  // await node.loop(async () => {
  //   const msg = await topic.receiveMsg();
  //   console.log('message received is ', msg)
  // });
}

main().catch(console.error);
