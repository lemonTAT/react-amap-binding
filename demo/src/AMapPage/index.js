import React from 'react';
import {
  node,
  object,
  string,
} from 'prop-types';
import { hot } from 'react-hot-loader';
import { withStyles } from '@material-ui/core/styles';
import { AMap } from '@gjyibus/react-amap-binding';

const styles = (theme) => ({
  mapContainer: {
    width: '100vw',
    height: '100vh',
  },
});

@hot(module)
@withStyles(styles)
class AMapPage extends React.Component {
  static propTypes = {
    appKey: string,
    classes: object,
    children: node,

  };

  static defaultProps = {
    appKey: 'e15e343ed5f952efd7899005dc60900f',
  };

  /**
   * Show AMap with full screen width and height.
   */
  render() {
    const {
      classes,
      children,
      ...others
    } = this.props;

    return (
      <div className={classes.mapContainer}>
        <AMap
          {...others}
          // proxyUrl={'http://0.0.0.0:8082/amap'}
          version={'2.0'}
          mapStyle={'amap://styles/24e5c77d4e3a7bc131df1b6dbafde743'}
        >
          {children}
        </AMap>
      </div>
    );
  }
}

export default AMapPage;
