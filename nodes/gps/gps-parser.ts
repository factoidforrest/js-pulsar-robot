import { EventEmitter } from 'events';

type ParsedSentence = 
  | GGASentence 
  | GSASentence 
  | RMCSentence 
  | VTGSentence 
  | GSVSentence 
  | GLLSentence 
  | ZDASentence 
  | GSTSentence 
  | HDTSentence 
  | GRSSentence 
  | GBSSentence 
  | GNSSentence;

interface BaseSentence {
  type: string;
  raw: string;
  valid: boolean;
}

interface GGASentence extends BaseSentence {
  type: 'GGA';
  time: Date | undefined;
  lat: number | undefined;
  lon: number | undefined;
  alt: number | undefined;
  quality: FixQuality;
  satellites: number | undefined;
  hdop: number | undefined;
  geoidal: number | undefined;
  age: number | undefined;
  stationId: number | undefined;
}

interface GSASentence extends BaseSentence {
  type: 'GSA';
  mode: 'manual' | 'automatic' | undefined;
  fix: 'FIX_2D' | 'FIX_3D' | 'None';
  satellites: number[];
  pdop: number | undefined;
  hdop: number | undefined;
  vdop: number | undefined;
  systemId: number | undefined;
  system: string;
}

interface RMCSentence extends BaseSentence {
  type: 'RMC';
  time: Date | undefined;
  status: 'active' | 'void' | undefined;
  lat: number | undefined;
  lon: number | undefined;
  speed: number | undefined;
  track: number | undefined;
  variation: number | undefined;
  faa: FAAMode | undefined;
  navStatus: string | undefined;
}

interface VTGSentence extends BaseSentence {
  type: 'VTG';
  track: number | undefined;
  trackMagnetic: number | undefined;
  speed: number | undefined;
  faa: FAAMode | undefined;
}

interface GSVSentence extends BaseSentence {
  type: 'GSV';
  msgNumber: number | undefined;
  msgsTotal: number | undefined;
  satsInView: number | undefined;
  satellites: SatelliteInfo[];
  signalId: number | undefined;
  system: string;
}

interface GLLSentence extends BaseSentence {
  type: 'GLL';
  time: Date | undefined;
  status: 'active' | 'void' | undefined;
  lat: number | undefined;
  lon: number | undefined;
  faa: FAAMode | undefined;
}

interface ZDASentence extends BaseSentence {
  type: 'ZDA';
  time: Date | undefined;
}

interface GSTSentence extends BaseSentence {
  type: 'GST';
  time: Date | undefined;
  rms: number | undefined;
  ellipseMajor: number | undefined;
  ellipseMinor: number | undefined;
  ellipseOrientation: number | undefined;
  latitudeError: number | undefined;
  longitudeError: number | undefined;
  heightError: number | undefined;
}

interface HDTSentence extends BaseSentence {
  type: 'HDT';
  heading: number | undefined;
  trueNorth: boolean;
}

interface GRSSentence extends BaseSentence {
  type: 'GRS';
  time: Date | undefined;
  mode: number | undefined;
  res: number[];
}

interface GBSSentence extends BaseSentence {
  type: 'GBS';
  time: Date | undefined;
  errLat: number | undefined;
  errLon: number | undefined;
  errAlt: number | undefined;
  failedSat: number | undefined;
  probFailedSat: number | undefined;
  biasFailedSat: number | undefined;
  stdFailedSat: number | undefined;
  systemId: number | undefined;
  signalId: number | undefined;
}

interface GNSSentence extends BaseSentence {
  type: 'GNS';
  time: Date | undefined;
  lat: number | undefined;
  lon: number | undefined;
  mode: string;
  satsUsed: number | undefined;
  hdop: number | undefined;
  alt: number | undefined;
  sep: number | undefined;
  diffAge: number | undefined;
  diffStation: number | undefined;
  navStatus: string | undefined;
}

interface SatelliteInfo {
  prn: number | undefined;
  elevation: number | undefined;
  azimuth: number | undefined;
  snr: number | undefined;
  status: 'tracking' | 'in view' | undefined;
  system: string;
  key: string;
}

enum FixQuality {
  Invalid = 0,
  GPSFix = 1,
  DGPSFix = 2,
  PPSFix = 3,
  RTKFix = 4,
  FloatRTK = 5,
  Estimated = 6,
  ManualInput = 7,
  Simulation = 8,
}

