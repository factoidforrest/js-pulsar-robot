import usePromise from "react-use-promise"
import { wsNode } from "./services/nats";

export default function App() {

  const dataSub = wsNode.createTopicSubscriber('test',)
  const [res, err, state] = usePromise(p)

  
  return (<>
  <h1>hello, {res}</h1>
  <p>{JSON.stringify(wsNode)}</p>
    
  </>)
}