import {SerialPort} from 'serialport';
import {Node, TopicPublisher} from '../../lib/node-services.js';
import {gpsData} from '../../topics/generated/topics/topics.js';
import {
	GPS, type GGASentence, type RMCSentence, type GSASentence, type GSVSentence, type VTGSentence,
} from './gps-parser.js';

class GPSNode {
	private readonly gps: GPS;
	private readonly port: SerialPort;
	private readonly node: Node;
	private readonly gpsData: {
		timestamp: number | undefined;
		latitude: number | undefined;
		longitude: number | undefined;
		altitude: number | undefined;
		speed: number | undefined;
		course: number | undefined;
		satellites: number | undefined;
		pdop: number | undefined;
		fix: 'None' | 'FIX_2D' | 'FIX_3D'
		linkQuality: string | undefined;
		dgps: boolean;
	};


	private systemTimeSet = false;

	constructor(node: Node, private publisher: TopicPublisher<gpsData>) {
		this.node = node;

		this.gps = new GPS();
		this.gpsData = {
			dgps: false, linkQuality: 'unknown', timestamp: undefined, latitude: undefined, longitude: undefined, altitude: undefined, speed: undefined, course: undefined, satellites: undefined, pdop: undefined, fix: 'None',
		};

		this.gps.on('data', (msg) => {
			console.log('received message of type', msg.type)
			console.log(msg)
		})
		// Set up listeners for specific NMEA sentence types
		this.gps.on('GGA', this.handleGGA.bind(this));
		this.gps.on('RMC', this.handleRMC.bind(this));
		this.gps.on('GSA', this.handleGSA.bind(this));
		this.gps.on('GSV', this.handleGSV.bind(this));
		this.gps.on('VTG', this.handleVTG.bind(this));

		// Listen to the Raspberry Pi serial port for UART 0 connected via GPIO
		this.port = new SerialPort({
			path: '/dev/ttyAMA0',
			baudRate: 9600,
		});

		// Pass data to the GPS
		this.port.on('data', (data: Buffer) => {
			this.gps.update(data.toString());
		});
	}

	// this is the main fix, so we only publish on this one.
	private handleGGA(data: GGASentence) {
		this.gpsData.timestamp = data.time?.getTime() || undefined;
		this.gpsData.latitude = data.lat;
		this.gpsData.longitude = data.lon;
		this.gpsData.altitude = data.alt;
		this.gpsData.satellites = data.satellites;
		this.gpsData.dgps = data.quality === 2;
		this.setSystemTime(data.time);
		this.publishGPSData();
	}

	private handleRMC(data: RMCSentence) {
		// this.gpsData.timestamp = data.time?.getTime() || undefined;
		// this.gpsData.latitude = data.lat;
		// this.gpsData.longitude = data.lon;
		this.gpsData.speed = data.speed;
		this.gpsData.course = data.track;

		this.setSystemTime(data.time);
		// this.publishGPSData();
	}

	private handleGSA(data: GSASentence) {
		this.gpsData.fix = data.fix;
		this.gpsData.pdop = data.pdop;
		this.gpsData.linkQuality = this.updateLinkQuality(data.pdop);
		// this.publishGPSData();
	}

	private handleGSV(data: GSVSentence) {
		// We're not storing detailed satellite information, but we could extend this if needed
	}

	private handleVTG(data: VTGSentence) {
		this.gpsData.speed = data.speed;
		this.gpsData.course = data.track;
		// this.publishGPSData();
	}

	private updateLinkQuality(pdop: number | undefined) {
		if (pdop === undefined) {
			// Handle the case where pdop is undefined
			return 'unknown';
		}
	
		if (pdop <= 2.0) {
			return 'excellent'; // Highly accurate, typically within a few meters
		} else if (pdop <= 3.0) {
			return 'good'; // Reliable, with accuracy around 5 meters or better
		} else if (pdop <= 5.0) {
			return 'moderate'; // Acceptable, accuracy may be around 10 meters
		} else if (pdop <= 10.0) {
			return 'fair'; // Less reliable, with errors around 10 to 20 meters
		} else {
			return 'poor'; // Inaccurate, errors likely beyond 20 meters
		}
	}

	private setSystemTime(time: Date | undefined) {
		if (!this.systemTimeSet && time) {
			// Set system time (this requires root privileges)
			const {exec} = require('node:child_process');
			exec(`sudo date -s "${time.toISOString()}"`, (error: Error | undefined) => {
				if (error) {
					console.error(`Error setting system time: ${error}`);
				} else {
					this.systemTimeSet = true;
				}
			});
		}
	}

	private publishGPSData() {
		
		this.publisher.sendMsg(this.gpsData);
	}
}

async function main() {
	console.log('Initializing GPS node');
	const node = await Node.create({name: 'gps', rate: Infinity});
	const gpsTopicPublisher = await node.createTopicPublisher('auv.hardware.gps', gpsData);

	// Initialize GPS
	new GPSNode(node, gpsTopicPublisher);

	// Run the node
}

main().catch(console.error);
