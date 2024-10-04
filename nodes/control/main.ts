import * as i2cBus from 'i2c-bus';
import { Node } from '../../lib/node-services.js';
import { actuatorCommand } from '../../topics/generated/topics/topics.js';
import { Pca9685Driver, Pca9685Options } from 'pca9685';

const chan = {
    portStab: 12,
    topRud: 13,
    starbStab: 14,
    bottomRud: 15,
    motor: 4
}

type Fin = Exclude<keyof typeof chan, 'motor'>
class ActuatorNode {
  private node!: Node;
  private actuatorTopic: any;
  private i2c!: i2cBus.I2CBus;
  private pwm!: Pca9685Driver;

  private constructor() {}

  static async initialize() {
    const actuatorNode = new ActuatorNode();
    console.log('initializing actuator node');
    actuatorNode.node = await Node.create({
      name: 'actuator-node',
    });

    actuatorNode.actuatorTopic = actuatorNode.node.createTopicSubscriber(
      'auv.control.actuators',
      actuatorCommand
    );

    actuatorNode.actuatorTopic.on('message', actuatorNode.handleMessage.bind(actuatorNode));
    actuatorNode.actuatorTopic.on('error', actuatorNode.handleError.bind(actuatorNode));

    actuatorNode.i2c = i2cBus.openSync(1);

    const driverOptions: Pca9685Options = {
      i2c: actuatorNode.i2c,
      address: 0x40,
      frequency: 50, //todo: Change to 100, just it was 50 by default so make sure it works first
      debug: true,
    };

    // promisify the creation of this slightly clunky i2c lib
    actuatorNode.pwm = await new Promise((resolve, reject) => {
        const pwm = new Pca9685Driver(driverOptions,(err) => {
            if (err) {
                reject(err);
            } else {
              console.log('initialized PWM board')
                resolve(pwm);
            }
        });
    });



    // zero everything out to start. Should make ESC boot and fins straight
    actuatorNode.setMotor(0);
    ['portStab','topRud','starbStab','bottomRud'].forEach((fin) => {
        actuatorNode.setFin(fin as Fin, 0);
    })

    actuatorNode.pwm.channelOn(0);
    // Log all I2C registers after initialization
    await actuatorNode.logI2CRegisters();
    while(true){
      await actuatorNode.finTest();
    }
  }
  
  async logI2CRegisters() {
    console.log('Logging I2C registers for device at 0x40:');
    for (let register = 0; register <= 0x45; register++) {
      try {
        const value = await new Promise<number>((resolve, reject) => {
          this.i2c.readByte(0x40, register, (err, byte) => {
            if (err) reject(err);
            else resolve(byte);
          });
        });
        console.log(`Register 0x${register.toString(16).padStart(2, '0')}: 0x${value.toString(16).padStart(2, '0')}`);
      } catch (error) {
        console.error(`Error reading register 0x${register.toString(16).padStart(2, '0')}:`, error);
      }
    }
  }

  setFin(fin: Fin, angle: number) {
    // Limit the angle to ±40 degrees
    angle = Math.max(-40, Math.min(40, angle));
    // do the math to convert a servo that is at a zero degree angle in the middle of its duty cycle, so "50" to an angle. So if the angle is negative, it will be below 50, and positive, above 50. assume 180 degree servoes
    const dutyCycle = 50 + (angle / 180) * 50;
    const channel = chan[fin];
    this.pwm.setDutyCycle(channel, dutyCycle);
  }

  setMotor(speed: number) {
    this.pwm.setDutyCycle(chan.motor, speed);
  }

  calculateFinAngles(yaw: number, pitch: number, roll: number): { [key in Exclude<keyof typeof chan, 'motor'>]: number } {
    return {
      portStab: pitch - roll,
      topRud: yaw - roll,
      starbStab: pitch + roll,
      bottomRud: yaw + roll
    };
  }

  async finTest() {
    console.log('testing fins')
    function sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    for (let i = -40; i <= 40; i++) {
        ['portStab','topRud','starbStab','bottomRud'].forEach((fin) => {
          this.setFin(fin as Fin, i);
      })
      await sleep(10);
    }
  }

  private handleMessage(message: actuatorCommand) {
    const { yaw, pitch, roll, motor } = message;
    
    // Calculate fin angles
    const finAngles = this.calculateFinAngles(yaw, pitch, roll);
    
    // Set fin angles
    for (const [fin, angle] of Object.entries(finAngles) as [Exclude<keyof typeof chan, 'motor'>, number][]) {
      this.setFin(fin, angle);
    }
    
    // Set motor speed
    this.setMotor(motor);
  }

  private handleError(error: any) {
    throw error;
  }
}

async function main() {
  await ActuatorNode.initialize();
}

main().catch(console.error);
