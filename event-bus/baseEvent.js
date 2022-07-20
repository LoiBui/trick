class BaseEvent {
    _generateEventName(keyPrefix, eventName) {
        return `${keyPrefix}:${eventName}`;
    }
}

export default BaseEvent;