type FAAMode = 'autonomous' | 'differential' | 'estimated' | 'manual input' | 'simulated' | 'not valid' | 'precise' | 'rtk' | 'rtk-float';

class GPSParser extends EventEmitter {
  private buffer: string = '';

  constructor() {
    super();
  }

  public update(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\r\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('$')) {
        try {
          const parsed = this.parseSentence(line);
          if (parsed) {
            this.emit('data', parsed);
            this.emit(parsed.type, parsed);
          }
        } catch (error) {
          this.emit('error', error);
        }
      }
    }
  }

  private parseSentence(sentence: string): ParsedSentence | undefined {
    const fields = sentence.slice(1, -3).split(',');
    const type = fields[0].slice(2);
    const checksum = sentence.slice(-2);

    const parsed = (() => {
      switch (type) {
        case 'GGA': return this.parseGGA(fields);
        case 'GSA': return this.parseGSA(fields);
        case 'RMC': return this.parseRMC(fields);
        case 'VTG': return this.parseVTG(fields);
        case 'GSV': return this.parseGSV(fields);
        case 'GLL': return this.parseGLL(fields);
        case 'ZDA': return this.parseZDA(fields);
        case 'GST': return this.parseGST(fields);
        case 'HDT': return this.parseHDT(fields);
        case 'GRS': return this.parseGRS(fields);
        case 'GBS': return this.parseGBS(fields);
        case 'GNS': return this.parseGNS(fields);
        default: return undefined;
      }
    })();

    if (parsed) {
      parsed.raw = sentence;
      parsed.valid = this.isValid(sentence, checksum);
    }

    return parsed;
  }

  private parseGGA(fields: string[]): GGASentence {
    return {
      type: 'GGA',
      time: this.parseTime(fields[1]),
      lat: this.parseCoordinate(fields[2], fields[3]),
      lon: this.parseCoordinate(fields[4], fields[5]),
      quality: parseInt(fields[6]) as FixQuality,
      satellites: this.parseNumber(fields[7]),
      hdop: this.parseNumber(fields[8]),
      alt: this.parseDist(fields[9], fields[10]),
      geoidal: this.parseDist(fields[11], fields[12]),
      age: this.parseNumber(fields[13]),
      stationId: this.parseNumber(fields[14]),
    } as GGASentence;
  }

  private parseGSA(fields: string[]): GSASentence {
    const satellites: number[] = [];
    for (let i = 3; i <= 14; i++) {
      const sat = this.parseNumber(fields[i]);
      if (sat !== undefined) satellites.push(sat);
    }

    return {
      type: 'GSA',
      mode: this.parseGSAMode(fields[1]),
      fix: this.parseGSAFix(fields[2]),
      satellites,
      pdop: this.parseNumber(fields[15]),
      hdop: this.parseNumber(fields[16]),
      vdop: this.parseNumber(fields[17]),
      systemId: fields.length > 18 ? this.parseNumber(fields[18]) : undefined,
      system: fields.length > 18 ? this.parseSystemId(this.parseNumber(fields[18])) : 'unknown',
    } as GSASentence;
  }

  private parseRMC(fields: string[]): RMCSentence {
    return {
      type: 'RMC',
      time: this.parseTime(fields[1]),
      status: this.parseRMCStatus(fields[2]),
      lat: this.parseCoordinate(fields[3], fields[4]),
      lon: this.parseCoordinate(fields[5], fields[6]),
      speed: this.parseKnots(fields[7]),
      track: this.parseNumber(fields[8]),
      variation: this.parseRMCVariation(fields[10], fields[11]),
      faa: fields.length > 13 ? this.parseFAA(fields[12]) : undefined,
      navStatus: fields.length > 14 ? fields[13] : undefined,
    } as RMCSentence;
  }

  private parseVTG(fields: string[]): VTGSentence {
    return {
      type: 'VTG',
      track: this.parseNumber(fields[1]),
      trackMagnetic: this.parseNumber(fields[3]),
      speed: this.parseKnots(fields[5]),
      faa: fields.length === 11 ? this.parseFAA(fields[9]) : undefined,
    } as VTGSentence;
  }

  private parseGSV(fields: string[]): GSVSentence {
    const satellites: SatelliteInfo[] = [];
    const system = this.parseSystem(fields[0]);

    for (let i = 4; i < fields.length - 3; i += 4) {
      const prn = this.parseNumber(fields[i]);
      const snr = this.parseNumber(fields[i + 3]);
      satellites.push({
        prn,
        elevation: this.parseNumber(fields[i + 1]),
        azimuth: this.parseNumber(fields[i + 2]),
        snr,
        status: prn !== undefined ? (snr !== undefined ? 'tracking' : 'in view') : undefined,
        system,
        key: fields[0].slice(1, 3) + prn,
      });
    }

    return {
      type: 'GSV',
      msgNumber: this.parseNumber(fields[2]),
      msgsTotal: this.parseNumber(fields[1]),
      satsInView: this.parseNumber(fields[3]),
      satellites,
      signalId: fields.length % 4 === 2 ? this.parseNumber(fields[fields.length - 2]) : undefined,
      system,
    } as GSVSentence;
  }

  private parseGLL(fields: string[]): GLLSentence {
    return {
      type: 'GLL',
      lat: this.parseCoordinate(fields[1], fields[2]),
      lon: this.parseCoordinate(fields[3], fields[4]),
      time: this.parseTime(fields[5]),
      status: this.parseRMCStatus(fields[6]),
      faa: fields.length === 9 ? this.parseFAA(fields[7]) : undefined,
    } as GLLSentence;
  }

  private parseZDA(fields: string[]): ZDASentence {
    return {
      type: 'ZDA',
      time: this.parseTime(fields[1], fields[2] + fields[3] + fields[4]),
    } as ZDASentence;
  }

  private parseGST(fields: string[]): GSTSentence {
    return {
      type: 'GST',
      time: this.parseTime(fields[1]),
      rms: this.parseNumber(fields[2]),
      ellipseMajor: this.parseNumber(fields[3]),
      ellipseMinor: this.parseNumber(fields[4]),
      ellipseOrientation: this.parseNumber(fields[5]),
      latitudeError: this.parseNumber(fields[6]),
      longitudeError: this.parseNumber(fields[7]),
      heightError: this.parseNumber(fields[8]),
    } as GSTSentence;
  }

  private parseHDT(fields: string[]): HDTSentence {
    return {
      type: 'HDT',
      heading: this.parseNumber(fields[1]),
      trueNorth: fields[2] === 'T',
    } as HDTSentence;
  }

  private parseGRS(fields: string[]): GRSSentence {
    const res: number[] = [];
    for (let i = 3; i <= 14; i++) {
      const val = this.parseNumber(fields[i]);
      if (val !== undefined) res.push(val);
    }

    return {
      type: 'GRS',
      time: this.parseTime(fields[1]),
      mode: this.parseNumber(fields[2]),
      res,
    } as GRSSentence;
  }

  private parseGBS(fields: string[]): GBSSentence {
    return {
      type: 'GBS',
      time: this.parseTime(fields[1]),
      errLat: this.parseNumber(fields[2]),
      errLon: this.parseNumber(fields[3]),
      errAlt: this.parseNumber(fields[4]),
      failedSat: this.parseNumber(fields[5]),
      probFailedSat: this.parseNumber(fields[6]),
      biasFailedSat: this.parseNumber(fields[7]),
      stdFailedSat: this.parseNumber(fields[8]),
      systemId: fields.length === 12 ? this.parseNumber(fields[9]) : undefined,
      signalId: fields.length === 12 ? this.parseNumber(fields[10]) : undefined,
    } as GBSSentence;
  }

  private parseGNS(fields: string[]): GNSSentence {
    return {
      type: 'GNS',
      time: this.parseTime(fields[1]),
      lat: this.parseCoordinate(fields[2], fields[3]),
      lon: this.parseCoordinate(fields[4], fields[5]),
      mode: fields[6],
      satsUsed: this.parseNumber(fields[7]),
      hdop: this.parseNumber(fields[8]),
      alt: this.parseNumber(fields[9]),
      sep: this.parseNumber(fields[10]),
      diffAge: this.parseNumber(fields[11]),
      diffStation: this.parseNumber(fields[12]),
      navStatus: fields.length === 15 ? fields[13] : undefined,
    } as GNSSentence;
  }

  private parseTime(time: string, date?: string): Date | undefined {
    if (time === ''|| time === undefined) return undefined;

    const hours = parseInt(time.slice(0, 2));
    const minutes = parseInt(time.slice(2, 4));
    const seconds = parseInt(time.slice(4, 6));
    const milliseconds = time.length > 6 ? parseInt(time.slice(7)) : 0;

    const now = new Date();
    if (date) {
      const day = parseInt(date.slice(0, 2));
      const month = parseInt(date.slice(2, 4)) - 1;
      const year = parseInt(date.slice(4));
      now.setUTCFullYear(year < 73 ? 2000 + year : 1900 + year, month, day);
    }
    now.setUTCHours(hours, minutes, seconds, milliseconds);
    return now;
  }

  private parseCoordinate(coord: string, dir: string): number | undefined {
    if (coord === '') return undefined;

    const deg = parseFloat(coord.slice(0, 2));
    const min = parseFloat(coord.slice(2));
    let result = deg + (min / 60);

    if (dir === 'S' || dir === 'W') {
      result = -result;
    }

    return result;
  }

  private parseNumber(num: string): number | undefined {
    return num === '' ? undefined : parseFloat(num);
  }

  private parseKnots(knots: string): number | undefined {
    return knots === '' ? undefined : parseFloat(knots) * 1.852;
  }

  private parseGSAMode(mode: string): 'manual' | 'automatic' | undefined {
    switch (mode) {
      case 'M': return 'manual';
      case 'A': return 'automatic';
      default: return undefined;
    }
  }

  private parseGSAFix(fix: string): GSASentence['fix'] {
    switch (fix) {
      case '2': return 'FIX_2D';
      case '3': return 'FIX_3D';
      default: return 'None';
    }
  }

  private parseRMCStatus(status: string): 'active' | 'void' | undefined {
    switch (status) {
      case 'A': return 'active';
      case 'V': return 'void';
      default: return undefined;
    }
  }

  private parseFAA(faa: string): FAAMode | undefined {
    switch (faa) {
      case 'A': return 'autonomous';
      case 'D': return 'differential';
      case 'E': return 'estimated';
      case 'M': return 'manual input';
      case 'S': return 'simulated';
      case 'N': return 'not valid';
      case 'P': return 'precise';
      case 'R': return 'rtk';
      case 'F': return 'rtk-float';
      default: return undefined;
    }
  }

  private parseRMCVariation(variation: string, direction: string): number | undefined {
    if (variation === '' || direction === '') return undefined;
    const value = parseFloat(variation);
    return direction === 'W' ? -value : value;
  }

  private parseDist(dist: string, unit: string): number | undefined {
    if (dist === '') return undefined;
    if (unit === 'M' || unit === '') return parseFloat(dist);
    throw new Error('Unknown distance unit: ' + unit);
  }

  private parseSystemId(systemId: number | undefined): string {
    switch (systemId) {
      case 0: return 'QZSS';
      case 1: return 'GPS';
      case 2: return 'GLONASS';
      case 3: return 'Galileo';
      case 4: return 'BeiDou';
      default: return 'unknown';
    }
  }

  private parseSystem(str: string): string {
    const satellite = str.slice(1, 3);
    switch (satellite) {
      case 'GP': return 'GPS';
      case 'GQ': return 'QZSS';
      case 'GL': return 'GLONASS';
      case 'GA': return 'Galileo';
      case 'GB': return 'BeiDou';
      default: return satellite;
    }
  }

  private isValid(sentence: string, checksum: string): boolean {
    let sum = 0;
    for (let i = 1; i < sentence.length; i++) {
      const char = sentence.charCodeAt(i);
      if (char === 42) break; // Asterisk: *
      sum ^= char;
    }
    return sum === parseInt(checksum, 16);
  }

  // Utility methods
  public static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const EARTH_RADIUS = 6372.8; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS * c;
  }

  public static calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }
}

export { 
  GPSParser as GPS, ParsedSentence, GGASentence, GSASentence, RMCSentence, VTGSentence, 
  GSVSentence, GLLSentence, ZDASentence, GSTSentence, HDTSentence, GRSSentence, 
  GBSSentence, GNSSentence, FixQuality, FAAMode, SatelliteInfo 
};