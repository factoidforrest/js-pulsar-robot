import {
  connect,
  type NatsConnection,
  type Subscription,
  StringCodec,
} from 'nats';
import {type MessageFns} from '../topics/generated/topics/topics.js';

export type NodeConfig = {
  servers?: string | string[];
  rate: number;
  name: string;
  // Add other configuration options as needed
};

export class Node {
  private connection: NatsConnection;

  constructor(public config: NodeConfig) {}

  async connect(): Promise<void> {
    this.connection = await connect({
      servers: this.config.servers || 'nats://localhost:4222',
      name: this.config.name,
    });
  }

  async createTopicProducer<T>(
    topicName: string,
    messageFns: MessageFns<T>,
  ): Promise<TopicProducer<T>> {
    return new TopicProducer<T>(
      this.connection,
      messageFns,
      topicName,
      this.config.name,
    );
  }

  async createTopicConsumer<T>(
    topicName: string,
    messageFns: MessageFns<T>,
    subscription: string,
  ): Promise<TopicConsumer<T>> {
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
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  }

  async close(): Promise<void> {
    await this.connection.close();
  }
}

export class TopicProducer<T> {
  private readonly sc = StringCodec();

  constructor(
    private readonly connection: NatsConnection,
    private readonly messageFns: MessageFns<T>,
    private readonly topicName: string,
    private readonly nodeName: string,
  ) {}

  async sendMsg(message: T): Promise<void> {
    const rawMessage = this.messageFns.encode(message).finish();
    const encodedMessage = this.sc.encode(
      Buffer.from(rawMessage).toString('base64'),
    );
    this.connection.publish(this.topicName, encodedMessage);
    console.log('Message sent:', message);
  }

  async close(): Promise<void> {
    // No need to close the producer in NATS
  }
}

export class TopicConsumer<T> {
  private readonly sc = StringCodec();

  constructor(
    private readonly consumer: Subscription,
    private readonly messageFns: MessageFns<T>,
  ) {}

  async receiveMsg(): Promise<T> {
    const message = await this.consumer.next();
    if (!message) {
      throw new Error('No message received');
    }

    const decodedData = Buffer.from(this.sc.decode(message.data), 'base64');
    const decodedMessage = this.messageFns.decode(decodedData);
    return decodedMessage;
  }

  async close(): Promise<void> {
    await this.consumer.unsubscribe();
  }
}
