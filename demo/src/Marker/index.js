import React from 'react';
import { hot } from 'react-hot-loader';
import { Marker } from '@ibus/react-amap-binding';
import AMap from '../AMapPage';

@hot(module)
class MarkerPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      markers: [{
        position: [120.162692, 30.253647],
      }, {
        position: [120.163071, 30.254444],
      }],
    };
  }

  /**
   * Test Marker component update functionalities.
   */
  componentDidMount() {
    setTimeout(() => {
      this.setState({
        ...this.state,
        markers: [
          {
            position: [120.161955, 30.253519],
          },
          ...this.state.markers[1],
        ],
      });
    }, 5000);
  }

  /**
   * Click handler.
   * @param {Object} map - AMap.Map instance
   * @param {Object} target - Marker component instance
   * @param {Object} e - Event
   */
  handleClick = (map, target, e) => {
    console.log('You have clicked a marker icon', map, target, e);
  }

  render() {
    const {
      markers,
    } = this.state;

    return (
      <AMap>
        {
          markers.map((marker, index) => {
            return <Marker
              key={index}
              {...marker}
              onClick={this.handleClick}
            />;
          })
        }
      </AMap>
    );
  }
}

export default MarkerPage;

