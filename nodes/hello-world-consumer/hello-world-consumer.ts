import { Node} from '../../lib/node-services'
import { helloWorld } from '../../topics/generated/topics/topics';



async function main() {
  console.log('initializing node')
  const node = new Node({name: 'hello-world-consumer', rate:Infinity});
  const topic = await node.createTopicConsumer("hello_world", helloWorld, "my-subscription");
  console.log('created topic')

  await node.loop(async () => {
    const msg = await topic.receiveMsg();
    console.log('message received is ', msg)
  });
}

main().catch(console.error);