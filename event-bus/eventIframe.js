import BaseEvent from "./baseEvent";
import { isFunction } from "lodash";
import { makeUuid } from "../helpers/helper";

class EventIframe extends BaseEvent {
    constructor(iframe, from, keyPrefix = null) {
        super();
        this.keyPrefix =
            keyPrefix || process.env.VUE_APP_EVENT_PREFIX || "DEFAULT_PREFIX";
        this.iframe = iframe;
        this.from = from;
        this.eventQueue = [];

        this._initListen();
    }

    _getIframe() {
        return document.querySelector(`#${$mapToolSDKSecond.iframeId}`)
    }

    _generateKey() {
        return `${this.keyPrefix}::transfer-data`;
    }

    _initListen() {
        window.onmessage = (e) => {
            const { data = {} } = e;
            if (data.type !== this._generateKey()) return;

            const eventName = data.name;

            const callback = this.eventQueue[eventName];
            
            if (isFunction(callback)) {
                callback(data.payload, (dataRes) => {
                    this.fire(`pong::${data.uuid}`, dataRes, {
                        isNeedResult: false,
                    });
                });

                if (data.isNeedResult && !data.isNeedResponse) {
                    this.fire(`pong::${data.uuid}`, null, {
                        isNeedResult: false,
                    });
                }
            }
        };
    }

    subscribe(eventName, callback) {
        const name = this._generateEventName(this.keyPrefix, eventName);
        this.eventQueue[name] = callback;
    }

    fire(eventName, data, options = {}, timeout = 1000) {
        options = {
            pong: (_) => {},
            timeout: (_) => {},
            isNeedResult: true,
            isNeedResponse: false,
            ...options,
        };

        const name = this._generateEventName(this.keyPrefix, eventName);

        const uuid = makeUuid();
        
        const payload = {
            type: this._generateKey(),
            name,
            payload: data,
            uuid,
            isNeedResult: options.isNeedResult,
            isNeedResponse: options.isNeedResponse,
        };

        if (options.isNeedResult) {
            let isPong = false;

            this.subscribe(`pong::${uuid}`, data => {
                isPong = true;
                options.pong(data);
            });

            setTimeout((_) => {
                if (!isPong) {
                    options.timeout();
                }
            }, timeout);
        }

        if (this.from === "parent") {
            this._getIframe().contentWindow.postMessage(payload, "*");
        } else {
            window.top.postMessage(payload, "*");
        }
    }
}

export default EventIframe;
