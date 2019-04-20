import { registeredStreamNames } from './channels-config';
import { ChannelPayload } from './channel-payload-class';
import {RouteChannelUpdater} from '../utils/route-channel-updater';
import { ReplaySubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import {ifElse, isString, identity, head, mergeAll, objOf, view, is, chain, lensIndex, always, fromPairs, path, equals, prop} from 'ramda';
const rMap = require('ramda').map;
const rMerge = require('ramda').mergeRight;

export class Channel {
  /**
   * @module Channel
   * @type extendable
   *
   * @desc
   * <p>Channels broadcast specific types of data that is listened to by other Channels and by LINK['ViewStream', 'view-stream'] instances.</p>
   * <p>Channels create data by subscribing to other Channels and by parsing ViewStream info that's sent to its LINK['onViewStreamInfo', 'channel-on-view-stream-info'] method.</p>
   * <h3>The Basic Channel Structure</h3>
   * <ul>
   * <li>Channels requires a unique name, for example, <em>CHANNEL_MYCHANNEL</em>, which is used by the LINK['ChannelsController', 'channels-controller'] to direct the flow of Channel data.</li>
   * <li>Channels are instantiated and 'registered' after initializing a LINK['SpyneApp', 'spyne-app']; they remain persistent and are not deleted.</li>
   * <li>Channels can send data at any time using the LINK['sendChannelPayload', 'channel-send-channel-payload'] method.</li>
   * <li>Channels use the LINK['getChannel', 'channel-get-channel'] method to retrieve data from other channels by subscribing to its source EXT['rxjs Subject', '//rxjs-dev.firebaseapp.com/guide/subject']</li>
   * <li>A Channel's LINK['onViewStreamInfo', 'channel-on-view-stream-info'] method is called whenever a ViewStream instances sends data to that channel.</li>
   * </ul>
   * <h3>Other Channels that extend Channel</h3>
   * <ul>
   * <li>The four Spyne Channels, LINK['SpyneChannelUI', 'spyne-channel-u-i'], LINK['SpyneChannelWindow', 'spyne-channel-window'], LINK['SpyneChannelRoute', 'spyne-channel-route'] and LINK['SpyneChannelLifecycle', 'spyne-channel-lifecycle'], all extend this Channel class.<br>Channel instances can subscribe to any combination of these four SpyneChannels.</li>
   * <li>ChannelFetch instances also extends Channel by using the ChannelFetchUtil to immediately publish the fetched response as a ChannelPayload.</li>
   * </ul>
   * <h3>Sending ChannelPayloads</h3>
   *   <p>The main task of all channels is to send data and events using the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-send-channel-payload"  href="/guide/reference/channel-send-channel-payload" >sendChannelPayload</a>
   method.</p>
   *
   *   <p><a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-payload"  href="/guide/reference/channel-payload" >Channel Payloads</a>
   require an action string to be sent as well, and all channel actions need to be registered within its channel by using the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-add-registered-actions"  href="/guide/reference/channel-add-registered-actions" >addRegisteredActions</a>
   method.</p>
   *
   * <h3>Receiving Data from ViewStream Instances</h3>
   * <p>ViewStreams can send data to any custom channel using the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="view-stream-send-into-to-channel"  href="/guide/reference/view-stream-send-info-to-channel" >sendInfoToChannel</a>
   method. Channels cam listen to any ViewStream data directed to itself through the default method, <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-on-view-stream-info"  href="/guide/reference/channel-on-view-stream-info" >onViewStreamInfo</a>. </p>
   *
   *
   * @example
   * TITLE["<h4>Registering a New Channel Instance</h4>"]
   * SpyneApp.register(new Channel("CHANNEL_MYCHANNEL");
   *
   *
   * @constructor
   * @param {string} CHANNEL_NAME
   * @param {Object} props This json object takes in parameters to initialize the channel
   * @property {String} CHANNEL_NAME - = undefined; This will be the registered name for this channel.
   * @property {Object} props - = {}; The props objects allows for custom properties for the channel.
   * @property {Observable} observer - = new Subject(); This is the source rxjs Subject for the channel.
   *
   */
  constructor(CHANNEL_NAME, props = {}) {
    this.addRegisteredActions.bind(this);
    this.createChannelActionsObj(CHANNEL_NAME, props.extendedActionsArr);
    props.name = CHANNEL_NAME;
    this.props = props;
    this.props.isProxy = this.props.isProxy === undefined ? false : this.props.isProxy;
    this.props.sendCachedPayload = this.props.sendCachedPayload === undefined ? false : this.props.sendCachedPayload;
    this.sendPayloadToRouteChannel = new RouteChannelUpdater(this);
    this.createChannelActionMethods();
    this.streamsController = window.Spyne.channels;// getGlobalParam('streamsController');
    let observer$ = this.getMainObserver();

    this.observer$ = this.props['observer'] = observer$;
    let dispatcherStream$ = this.streamsController.getStream('DISPATCHER');
    dispatcherStream$.subscribe((val) => this.onReceivedObservable(val));
  }

  getMainObserver() {
    let proxyExists = this.streamsController.testStream(this.props.name);

    if (proxyExists === true) {
      return this.streamsController.getProxySubject(this.props.name, this.props.sendCachedPayload);
    } else {
      return this.props.sendCachedPayload === true ? new ReplaySubject(1) : new Subject();
    }
  }

  //  OVERRIDE INITIALIZATION METHOD
  /**
   * <p>This method is empty and is called as soon as the Channel has been registered.</p>
   * <p>Tasks such as subscribing to other channels, and sending initial payloads can be added here.</p>
   */
  onChannelInitialized() {

  }

  get isProxy() {
    return this.props.isProxy;
  }

  get channelName() {
    return this.props.name;
  }

  /**
   *
   * @desc
   * returns the source observable for the channel
   */
  get observer() {
    return this.observer$;
  }

  // DO NOT OVERRIDE THIS METHOD
  initializeStream() {
    this.onChannelInitialized();
  }

  setTrace(bool) {
  }

  createChannelActionsObj(name, extendedActionsArr=[]) {
    const getActionVal = ifElse(is(String), identity, head);
    let mainArr = extendedActionsArr.concat(this.addRegisteredActions(name));
    let arr = rMap(getActionVal,mainArr);
    const converter = str => objOf(str, str);
    let obj = mergeAll(chain(converter, arr));
    this.channelActions = obj;
  }

  createChannelActionMethods() {
    const defaultFn = 'onViewStreamInfo';
    const getActionVal = ifElse(is(String), identity, head);
    const getCustomMethod = val => {
      const methodStr = view(lensIndex(1), val);
      const hasMethod = typeof (this[methodStr]) === 'function';
      if (hasMethod === true) {
        this[methodStr].bind(this);
      } else {
        console.warn(`"${this.props.name}", REQUIRES THE FOLLOWING METHOD ${methodStr} FOR ACTION, ${val[0]}`);
      }

      return methodStr;
    };

    const getArrMethod =  ifElse(is(String), always(defaultFn), getCustomMethod);

    const createObj = val => {
      let key = getActionVal(val);
      let method =  getArrMethod(val);
      return [key, method];
    };

    this.channelActionMethods = fromPairs(rMap(createObj, this.addRegisteredActions()));

    // console.log('the channel action methods ',this.channelActionMethods);
  }

  /**
   *
   * @desc
   * <p>Channels send along Action names along with its payload.</p>
   * <p>Before any action can be used, that action needs to be registered using this method.</p>
   * <p>ViewStream instances can filter ChannelPayloads by binding specific LINK['actions to local methods', 'view-stream-add-action-listeners'].</p>
   * <p>Forcing registration of actions allows Spyne to validate Actions, and is also a useful way to keep track of all Actions that are intended to be used.</p>
   *
   * @returns
   * Array of Strings
   *
   * @example
   * TITLE["<h4>Registering Actions in the addRegisteredActions method</h4>"]
   *    addRegisteredActions() {
   *     return [
   *        'CHANNEL_MY_CHANNEL_EVENT',
   *        'CHANNEL_MY_CHANNEL_UPDATE_EVENT'
   *       ];
   *      }
   *
   */
  addRegisteredActions() {
    return [];
  }

  onReceivedObservable(obj) {
    this.onIncomingObservable(obj);
  }

  getActionMethodForObservable(obj) {
    const defaultFn = this.onViewStreamInfo.bind(this);

    let methodStr = path(['data', 'action'], obj);
    const methodVal = prop(methodStr, this.channelActionMethods);

    let fn = defaultFn;

    if (methodVal !== undefined && methodVal !== 'onViewStreamInfo') {
      const methodExists = typeof (this[methodVal]) === 'function';
      if (methodExists === true) {
        fn = this[methodVal].bind(this);
      }
    }

    return fn;
  }

  onIncomingObservable(obj) {
    let eqsName = equals(obj.name, this.props.name);
    const mergeProps = (d) => mergeAll([d, { action: prop('action', d) }, prop('payload', d), prop('srcElement', d)]);
    let dataObj = obsVal => ({
      props: () => mergeProps(obj.data),
      viewStreamInfo: obj.data,
      viewStreamEvent: obsVal
    });
    let onSuccess = (obj) => obj.observable.pipe(map(dataObj))
      .subscribe(this.getActionMethodForObservable(obj));
    let onError = () => {};
    return eqsName === true ? onSuccess(obj) : onError();
  }

  /**
   *
   * <p>ViewSteam instances can send info to channels through its LINK['sendInfoToChannel, 'view-stream-send-info-to-channel'] method.</p>
   * <p>Data received from ViewStreams are directed to this method.</p>
   * <p>ViewStreams send data using the LINK['ViewStreamPayload', 'view-stream-payload'] format.</p>
   *
   * @param {ViewStreamPayload} obj
   *
   * @example
   * TITLE["<h4>Parsing Data Returned from a ViewStream Instance</h4>"]
   * onViewStreamInfo(obj){
   *     let data = obj.viewStreamInfo;
   *     let action = data.action;
   *     let newPayload = this.parseViewStreamData(data);
   *     this.sendChannelPayload(action, newPayload);
   * }
   *
   *
   */
  onViewStreamInfo(obj) {
  }


  /**
   *
   * @desc
   *
   * <p>This method takes an action, a data object and other properties to create and publish a LINK['ChannelPayload', 'channel-payload'] object.</p>
   * <p>Once the action and payload is validated, this method will publish the data by using the channel's source Subject next() method.
   * <p>This consistent format allows subscribers to understand how to parse any incoming channel data.</p>
   *
   * @param {String} action
   * @param {Object} payload
   * @param {HTMLElement} srcElement
   * @param {HTMLElement} event
   * @param {Observable} obs$
   * @property {String} action - = undefined; Required. An action is a string, typically in the format of "CHANNEL_NAME_ACTION_NAME_EVENT", and that has been added in the addRegisteredActions method.
   * @property {Object} payload - = undefined; Required. This can be any javascript object and is used to send any custom data.
   * @property {HTMLElement} srcElement - = Not Required. undefined; This can be either the element returned from the UI Channel, or the srcElement from a ViewStream instance.
   * @property {UIEvent} event - = undefined; Not Required. This will be defined if the event is from the UI Channel.
   * @property {Observable} obs$ - = this.observer; This default is the source observable for this channel.
   *
   * @example
   * TITLE['<h4>Publishing a ChannelPayload</h4>']
   * let action = "CHANNEL_MY_CHANNEL_REGISTERED_ACTION_EVENT";
   * let data = {foo:"bar"};
   * this.sendChannelPayload(action, data);
   *
   */
  sendChannelPayload(action, payload, srcElement = {}, event = {}, obs$ = this.observer$) {
    // MAKES ALL CHANNEL BASE AND DATA STREAMS CONSISTENT
    let channelPayloadItem = new ChannelPayload(this.props.name, action, payload, srcElement, event);
    // console.log("CHANNEL STREEM ITEM ",channelPayloadItem);

    obs$.next(channelPayloadItem);
  }

  /**
   *
   * <p>Allows channels to subscribe to other channels.</p>
   * <p>This method returns the source rxjs Subject for the requested Channel, which can be listened to by calling its subscribe method.</p>
   * <p>Knowledge of rxjs is not required to subscribe to and parse Channel data.</p>
   * <p>But accessing the rxjs Subject gives developers the ability to use all of the available rxjs mapping and observable tools.</p>
   *
   * @param {String} CHANNEL_NAME The registered name of the requested channel.
   * @returns
   * The source rxjs Subject of the requested channel.
   * @example
   * TITLE["<h4>Subscribing to a Channel Using the getChannel method</h4>"]
   * let route$ = this.getChannel("CHANNEL_ROUTE")
   * route$.subscribe(localMethod);
   *
   *
   */
  getChannel(CHANNEL_NAME) {
    let isValidChannel = c => registeredStreamNames().includes(c);
    let error = c => console.warn(
      `channel name ${c} is not within ${registeredStreamNames}`);
    let startSubscribe = (c) => this.streamsController.getStream(c).observer;
    let fn = ifElse(isValidChannel, startSubscribe, error);
    return fn(CHANNEL_NAME);
  }
}
