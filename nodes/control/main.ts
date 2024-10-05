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
    const self = new ActuatorNode();
    console.log('initializing actuator node');
    self.node = await Node.create({
      name: 'actuator-node',
    });

    self.actuatorTopic = self.node.createTopicSubscriber(
      'auv.control.actuators',
      actuatorCommand
    );

    self.actuatorTopic.on('message', self.handleMessage.bind(self));
    self.actuatorTopic.on('error', self.handleError.bind(self));

    self.i2c = i2cBus.openSync(1);

    const driverOptions: Pca9685Options = {
      i2c: self.i2c,
      address: 0x40,
      frequency: 50, 
      debug: true,
    };

    // promisify the creation of this slightly clunky i2c lib
    self.pwm = await new Promise((resolve, reject) => {
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

    
    // Log all I2C registers after initialization
    await self.logI2CRegisters();

    await self.finTest();

    self.zeroEverything();
    
    // console.log('setting pin 12 to 1500')

    // actuatorNode.pwm.setPulseLength(12, 1500);

    // await actuatorNode.logI2CRegisters();

  }

  zeroEverything() {
    this.setMotor(0);
    ['portStab','topRud','starbStab','bottomRud'].forEach((fin) => {
        this.setFin(fin as Fin, 0);
    })
  }
  
  async logI2CRegisters() {
    console.log('Logging I2C registers for device at 0x40:');
    console.log('Channel | ON time | OFF time | Duty Cycle');
    console.log('--------|---------|----------|------------');

    for (let channel = 0; channel < 16; channel++) {
      const baseRegister = 0x06 + (channel * 4);
      try {
        const onLow = await this.readRegister(baseRegister);
        const onHigh = await this.readRegister(baseRegister + 1);
        const offLow = await this.readRegister(baseRegister + 2);
        const offHigh = await this.readRegister(baseRegister + 3);

        const onTime = (onHigh << 8) | onLow;
        const offTime = (offHigh << 8) | offLow;

        let dutyCycle: number | string;
        if (onTime === 4096) {
          dutyCycle = "100%";
        } else if (offTime === 4096) {
          dutyCycle = "0%";
        } else {
          dutyCycle = ((offTime - onTime) / 4096 * 100).toFixed(2) + "%";
        }

        console.log(`${channel.toString().padStart(7)} | ${onTime.toString().padStart(7)} | ${offTime.toString().padStart(8)} | ${dutyCycle.toString().padStart(10)}`);
      } catch (error) {
        console.error(`Error reading registers for channel ${channel}:`, error);
      }
    }
  }

  private async readRegister(register: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.i2c.readByte(0x40, register, (err, byte) => {
        if (err) reject(err);
        else resolve(byte);
      });
    });
  }

  setFin(fin: Fin, angle: number) {
    // Limit the angle to ±40 degrees
    angle = Math.max(-40, Math.min(40, angle));
    //calculate 1000-2000 pulse length 1000 is 0 degrees, 2000 is 180 degrees
    const pulse = 1500 + (angle / 90) * 500;
    // const dutyCycle = 50 + (angle / 180) * 50;
    const channel = chan[fin];
    this.pwm.setPulseLength(channel, pulse);
    console.log('SET FIN TO ', pulse);
  }

  setMotor(speed: number) {
    this.pwm.setDutyCycle(chan.motor, speed);
  }

  calculateFinAngles(yaw: number, pitch: number, roll: number): { [key in Exclude<keyof typeof chan, 'motor'>]: number } {
    // todo: we should limit pitch and yaw by the amount of roll needed so that we dont lose half of roll authority by maxing out the 40 degree limit
  
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
      // this.logI2CRegisters();
      await sleep(50);
    }
    for (let i = 40; i >= -40; i--) {
      ['portStab','topRud','starbStab','bottomRud'].forEach((fin) => {
        this.setFin(fin as Fin, i);
    })
    // this.logI2CRegisters();
    await sleep(50);
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
