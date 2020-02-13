import React from 'react';
import { store } from 'cornerstone-tools';

// TODO
//import './roiContourMenu.styl';

const modules = store.modules;

/**
 * @class WorkingCollectionListItem - Renders metadata for the working
 * ROIContour Collection.
 */
export default class WorkingCollectionListItem extends React.Component {
  constructor(props = {}) {
    super(props);

    this.onTextInputChange = this.onTextInputChange.bind(this);
  }

  onTextInputChange(evt) {
    const name = evt.target.value;
    const { seriesInstanceUid } = this.props;

    if (name.replace(' ', '').length > 0) {
      const metadata = this.props.metadata;
      const freehand3DModule = modules.freehand3D;

      freehand3DModule.setters.ROIContourName(
        name,
        seriesInstanceUid,
        'DEFAULT',
        metadata.uid
      );
    }
  }

  render() {
    const {
      roiContourIndex,
      metadata,
      onRoiChange,
      activeROIContourIndex,
    } = this.props;

    const checked = activeROIContourIndex === roiContourIndex;
    const name = metadata.name;
    const polygonCount = metadata.polygonCount;
    const roiContourColor = metadata.color;

    return (
      <tr>
        <td className="left-aligned-cell">
          <i className="fa fa-square" style={{ color: roiContourColor }} />{' '}
          <input
            type="radio"
            checked={checked}
            onChange={() => onRoiChange(roiContourIndex)}
          />
        </td>
        <td className="left-aligned-cell">
          <a className="roi-contour-menu-name-link">
            <input
              name="roiContourName"
              className="form-themed form-control"
              onChange={this.onTextInputChange}
              type="text"
              autoComplete="off"
              defaultValue={name}
              placeholder="Enter ROI Name..."
              tabIndex="1"
            />
          </a>
        </td>
        <td>{polygonCount}</td>
      </tr>
    );
  }
}