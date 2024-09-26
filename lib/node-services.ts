import * as Nats from 'nats';
import { MessageFns } from '../topics/generated/topics/topics';
import EventEmitter from 'events';

export interface NodeConfig {
  natsServers?: string | string[];
  rate: number;
  name: string;
  // Add other configuration options as needed
}

export class Node {
  private client!: Nats.NatsConnection;

  constructor(public config: NodeConfig) {
    // Initialization logic without async
  }

  // THIS IS OUR PUBLIC METHOD HERE
  static async create(config: NodeConfig): Promise<Node> {
    const instance = new this(config);
    await instance.connect();
    return instance;
  }

  async connect(): Promise<void> {
    this.client = await Nats.connect({
      servers: this.config.natsServers || 'nats://localhost:4222',
      // Additional client configuration
    });
  }

  async createTopicPublisher<T>(topicName: string, messageFns: MessageFns<T>): Promise<TopicPublisher<T>> {
    return new TopicPublisher<T>(this.client, messageFns, topicName, this.config.name);
  }

  async createTopicSubscriber<T>(topicName: string, messageFns: MessageFns<T>, subscription: string): Promise<TopicSubscriber<T>> {
    return new TopicSubscriber<T>(this.client, messageFns, topicName, this.config.name + '-' + subscription);
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

export class TopicPublisher<T> {
  constructor(
    private client: Nats.NatsConnection,
    private messageFns: MessageFns<T>,
    private topicName: string,
    private nodeName: string
  ) {}

  async sendMsg(message: T): Promise<void> {
    const rawMsg = this.messageFns.encode(message).finish();
    const msgHeaders = Nats.headers();
    msgHeaders.append('node', this.nodeName);
    await this.client.publish(this.topicName, rawMsg, { headers: msgHeaders });
    console.log('Message sent:', message);
  }

  async close(): Promise<void> {
    // No need to close the producer in NATS
  }
}

// Define event types
interface TopicConsumerEvents<T> {
  message: (msg: T) => void;
  error: (err: Error) => void;
}

export class TopicSubscriber<T> extends EventEmitter {
  private subscription: Nats.Subscription;

  constructor(
    private client: Nats.NatsConnection,
    private messageFns: MessageFns<T>,
    private topicName: string,
    private subscriptionName: string
  ) {
    super();
    this.subscription = this.client.subscribe(this.topicName, {
      queue: this.subscriptionName,
    });
    this.setupSubscription();
  }

  private setupSubscription(): void {
    this.subscription.callback = (err, msg) => {
      if (err) {
        this.emit('error', err);
        return;
      }
      try {
        const decodedMsg = this.messageFns.decode(msg.data);
        this.emit('message', decodedMsg);
      } catch (e) {
        console.error('Error decoding message:', e);
        this.emit('error', e as Error);
      }
    };
  }

  async close(): Promise<void> {
    this.subscription.unsubscribe();
  }

  // Override the EventEmitter `on` and `emit` for strong typing
  on<K extends keyof TopicConsumerEvents<T>>(event: K, listener: TopicConsumerEvents<T>[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof TopicConsumerEvents<T>>(event: K, ...args: Parameters<TopicConsumerEvents<T>[K]>): boolean {
    return super.emit(event, ...args);
  }
}