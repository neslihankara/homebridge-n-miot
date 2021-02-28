const MiotDevice = require('../../MiotDevice.js');
const FanCapabilities = require('./FanCapabilities.js');
const FanProperties = require('./FanProperties.js');
const Constants = require('../../constants/Constants.js');
const DevTypes = require('../../constants/DevTypes.js');


class FanDevice extends MiotDevice {
  constructor(miioDevice, model, deviceId, name, logger) {
    super(miioDevice, model, deviceId, name, logger);
  }

  /*----------========== INIT ==========----------*/

  initialPropertyFetchDone() {
    // log the fan total use time if the fan supports it
    if (this.supportsUseTimeReporting()) {
      this.logger.info(`Device total use time: ${this.getUseTime()} minutes.`);
    }
  }

  /*----------========== INFO ==========----------*/

  getType() {
    return DevTypes.FAN;
  }


  /*----------========== CAPABILITIES ==========----------*/

  // speed
  supportsSteplessFanSpeed() {
    return this.properties[FanProperties.FAN_SPEED] !== undefined; // free speed selection from 0% to 100%
  }

  supportsFanSpeedRpmReporting() {
    return this.properties[FanProperties.FAN_SPEED_RPM] !== undefined; // whether the fan reports the rpm speed value
  }

  // fan levels
  supportsFanLevels() {
    return this.capabilities[FanCapabilities.FAN_LEVELS] !== undefined ? true : false; // preconfigured fan levels which can be set
  }

  fanLevels() {
    return this.capabilities[FanCapabilities.FAN_LEVELS] || 0; // how many fan levels
  }

  // horizontal swing
  supportsHorizontalSwing() {
    return this.properties[FanProperties.HORIZONTAL_SWING] !== undefined; // fan moves left to right on/off
  }

  supportsHorizontalSwingAngle() {
    return this.properties[FanProperties.HORIZONTAL_SWING_ANGLE] !== undefined; // if a custom angle can be set for horizontal swing usually 0 to 120 degree
  }

  horizontalSwingAngleRange() {
    return this.capabilities[FanCapabilities.HORIZONTAL_SWING_ANGLE_RANGE] || []; // range for horizontal swing angle
  }

  supportsHorizontalSwingLevels() {
    return this.capabilities[FanCapabilities.HORIZONTAL_SWING_LEVELS] !== undefined ? true : false; // preconfigured levels for oscillation
  }

  horizontalSwingLevels() {
    return this.capabilities[FanCapabilities.HORIZONTAL_SWING_LEVELS] || []; // array of levels (in degree) for oscillation
  }

  // vertical swing
  supportsVerticalSwing() {
    return this.properties[FanProperties.VERTICAL_SWING] !== undefined; // fan moves top to down on/off
  }

  supportsVerticalSwingAngle() {
    return this.properties[FanProperties.VERTICAL_SWING_ANGLE] !== undefined; // if a custom angle can be set for vertical swing usually 0 to 120 degree
  }

  verticalSwingAngleRange() {
    return this.capabilities[FanCapabilities.VERTICAL_SWING_ANGLE_RANGE] || []; // range for vertical swing angle
  }

  // manual fan move
  supportsHorizontalMove() {
    return this.properties[FanProperties.HORIZONTAL_MOVE] !== undefined; // whether the fan can be rotated left or right by 5 degree
  }

  supportsVerticalMove() {
    return this.properties[FanProperties.VERTICAL_MOVE] !== undefined; // whether the fan can be rotated up or down by 5 degree
  }

  // modes
  supportsNaturalMode() {
    return this.capabilities[FanCapabilities.NATURAL_MODE] || false; // whether the natural mode is supported on/off
  }

  supportsSleepMode() {
    return this.capabilities[FanCapabilities.SLEEP_MODE] || false; // whether the sleep mode is supported on/off
  }

  // ioniser
  supportsIoniser() {
    return this.properties[FanProperties.ANION] !== undefined; // whether the fan has a built in ioniser which can be controled on/off
  }


  /*----------========== CAPABILITY HELPERS ==========----------*/

