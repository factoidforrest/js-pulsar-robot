import { Node, TopicSubscriber, TopicPublisher } from '../../lib/node-services.js';
import {
  mission,
  waypoint,
  setNavigationMode,
  targetPose,
  missionStatus,
  positionEstimate
} from '../../topics/generated/topics/topics.js';

class Autopilot {
  private node: Node;
  private currentMission: mission | null = null;
  private currentWaypointIndex: number = 0;
  private navigationMode: string = 'manual';
  private currentPosition: positionEstimate | null = null;
  private firstPositionEstimate: positionEstimate | null = null;

  private missionTopic: TopicSubscriber<mission>;
  private setNavigationModeTopic: TopicSubscriber<setNavigationMode>;
  private positionEstimateTopic: TopicSubscriber<positionEstimate>;
  private targetPoseTopic: TopicPublisher<targetPose>;
  private missionStatusTopic: TopicPublisher<missionStatus>;

  constructor(node: Node) {
    this.node = node;

    // Set up topic subscribers
    this.missionTopic = this.node.createTopicSubscriber('auv.autopilot.mission', mission);
    this.setNavigationModeTopic = this.node.createTopicSubscriber('auv.navigation.mode', setNavigationMode);
    this.positionEstimateTopic = this.node.createTopicSubscriber('auv.navigation.position_estimate', positionEstimate);

    // Set up topic publishers
    this.targetPoseTopic = this.node.createTopicPublisher('auv.navigation.target_pose', targetPose);
    this.missionStatusTopic = this.node.createTopicPublisher('auv.mission.status', missionStatus);

    // Set up message handlers
    this.missionTopic.on('message', this.handleMission.bind(this));
    this.setNavigationModeTopic.on('message', this.handleSetNavigationMode.bind(this));
    this.positionEstimateTopic.on('message', this.handlePositionEstimate.bind(this));

    console.log('Autopilot initialized and subscribed to topics');
  }

  private handleMission(message: mission) {
    if (!this.firstPositionEstimate) {
      console.log('Cannot start mission: No position estimate received yet');
      return;
    }
    this.currentMission = message;
    this.currentWaypointIndex = 0;
    console.log('New mission received:', this.currentMission);
    this.updateMissionStatus();
  }

  private handleSetNavigationMode(message: setNavigationMode) {
    this.navigationMode = message.mode;
    console.log('Navigation mode set to:', this.navigationMode);
    if (this.navigationMode === 'abort') {
      this.handleAbort();
    }
    this.updateMissionStatus();
  }

  private handlePositionEstimate(message: positionEstimate) {
    if (!this.firstPositionEstimate) {
      this.firstPositionEstimate = message;
    }
    this.currentPosition = message;
    if (this.navigationMode === 'waypoint' && this.currentMission) {
      this.updateTargetPose();
    } else if (this.navigationMode === 'abort') {
      this.handleAbort();
    }
  }

  private handleAbort() {
    if (!this.firstPositionEstimate || !this.currentPosition) {
      console.log('Cannot abort: No position estimates available');
      return;
    }

    const surfaceWaypoint: waypoint = {
      uuid: 'abort-surface',
      latitude: this.currentPosition.global.latitude,
      longitude: this.currentPosition.global.longitude,
      depth: 0, // Surface
      speed: 1, // Slow speed for safety
    };

    const returnWaypoint: waypoint = {
      uuid: 'abort-return',
      latitude: this.firstPositionEstimate.global.latitude,
      longitude: this.firstPositionEstimate.global.longitude,
      depth: 0, // Stay at surface
      speed: 1, // Slow speed for safety
    };

    this.currentMission = {
      waypoints: [surfaceWaypoint, returnWaypoint],
      maxDuration: 3600, // 1 hour max for abort mission
      defaultSpeed: 1, // Slow speed for safety
      maxDepth: 0, // Stay at surface
    };
    this.currentWaypointIndex = 0;
    this.updateTargetPose();
  }

  private updateTargetPose() {
    if (!this.currentMission || !this.currentPosition) {
      console.log('Cannot update target pose: Missing mission or current position');
      return;
    }

    const currentWaypoint = this.currentMission.waypoints[this.currentWaypointIndex];
    if (!currentWaypoint) {
      console.log('Mission completed');
      this.navigationMode = 'manual';
      this.updateMissionStatus();
      return;
    }

    const targetPoseMsg: targetPose = this.calculateTargetPose(currentWaypoint);
    this.targetPoseTopic.sendMsg(targetPoseMsg);
  }

  private calculateTargetPose(waypoint: waypoint): targetPose {
    if (!this.currentPosition) {
      throw new Error('Current position is not available');
    }

    const dx = waypoint.longitude - this.currentPosition.global.longitude;
    const dy = waypoint.latitude - this.currentPosition.global.latitude;
    const dz = waypoint.depth - this.currentPosition.global.depth; // Assuming depth exists

    // Calculate pitch and yaw angles
    const yaw = Math.atan2(dy, dx);
    const pitch = Math.atan2(-dz, Math.sqrt(dx * dx + dy * dy));

    // Convert to quaternion
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);

    const qw = cy * cp;
    const qx = sy * sp;
    const qy = sy * cp;
    const qz = cy * sp;

    return { qw, qx, qy, qz };
  }

  private updateMissionStatus() {
    if (!this.currentMission) return;

    const statusMsg: missionStatus = {
      missionId: this.currentMission.waypoints[0].uuid,
      status: this.navigationMode === 'waypoint' ? 'IN_PROGRESS' :
              this.navigationMode === 'abort' ? 'ABORTING' : 'PENDING',
      currentWaypointIndex: this.currentWaypointIndex,
      missionProgress: (this.currentWaypointIndex / this.currentMission.waypoints.length) * 100,
      currentAction: this.navigationMode,
      completedActions: [],
      lastError: '',
      estimatedTimeRemaining: 0 // To be implemented
    };

    this.missionStatusTopic.sendMsg(statusMsg);
  }
}

async function main() {
  console.log('Initializing Autopilot node');
  const node = await Node.create({
    name: 'autopilot',
  });

  const autopilot = new Autopilot(node);

  console.log('Autopilot node initialized and running');
}

main();
