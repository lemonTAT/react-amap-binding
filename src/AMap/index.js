import React from 'react';
import PropTypes from 'prop-types';
import AMapContext from '../AMapContext';
import createEventCallback from '../utils/createEventCallback';
import isShallowEqual from '../utils/isShallowEqual';
import { bindInstanceEvent, removeInstanceEvent } from '../utils/instanceEventHandler';
import version2Flag from '../utils/mapVersion2Flag';

const mapContainerStyle = { width: '100%', height: '100%' };

/**
 * This module imports AMap libraries (JS API, JS UI API, and Loca), and creates a map scope.
 * All other map component should be descendant of this component.
 */
class AMap extends React.PureComponent {
  /**
   * AMap component accepts the following options to initialise AMap.
   * AMap has the same options as AMap.Map unless highlighted below.
   * {@link http://lbs.amap.com/api/javascript-api/reference/map}
   */
  static propTypes = {
    /**
     * AMap JS App key.
     */
    appKey: PropTypes.string.isRequired,
    /* eslint-disable-next-line react/no-unused-prop-types */
    bounds: PropTypes.oneOfType([
      /**
       * South west and north east lng lat position.
       * i.e. [[soutWest], [northEast]]
       */
      PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
      /**
       * AMap.Bounds instance.
       */
      PropTypes.object,
    ]),
    /**
     * Child components.
     */
    children: PropTypes.node,
    /**
     * Loca library version.
     * Loca will be deprecated in the next major version. Please consider react-amap-2drender for
     * rendering map UI components with high performance.
     */
    locaVersion: PropTypes.string,
    /**
     * Whether it is http or https.
     */
    onClick: PropTypes.func,
    /**
     * AMap UI version.
     */
    onComplete: PropTypes.func,
    /**
     * AMap javascript library version.
     */
    onDblClick: PropTypes.func,
    /**
     * self defined prop: AMap proxy url.
     */
    onDragEnd: PropTypes.func,
    /**
     * Event callback.
     * Signature:
     * (map, ...event) => void
     * map: AMap instance.
     * event: AMap event.
     */
    /* eslint-disable react/sort-prop-types,react/no-unused-prop-types */
    onDragging: PropTypes.func,
    onDragStart: PropTypes.func,
    onHotspotClick: PropTypes.func,
    onHotspotOut: PropTypes.func,
    onHotspotOver: PropTypes.func,
    onMapMove: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseMove: PropTypes.func,
    onMouseOut: PropTypes.func,
    onMouseOver: PropTypes.func,
    onMouseUp: PropTypes.func,
    onMouseWheel: PropTypes.func,
    onMoveEnd: PropTypes.func,
    onMoveStart: PropTypes.func,
    onResize: PropTypes.func,
    onRightClick: PropTypes.func,
    onTouchEnd: PropTypes.func,
    onTouchMove: PropTypes.func,
    onTouchStart: PropTypes.func,
    onZoomChange: PropTypes.func,
    onZoomEnd: PropTypes.func,
    onZoomStart: PropTypes.func,
    protocol: PropTypes.oneOf(['http', 'https']),
    proxyUrl: PropTypes.string,
    uiVersion: PropTypes.string,
    version: PropTypes.string,
    /* eslint-enable */
  };

  static defaultProps = {
    locaVersion: '1.0.5',
    protocol: 'https',
    version: '1.4.15',
    uiVersion: '1.0',
  };

  /**
   * Parse AMap.Map options.
   * Filter out event callbacks, the remainings are map options.
   */
  static parseMapOptions(props) {
    const {
      appKey,
      children,
      locaVersion,
      protocol,
      uiVersion,
      version,
      onComplete,
      onClick,
      onDblClick,
      onMapMove,
      onHotspotClick,
      onHotspotOver,
      onHotspotOut,
      onMoveStart,
      onMoveEnd,
      onZoomChange,
      onZoomStart,
      onZoomEnd,
      onMouseMove,
      onMouseWheel,
      onMouseOver,
      onMouseOut,
      onMouseUp,
      onMouseDown,
      onRightClick,
      onDragStart,
      onDragging,
      onDragEnd,
      onResize,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      ...mapOptions
    } = props;

    const {
      bounds,
    } = mapOptions;

    return {
      ...mapOptions,
      bounds: (() => {
        /**
         * Bounds does not have any effect before AMap library has been loaded.
         * Bounds takes effect through calling setBounds function as long as AMap library has been
         * loaded.
         */
        if (window.AMap === void 0) return void 0;

        /**
         * The most anticipated value.
         */
        if (bounds instanceof window.AMap.Bounds) return bounds;

        /**
         * Transform [[soutWest], [northEast]] to AMap.Bounds instance.
         */
        if (bounds instanceof Array) {
          return new window.AMap.Bounds(...bounds);
        }

        return bounds;
      })(),
      /**
       * Memorise props.bounds.
       * We always create a new instance of AMap.Bounds if props.bounds is an array. Shallow
       * compare bounds always results unequal even if props.bounds does not change. boundsProp
       * memorises the original props.bounds. Comparing boundProp has a clear understanding
       * whether bounds has changed.
       */
      boundsProp: (() => {
        /**
         * Bounds does not have any effect before AMap library has been loaded.
         * Bounds takes effect through calling setBounds function as long as AMap library has been
         * loaded.
         */
        if (window.AMap === void 0) return void 0;

        return bounds;
      })(),
    };
  }

