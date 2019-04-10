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
   * <p>Channels are observables that sends data and events using the ChannelPayloads format.</p>
   * <h3>Channel Name</h3>
   * <p>All Channels requires a unique name that is typically set in the following format, <em>CHANNEL_MYCHANNEL</em> </p>
   * <h3>Connecting to Channels</h3>
   * <p>Any Channel can subscribe to any other Channel instance by calling its unique name in the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-get-channel"  href="/guide/reference/channel-get-channel" >getChannel</a>
   method.</p>
   *   <p>ViewStreams automatically subscribes and unsubscribes to channels by calling its unique name in the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="view-stream-add-channel"  href="/guide/reference/view-stream-add-channel" >addChannel</a> method.</p>
   *
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
   * @constructor
   * @param {string} name
   * @param {Object} props This json object takes in parameters to initialize the channel
   * @property {String} name - = undefined; This will be the registered name for this channel.
   * @property {Object} props - = {}; The props objects allows for custom properties for the channel.
   * @property {Observable} observer - = new Subject(); This is the source rxjs Subject for the channel.
   *
   */
  constructor(name = 'observer', props = {}) {
    this.addRegisteredActions.bind(this);
    this.createChannelActionsObj();
    props.name = name;
    this.props = props;
    this.props.isProxy = this.props.isProxy === undefined ? false : this.props.isProxy;
    this.props.sendCurrentPayload = this.props.sendCurrentPayload === undefined ? false : this.props.sendCurrentPayload;
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
      return this.streamsController.getProxySubject(this.props.name, this.props.sendCurrentPayload);
    } else {
      return this.props.sendCurrentPayload === true ? new ReplaySubject(1) : new Subject();
    }
  }

  //  OVERRIDE INITIALIZATION METHOD
  /**
   * <p>This method is meant to be extended and is called as soon as the channel is ready.</p>
   * <p>This is the recommended method to add functionality such as publishing the first channel payload, or subscribing to other channels.</p>
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

  createChannelActionsObj() {
    const getActionVal = ifElse(is(String), identity, head);
    let arr = rMap(getActionVal, this.addRegisteredActions());
    // console.log("ARR IS ",arr);
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
   * Any action that is to be used by the channel is required to be added here.
   * If the action is added as a paired array, then the second value will be the directed to that method instead of the default, <i>onViewStreamInfo</i> method.
   * @returns
   * Array of Strings and/or paired Array
   *
   * @example
   *    addRegisteredActions() {
   *     return [
   *        'CHANNEL_MY_CHANNEL_EVENT',
   *        ['CHANNEL_MY_CHANNEL_UPDATE_EVENT', 'onMethodListener']
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
   * This is the default method to listen for ViewStream payloads that are directed to a particular channel.
   *
   * @param {ViewStreamPayload} obj
   *
   * @example
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
   * <p>All channels send data using the <a class='linker' data-channel="ROUTE"  data-event-prevent-default="true" data-menu-item="channel-payload"  href="/guide/reference/channel-payload" >Channel Payload</a>
   object format. This consistent format allows subscribers to understand how to parse any incoming channel data.</p>
   * <p>And this method automatically formats an action and javascript payload object into a ChannelPayload object and calls this.observer.next().</p>
   *
   * @param {String} action
   * @param {Object} payload
   * @param {HTMLElement} srcElement
   * @param {HTMLElement} event
   * @param {Observable} obs$
   * @property {String} action - = undefined; Required. An action is a string, typically in the format of "CHANNEL_NAME_ACTION_NAME_EVENT", and that has been added in the addRegisteredActions method.
   * @property {Object} paylaod - = undefined; Required. This can be any javascript object and is used to send any custom data.
   * @property {HTMLElement} srcElement - = undefined; This can be either the element returned from the UI Channel, or the srcElement from a ViewStream instance.
   * @property {UIEvent} event - = undefined; This will be defined if the event is from the UI Channel.
   * @property {Observable} obs$ - = this.observer; This default is the main observable for the channel. The option for another observable is available.
   *
   * @example
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
   * This method allows channels to subscribe to other channels.
   * @param {String} channel The registered name of the requested channel.
   * @example
   * let route$ = this.getChannel("CHANNEL_ROUTE")
   * route$.subscribe(localMethod);
   *
   *
   */
  getChannel(channel) {
    let isValidChannel = c => registeredStreamNames().includes(c);
    let error = c => console.warn(
      `channel name ${c} is not within ${registeredStreamNames}`);
    let startSubscribe = (c) => this.streamsController.getStream(c).observer;
    let fn = ifElse(isValidChannel, startSubscribe, error);
    return fn(channel);
  }
}