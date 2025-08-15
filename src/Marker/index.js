import React from 'react';
import PropTypes from 'prop-types';
import AMapContext from '../AMapContext';
import breakIfNotChildOfAMap from '../utils/breakIfNotChildOfAMap';
import cloneDeep from '../utils/cloneDeep';
import createEventCallback from '../utils/createEventCallback';
import isNullVoid from '../utils/isNullVoid';
import isShallowEqual from '../utils/isShallowEqual';
import { bindInstanceEvent, removeInstanceEvent } from '../utils/instanceEventHandler';

/**
 * Fields that need to be deep copied.
 * AMap LBS library mutates options. Deep copy those options before passing to AMap so that
 * props won't be mutated.
 */
const NEED_DEEP_COPY_FIELDS = ['position'];

/**
 * Marker binding.
 * Marker has the same options as AMap.Marker unless highlighted below.
 * {@link http://lbs.amap.com/api/javascript-api/reference/overlay#marker}
 */
class Marker extends React.Component {
  static propTypes = {
    /* eslint-disable react/no-unused-prop-types */
    icon: PropTypes.oneOfType([
      /**
       * AMap.Icon instance.
       */
      PropTypes.object,
      /**
       * AMap.Icon options.
       */
      PropTypes.shape({
        image: PropTypes.string,
        imageOffset: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.number),
          /**
           * AMap.Pixel instance.
           */
          PropTypes.object,
        ]),
        imageSize: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.number),
          /**
           * AMap.Size instance.
           */
          PropTypes.object,
        ]),
        size: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.number),
          /**
           * AMap.Size instance.
           */
          PropTypes.object,
        ]),
      }),
      /**
       * Image url.
       */
      PropTypes.string,
    ]),
    label: PropTypes.shape({
      /**
       * An array of two numbers or AMap.Pixel.
       */
      offset: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.number),
        /**
         * AMap.Pixel instance.
         */
        PropTypes.object,
      ]),
    }),
    /**
     * An array of two numbers or AMap.Pixel.
     */
    offset: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.number),
      /**
       * AMap.Pixel instance.
       */
      PropTypes.object,
    ]),
    /**
     * Show Marker by default, you can toggle show or hide by changing visible.
     */
    visible: PropTypes.bool,
    /**
     * Event callback.
     * Signature:
     * (marker, ...event) => void
     * marker: AMap.Marker instance.
     * event: AMap event.
     */
    /* eslint-disable react/sort-prop-types,react/no-unused-prop-types */
    onComplete: PropTypes.func,
    onClick: PropTypes.func,
    onDblClick: PropTypes.func,
    onRightClick: PropTypes.func,
    onMouseMove: PropTypes.func,
    onMouseOver: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseUp: PropTypes.func,
    onDragStart: PropTypes.func,
    onDragging: PropTypes.func,
    onDragEnd: PropTypes.func,
    onMoving: PropTypes.func,
    onMoveEnd: PropTypes.func,
    onMoveAlong: PropTypes.func,
    onTouchStart: PropTypes.func,
    onTouchMove: PropTypes.func,
    onTouchEnd: PropTypes.func,
    /* eslint-enable */
  };

  static defaultProps = {
    visible: true,
  };

  /**
   * AMap map instance.
   */
  static contextType = AMapContext;

  /**
   * Parse AMap.Marker options.
   * Named properties are event callbacks, other properties are marker options.
   */
  static parseMarkerOptions(props) {
    const {
      onComplete,
      onClick,
      onDblClick,
      onRightClick,
      onMouseMove,
      onMouseOver,
      onMouseOut,
      onMouseDown,
      onMouseUp,
      onDragStart,
      onDragging,
      onDragEnd,
      onMoving,
      onMoveEnd,
      onMoveAlong,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      ...markerOptions
    } = props;

    const {
      icon,
      label = {},
      offset,
    } = markerOptions;

    return {
      ...markerOptions,
      icon: (() => {
        /**
         * Changing label to either null or undefined clears icon.
         */
        if (isNullVoid(icon)) return null;

        if (icon instanceof window.AMap.Icon) return icon;

        /**
         * Construct AMap.Icon instance with options.
         */
        return new window.AMap.Icon({
          image: icon.image,
          imageOffset: (() => {
            if (icon.imageOffset instanceof window.AMap.Pixel) {
              return icon.imageOffset;
            }

            if (icon.imageOffset instanceof Array) {
              return new window.AMap.Pixel(...icon.imageOffset);
            }

            return new window.AMap.Pixel(0, 0);
          })(),
          /**
           * AMap.Icon understands both [x, y] and instance of AMap.Size.
           */
          imageSize: icon.imageSize,
          size: icon.size,
        });
      })(),
      label: (() => {
        /**
         * Changing label to either null or undefined clears label.
         */
        if (isNullVoid(label)) return null;

        return {
          ...label,
          // Will transform an array of two numbers into a Pixel instance
          offset: (() => {
            if (label.offset instanceof window.AMap.Pixel) {
              return label.offset;
            }

            if (label.offset instanceof Array) {
              return new window.AMap.Pixel(...label.offset);
            }

            return new window.AMap.Pixel(0, 0);
          })(),
        };
      })(),
      // Will transform an array of two numbers into a Pixel instance
      offset: (() => {
        if (offset instanceof window.AMap.Pixel) {
          return offset;
        }

        if (offset instanceof Array) {
          return new window.AMap.Pixel(...offset);
        }

        return new window.AMap.Pixel(-10, -34);
      })(),
    };
  }

  /**
   * Define event name mapping relations of react binding Marker and AMap.Marker.
   * Initialise AMap.Marker and bind events.
   * Fire complete action as soon as bezier curve has been created.
   */
  constructor(props, context) {
    super(props);

    const { onComplete } = this.props;

    const map = context;

    breakIfNotChildOfAMap('Marker', map);

    this.markerOptions = Marker.parseMarkerOptions(this.props);

    this.marker = this.initMarker(map);

    this.bindEvents();

    typeof onComplete === 'function' && onComplete(map, this.marker);
  }

  /**
   * Update this.marker by calling AMap.Marker methods.
   */
  shouldComponentUpdate(nextProps) {
    const nextMarkerOptions = Marker.parseMarkerOptions(nextProps);

    const newMarkerOptions = cloneDeep(nextMarkerOptions, NEED_DEEP_COPY_FIELDS);

    this.toggleVisible(this.markerOptions.visible, nextMarkerOptions.visible);

    this.updateMarkerWithAPI('setAnchor', this.markerOptions.anchor, nextMarkerOptions.anchor,
      newMarkerOptions.anchor);

    this.updateMarkerWithAPI('setOffset', this.markerOptions.offset, nextMarkerOptions.offset,
      newMarkerOptions.offset);

    this.updateMarkerWithAPI('setAnimation', this.markerOptions.animation,
      nextMarkerOptions.animation, newMarkerOptions.animation);

    this.updateMarkerWithAPI('setClickable', this.markerOptions.clickable,
      nextMarkerOptions.clickable, newMarkerOptions.clickable);

    this.updateMarkerWithAPI('setPosition', this.markerOptions.position, nextMarkerOptions.position,
      newMarkerOptions.position);

    this.updateMarkerWithAPI('setAngle', this.markerOptions.angle, nextMarkerOptions.angle,
      newMarkerOptions.angle);

    /**
     * WARNING: There is a known issue: Create Marker with label, then setLabel(null) to clear
     * label, then setIcon to change icon image, results label appears again.
     */
    this.updateMarkerWithAPI('setLabel', this.markerOptions.label, nextMarkerOptions.label,
      newMarkerOptions.label);

    this.updateMarkerWithAPI('setzIndex', this.markerOptions.zIndex, nextMarkerOptions.zIndex,
      newMarkerOptions.zIndex);

    this.updateMarkerWithAPI('setIcon', this.markerOptions.icon, nextMarkerOptions.icon,
      newMarkerOptions.icon);

    this.updateMarkerWithAPI('setDraggable', this.markerOptions.draggable,
      nextMarkerOptions.draggable, newMarkerOptions.draggable);

    this.updateMarkerWithAPI('setCursor', this.markerOptions.cursor, nextMarkerOptions.cursor,
      newMarkerOptions.cursor);

    this.updateMarkerWithAPI('setContent', this.markerOptions.content, nextMarkerOptions.content,
      newMarkerOptions.content);

    this.updateMarkerWithAPI('setTitle', this.markerOptions.title, nextMarkerOptions.title,
      newMarkerOptions.title);

    this.updateMarkerWithAPI('setShadow', this.markerOptions.shadow, nextMarkerOptions.shadow,
      newMarkerOptions.shadow);

    this.updateMarkerWithAPI('setShape', this.markerOptions.shape, nextMarkerOptions.shape,
      newMarkerOptions.shape);

    this.updateMarkerWithAPI('setExtData', this.markerOptions.extData, nextMarkerOptions.extData,
      newMarkerOptions.extData);

    this.markerOptions = nextMarkerOptions;

    return false;
  }

  /**
   * Remove event listeners.
   * Destroy marker instance.
   */
  componentWillUnmount() {
    removeInstanceEvent(this.marker, this.AMapEventListeners);

    this.marker.setMap(null);
    this.marker = null;
  }

  /**
   * Bind all events on map instance, and save event listeners which will be removed in
   * componentWillUnmount lifecycle.
   */
  bindEvents() {
    this.AMapEventListeners = [];

    /**
     * Construct event callbacks.
     */
    const eventCallbacks = this.parseEvents();

    bindInstanceEvent(this.marker, eventCallbacks, this.AMapEventListeners);
  }

  /**
   * Initialise AMap.Marker
   */
  initMarker(map) {
    const { visible } = this.props;

    const newMarkerOptions = cloneDeep(this.markerOptions, NEED_DEEP_COPY_FIELDS);

    const marker = new window.AMap.Marker(newMarkerOptions);

    marker.setMap(map);

    if (visible === false) marker.hide();

    return marker;
  }

  /**
   * Return an object of all supported event callbacks.
   */
  parseEvents() {
    return {
      onClick: createEventCallback('onClick', this.marker).bind(this),
      onDblClick: createEventCallback('onDblClick', this.marker).bind(this),
      onRightClick: createEventCallback('onRightClick', this.marker).bind(this),
      onMouseMove: createEventCallback('onMouseMove', this.marker).bind(this),
      onMouseOver: createEventCallback('onMouseOver', this.marker).bind(this),
      onMouseOut: createEventCallback('onMouseOut', this.marker).bind(this),
      onMouseDown: createEventCallback('onMouseDown', this.marker).bind(this),
      onMouseUp: createEventCallback('onMouseUp', this.marker).bind(this),
      onDragStart: createEventCallback('onDragStart', this.marker).bind(this),
      onDragging: createEventCallback('onDragging', this.marker).bind(this),
      onDragEnd: createEventCallback('onDragEnd', this.marker).bind(this),
      onMoving: createEventCallback('onMoving', this.marker).bind(this),
      onMoveEnd: createEventCallback('onMoveEnd', this.marker).bind(this),
      onMoveAlong: createEventCallback('onMoveAlong', this.marker).bind(this),
      onTouchStart: createEventCallback('onTouchStart', this.marker).bind(this),
      onTouchMove: createEventCallback('onTouchMove', this.marker).bind(this),
      onTouchEnd: createEventCallback('onTouchEnd', this.marker).bind(this),
    };
  }

  /**
   * Hide or show marker.
   */
  toggleVisible(previousProp, nextProp) {
    if (!isShallowEqual(previousProp, nextProp)) {
      if (nextProp === true) this.marker.show();
      if (nextProp === false) this.marker.hide();
    }
  }

  /**
   * Update AMap.Marker instance with named API and given value.
   * Won't call API if the given value does not change.
   */
  updateMarkerWithAPI(apiName, previousProp, nextProp, newProp) {
    if (!isShallowEqual(previousProp, nextProp)) {
      this.marker[apiName](newProp);
    }
  }

  /**
   * Render nothing.
   */
  render() {
    return null;
  }
}

export default Marker;
