// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.2.0
//   protoc               v3.20.3
// source: topics/topics.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";

export const protobufPackage = "topics";

export interface helloWorld {
  message: string;
}

export interface leakSensor {
  isLeaking: boolean;
}

export interface imuData {
  acceleration?: Vector3 | undefined;
  magnetometer?: Vector3 | undefined;
  gyroscope?: Vector3 | undefined;
  orientation?: Quaternion | undefined;
  linearAcceleration?: Vector3 | undefined;
  gravity?: Vector3 | undefined;
  temperature: number;
  calibrationStatus?: imuData_CalibrationStatus | undefined;
}

export interface imuData_CalibrationStatus {
  sys: number;
  gyro: number;
  accel: number;
  mag: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface gpsData {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  satellites: number;
  hdop: number;
  fix: string;
  linkQuality: string;
}

function createBasehelloWorld(): helloWorld {
  return { message: "" };
}

export const helloWorld: MessageFns<helloWorld> = {
  encode(message: helloWorld, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.message !== "") {
      writer.uint32(10).string(message.message);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): helloWorld {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasehelloWorld();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.message = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): helloWorld {
    return { message: isSet(object.message) ? globalThis.String(object.message) : "" };
  },

  toJSON(message: helloWorld): unknown {
    const obj: any = {};
    if (message.message !== "") {
      obj.message = message.message;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<helloWorld>, I>>(base?: I): helloWorld {
    return helloWorld.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<helloWorld>, I>>(object: I): helloWorld {
    const message = createBasehelloWorld();
    message.message = object.message ?? "";
    return message;
  },
};

function createBaseleakSensor(): leakSensor {
  return { isLeaking: false };
}

export const leakSensor: MessageFns<leakSensor> = {
  encode(message: leakSensor, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.isLeaking !== false) {
      writer.uint32(8).bool(message.isLeaking);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): leakSensor {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseleakSensor();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.isLeaking = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): leakSensor {
    return { isLeaking: isSet(object.isLeaking) ? globalThis.Boolean(object.isLeaking) : false };
  },

  toJSON(message: leakSensor): unknown {
    const obj: any = {};
    if (message.isLeaking !== false) {
      obj.isLeaking = message.isLeaking;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<leakSensor>, I>>(base?: I): leakSensor {
    return leakSensor.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<leakSensor>, I>>(object: I): leakSensor {
    const message = createBaseleakSensor();
    message.isLeaking = object.isLeaking ?? false;
    return message;
  },
};

function createBaseimuData(): imuData {
  return {
    acceleration: undefined,
    magnetometer: undefined,
    gyroscope: undefined,
    orientation: undefined,
    linearAcceleration: undefined,
    gravity: undefined,
    temperature: 0,
    calibrationStatus: undefined,
  };
}

export const imuData: MessageFns<imuData> = {
  encode(message: imuData, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.acceleration !== undefined) {
      Vector3.encode(message.acceleration, writer.uint32(18).fork()).join();
    }
    if (message.magnetometer !== undefined) {
      Vector3.encode(message.magnetometer, writer.uint32(26).fork()).join();
    }
    if (message.gyroscope !== undefined) {
      Vector3.encode(message.gyroscope, writer.uint32(34).fork()).join();
    }
    if (message.orientation !== undefined) {
      Quaternion.encode(message.orientation, writer.uint32(42).fork()).join();
    }
    if (message.linearAcceleration !== undefined) {
      Vector3.encode(message.linearAcceleration, writer.uint32(50).fork()).join();
    }
    if (message.gravity !== undefined) {
      Vector3.encode(message.gravity, writer.uint32(58).fork()).join();
    }
    if (message.temperature !== 0) {
      writer.uint32(65).double(message.temperature);
    }
    if (message.calibrationStatus !== undefined) {
      imuData_CalibrationStatus.encode(message.calibrationStatus, writer.uint32(74).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): imuData {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseimuData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          if (tag !== 18) {
            break;
          }

          message.acceleration = Vector3.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.magnetometer = Vector3.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.gyroscope = Vector3.decode(reader, reader.uint32());
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.orientation = Quaternion.decode(reader, reader.uint32());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.linearAcceleration = Vector3.decode(reader, reader.uint32());
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.gravity = Vector3.decode(reader, reader.uint32());
          continue;
        case 8:
          if (tag !== 65) {
            break;
          }

          message.temperature = reader.double();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.calibrationStatus = imuData_CalibrationStatus.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): imuData {
    return {
      acceleration: isSet(object.acceleration) ? Vector3.fromJSON(object.acceleration) : undefined,
      magnetometer: isSet(object.magnetometer) ? Vector3.fromJSON(object.magnetometer) : undefined,
      gyroscope: isSet(object.gyroscope) ? Vector3.fromJSON(object.gyroscope) : undefined,
      orientation: isSet(object.orientation) ? Quaternion.fromJSON(object.orientation) : undefined,
      linearAcceleration: isSet(object.linearAcceleration) ? Vector3.fromJSON(object.linearAcceleration) : undefined,
      gravity: isSet(object.gravity) ? Vector3.fromJSON(object.gravity) : undefined,
      temperature: isSet(object.temperature) ? globalThis.Number(object.temperature) : 0,
      calibrationStatus: isSet(object.calibrationStatus)
        ? imuData_CalibrationStatus.fromJSON(object.calibrationStatus)
        : undefined,
    };
  },

  toJSON(message: imuData): unknown {
    const obj: any = {};
    if (message.acceleration !== undefined) {
      obj.acceleration = Vector3.toJSON(message.acceleration);
    }
    if (message.magnetometer !== undefined) {
      obj.magnetometer = Vector3.toJSON(message.magnetometer);
    }
    if (message.gyroscope !== undefined) {
      obj.gyroscope = Vector3.toJSON(message.gyroscope);
    }
    if (message.orientation !== undefined) {
      obj.orientation = Quaternion.toJSON(message.orientation);
    }
    if (message.linearAcceleration !== undefined) {
      obj.linearAcceleration = Vector3.toJSON(message.linearAcceleration);
    }
    if (message.gravity !== undefined) {
      obj.gravity = Vector3.toJSON(message.gravity);
    }
    if (message.temperature !== 0) {
      obj.temperature = message.temperature;
    }
    if (message.calibrationStatus !== undefined) {
      obj.calibrationStatus = imuData_CalibrationStatus.toJSON(message.calibrationStatus);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<imuData>, I>>(base?: I): imuData {
    return imuData.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<imuData>, I>>(object: I): imuData {
    const message = createBaseimuData();
    message.acceleration = (object.acceleration !== undefined && object.acceleration !== null)
      ? Vector3.fromPartial(object.acceleration)
      : undefined;
    message.magnetometer = (object.magnetometer !== undefined && object.magnetometer !== null)
      ? Vector3.fromPartial(object.magnetometer)
      : undefined;
    message.gyroscope = (object.gyroscope !== undefined && object.gyroscope !== null)
      ? Vector3.fromPartial(object.gyroscope)
      : undefined;
    message.orientation = (object.orientation !== undefined && object.orientation !== null)
      ? Quaternion.fromPartial(object.orientation)
      : undefined;
    message.linearAcceleration = (object.linearAcceleration !== undefined && object.linearAcceleration !== null)
      ? Vector3.fromPartial(object.linearAcceleration)
      : undefined;
    message.gravity = (object.gravity !== undefined && object.gravity !== null)
      ? Vector3.fromPartial(object.gravity)
      : undefined;
    message.temperature = object.temperature ?? 0;
    message.calibrationStatus = (object.calibrationStatus !== undefined && object.calibrationStatus !== null)
      ? imuData_CalibrationStatus.fromPartial(object.calibrationStatus)
      : undefined;
    return message;
  },
};

function createBaseimuData_CalibrationStatus(): imuData_CalibrationStatus {
  return { sys: 0, gyro: 0, accel: 0, mag: 0 };
}

export const imuData_CalibrationStatus: MessageFns<imuData_CalibrationStatus> = {
  encode(message: imuData_CalibrationStatus, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.sys !== 0) {
      writer.uint32(8).uint32(message.sys);
    }
    if (message.gyro !== 0) {
      writer.uint32(16).uint32(message.gyro);
    }
    if (message.accel !== 0) {
      writer.uint32(24).uint32(message.accel);
    }
    if (message.mag !== 0) {
      writer.uint32(32).uint32(message.mag);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): imuData_CalibrationStatus {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseimuData_CalibrationStatus();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.sys = reader.uint32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.gyro = reader.uint32();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.accel = reader.uint32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.mag = reader.uint32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): imuData_CalibrationStatus {
    return {
      sys: isSet(object.sys) ? globalThis.Number(object.sys) : 0,
      gyro: isSet(object.gyro) ? globalThis.Number(object.gyro) : 0,
      accel: isSet(object.accel) ? globalThis.Number(object.accel) : 0,
      mag: isSet(object.mag) ? globalThis.Number(object.mag) : 0,
    };
  },

  toJSON(message: imuData_CalibrationStatus): unknown {
    const obj: any = {};
    if (message.sys !== 0) {
      obj.sys = Math.round(message.sys);
    }
    if (message.gyro !== 0) {
      obj.gyro = Math.round(message.gyro);
    }
    if (message.accel !== 0) {
      obj.accel = Math.round(message.accel);
    }
    if (message.mag !== 0) {
      obj.mag = Math.round(message.mag);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<imuData_CalibrationStatus>, I>>(base?: I): imuData_CalibrationStatus {
    return imuData_CalibrationStatus.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<imuData_CalibrationStatus>, I>>(object: I): imuData_CalibrationStatus {
    const message = createBaseimuData_CalibrationStatus();
    message.sys = object.sys ?? 0;
    message.gyro = object.gyro ?? 0;
    message.accel = object.accel ?? 0;
    message.mag = object.mag ?? 0;
    return message;
  },
};

function createBaseVector3(): Vector3 {
  return { x: 0, y: 0, z: 0 };
}

export const Vector3: MessageFns<Vector3> = {
  encode(message: Vector3, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.x !== 0) {
      writer.uint32(9).double(message.x);
    }
    if (message.y !== 0) {
      writer.uint32(17).double(message.y);
    }
    if (message.z !== 0) {
      writer.uint32(25).double(message.z);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): Vector3 {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVector3();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 9) {
            break;
          }

          message.x = reader.double();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.y = reader.double();
          continue;
        case 3:
          if (tag !== 25) {
            break;
          }

          message.z = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Vector3 {
    return {
      x: isSet(object.x) ? globalThis.Number(object.x) : 0,
      y: isSet(object.y) ? globalThis.Number(object.y) : 0,
      z: isSet(object.z) ? globalThis.Number(object.z) : 0,
    };
  },

  toJSON(message: Vector3): unknown {
    const obj: any = {};
    if (message.x !== 0) {
      obj.x = message.x;
    }
    if (message.y !== 0) {
      obj.y = message.y;
    }
    if (message.z !== 0) {
      obj.z = message.z;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Vector3>, I>>(base?: I): Vector3 {
    return Vector3.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Vector3>, I>>(object: I): Vector3 {
    const message = createBaseVector3();
    message.x = object.x ?? 0;
    message.y = object.y ?? 0;
    message.z = object.z ?? 0;
    return message;
  },
};

function createBaseQuaternion(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 0 };
}

export const Quaternion: MessageFns<Quaternion> = {
  encode(message: Quaternion, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.x !== 0) {
      writer.uint32(9).double(message.x);
    }
    if (message.y !== 0) {
      writer.uint32(17).double(message.y);
    }
    if (message.z !== 0) {
      writer.uint32(25).double(message.z);
    }
    if (message.w !== 0) {
      writer.uint32(33).double(message.w);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): Quaternion {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQuaternion();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 9) {
            break;
          }

          message.x = reader.double();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.y = reader.double();
          continue;
        case 3:
          if (tag !== 25) {
            break;
          }

          message.z = reader.double();
          continue;
        case 4:
          if (tag !== 33) {
            break;
          }

          message.w = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Quaternion {
    return {
      x: isSet(object.x) ? globalThis.Number(object.x) : 0,
      y: isSet(object.y) ? globalThis.Number(object.y) : 0,
      z: isSet(object.z) ? globalThis.Number(object.z) : 0,
      w: isSet(object.w) ? globalThis.Number(object.w) : 0,
    };
  },

  toJSON(message: Quaternion): unknown {
    const obj: any = {};
    if (message.x !== 0) {
      obj.x = message.x;
    }
    if (message.y !== 0) {
      obj.y = message.y;
    }
    if (message.z !== 0) {
      obj.z = message.z;
    }
    if (message.w !== 0) {
      obj.w = message.w;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Quaternion>, I>>(base?: I): Quaternion {
    return Quaternion.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Quaternion>, I>>(object: I): Quaternion {
    const message = createBaseQuaternion();
    message.x = object.x ?? 0;
    message.y = object.y ?? 0;
    message.z = object.z ?? 0;
    message.w = object.w ?? 0;
    return message;
  },
};

function createBasegpsData(): gpsData {
  return {
    timestamp: 0,
    latitude: 0,
    longitude: 0,
    altitude: 0,
    speed: 0,
    course: 0,
    satellites: 0,
    hdop: 0,
    fix: "",
    linkQuality: "",
  };
}

export const gpsData: MessageFns<gpsData> = {
  encode(message: gpsData, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.timestamp !== 0) {
      writer.uint32(9).double(message.timestamp);
    }
    if (message.latitude !== 0) {
      writer.uint32(17).double(message.latitude);
    }
    if (message.longitude !== 0) {
      writer.uint32(25).double(message.longitude);
    }
    if (message.altitude !== 0) {
      writer.uint32(33).double(message.altitude);
    }
    if (message.speed !== 0) {
      writer.uint32(41).double(message.speed);
    }
    if (message.course !== 0) {
      writer.uint32(49).double(message.course);
    }
    if (message.satellites !== 0) {
      writer.uint32(56).int32(message.satellites);
    }
    if (message.hdop !== 0) {
      writer.uint32(65).double(message.hdop);
    }
    if (message.fix !== "") {
      writer.uint32(74).string(message.fix);
    }
    if (message.linkQuality !== "") {
      writer.uint32(82).string(message.linkQuality);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): gpsData {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasegpsData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 9) {
            break;
          }

          message.timestamp = reader.double();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.latitude = reader.double();
          continue;
        case 3:
          if (tag !== 25) {
            break;
          }

          message.longitude = reader.double();
          continue;
        case 4:
          if (tag !== 33) {
            break;
          }

          message.altitude = reader.double();
          continue;
        case 5:
          if (tag !== 41) {
            break;
          }

          message.speed = reader.double();
          continue;
        case 6:
          if (tag !== 49) {
            break;
          }

          message.course = reader.double();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.satellites = reader.int32();
          continue;
        case 8:
          if (tag !== 65) {
            break;
          }

          message.hdop = reader.double();
          continue;
        case 9:
          if (tag !== 74) {
            break;
          }

          message.fix = reader.string();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.linkQuality = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): gpsData {
    return {
      timestamp: isSet(object.timestamp) ? globalThis.Number(object.timestamp) : 0,
      latitude: isSet(object.latitude) ? globalThis.Number(object.latitude) : 0,
      longitude: isSet(object.longitude) ? globalThis.Number(object.longitude) : 0,
      altitude: isSet(object.altitude) ? globalThis.Number(object.altitude) : 0,
      speed: isSet(object.speed) ? globalThis.Number(object.speed) : 0,
      course: isSet(object.course) ? globalThis.Number(object.course) : 0,
      satellites: isSet(object.satellites) ? globalThis.Number(object.satellites) : 0,
      hdop: isSet(object.hdop) ? globalThis.Number(object.hdop) : 0,
      fix: isSet(object.fix) ? globalThis.String(object.fix) : "",
      linkQuality: isSet(object.linkQuality) ? globalThis.String(object.linkQuality) : "",
    };
  },

  toJSON(message: gpsData): unknown {
    const obj: any = {};
    if (message.timestamp !== 0) {
      obj.timestamp = message.timestamp;
    }
    if (message.latitude !== 0) {
      obj.latitude = message.latitude;
    }
    if (message.longitude !== 0) {
      obj.longitude = message.longitude;
    }
    if (message.altitude !== 0) {
      obj.altitude = message.altitude;
    }
    if (message.speed !== 0) {
      obj.speed = message.speed;
    }
    if (message.course !== 0) {
      obj.course = message.course;
    }
    if (message.satellites !== 0) {
      obj.satellites = Math.round(message.satellites);
    }
    if (message.hdop !== 0) {
      obj.hdop = message.hdop;
    }
    if (message.fix !== "") {
      obj.fix = message.fix;
    }
    if (message.linkQuality !== "") {
      obj.linkQuality = message.linkQuality;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<gpsData>, I>>(base?: I): gpsData {
    return gpsData.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<gpsData>, I>>(object: I): gpsData {
    const message = createBasegpsData();
    message.timestamp = object.timestamp ?? 0;
    message.latitude = object.latitude ?? 0;
    message.longitude = object.longitude ?? 0;
    message.altitude = object.altitude ?? 0;
    message.speed = object.speed ?? 0;
    message.course = object.course ?? 0;
    message.satellites = object.satellites ?? 0;
    message.hdop = object.hdop ?? 0;
    message.fix = object.fix ?? "";
    message.linkQuality = object.linkQuality ?? "";
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
  fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
