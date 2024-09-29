import { Quaternion, gpsData, imuData, Vector3 } from '../../topics/generated/topics/topics';

export interface State {
    x: number;  // x position in local coordinates
    y: number;  // y position in local coordinates
    z: number;  // depth
    v: number;  // forward velocity
    qw: number; // quaternion w component
    qx: number; // quaternion x component
    qy: number; // quaternion y component
    qz: number; // quaternion z component
}

export interface GPSReference {
    latitude: number;
    longitude: number;
    //negative altitudes mean underneath MSL, just remember depth will be positive as depth increases
    altitude: number;
}

export class EKFPositionEstimator {
    public lastGpsFixTime = 0;

    private state: State;
    private covariance: number[][] = [
        [100, 0, 0, 0, 0, 0, 0, 0],
        [0, 100, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 10, 0, 0, 0, 0],
        [0, 0, 0, 0, 0.1, 0, 0, 0],
        [0, 0, 0, 0, 0, 0.1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0.1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0.1]
    ];
    private gpsReference: GPSReference | null = null;
    private earthRadius = 6371000; // meters

    private lastPrediction = Date.now();
    constructor(gps: gpsData) {

        if (!EKFPositionEstimator.fixSufficient(gps)) {
            throw new Error("EKF Initialized without good GPS fix")
        }

        this.gpsReference = {
            latitude: gps.latitude!,
            longitude: gps.longitude!,
            altitude: gps.altitude!
        };

        this.state = { x: 0, y: 0, z: -gps.altitude, v: 0, qw: 1, qx: 0, qy: 0, qz: 0 };
        this.state.x = 0;
        this.state.y = 0;
        this.state.z = -gps.altitude!;
        this.lastGpsFixTime = Date.now();
        return;
    }

    static fixSufficient(gps: gpsData):  gps is gpsData & { altitude: number; fix: 'FIX_3D'; } {
        if (gps.linkQuality !== 'excellent' && gps.linkQuality !== 'good'){
            console.log('insufficient link quality of ', gps.linkQuality)
            return false;
        }
        if (gps.fix !== "FIX_3D"){
            console.log('insufficient fix of ', gps.fix)
            return false;
        }

        if (gps.altitude === undefined){
            console.log('insufficient altitude of ', gps.altitude)
            return false;
        }
        return true;
    }

    predict(imu: imuData) {
        // Time since last prediction
        const now = Date.now();
        const dt = (now - this.lastPrediction) / 1000;
        this.lastPrediction = now;
    
        if (!imu.orientation || !imu.linearAcceleration) return;
    
        // Update orientation directly from IMU
        this.state.qw = imu.orientation.w;
        this.state.qx = imu.orientation.x;
        this.state.qy = imu.orientation.y;
        this.state.qz = imu.orientation.z;
    
        const R = this.quaternionToRotationMatrix(imu.orientation);
        const forwardVector = [R[0][0], R[1][0], R[2][0]];
        
        // Project acceleration onto forward direction
        const forwardAcc = imu.linearAcceleration.x * forwardVector[0] + 
                           imu.linearAcceleration.y * forwardVector[1] + 
                           imu.linearAcceleration.z * forwardVector[2];
    
        // Update position and velocity
        this.state.x += this.state.v * forwardVector[0] * dt;
        this.state.y += this.state.v * forwardVector[1] * dt;
        this.state.z += this.state.v * forwardVector[2] * dt;
        this.state.v += forwardAcc * dt;
    
        // Jacobian of state transition function
        const F = this.getStateTransitionJacobian(dt, forwardVector, forwardAcc);
    
        // Process noise covariance
        const Q = this.getProcessNoiseMatrix(dt);
    
        // Predict covariance
        this.covariance = this.matrixAdd(
            this.matrixMultiply(this.matrixMultiply(F, this.covariance), this.transposeMatrix(F)),
            Q
        );
    }

    updateGPS(gps: gpsData) {
        console.log('updating gps with ', gps)
        if (gps.linkQuality !== 'excellent' && gps.linkQuality !== 'good') return;


        const [x, y] = this.gpsToLocal(gps.latitude!, gps.longitude!);
        const z = -gps.altitude!;

        const H = [
            [1, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0]
        ];

        const measurement = [x, y, z];
        const predicted = [this.state.x, this.state.y, this.state.z];
        const innovation = this.vectorSubtract(measurement, predicted);

        const R = this.getGPSMeasurementNoiseMatrix(gps);
        this.updateState(H, innovation, R);
        this.lastGpsFixTime = Date.now();
    }

    updateDepth(depth: number) {
        const H = [[0, 0, 1, 0, 0, 0, 0, 0]];
        const innovation = [depth - this.state.z];
        const R = [[0.01]]; // Very low measurement noise for depth
        this.updateState(H, innovation, R);
    }

