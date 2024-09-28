import {Quaternion } from '../../topics/generated/topics/topics';

export interface State {
    x: number;  // x position in local coordinates
    y: number;  // y position in local coordinates
    z: number;  // depth
    vx: number; // velocity in x direction
    vy: number; // velocity in y direction
}

export interface GPSReference {
    latitude: number;
    longitude: number;
    altitude: number;
}

export class EKFPositionEstimator {
    private state: State = { x: 0, y: 0, z: 0, vx: 0, vy: 0 };
    private covariance: number[][] = [
        [100, 0, 0, 0, 0],
        [0, 100, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 10, 0],
        [0, 0, 0, 0, 10]
    ];
    private gpsReference: GPSReference | null = null;
    private earthRadius = 6371000; // meters

    predict(dt: number, orientation: Quaternion) {
        const R = this.quaternionToRotationMatrix(orientation);
        
        // State transition matrix
        const F = [
            [1, 0, 0, dt, 0],
            [0, 1, 0, 0, dt],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];

        // Predict state
        this.state.x += this.state.vx * dt;
        this.state.y += this.state.vy * dt;

        // Predict covariance
        const Q = this.getProcessNoiseMatrix(dt);
        this.covariance = this.matrixAdd(
            this.matrixMultiply(this.matrixMultiply(F, this.covariance), this.transposeMatrix(F)),
            Q
        );
    }
    updateGPS(gps: gpsData) {
      if (!this.gpsReference) {
          if (gps.fix === 'excellent' || gps.fix === 'good') {
              this.gpsReference = {
                  latitude: gps.latitude!,
                  longitude: gps.longitude!,
                  altitude: gps.altitude!
              };
              this.state = { x: 0, y: 0, z: -gps.altitude!, vx: 0, vy: 0 };
          }
          return;
      }

      const [x, y] = this.gpsToLocal(gps.latitude!, gps.longitude!);
      const z = -gps.altitude!;

      const H = [
          [1, 0, 0, 0, 0],
          [0, 1, 0, 0, 0],
          [0, 0, 1, 0, 0]
      ];

      const measurement = [x, y, z];
      const predicted = [this.state.x, this.state.y, this.state.z];
      const innovation = this.vectorSubtract(measurement, predicted);

      const R = this.getGPSMeasurementNoiseMatrix(gps);
      const S = this.matrixAdd(
          this.matrixMultiply(this.matrixMultiply(H, this.covariance), this.transposeMatrix(H)),
          R
      );
      const K = this.matrixMultiply(
          this.matrixMultiply(this.covariance, this.transposeMatrix(H)),
          this.inverseMatrix(S)
      );

      const stateUpdate = this.matrixMultiply(K, [innovation]) as number[][];
      this.state.x += stateUpdate[0][0];
      this.state.y += stateUpdate[1][0];
      this.state.z += stateUpdate[2][0];
      this.state.vx += stateUpdate[3][0];
      this.state.vy += stateUpdate[4][0];

      const I = this.identityMatrix(5);
      this.covariance = this.matrixMultiply(
          this.matrixSubtract(I, this.matrixMultiply(K, H)),
          this.covariance
      );
  }

  updateDepth(depth: number) {
      const H = [[0, 0, 1, 0, 0]];
      const innovation = [depth - this.state.z];
      const R = [[0.01]]; // Very low measurement noise for depth
      const S = this.matrixAdd(
          this.matrixMultiply(this.matrixMultiply(H, this.covariance), this.transposeMatrix(H)),
          R
      );
      const K = this.matrixMultiply(this.covariance, this.transposeMatrix(H));
      const KS = this.matrixMultiply(K, this.inverseMatrix(S));

      const stateUpdate = this.matrixMultiply(KS, innovation);
      this.state.x += stateUpdate[0][0];
      this.state.y += stateUpdate[1][0];
      this.state.z += stateUpdate[2][0];
      this.state.vx += stateUpdate[3][0];
      this.state.vy += stateUpdate[4][0];

      const I = this.identityMatrix(5);
      this.covariance = this.matrixSubtract(this.covariance, this.matrixMultiply(KS, H));
  }

  updateSpeed(speed: number) {
      const H = [[0, 0, 0, 1, 1]]; // Assumes speed is sqrt(vx^2 + vy^2)
      const measurement = [speed];
      const predicted = [Math.sqrt(this.state.vx ** 2 + this.state.vy ** 2)];
      const innovation = this.vectorSubtract(measurement, predicted);
      const R = [[0.1]]; // Measurement noise for speed
      const S = this.matrixAdd(
          this.matrixMultiply(this.matrixMultiply(H, this.covariance), this.transposeMatrix(H)),
          R
      );
      const K = this.matrixMultiply(this.covariance, this.transposeMatrix(H));
      const KS = this.matrixMultiply(K, this.inverseMatrix(S));

      const stateUpdate = this.matrixMultiply(KS, [innovation]);
      this.state.x += stateUpdate[0][0];
      this.state.y += stateUpdate[1][0];
      this.state.z += stateUpdate[2][0];
      this.state.vx += stateUpdate[3][0];
      this.state.vy += stateUpdate[4][0];

      const I = this.identityMatrix(5);
      this.covariance = this.matrixSubtract(this.covariance, this.matrixMultiply(KS, H));
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

    getGlobalPosition(): { latitude: number, longitude: number, altitude: number } | null {
        if (!this.gpsReference) return null;
        const [lat, lon] = this.localToGPS(this.state.x, this.state.y);
        return {
            latitude: lat,
            longitude: lon,
            altitude: -this.state.z
        };
    }

    private quaternionToRotationMatrix(q: Quaternion): number[][] {
        const { x, y, z, w } = q;
        return [
            [1 - 2*y*y - 2*z*z, 2*x*y - 2*z*w, 2*x*z + 2*y*w],
            [2*x*y + 2*z*w, 1 - 2*x*x - 2*z*z, 2*y*z - 2*x*w],
            [2*x*z - 2*y*w, 2*y*z + 2*x*w, 1 - 2*x*x - 2*y*y]
        ];
    }

    private getProcessNoiseMatrix(dt: number): number[][] {
        const q = 0.1; // Process noise parameter
        return [
            [q*dt**4/4, 0, 0, q*dt**3/2, 0],
            [0, q*dt**4/4, 0, 0, q*dt**3/2],
            [0, 0, q*dt**4/4, 0, 0],
            [q*dt**3/2, 0, 0, q*dt**2, 0],
            [0, q*dt**3/2, 0, 0, q*dt**2]
        ];
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

    // Matrix operations

    private matrixMultiply(a: number[][], b: number[][]): number[][] {
      const result: number[][] = [];
      for (let i = 0; i < a.length; i++) {
          result[i] = [];
          for (let j = 0; j < b[0].length; j++) {
              let sum = 0;
              for (let k = 0; k < a[i].length; k++) {
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
        // Simple 3x3 matrix inversion, extend if needed
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


    private scalarMultiply(a: number[], b: number): number[] {
        return a.map(val => val * b);
    }
}
