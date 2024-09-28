import {Node} from '../../lib/node-services.js';
import {helloWorld} from '../../topics/generated/topics/topics.js';

async function main() {
  console.log('initializing node');
  const node = await Node.create({
    name: 'hello-world-consumer',
    rate: Infinity,
  });
  const topic = await node.createTopicSubscriber(
    'hello_world',
    helloWorld
  );

  topic.on('message', (message) => {
    console.log('message received is', message);
  });

  topic.on('error', (error) => {
    console.log('error is', error);
  });

  // Console.log('created topic')

  // await node.loop(async () => {
  //   const msg = await topic.receiveMsg();
  //   console.log('message received is ', msg)
  // });
}

main().catch(console.error);
