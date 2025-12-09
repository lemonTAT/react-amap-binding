import React from 'react';
import { hot } from 'react-hot-loader';
import { TileLayerTraffic } from '@gjyibus/react-amap-binding';
import AMap from '../AMapPage';

@hot(module)
class Traffic extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: true,
    };
  }

  toggleVisible = () => {
    this.setState({
      visible: !this.state.visible,
    });
  };

  render() {
    const { visible } = this.state;
    return (
      <AMap>
        <TileLayerTraffic
          autoRefresh
          visible={visible}
          // zIndex={10}
          // opacity={1}
        />
        <div
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'red', padding: 5, color: 'white' }}
          onClick={this.toggleVisible}
        >
          {visible ? '隐藏' : '显示'}
        </div>
      </AMap>
    );
  }
}

export default Traffic;