  /**
   * Create script tag to load some scripts.
   */
  static loadScript(src) {
    const scriptTag = document.createElement('script');
    scriptTag.type = 'text/javascript';
    scriptTag.src = src;

    document.head.appendChild(scriptTag);

    return new Promise((resolve) => {
      scriptTag.onload = () => {
        return resolve();
      };
    });
  }

  /**
   * Create script tag to require AMap library.
   */
  static requireAMap({ appKey, protocol, version, proxyUrl }) {
    let src = `${protocol}://webapi.amap.com/maps?v=${version}&key=${appKey}`;
    if (proxyUrl) {
      src = `${proxyUrl}/maps?v=${version}&key=${appKey}`;
    }

    return AMap.loadScript(src);
  }

  /**
   * Create script tag to require AMapUI library.
   */
  static async requireAMapUI({ protocol, version, proxyUrl }) {
    let src = `${protocol}://webapi.amap.com/ui/${version}/main-async.js`;
    if (proxyUrl) {
      src = `${proxyUrl}/ui/${version}/main-async.js`;
    }

    await AMap.loadScript(src);

    window.initAMapUI();
  }

  /**
   * Create script tag to require Loca library.
   */
  static requireLoca({ appKey, protocol, version, proxyUrl }) {
    let src = `${protocol}://webapi.amap.com/loca?key=${appKey}&v=${version}`;
    if (proxyUrl) {
      src = `${proxyUrl}/loca?key=${appKey}&v=${version}`;
    }

    return AMap.loadScript(src);
  }

  /**
   * Initialise map property with undefined.
   */
  constructor(props) {
    super(props);

    this.state = {
      map: void 0,
    };

    this.mapOptions = AMap.parseMapOptions(this.props);
  }

  /**
   * We get map conatiner element reference until this lifecycle method to instantiate
   * AMap map object.
   */
  componentDidMount() {
    this.initAMap();
  }

  /**
   * Update this.map by calling AMap.Map methods.
   */
  componentDidUpdate() {
    /**
     * Hold all updates until map has been created.
     */
    if (this.map === void 0) return;

    const nextMapOptions = AMap.parseMapOptions(this.props);

    this.updateMapWithAPI('setZoom', this.mapOptions.zoom, nextMapOptions.zoom);
    this.updateMapWithAPI('setLabelzIndex', this.mapOptions.labelzIndex,
      nextMapOptions.labelzIndex);
    // Calling setLayers causes fatal exceptions
    // this.updateMapWithApi('setLayers', this.mapOptions.layers, nextMapOptions.layers);
    this.updateMapWithAPI('setCenter', this.mapOptions.center, nextMapOptions.center);
    this.updateMapWithAPI('setCity', this.mapOptions.city, nextMapOptions.city);
    /**
     * Comparing props.bounds instead of bounds because bounds are newly created everytime
     * even though props.bounds does not change.
     */
    this.updateMapWithAPI('setBounds', this.mapOptions.boundsProp, nextMapOptions.boundsProp,
      nextMapOptions.bounds);
    this.updateMapWithAPI('setLang', this.mapOptions.lang, nextMapOptions.lang);
    this.updateMapWithAPI('setRotation', this.mapOptions.rotation, nextMapOptions.rotation);
    this.updateMapWithAPI('setStatus', this.mapOptions.status, nextMapOptions.status);
    this.updateMapWithAPI('setDefaultCursor', this.mapOptions.defaultCursor,
      nextMapOptions.defaultCursor);
    this.updateMapWithAPI('setMapStyle', this.mapOptions.mapStyle, nextMapOptions.mapStyle);
    this.updateMapWithAPI('setFeatures', this.mapOptions.features, nextMapOptions.features);
    this.updateMapWithAPI('setDefaultLayer', this.mapOptions.defaultLayer,
      nextMapOptions.defaultLayer);
    this.updateMapWithAPI('setPitch', this.mapOptions.pitch, nextMapOptions.pitch);

    this.mapOptions = nextMapOptions;
  }

