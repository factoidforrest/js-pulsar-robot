import { Node} from '../../lib/node-services'
import { helloWorld } from '../../topics/generated/topics/topics';



async function main() {
  console.log('initializing node')
  const node = new Node({rate:1});
  const topic = await node.createTopicProducer("hello_world", helloWorld);
  console.log('created topic')

  await node.loop(async () => {
    const message = {
      message: 'Hello, World!',
    };

    await topic.sendMsg(message);
  });
}

main().catch(console.error);