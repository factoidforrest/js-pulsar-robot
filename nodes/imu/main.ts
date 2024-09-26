import * as i2c from 'i2c-bus';
import {Node} from '../../lib/node-services.js';
import {imuData} from '../../topics/generated/topics/topics.js';
import {bno055Registers} from './registers.js';

class BNO055 {
  private readonly i2c: i2c.I2CBus;

  constructor(
    busNumber: number,
    private readonly address: number,
  ) {
    this.i2c = i2c.openSync(busNumber);
  }

  async initialize() {
    // Set to CONFIG mode
    await this.write(
      bno055Registers.BNO055_OPR_MODE_ADDR,
      bno055Registers.OPERATION_MODE_CONFIG,
    );

    // Trigger reset
    await this.write(bno055Registers.BNO055_SYS_TRIGGER_ADDR, 0x20);

    // Wait for reset to complete
    await new Promise((resolve) => setTimeout(resolve, 650));

    // Set to normal power mode
    await this.write(
      bno055Registers.BNO055_PWR_MODE_ADDR,
      bno055Registers.POWER_MODE_NORMAL,
    );

    // Set to NDOF mode
    await this.write(
      bno055Registers.BNO055_OPR_MODE_ADDR,
      bno055Registers.OPERATION_MODE_NDOF,
    );

    // Wait for the sensor to be ready
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  async read(register: number, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.i2c.readI2cBlock(
        this.address,
        register,
        length,
        Buffer.alloc(length),
        (error: Error, bytesRead: number, buffer: Buffer) => {
          if (error) reject(error);
          else resolve(buffer);
        },
      );
    });
  }

  async write(register: number, byte: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.i2c.writeByte(this.address, register, byte, (error: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async getData(): Promise<imuData> {
    const accelData = await this.read(
      bno055Registers.BNO055_ACCEL_DATA_X_LSB_ADDR,
      6,
    );
    const magData = await this.read(
      bno055Registers.BNO055_MAG_DATA_X_LSB_ADDR,
      6,
    );
    const gyroData = await this.read(
      bno055Registers.BNO055_GYRO_DATA_X_LSB_ADDR,
      6,
    );
    const quatData = await this.read(
      bno055Registers.BNO055_QUATERNION_DATA_W_LSB_ADDR,
      8,
    );
    const linaData = await this.read(
      bno055Registers.BNO055_LINEAR_ACCEL_DATA_X_LSB_ADDR,
      6,
    );
    const gravData = await this.read(
      bno055Registers.BNO055_GRAVITY_DATA_X_LSB_ADDR,
      6,
    );
    const temporaryData = await this.read(bno055Registers.BNO055_TEMP_ADDR, 1);
    const calibData = await this.read(
      bno055Registers.BNO055_CALIB_STAT_ADDR,
      1,
    );

    const calibStatusNumber = calibData.readUInt8(0);
    const calibrationStatus = {
      sys: (calibStatusNumber >> 6) & 0x03,
      gyro: (calibStatusNumber >> 4) & 0x03,
      accel: (calibStatusNumber >> 2) & 0x03,
      mag: calibStatusNumber & 0x03,
    };
    return {
      acceleration: {
        x: accelData.readInt16LE(0) / 100,
        y: accelData.readInt16LE(2) / 100,
        z: accelData.readInt16LE(4) / 100,
      },
      magnetometer: {
        x: magData.readInt16LE(0) / 16,
        y: magData.readInt16LE(2) / 16,
        z: magData.readInt16LE(4) / 16,
      },
      gyroscope: {
        x: gyroData.readInt16LE(0) / 16,
        y: gyroData.readInt16LE(2) / 16,
        z: gyroData.readInt16LE(4) / 16,
      },
      orientation: {
        w: quatData.readInt16LE(0) / 16_384,
        x: quatData.readInt16LE(2) / 16_384,
        y: quatData.readInt16LE(4) / 16_384,
        z: quatData.readInt16LE(6) / 16_384,
      },
      linearAcceleration: {
        x: linaData.readInt16LE(0) / 100,
        y: linaData.readInt16LE(2) / 100,
        z: linaData.readInt16LE(4) / 100,
      },
      gravity: {
        x: gravData.readInt16LE(0) / 100,
        y: gravData.readInt16LE(2) / 100,
        z: gravData.readInt16LE(4) / 100,
      },
      temperature: temporaryData.readInt8(0),
      calibrationStatus,
    };
  }
}

async function main() {
  console.log('Initializing BNO055 IMU node');
  const node = await Node.create({rate: 100, name: 'bno055_imu_node'});
  const topic = await node.createTopicPublisher('auv.hardware.imu', imuData);
  console.log('Created topic');

  const bno055 = new BNO055(1, bno055Registers.BNO055_ADDRESS_B); // Using I2C bus 1 and default address
  await bno055.initialize();
  console.log('BNO055 initialized');

  await node.loop(async () => {
    try {
      const data = await bno055.getData();
      await topic.sendMsg(data);
    } catch (error) {
      console.error('Error reading BNO055 data:', error);
    }
  });
}

main().catch(console.error);
