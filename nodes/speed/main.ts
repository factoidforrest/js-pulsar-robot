import {Node} from '../../lib/node-services.js';
import {speed} from '../../topics/generated/topics/topics.js';

async function main() {
  console.log('initializing node');
  const node = await Node.create({rate: 1, name: 'speed'});
  const topic = await node.createTopicPublisher('auv.position.speed', speed);
  console.log('created topic');

  await node.loop(async () => {
    const message = {
      speed: 0
    };

    await topic.sendMsg(message);
  });
}

main().catch(console.error);
