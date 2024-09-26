import { Node } from '../../lib/node-services';
import { imuData } from '../../topics/generated/topics/topics';
import * as i2c from 'i2c-bus';

// BNO055 Register addresses
const BNO055_CHIP_ID_ADDR = 0x00;
const BNO055_ACCEL_DATA_X_LSB_ADDR = 0x08;
const BNO055_MAG_DATA_X_LSB_ADDR = 0x0E;
const BNO055_GYRO_DATA_X_LSB_ADDR = 0x14;
const BNO055_EUL_DATA_X_LSB_ADDR = 0x1A;
const BNO055_QUATERNION_DATA_W_LSB_ADDR = 0x20;
const BNO055_LINEAR_ACCEL_DATA_X_LSB_ADDR = 0x28;
const BNO055_GRAVITY_DATA_X_LSB_ADDR = 0x2E;
const BNO055_TEMP_ADDR = 0x34;
const BNO055_CALIB_STAT_ADDR = 0x35;
const BNO055_SYS_TRIGGER_ADDR = 0x3F;
const BNO055_PWR_MODE_ADDR = 0x3E;
const BNO055_OPR_MODE_ADDR = 0x3D;

// BNO055 Operation modes
const OPERATION_MODE_CONFIG = 0x00;
const OPERATION_MODE_NDOF = 0x0C;

class BNO055 {
  private i2c: any;
  private address: number;

  constructor(busNumber: number, address: number) {
    this.address = address;
    this.i2c = i2c.openSync(busNumber);
  }

  async initialize() {
    // Set to CONFIG mode
    await this.write(BNO055_OPR_MODE_ADDR, OPERATION_MODE_CONFIG);
    
    // Trigger reset
    await this.write(BNO055_SYS_TRIGGER_ADDR, 0x20);
    
    // Wait for reset to complete
    await new Promise(resolve => setTimeout(resolve, 650));
    
    // Set to normal power mode
    await this.write(BNO055_PWR_MODE_ADDR, 0x00);
    
    // Set to NDOF mode
    await this.write(BNO055_OPR_MODE_ADDR, OPERATION_MODE_NDOF);
    
    // Wait for the sensor to be ready
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  async read(register: number, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.i2c.readI2cBlock(this.address, register, length, Buffer.alloc(length), (err: Error, bytesRead: number, buffer: Buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });
  }

  async write(register: number, byte: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.i2c.writeByte(this.address, register, byte, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getData(): Promise<imuData> {
    const accelData = await this.read(BNO055_ACCEL_DATA_X_LSB_ADDR, 6);
    const magData = await this.read(BNO055_MAG_DATA_X_LSB_ADDR, 6);
    const gyroData = await this.read(BNO055_GYRO_DATA_X_LSB_ADDR, 6);
    const quatData = await this.read(BNO055_QUATERNION_DATA_W_LSB_ADDR, 8);
    const linaData = await this.read(BNO055_LINEAR_ACCEL_DATA_X_LSB_ADDR, 6);
    const gravData = await this.read(BNO055_GRAVITY_DATA_X_LSB_ADDR, 6);
    const tempData = await this.read(BNO055_TEMP_ADDR, 1);
    const calibData = await this.read(BNO055_CALIB_STAT_ADDR, 1);

    return {
      acceleration: {
        x: accelData.readInt16LE(0) / 100.0,
        y: accelData.readInt16LE(2) / 100.0,
        z: accelData.readInt16LE(4) / 100.0,
      },
      magnetometer: {
        x: magData.readInt16LE(0) / 16.0,
        y: magData.readInt16LE(2) / 16.0,
        z: magData.readInt16LE(4) / 16.0,
      },
      gyroscope: {
        x: gyroData.readInt16LE(0) / 16.0,
        y: gyroData.readInt16LE(2) / 16.0,
        z: gyroData.readInt16LE(4) / 16.0,
      },
      orientation: {
        w: quatData.readInt16LE(0) / 16384.0,
        x: quatData.readInt16LE(2) / 16384.0,
        y: quatData.readInt16LE(4) / 16384.0,
        z: quatData.readInt16LE(6) / 16384.0,
      },
      linearAcceleration: {
        x: linaData.readInt16LE(0) / 100.0,
        y: linaData.readInt16LE(2) / 100.0,
        z: linaData.readInt16LE(4) / 100.0,
      },
      gravity: {
        x: gravData.readInt16LE(0) / 100.0,
        y: gravData.readInt16LE(2) / 100.0,
        z: gravData.readInt16LE(4) / 100.0,
      },
      temperature: tempData.readInt8(0),
      calibrationStatus: calibData.readUInt8(0),
    };
  }
}

async function main() {
  console.log('Initializing BNO055 IMU node');
  const node = await Node.create({ rate: 100, name: "bno055_imu_node" });
  const topic = await node.createTopicPublisher("auv.hardware.imu", imuData);
  console.log('Created topic');

  const bno055 = new BNO055(1, 0x29); // Using I2C bus 1 and default address 0x28
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