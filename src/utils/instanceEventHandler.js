export const bindInstanceEvent = (instance, eventCallbacks, eventCBList) => {
  Object.keys(eventCallbacks).forEach((key) => {
    const eventName = key.substring(2).toLowerCase();
    const handler = eventCallbacks[key];

    instance.on(eventName, handler);
    eventCBList.push({ eventName, handler });
  });
};

export const removeInstanceEvent = (instance, eventCBList) => {
  eventCBList.forEach((listener) => {
    instance.off(listener.eventName, listener.handler);
  });
};
