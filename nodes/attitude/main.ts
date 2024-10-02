import { Node } from '../../lib/node-services.js';
import { targetPose, actuatorCommand } from '../../topics/generated/topics/topics.js';

class PIDController {
    private kp: number;
    private ki: number;
    private kd: number;
    private integral: number = 0;
    private previousError: number = 0;

    constructor(kp: number, ki: number, kd: number) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
    }

    update(setpoint: number, measurement: number, dt: number): number {
        const error = setpoint - measurement;
        this.integral += error * dt;
        const derivative = (error - this.previousError) / dt;
        this.previousError = error;

        return this.kp * error + this.ki * this.integral + this.kd * derivative;
    }

    reset() {
        this.integral = 0;
        this.previousError = 0;
    }
}

class AttitudeController {
    private node: Node;
    private targetPoseTopic: any;
    private actuatorCommandTopic: any;
    private yawPID: PIDController;
    private pitchPID: PIDController;
    private rollPID: PIDController;
    private lastUpdateTime: number;

    constructor(node: Node) {
        this.node = node;
        this.yawPID = new PIDController(0.5, 0.1, 0.2);
        this.pitchPID = new PIDController(0.5, 0.1, 0.2);
        this.rollPID = new PIDController(0.5, 0.1, 0.2);
        this.lastUpdateTime = Date.now();
    }

    async initialize() {
        this.targetPoseTopic = await this.node.createTopicSubscriber('auv.navigation.target_pose', targetPose);
        this.actuatorCommandTopic = await this.node.createTopicPublisher('auv.hardware.actuators', actuatorCommand);

        this.targetPoseTopic.on('message', this.handleTargetPose.bind(this));
        console.log('AttitudeController initialized and subscribed to topics');
    }

    private quaternionToEuler(q: { qw: number, qx: number, qy: number, qz: number }): { yaw: number, pitch: number, roll: number } {
        // Convert quaternion to Euler angles
        const sinr_cosp = 2 * (q.qw * q.qx + q.qy * q.qz);
        const cosr_cosp = 1 - 2 * (q.qx * q.qx + q.qy * q.qy);
        const roll = Math.atan2(sinr_cosp, cosr_cosp);

        const sinp = 2 * (q.qw * q.qy - q.qz * q.qx);
        const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

        const siny_cosp = 2 * (q.qw * q.qz + q.qx * q.qy);
        const cosy_cosp = 1 - 2 * (q.qy * q.qy + q.qz * q.qz);
        const yaw = Math.atan2(siny_cosp, cosy_cosp);

        return { yaw, pitch, roll };
    }

    private handleTargetPose(message: targetPose) {
        const currentTime = Date.now();
        const dt = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = currentTime;

        const { yaw, pitch, roll } = this.quaternionToEuler(message);

        // Calculate PID outputs
        const yawOutput = this.yawPID.update(yaw, 0, dt);
        const pitchOutput = this.pitchPID.update(pitch, 0, dt);
        const rollOutput = this.rollPID.update(roll, 0, dt);

        // Clamp outputs to [-45, 45] range
        const clampedYaw = Math.max(-45, Math.min(45, yawOutput));
        const clampedPitch = Math.max(-45, Math.min(45, pitchOutput));
        const clampedRoll = Math.max(-45, Math.min(45, rollOutput));

        // Create actuator command
        const command: actuatorCommand = {
            yaw: clampedYaw,
            pitch: clampedPitch,
            roll: clampedRoll,
            motor: 0.5 // 50% motor speed as placeholder
        };

        // Publish actuator command
        this.actuatorCommandTopic.sendMsg(command);


    }
}

async function main() {
    console.log('Initializing Attitude Controller node');
        const node = await Node.create({
            name: 'attitude-controller',
        });

        const controller = new AttitudeController(node);
        await controller.initialize();

        console.log('Attitude Controller node initialized and running');
}

main();