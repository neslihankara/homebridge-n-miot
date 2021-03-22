let Service, Characteristic, Accessory, HapStatusError, HAPStatus;
const Constants = require('../../constants/Constants.js');

class CeilingFanAccessory {
  constructor(name, miotDevice, uuid, log, config, api, logger) {
    this.log = log;
    this.api = api;
    this.logger = logger;

    Service = this.api.hap.Service;
    Characteristic = this.api.hap.Characteristic;
    Accessory = this.api.platformAccessory;
    HapStatusError = this.api.hap.HapStatusError;
    HAPStatus = this.api.hap.HAPStatus;

    // check if we have mandatory device info
    try {
      if (!miotDevice) throw new Error(`Missing miot device for ${config.name}!`);
      if (!uuid) throw new Error(`Missing uuid for ${config.name}!`);
    } catch (error) {
      this.logger.error(error);
      this.logger.error(`Something went wrong!`);
      this.logger.error(`Failed to create accessory, missing mandatory information!`);
      return;
    }

    // configuration
    this.fanLevelControl = this.getPropValue(config['fanLevelControl'], true);
    this.shutdownTimer = this.getPropValue(config['shutdownTimer'], false);

    // variables
    this.name = name;
    this.uuid = uuid;
    this.miotCellingFanDevice = miotDevice;
    this.accesory = null;

    this.initAccessory();

    // return self
    return this;
  }


  /*----------========== SETUP SERVICES ==========----------*/

  initAccessory() {
    // prepare the fan accessory
    this.accesory = new Accessory(this.name, this.uuid, this.api.hap.Accessory.Categories.FAN);

    // prepare accessory services
    this.setupAccessoryServices();
  }

  setupAccessoryServices() {
    // prepare the fan service
    this.prepareFanService();

    // additional services
    this.prepareShutdownTimerService();
    this.prepareFanLevelControlService();

    this.prepareLightService();
  }

  prepareFanService() {
    this.fanService = new Service.Fanv2(this.name, 'fanService');
    this.fanService
      .getCharacteristic(Characteristic.Active)
      .onGet(this.getPowerState.bind(this))
      .onSet(this.setPowerState.bind(this));
    this.fanService
      .addCharacteristic(Characteristic.CurrentFanState) // for what is this used?
      .onGet(this.getFanState.bind(this));

    this.accesory.addService(this.fanService);
  }


  prepareShutdownTimerService() {
    if (this.shutdownTimer && this.miotCellingFanDevice.supportsPowerOffTimer()) {
      this.shutdownTimerService = new Service.Lightbulb(this.name + ' Shutdown timer', 'shutdownTimerService');
      this.shutdownTimerService
        .getCharacteristic(Characteristic.On)
        .onGet(this.getShutdownTimerEnabled.bind(this))
        .onSet(this.setShutdownTimerEnabled.bind(this));
      this.shutdownTimerService
        .addCharacteristic(new Characteristic.Brightness())
        .onGet(this.getShutdownTimer.bind(this))
        .onSet(this.setShutdownTimer.bind(this));

      this.accesory.addService(this.shutdownTimerService);
    }
  }

  prepareFanLevelControlService() {
    if (this.fanLevelControl && this.miotCellingFanDevice.supportsFanLevels()) {
      this.fanLevelControlService = new Array();
      for (let i = 1; i <= this.miotCellingFanDevice.fanLevels(); i++) {
        let tmpFanLevelButton = new Service.Switch(this.name + ' Level ' + i, 'levelControlService' + i);
        tmpFanLevelButton
          .getCharacteristic(Characteristic.On)
          .onGet(() => {
            return this.getFanLevelState(i);
          })
          .onSet((state) => {
            this.setFanLevelState(state, i);
          });
        this.accesory.addService(tmpFanLevelButton);
        this.fanLevelControlService.push(tmpFanLevelButton);
      }
    }
  }

  prepareLightService() {
    if (this.miotCellingFanDevice.hasBuiltInLight()) {
      this.lightService = new Service.Lightbulb(this.name + ' Light', 'lightService');
      this.lightService
        .getCharacteristic(Characteristic.On)
        .onGet(this.getLightOnState.bind(this))
        .onSet(this.setLightOnState.bind(this));

      if (this.miotCellingFanDevice.supportsLightBrightness()) {
        this.lightService
          .addCharacteristic(new Characteristic.Brightness())
          .onGet(this.getLightBrightness.bind(this))
          .onSet(this.setLightBrightness.bind(this));
      }

      if (this.miotCellingFanDevice.supportsLightColorTemp()) {
        this.lightService
          .addCharacteristic(new Characteristic.ColorTemperature())
          .onGet(this.getLightColorTemp.bind(this))
          .onSet(this.setLightColorTemp.bind(this));
      }

      this.accesory.addService(this.lightService);
    }
  }


  /*----------========== HOMEBRIDGE STATE SETTERS/GETTERS ==========----------*/

