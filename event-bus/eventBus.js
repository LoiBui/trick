import BaseEvent from "./baseEvent";
import { makeUuid } from "../helpers/helper";
import { isNil } from "lodash";

class EventBus extends BaseEvent {
    constructor(keyPrefix) {
        super();
        this.keyPrefix =
            keyPrefix || process.env.VUE_APP_EVENT_PREFIX || "DEFAULT_PREFIX";

        this.callbacks = [];
        
        this.setNewUuid();
    }

    setNewUuid() {
        this.uuid = makeUuid();;

        this.callbacks[this.uuid] = [];
    }

    subscribe(eventName, callback) {
        const name = this._generateEventName(this.keyPrefix, eventName);
        
        const anonymus = (e) => {
            callback(e.detail, (data) => {
                this.fire(`pong::${e.detail.uuid}`, data, {
                    isNeedResult: false,
                });
            });

            if (e.detail.isNeedResult && !e.detail.isNeedResponse) {
                this.fire(`pong::${e.detail.uuid}`, null, {
                    isNeedResult: false,
                });
            }
        };
        
        const uuid = makeUuid();
        
        if (isNil(this.callbacks[this.uuid][name])) {
            this.callbacks[this.uuid][name] = [];
        }

        this.callbacks[this.uuid][name][uuid] = anonymus;

        document.addEventListener(name, anonymus);
        return uuid;
    }

    fire(eventName, data, options = {}, timeout = 2000) {
        options = {
            pong: (_) => {},
            timeout: (_) => {},
            isNeedResult: true,
            isNeedResponse: false,
            ...options,
        };

        const uuid = makeUuid();

        const name = this._generateEventName(this.keyPrefix, eventName);
        const event = new CustomEvent(name, {
            detail: {
                payload: data,
                isNeedResult: options.isNeedResult,
                isNeedResponse: options.isNeedResponse,
                uuid,
            },
        });

        if (options.isNeedResult) {
            let isPong = false;

            this.subscribe(`pong::${uuid}`, (data) => {
                isPong = true;
                options.pong(data);
            });

            setTimeout((_) => {
                if (!isPong) {
                    options.timeout();
                }
            }, timeout);
        }

        document.dispatchEvent(event);
    }

    unSubscribe(eventName, uuid) {
        const name = this._generateEventName(this.keyPrefix, eventName);

        const fn = ((this.callbacks[this.uuid] || [])[name] || [])[uuid];
        
        document.removeEventListener(name, fn);
    }

    unSubscribeAll() {
        for(const [_, events] of Object.entries(this.callbacks)) {
            events = events || {}
            for(const [name, item] of Object.entries(events)) {
                item = item || {}
                for(const [_, fn] of Object.entries(item)) {
                    document.removeEventListener(name, fn);
                }
            }
        }
    }
}

export default EventBus;