    updateIMU(imu: imuData) {

        if (!imu.orientation || !imu.linearAcceleration){
            return;
        }
        // Update orientation directly
        this.state.qw = imu.orientation.w;
        this.state.qx = imu.orientation.x;
        this.state.qy = imu.orientation.y;
        this.state.qz = imu.orientation.z;

    
        // Use linear acceleration to update velocity estimate
        const R = this.quaternionToRotationMatrix(imu.orientation);
        const forwardVector = [R[0][0], R[1][0], R[2][0]];
        const forwardAcc = imu.linearAcceleration.x * forwardVector[0] + 
                           imu.linearAcceleration.y * forwardVector[1] + 
                           imu.linearAcceleration.z * forwardVector[2];

        const H = [[0, 0, 0, 1, 0, 0, 0, 0]];
        const innovation = [forwardAcc - this.state.v];
        const RMatrix = [[this.getIMUMeasurementNoise(imu)]];
        this.updateState(H, innovation, RMatrix);
    }

    updateVelocity(speed: number) {
        const H = [[0, 0, 0, 1, 0, 0, 0, 0]];
        const innovation = [speed - this.state.v];
        const R = [[0.1]]; // Adjust based on velocity measurement noise
        this.updateState(H, innovation, R);
    }

    private updateState(H: number[][], innovation: number[], R: number[][]) {
        console.log('updating state', arguments)
        const S = this.matrixAdd(
            this.matrixMultiply(this.matrixMultiply(H, this.covariance), this.transposeMatrix(H)),
            R
        );
        const K = this.matrixMultiply(
            this.matrixMultiply(this.covariance, this.transposeMatrix(H)),
            this.inverseMatrix(S)
        );
        console.log('calculating state update')
        const stateUpdate = this.matrixMultiply(K, [innovation]);
        this.state.x += stateUpdate[0][0];
        this.state.y += stateUpdate[1][0];
        this.state.z += stateUpdate[2][0];
        this.state.v += stateUpdate[3][0];
        this.state.qw += stateUpdate[4][0];
        this.state.qx += stateUpdate[5][0];
        this.state.qy += stateUpdate[6][0];
        this.state.qz += stateUpdate[7][0];

        this.normalizeQuaternion();

        const I = this.identityMatrix(8);
        console.log('calculating covariance')
        this.covariance = this.matrixMultiply(
            this.matrixSubtract(I, this.matrixMultiply(K, H)),
            this.covariance
        );
    }

    private getStateTransitionJacobian(dt: number, forwardVector: number[], forwardAcc: number): number[][] {
        const F = this.identityMatrix(8);
        // Position update
        F[0][3] = forwardVector[0] * dt;
        F[1][3] = forwardVector[1] * dt;
        F[2][3] = forwardVector[2] * dt;
        // Velocity update
        F[3][3] = 1;
        // Acceleration effect on velocity
        F[3][3] += forwardAcc * dt;
        // Orientation update is from IMU so we dont touch it here (handled directly by IMU)
        return F;
    }
    
    private getProcessNoiseMatrix(dt: number): number[][] {
        const q_pos = 0.1;   // Process noise parameter for position
        const q_vel = 0.1;   // Process noise parameter for velocity
        const q_orient = 0.01; // Process noise parameter for orientation
    
        const Q = this.zeros(8, 8);
        for (let i = 0; i < 3; i++) {
            Q[i][i] = q_pos * dt**4 / 4;
            Q[i][3] = q_pos * dt**3 / 2;
            Q[3][i] = q_pos * dt**3 / 2;
        }
        Q[3][3] = q_vel * dt**2;
        for (let i = 4; i < 8; i++) {
            Q[i][i] = q_orient * dt**2;
        }
        return Q;
    }

    private getGPSMeasurementNoiseMatrix(gps: gpsData): number[][] {
        let r = 10; // Base GPS noise
        if (gps.fix === 'excellent') r = 5;
        else if (gps.fix === 'good') r = 10;
        else r = 20;

        return [
            [r, 0, 0],
            [0, r, 0],
            [0, 0, r]
        ];
    }

    private getIMUMeasurementNoise(imu: imuData): number {
        // This could be adjusted based on IMU calibration status or other factors
        return 0.1;
    }

