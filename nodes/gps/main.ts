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
		timestamp: number | null;
		latitude: number | null;
		longitude: number | null;
		altitude: number | null;
		speed: number | null;
		course: number | null;
		satellites: number | null;
		hdop: number | null;
		fix: string | null;
		linkQuality: string | null;
	};

	private systemTimeSet = false;

	constructor(node: Node, private publisher: TopicPublisher<gpsData>) {
		this.node = node;

		this.gps = new GPS();
		this.gpsData = {
			linkQuality: 'unknown', timestamp: null, latitude: null, longitude: null, altitude: null, speed: null, course: null, satellites: null, hdop: null, fix: null,
		};

		// Set up listeners for specific NMEA sentence types
		this.gps.on('GGA', this.handleGGA.bind(this));
		this.gps.on('RMC', this.handleRMC.bind(this));
		this.gps.on('GSA', this.handleGSA.bind(this));
		this.gps.on('GSV', this.handleGSV.bind(this));
		this.gps.on('VTG', this.handleVTG.bind(this));

		// Listen to the Raspberry Pi serial port for UART 0 connected via GPIO
		this.port = new SerialPort({
			path: '/dev/ttyS0',
			baudRate: 9600,
		});

		// Pass data to the GPS
		this.port.on('data', (data: Buffer) => {
			this.gps.update(data.toString());
		});
	}

	private handleGGA(data: GGASentence) {
		this.gpsData.timestamp = data.time?.getTime() || null;
		this.gpsData.latitude = data.lat;
		this.gpsData.longitude = data.lon;
		this.gpsData.altitude = data.alt;
		this.gpsData.satellites = data.satellites;
		this.gpsData.hdop = data.hdop;

		this.updateLinkQuality(data.quality);
		this.setSystemTime(data.time);
		this.publishGPSData();
	}

	private handleRMC(data: RMCSentence) {
		this.gpsData.timestamp = data.time?.getTime() || null;
		this.gpsData.latitude = data.lat;
		this.gpsData.longitude = data.lon;
		this.gpsData.speed = data.speed;
		this.gpsData.course = data.track;

		this.setSystemTime(data.time);
		this.publishGPSData();
	}

	private handleGSA(data: GSASentence) {
		this.gpsData.fix = data.fix;
		this.publishGPSData();
	}

	private handleGSV(data: GSVSentence) {
		// We're not storing detailed satellite information, but we could extend this if needed
	}

	private handleVTG(data: VTGSentence) {
		this.gpsData.speed = data.speed;
		this.gpsData.course = data.track;
		this.publishGPSData();
	}

	private updateLinkQuality(quality: number | null) {
		if (quality === null) {
			this.gpsData.linkQuality = 'unknown';
		} else if (quality >= 4) {
			this.gpsData.linkQuality = 'excellent';
		} else if (quality === 3) {
			this.gpsData.linkQuality = 'good';
		} else if (quality === 2) {
			this.gpsData.linkQuality = 'moderate';
		} else {
			this.gpsData.linkQuality = 'poor';
		}
	}

	private setSystemTime(time: Date | null) {
		if (!this.systemTimeSet && time) {
			// Set system time (this requires root privileges)
			const {exec} = require('node:child_process');
			exec(`sudo date -s "${time.toISOString()}"`, (error: Error | null) => {
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
	const gpsTopicPublisher = await node.createTopicPublisher('auv.position.gps', gpsData);

	// Initialize GPS
	new GPSNode(node, gpsTopicPublisher);

	// Run the node
}

main().catch(console.error);
