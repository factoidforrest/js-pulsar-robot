import { Node} from '../../lib/node-services'
import { helloWorld } from '../../topics/generated/topics/topics';



async function main() {
  console.log('initializing node')
  const node = await Node.create({name: 'hello-world-consumer', rate:Infinity});
  const topic = await node.createTopicSubscriber("hello_world", helloWorld, "my-subscription");

  topic.on('message', (msg) => {
    console.log('message received is ', msg)
  });

  topic.on('error', (err) => {
    console.log('error is ', err)
  })

  
  // console.log('created topic')

  // await node.loop(async () => {
  //   const msg = await topic.receiveMsg();
  //   console.log('message received is ', msg)
  // });
}

main().catch(console.error);