  /*--== horizontal swing angle ==--*/
  adjustHorizontalSwingAngleToRange(angle) {
    if (this.supportsHorizontalSwingAngle() && this.horizontalSwingAngleRange().length > 1) {
      let low = this.horizontalSwingAngleRange()[0];
      let high = this.horizontalSwingAngleRange()[1];
      if (angle > high) angle = high;
      if (angle < low) angle = low;
      return angle;
    }
    return angle;
  }

  checkHorizontalSwingAngleWithinRange(angle) {
    if (this.supportsHorizontalSwingAngle() && this.horizontalSwingAngleRange().length > 1) {
      let low = this.horizontalSwingAngleRange()[0];
      let high = this.horizontalSwingAngleRange()[1];
      if (angle >= low && angle <= high) {
        return true;
      }
    }
    return false;
  }

  /*--== horizontal swing levels ==--*/
  checkHorizontalSwingLevelSupported(angle) {
    if (this.horizontalSwingLevels().includes(angle)) {
      return true;
    }
    return false;
  }


  /*----------========== STATUS ==========----------*/

  getRotationSpeed() {
    return this.getPropertyValue(FanProperties.FAN_SPEED);
  }

  getSpeed() {
    return this.getPropertyValue(FanProperties.FAN_SPEED_RPM);
  }

  getFanLevel() {
    return this.getPropertyValue(FanProperties.FAN_LEVEL);
  }

  isHorizontalSwingEnabled() {
    return this.getPropertyValue(FanProperties.HORIZONTAL_SWING);
  }

  getHorizontalSwingAngle() {
    return this.getPropertyValue(FanProperties.HORIZONTAL_SWING_ANGLE);
  }

  isVerticalSwingEnabled() {
    return this.getPropertyValue(FanProperties.VERTICAL_SWING);
  }

  getVerticalSwingAngle() {
    return this.getPropertyValue(FanProperties.VERTICAL_SWING_ANGLE);
  }

  isNaturalModeEnabled() {
    return false;
  }

  isSleepModeEnabled() {
    return false;
  }

  isIoniserEnabled() {
    return this.getPropertyValue(FanProperties.ANION);
  }


  /*----------========== COMMANDS ==========----------*/

  async setRotationSpeed(speed) {
    this.setPropertyValue(FanProperties.FAN_SPEED, speed);
  }

  async setFanLevel(level) {
    this.setPropertyValue(FanProperties.FAN_LEVEL, level);
  }

  async setHorizontalSwingEnabled(enabled) {
    this.setPropertyValue(FanProperties.HORIZONTAL_SWING, enabled);
  }

  async setHorizontalSwingAngle(angle) {
    this.setPropertyValue(FanProperties.HORIZONTAL_SWING_ANGLE, angle);
  }

  async setVerticalSwingEnabled(enabled) {
    this.setPropertyValue(FanProperties.VERTICAL_SWING, enabled);
  }

  async setVerticalSwingAngle(angle) {
    this.setPropertyValue(FanProperties.VERTICAL_SWING_ANGLE, angle);
  }

  async setNaturalModeEnabled(enabled) {
    this.logWarn(Constants.COMMAND_NOT_SUPPORTED_MSG);
  }

  async setSleepModeEnabled(enabled) {
    this.logWarn(Constants.COMMAND_NOT_SUPPORTED_MSG);
  }

  async moveLeft() {
    this.setPropertyValue(FanProperties.HORIZONTAL_MOVE, 'left');
  }

  async moveRight() {
    this.setPropertyValue(FanProperties.HORIZONTAL_MOVE, 'right');
  }

  async moveUp() {
    this.setPropertyValue(FanProperties.VERTICAL_MOVE, 'up');
  }

  async moveDown() {
    this.setPropertyValue(FanProperties.VERTICAL_MOVE, 'down');
  }

  async setIoniserEnabled(enabled) {
    this.setPropertyValue(FanProperties.ANION, enabled);
  }


  /*----------========== HELPERS ==========----------*/


}

module.exports = FanDevice;