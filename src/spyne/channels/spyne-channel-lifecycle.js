import { ChannelBaseClass } from './channel-base-class';
import {prop} from 'ramda';

export class SpyneChannelLifecycle extends ChannelBaseClass {
  /**
   * @module SpyneChannelLifeCycle
   * @desc
   * Internal Channel that publishes ViewStream rendering and disposing events.
   *
   * @constructor
   * @param {String} name
   * @param {Object} props
   */

  constructor(props = {}) {
    super('CHANNEL_LIFECYCLE', props);
  }

  addRegisteredActions() {
    return [
      'CHANNEL_LIFECYCLE_RENDERED_EVENT',
      'CHANNEL_LIFECYCLE_REMOVED_EVENT'
    ];
  }

  onViewStreamInfo(obj) {
    let data = obj.viewStreamInfo;
    let action = data.action;
    let payload = prop('srcElement', data);
    payload['action'] = action;
    this.onSendEvent(action, payload);
  }

  onSendEvent(actionStr, payload = {}) {
    const action = this.channelActions[actionStr];
    const srcElement = {};
    const event = undefined;
    const delayStream = () => this.sendChannelPayload(action, payload, srcElement, event);
    window.setTimeout(delayStream, 0);
  }
}