    private gpsToLocal(lat: number, lon: number): [number, number] {
        const dLat = (lat - this.gpsReference!.latitude) * Math.PI / 180;
        const dLon = (lon - this.gpsReference!.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.gpsReference!.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = this.earthRadius * c;

        const y = Math.sin(dLon) * Math.cos(lat * Math.PI / 180);
        const x = Math.cos(this.gpsReference!.latitude * Math.PI / 180) * Math.sin(lat * Math.PI / 180) -
                Math.sin(this.gpsReference!.latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos(dLon);
        const bearing = Math.atan2(y, x);

        return [
            distance * Math.sin(bearing),
            distance * Math.cos(bearing)
        ];
    }

    private localToGPS(x: number, y: number): [number, number] {
        const distance = Math.sqrt(x*x + y*y);
        const bearing = Math.atan2(x, y);

        const lat1 = this.gpsReference!.latitude * Math.PI / 180;
        const lon1 = this.gpsReference!.longitude * Math.PI / 180;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(distance / this.earthRadius) +
            Math.cos(lat1) * Math.sin(distance / this.earthRadius) * Math.cos(bearing)
        );

        const lon2 = lon1 + Math.atan2(
            Math.sin(bearing) * Math.sin(distance / this.earthRadius) * Math.cos(lat1),
            Math.cos(distance / this.earthRadius) - Math.sin(lat1) * Math.sin(lat2)
        );

        return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
    }

    getState(): State {
        return { ...this.state };
    }

    getGlobalPosition(): { latitude: number, longitude: number, altitude: number }  {
        if (!this.gpsReference) {
            throw new Error('Asked to compute global GPS reference without one ever being recorded')
        };
        const [lat, lon] = this.localToGPS(this.state.x, this.state.y);
        return {
            latitude: lat,
            longitude: lon,
            altitude: -this.state.z
        };
    }

    private quaternionToRotationMatrix(q: Quaternion): number[][] {
        const { x,  y,  z,  w } = q;
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w, 2*x*z + 2*y*w],
            [2*x*y + 2*z*w, 1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w],
            [2*x*z - 2*y*w, 2*y*z + 2*x*w, 1 - 2*x*x - 2*y*y]
        ];
    }

    private angularVelocityToQuaternion(angularVelocity: Vector3, dt: number): Quaternion {
        const magnitude = Math.sqrt(angularVelocity.x**2 + angularVelocity.y**2 + angularVelocity.z**2);
        if (magnitude < 1e-8) {
            return { w: 1, x: 0, y: 0, z: 0 };
        }
        const angle = magnitude * dt;
        const s = Math.sin(angle / 2) / magnitude;
        return {
            w: Math.cos(angle / 2),
            x: angularVelocity.x * s,
            y: angularVelocity.y * s,
            z: angularVelocity.z * s
        };
    }

    private normalizeQuaternion() {
        const magnitude = Math.sqrt(
            this.state.qw**2 + this.state.qx**2 + this.state.qy**2 + this.state.qz**2
        );
        this.state.qw /= magnitude;
        this.state.qx /= magnitude;
        this.state.qy /= magnitude;
        this.state.qz /= magnitude;
    }

    // Matrix operations
    private matrixMultiply(a: number[][], b: number[][]): number[][] {
        // Ensure the matrices can be multiplied: columns of 'a' must equal rows of 'b'
        if (a[0].length !== b.length) {
            throw new Error('Number of columns in matrix A must match the number of rows in matrix B');
        }
    
        const result: number[][] = [];
        for (let i = 0; i < a.length; i++) {
            result[i] = [];
            for (let j = 0; j < b[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < a[0].length; k++) {
                    // console.log('ai is ', a[i], 'and bk is', b[k], `at indexes i${i}, k${k}, and j${j}`)
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    private vectorSubtract(a: number[], b: number[]): number[] {
        return a.map((val, i) => val - b[i]);
    }

    private matrixAdd(a: number[][], b: number[][]): number[][] {
        return a.map((row, i) => row.map((val, j) => val + b[i][j]));
    }

    private matrixSubtract(a: number[][], b: number[][]): number[][] {
        return a.map((row, i) => row.map((val, j) => val - b[i][j]));
    }

    private transposeMatrix(m: number[][]): number[][] {
        return m[0].map((_, i) => m.map(row => row[i]));
    }

    private inverseMatrix(m: number[][]): number[][] {
        // Assuming m is a 3x3 matrix for GPS and IMU updates
        const det = 
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
            m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
            m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

        const invDet = 1 / det;
        return [
            [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * invDet, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet],
            [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) * invDet, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * invDet],
            [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * invDet, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet]
        ];
    }

    private identityMatrix(size: number): number[][] {
        return Array(size).fill(0).map((_, i) => Array(size).fill(0).map((_, j) => i === j ? 1 : 0));
    }

    private zeros(rows: number, cols: number): number[][] {
        return Array(rows).fill(0).map(() => Array(cols).fill(0));
    }

    private scalarMultiply(a: number[], b: number): number[] {
        return a.map(val => val * b);
    }
}