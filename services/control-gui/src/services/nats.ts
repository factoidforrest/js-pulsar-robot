// import the connect function from a transport
// import { wsconnect } from "@nats-io/nats-core";
import {Node} from '../../../../lib/node-services'


const node = await Node.create({
    name: 'web-client',
    useWebsockets: true,
    natsServers: 'ws://localhost:4227'
})

console.log(`node connected `, node);

export const wsNode = node;
  
