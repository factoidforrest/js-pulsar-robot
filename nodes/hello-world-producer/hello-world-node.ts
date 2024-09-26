import {Node} from '../../lib/node-services.js';
import {helloWorld} from '../../topics/generated/topics/topics.js';

async function main() {
  console.log('initializing node');
  const node = await Node.create({rate: 1, name: 'hello-world-producer'});
  const topic = await node.createTopicPublisher('hello_world', helloWorld);
  console.log('created topic');

  await node.loop(async () => {
    const message = {
      message: 'Hello, World!',
    };

    await topic.sendMsg(message);
  });
}

main().catch(console.error);
