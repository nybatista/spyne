// import {baseCoreMixins}    from '../utils/mixins/base-core-mixins';
// import {BaseStreamsMixins} from '../utils/mixins/base-streams-mixins';
import { ChannelRoute } from './channel-route';
import { ChannelUI } from './channel-ui';
import { ChannelWindow } from './channel-window';
import { ChannelViewStreamLifecycle } from './channel-viewstream-lifecycle';
import { validate } from '../utils/channel-config-validator';

import { Subject } from 'rxjs';
import { ChannelsBaseProxy } from './channels-base-proxy';
const R = require('ramda');

// const R = require('ramda');

export class ChannelsBaseController {
  constructor(obs$) {
    this.addMixins();
    this.map = new Map();

    // console.log('Rx is ',Rx);
    // console.log('RX IS ', Subject);
    this.map.set('DISPATCHER', new Subject());
    this.listRegisteredChannels = ChannelsBaseController.listRegisteredChannels.bind(this);
    this.getChannelsList = ChannelsBaseController.getChannelsList.bind(this);
    window.setTimeout(this.checkForMissingChannels.bind(this), 3000);
  }

  static getChannelsList() {
    const proxyMapFn =  (k, v) => {
      let key = k[0];
      let val = k[1].constructor.name;
      return { key, val };
    };
    return Array.from(window.Spyne.channels.map, proxyMapFn);
  }

  static listRegisteredChannels(showOnlyProxies = false) {
    let proxyMap = this.getChannelsList();
    let rejectProxyFn = R.reject(R.propEq('val', 'ChannelsBaseProxy'));
    let filterProxyFn = R.filter(R.propEq('val', 'ChannelsBaseProxy'));
    let fn = showOnlyProxies === true ? filterProxyFn : rejectProxyFn;
    let removedProxyArr = fn(proxyMap);
    return R.pluck(['key'], removedProxyArr);
  }
  listProxyChannels() {
    return this.listRegisteredChannels(true);
  }

  checkForMissingChannels() {
    let proxyMap = this.getChannelsList();
    let filterProxyFn = R.filter(R.propEq('val', 'ChannelsBaseProxy'));
    let filterProxyArr = filterProxyFn(proxyMap);

    if (filterProxyArr.length >= 1) {
      let channelStr = filterProxyArr.length === 1 ? 'Channel has' : 'Channels have';
      let channels = R.compose(R.join(', '), R.map(R.prop('key')))(filterProxyArr);
      let filterPrefixWarning = `Spyne Warning: The following ${channelStr} not been initialized: ${channels}`;
      console.warn(filterPrefixWarning);
      // console.log("FILTER PROXY WARNING ",filterProxyArr);
    }

    // console.log(filterProxy(proxyMap),' proxyMap ', proxyMap);
  }

  init() {
    this.createMainStreams();
  }

  createObserver(obj) {
    // RIGHT NOW THIS CREATES THE DISPATCHER STREAM
    validate(obj.validations, obj.init);
    this.map.set(obj.init.name, obj.init.observable());
  }

  createMainStreams() {
    this.routeValueeam = new ChannelRoute();
    this.map.set('CHANNEL_ROUTE', this.routeValueeam);

    this.uiStream = new ChannelUI();
    this.map.set('CHANNEL_UI', this.uiStream);

    this.domStream = new ChannelWindow();
    this.map.set('CHANNEL_WINDOW', this.domStream);

    this.viewStreamLifecycle = new ChannelViewStreamLifecycle();
    this.map.set('CHANNEL_LIFECYCLE', this.viewStreamLifecycle);

    this.routeValueeam.initializeStream();
    this.domStream.initializeStream();
  }

  addKeyEvent(key) {
    this.map.get('UI').addKeyEvent(key);
  }

  registerStream(val) {
    let name = val.channelName;
    this.map.set(name, val);
    val.initializeStream();
  }

  getChannelActions(str) {
    return this.map.get(str).addRegisteredActions();
  }

  getProxySubject(name, isReplaySubject = false) {
    let subjectType = isReplaySubject === true ? 'replaySubject' : 'subject';

    return this.map.get(name)[subjectType];
  }

  testStream(name) {
    return this.map.get(name) !== undefined;
  }

  getStream(name) {
    if (this.testStream(name) === false) {
      this.map.set(name, new ChannelsBaseProxy(name));
    }

    return this.map.get(name);
  }

  addMixins() {
    //  ==================================
    // BASE CORE DECORATORS
    //  ==================================
    // let coreMixins =  baseCoreMixins();
    //  ==================================
    // BASE STREAMS DECORATORS
    //  ==================================
    // let streamsMixins = BaseStreamsMixins();
  }
}
