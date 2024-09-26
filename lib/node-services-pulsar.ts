import { connect, NatsConnection, Subscription, StringCodec } from 'nats';
import { MessageFns } from '../topics/generated/topics/topics';

export interface NodeConfig {
  servers?: string | string[];
  rate: number;
  name: string;
  // Add other configuration options as needed
}

export class Node {
  private connection: NatsConnection;

  constructor(public config: NodeConfig) {}

  async connect(): Promise<void> {
    this.connection = await connect({
      servers: this.config.servers || 'nats://localhost:4222',
      name: this.config.name,
    });
  }

  async createTopicProducer<T>(topicName: string, messageFns: MessageFns<T>): Promise<TopicProducer<T>> {
    return new TopicProducer<T>(this.connection, messageFns, topicName, this.config.name);
  }

  async createTopicConsumer<T>(topicName: string, messageFns: MessageFns<T>, subscription: string): Promise<TopicConsumer<T>> {
    const consumer = this.connection.subscribe(topicName, {
      queue: `${this.config.name}-${subscription}`,
    });
    return new TopicConsumer<T>(consumer, messageFns);
  }

  async loop(loopFunction: () => Promise<void>) {
    const intervalMs = 1000 / this.config.rate;
    while (true) {
      const startTime = Date.now();
      await loopFunction();
      const elapsedTime = Date.now() - startTime;
      const sleepTime = Math.max(0, intervalMs - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }

  async close(): Promise<void> {
    await this.connection.close();
  }
}

export class TopicProducer<T> {
  private sc = StringCodec();

  constructor(
    private connection: NatsConnection,
    private messageFns: MessageFns<T>,
    private topicName: string,
    private nodeName: string
  ) {}

  async sendMsg(message: T): Promise<void> {
    const rawMsg = this.messageFns.encode(message).finish();
    const encodedMsg = this.sc.encode(Buffer.from(rawMsg).toString('base64'));
    this.connection.publish(this.topicName, encodedMsg);
    console.log('Message sent:', message);
  }

  async close(): Promise<void> {
    // No need to close the producer in NATS
  }
}

export class TopicConsumer<T> {
  private sc = StringCodec();

  constructor(private consumer: Subscription, private messageFns: MessageFns<T>) {}

  async receiveMsg(): Promise<T> {
    const msg = await this.consumer.next();
    if (!msg) {
      throw new Error('No message received');
    }
    const decodedData = Buffer.from(this.sc.decode(msg.data), 'base64');
    const decodedMsg = this.messageFns.decode(decodedData);
    return decodedMsg;
  }

  async close(): Promise<void> {
    await this.consumer.unsubscribe();
  }
}