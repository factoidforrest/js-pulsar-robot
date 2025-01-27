import EventEmitter from 'node:events';
import {type MessageFns} from '../topics/generated/topics/topics.js';
import type NatsT from '@nats-io/nats-core'
const Nats = await (typeof window === 'undefined' ?  import('@nats-io/transport-node') : import('@nats-io/nats-core'))

export type NodeConfig = {
	natsServers?: string | string[];
	useWebsockets?: boolean;
	rate?: number;
	name: string;
	// Add other configuration options as needed
};

export class Node {
	private client!: NatsT.NatsConnection;

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

		const connector = this.config.useWebsockets ? Nats.wsconnect : Nats.connect;
		this.client = await connector({
			servers: this.config.natsServers || 'nats://localhost:4222',
			// Additional client configuration
		});
	}

	createTopicPublisher<T>(
		topicName: string,
		serializer: MessageFns<T>,
	): TopicPublisher<T> {
		return new TopicPublisher<T>(
			this.client,
			serializer,
			topicName,
			this.config.name,
		);
	}

	createTopicSubscriber<T>(
		topicName: string,
		serializer: MessageFns<T>,
	): TopicSubscriber<T> {
		return new TopicSubscriber<T>(
			this.client,
			serializer,
			topicName,
			this.config.name + '-' + 'subscription',
		);
	}

	async loop(loopFunction: () => Promise<void>) {
		if (!this.config.rate) {
			throw new Error('Rate not set, node shouldnt be calling loop without setting a rate');
		}
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
		private readonly client: NatsT.NatsConnection,
		private readonly serializer: MessageFns<T>,
		private readonly topicName: string,
		private readonly nodeName: string,
	) {}

	async sendMsg(message: T): Promise<void> {
		const rawMessage = this.serializer.encode(message).finish();
		const messageHeaders = Nats.headers();
		messageHeaders.append('node', this.nodeName);
		await this.client.publish(this.topicName, rawMessage, {
			headers: messageHeaders,
		});
		console.log('Message sent:', this.topicName, message);
	}

	async close(): Promise<void> {
		// No need to close the producer in NATS
	}
}

// Define event types
type TopicConsumerEvents<T> = {
	message: (message: T) => void;
	error: (error: Error) => void;
};

export class TopicSubscriber<T> extends EventEmitter {
	private readonly subscription: NatsT.Subscription;

	constructor(
		private readonly client: NatsT.NatsConnection,
		private readonly serializer: MessageFns<T>,
		private readonly topicName: string,
		private readonly subscriptionName: string,
	) {
		super();
		this.subscription = this.client.subscribe(this.topicName, {
			queue: this.subscriptionName,
		});
		this.setupSubscription();
	}

	private setupSubscription(): void {
		this.subscription.callback = (error, message) => {
			if (error) {
				this.emit('error', error);
				return;
			}

			let decodedMessage: T;
			try {
				decodedMessage = this.serializer.decode(message.data);
			} catch (error) {
				//TODO: It seems like this is catch all error types even from handlers
				console.error('Error decoding message:',this.topicName, message, error);
				this.emit('error', error as Error);
				return;
			}

			this.emit('message', decodedMessage);

		};
	}

	async close(): Promise<void> {
		this.subscription.unsubscribe();
	}

	// Override the EventEmitter `on` and `emit` for strong typing
	on<K extends keyof TopicConsumerEvents<T>>(
		event: K,
		listener: TopicConsumerEvents<T>[K],
	): this {
		console.log('Registered message listener ', this.topicName, this.subscriptionName)
		return super.on(event, listener);
	}

	emit<K extends keyof TopicConsumerEvents<T>>(
		event: K,
		...arguments_: Parameters<TopicConsumerEvents<T>[K]>
	): boolean {
		return super.emit(event, ...arguments_);
	}
}
