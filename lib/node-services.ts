import * as Pulsar from 'pulsar-client';
import { MessageFns } from '../topics/generated/topics/topics';

export interface NodeConfig {
  serviceUrl?: string;
  rate: number;
  name:string
  // Add other configuration options as needed
}

export class Node {

  private client: Pulsar.Client;

  constructor(public config: NodeConfig) {
    this.client = new Pulsar.Client({
      serviceUrl: config.serviceUrl || 'pulsar://localhost:6650',
      // Add other client configuration options as needed
    });
  }

  async createTopicProducer<T>(topicName: string, messageFns: MessageFns<T>): Promise<TopicProducer<T>> {
    const producer = await this.client.createProducer({
      topic: topicName,
      sendTimeoutMs: 3000,
      batchingEnabled: false,
    });

    return new TopicProducer<T>(producer, messageFns, this.config.name);
  }





  async createTopicConsumer<T>(topicName: string, messageFns: MessageFns<T>, subscription: string): Promise<TopicConsumer<T>> {
    const consumer = await this.client.subscribe({
      topic: topicName,
      subscription: this.config.name + '-' + subscription,
      subscriptionType: 'KeyShared',
      // readCompacted: true,
      subscriptionInitialPosition: 'Latest',
      readCompacted: true
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
    await this.client.close();
  }
}

export class TopicProducer<T> {
  constructor(private producer: Pulsar.Producer, private messageFns: MessageFns<T>, private nodeName: string) {}

  async sendMsg(message: T): Promise<void> {
    const rawMsg = this.messageFns.encode(message).finish();
    const msgId = await this.producer.send({
      data: Buffer.from(rawMsg),
      partitionKey: this.nodeName
    });
    console.log('Message sent:', msgId, message)
  }

  async close(): Promise<void> {
    await this.producer.close();
  }
}

export class TopicConsumer<T> {
  constructor(private consumer: Pulsar.Consumer, private messageFns: MessageFns<T>) {}

  async receiveMsg(): Promise<T> {
    const msg = await this.consumer.receive();
    const decodedMsg = this.messageFns.decode(msg.getData());
    await this.consumer.acknowledge(msg);
    return decodedMsg;
  }

  async close(): Promise<void> {
    await this.consumer.close();
  }
}