  getPowerState() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.isPowerOn() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
    }
    return Characteristic.Active.INACTIVE;
  }

  setPowerState(state) {
    if (this.isMiotDeviceConnected()) {
      let isPowerOn = state === Characteristic.Active.ACTIVE;
      if (isPowerOn === false || this.miotCellingFanDevice.isPowerOn() === false) {
        this.miotCellingFanDevice.setPowerOn(isPowerOn);
      }
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getFanState() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.isPowerOn() ? Characteristic.CurrentFanState.BLOWING_AIR : Characteristic.CurrentFanState.IDLE;
    }
    return Characteristic.CurrentFanState.INACTIVE;
  }

  getShutdownTimerEnabled() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.isShutdownTimerEnabled();
    }
    return false;
  }

  setShutdownTimerEnabled(state) {
    if (this.isMiotDeviceConnected()) {
      if (state === false) { // only if disabling, enabling will automatically set it to 100%
        this.miotCellingFanDevice.setShutdownTimer(0);
      }
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getShutdownTimer() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.getShutdownTimer();
    }
    return 0;
  }

  setShutdownTimer(level) {
    if (this.isMiotDeviceConnected()) {
      this.miotCellingFanDevice.setShutdownTimer(level);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getFanLevelState(level) {
    if (this.isMiotDeviceConnected() && this.miotCellingFanDevice.isPowerOn()) {
      return this.miotCellingFanDevice.getFanLevel() === level;
    }
    return false;
  }

  setFanLevelState(state, level) {
    if (this.isMiotDeviceConnected()) {
      if (state) {
        // if fan turned off then turn it on
        if (this.miotCellingFanDevice.isPowerOn() === false) {
          this.miotCellingFanDevice.setPowerOn(true);
        }
        this.miotCellingFanDevice.setFanLevel(level);
      }
      setTimeout(() => {
        this.updateFanLevelButtons();
      }, Constants.BUTTON_RESET_TIMEOUT);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }


  getLightOnState() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.isLightOn();
    }
    return false;
  }

  setLightOnState(state) {
    if (this.isMiotDeviceConnected()) {
      if (state === false || this.miotCellingFanDevice.isLightOn() === false) {
        this.miotCellingFanDevice.setLightOn(state);
      }
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getLightBrightness() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.getBrightness();
    }
    return 0;
  }

  setLightBrightness(brightness) {
    if (this.isMiotDeviceConnected()) {
      this.miotCellingFanDevice.setBrightness(brightness);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  getLightColorTemp() {
    if (this.isMiotDeviceConnected()) {
      return this.miotCellingFanDevice.getColorTemp();
    }
    return 140;
  }

  setLightColorTemp(colorTemp) {
    if (this.isMiotDeviceConnected()) {
      this.miotCellingFanDevice.setColorTemp(colorTemp);
    } else {
      throw new HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }


  /*----------========== STATUS ==========----------*/

  updateDeviceStatus() {
    if (this.miotCellingFanDevice) {
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.Active).updateValue(this.getPowerState());
      if (this.fanService) this.fanService.getCharacteristic(Characteristic.RotationSpeed).updateValue(this.getRotationSpeed());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.On).updateValue(this.getShutdownTimerEnabled());
      if (this.shutdownTimerService) this.shutdownTimerService.getCharacteristic(Characteristic.Brightness).updateValue(this.getShutdownTimer());
      this.updateFanLevelButtons();

      if (this.lightService) this.fanService.getCharacteristic(Characteristic.On).updateValue(this.getLightOnState());
      if (this.lightService && this.miotCellingFanDevice.supportsLightBrightness()) this.fanService.getCharacteristic(Characteristic.Brightness).updateValue(this.getLightBrightness());
      if (this.lightService && this.miotCellingFanDevice.supportsLightColorTemp()) this.fanService.getCharacteristic(Characteristic.ColorTemperature).updateValue(this.getLightColorTemp());
    }
  }

  getAccessory() {
    return this.accesory;
  }


  /*----------========== HELPERS ==========----------*/

  getPropValue(prop, defaultValue) {
    if (prop == undefined) {
      return defaultValue;
    }
    return prop;
  }

  isMiotDeviceConnected() {
    return this.miotCellingFanDevice && this.miotCellingFanDevice.isConnected();
  }


  updateFanLevelButtons() {
    if (this.fanLevelControlService) {
      let currentLevel = this.miotCellingFanDevice.getFanLevel();
      this.fanLevelControlService.forEach((tmpFanLevelButton, i) => {
        let fanLevelValue = i + 1;
        if (currentLevel === fanLevelValue && this.miotCellingFanDevice.isPowerOn()) {
          tmpFanLevelButton.getCharacteristic(Characteristic.On).updateValue(true);
        } else {
          tmpFanLevelButton.getCharacteristic(Characteristic.On).updateValue(false);
        }
      });
    }
  }


}


module.exports = CeilingFanAccessory;