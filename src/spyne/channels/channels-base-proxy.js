import { ChannelBaseClass } from './channel-base-class';
import { Subject, ReplaySubject, merge } from 'rxjs';
import {includes, path} from 'ramda';

export class ChannelsBaseProxy extends ChannelBaseClass {
  constructor(name, props = {}) {
    props.isProxy = true;
    super(name, props);
    this.props = props;
    this.subject$ = new Subject();
    this.replaySub$ = new ReplaySubject(1);
    this.observer$ = merge(this.subject$, this.replaySub$);
	const isDevMode = path(['Spyne', 'config', 'devMode'], window) === true;
    if (isDevMode === true){
      this.checkIfChannelIsStillProxy(name);
    }
  }

  getMergedSubject(peristData = false) {
    return peristData === true ? this.replaySub$ : this.subject$;
  }

  checkIfChannelIsStillProxy(channelName){
    let name = channelName;

    const checkIfProxy=()=>{
      //console.log("CHANNELS ",window.Spyne.channels.listRegisteredChannels());
      let bool = includes(name, window.Spyne.channels.listRegisteredChannels());
      if (bool!==true){
        console.warn(`Spyne Warning: The channel, ${name} does not appear to be registered!`);
      }
    };

    window.setTimeout(checkIfProxy, 1000);
  }

  get replaySubject() {
    return this.replaySub$;
  }

  get subject() {
    return this.subject$;
  }
}