  /**
   * Remove event listeners.
   * Destroy AMap.Map instance.
   */
  componentWillUnmount() {
    const { map } = this.state;
    /**
     * There is a scenario where AMap has not been loaded when component unmounts.
     * AMapEventListeners and map instance are assigned only if AMap library has been loaded.
     */
    if (map !== void 0) {
      removeInstanceEvent(map, this.AMapEventListeners);

      map.destroy();
    }
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
    this.eventCallbacks = this.parseEvents();

    bindInstanceEvent(this.map, this.eventCallbacks, this.AMapEventListeners);
  }

  /**
   * Load AMap library and instantiate map object by calling AMap.Map.
   */
  async initAMap() {
    const {
      appKey,
      locaVersion,
      protocol,
      uiVersion,
      version,
      proxyUrl,
    } = this.props;

    if (window.AMap === void 0) {
      await AMap.requireAMap({ appKey, protocol, version, proxyUrl });
      /**
       * Load AMapUI and Loca in parallel.
       */
      const newUiVersion = version2Flag(version) ? '1.1' : uiVersion;
      const AMapUI = AMap.requireAMapUI({ protocol, version: newUiVersion, proxyUrl });
      const Loca = AMap.requireLoca({ appKey, protocol, version: locaVersion, proxyUrl });
      await AMapUI;
      await Loca;
    }

    this.map = new window.AMap.Map(this.mapContainer, {
      ...this.mapOptions,
    });

    this.bindEvents();

    this.setState({
      map: this.map,
    });
  }

  /**
   * Return an object of all supported event callbacks.
  */
  parseEvents() {
    return {
      onComplete: createEventCallback('onComplete', this.map).bind(this),
      onClick: createEventCallback('onClick', this.map).bind(this),
      onDblClick: createEventCallback('onDblClick', this.map).bind(this),
      onMapMove: createEventCallback('onMapMove', this.map).bind(this),
      onHotspotClick: createEventCallback('onHotspotClick', this.map).bind(this),
      onHotspotOver: createEventCallback('onHotspotOver', this.map).bind(this),
      onHotspotOut: createEventCallback('onHotspotOut', this.map).bind(this),
      onMoveStart: createEventCallback('onMoveStart', this.map).bind(this),
      onMoveEnd: createEventCallback('onMoveEnd', this.map).bind(this),
      onZoomChange: createEventCallback('onZoomChange', this.map).bind(this),
      onZoomStart: createEventCallback('onZoomStart', this.map).bind(this),
      onZoomEnd: createEventCallback('onZoomEnd', this.map).bind(this),
      onMouseMove: createEventCallback('onMouseMove', this.map).bind(this),
      onMouseWheel: createEventCallback('onMouseWheel', this.map).bind(this),
      onMouseOver: createEventCallback('onMouseOver', this.map).bind(this),
      onMouseOut: createEventCallback('onMouseOut', this.map).bind(this),
      onMouseUp: createEventCallback('onMouseUp', this.map).bind(this),
      onMouseDown: createEventCallback('onMouseDown', this.map).bind(this),
      onRightClick: createEventCallback('onRightClick', this.map).bind(this),
      onDragStart: createEventCallback('onDragStart', this.map).bind(this),
      onDragging: createEventCallback('onDragging', this.map).bind(this),
      onDragEnd: createEventCallback('onDragEnd', this.map).bind(this),
      onResize: createEventCallback('onResize', this.map).bind(this),
      onTouchStart: createEventCallback('onTouchStart', this.map).bind(this),
      onTouchMove: createEventCallback('onTouchMove', this.map).bind(this),
      onTouchEnd: createEventCallback('onTouchEnd', this.map).bind(this),
    };
  }

  /**
   * Update AMap.Map instance with named API.
   * Call update API with next prop only if props to be compared are not identical.
   * Won't call API if prop does not change.
   */
  updateMapWithAPI(apiName, previousCompareProp, nextCompareProp, nextProp) {
    /**
     * nextProp can omit if next prop is identical to prop to be compared.
     */
    if (arguments.length === 3) {
      nextProp = nextCompareProp;
    }

    if (!isShallowEqual(previousCompareProp, nextCompareProp)) {
      if (apiName === 'setCenter' && !nextProp) {
        return;
      }
      this.map[apiName](nextProp);
    }
  }

  /**
   * Render a div element as root of AMap.
   */
  render() {
    const {
      children,
    } = this.props;

    const {
      map,
    } = this.state;

    return (
      <div ref={(self) => { this.mapContainer = self; }} style={mapContainerStyle}>
        <AMapContext.Provider value={map}>
          {map !== void 0 && children}
        </AMapContext.Provider>
      </div>
    );
  }
}

export default AMap;
