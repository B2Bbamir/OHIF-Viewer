import React from "react";
import { SeriesInfoProvider } from "meteor/icr:series-info-provider";
import MaskImporter from "../../../lib/IO/classes/MaskImporter.js";
import fetchJSON from "../../../lib/IO/fetchJSON.js";
import fetchXML from "../../../lib/IO/fetchXML.js";
import fetchArrayBuffer from "../../../lib/IO/fetchArrayBuffer.js";
import { cornerstoneTools } from "meteor/ohif:cornerstone";
import { sessionMap } from "meteor/icr:series-info-provider";
import awaitConfirmationDialog from "../../../lib/dialogUtils/awaitConfirmationDialog.js";

import "./maskImportListDialogs.styl";

const brushModule = cornerstoneTools.store.modules.brush;

const overwriteConfirmationContent = {
  title: `Warning`,
  body: `
    Loading in another Segmentation will overwrite existing segmentation data. Are you sure
    you want to do this?
  `
};

export default class MaskImportListDialog extends React.Component {
  constructor(props = {}) {
    super(props);

    this.state = {
      scanSelected: 0,
      segmentationSelected: 0,
      importListReady: false,
      importList: [],
      importing: false,
      progressText: ""
    };

    this._cancelablePromises = [];
    this._validTypes = ["SEG", "NIFTI"];
    this.onExportButtonClick = this.onExportButtonClick.bind(this);
    this.onCloseButtonClick = this.onCloseButtonClick.bind(this);
    this._collectionEligibleForImport = this._collectionEligibleForImport.bind(
      this
    );
    this.onSelectedScanChange = this.onSelectedScanChange.bind(this);
    this.onChangeRadio = this.onChangeRadio.bind(this);

    this._hasExistingMaskData = this._hasExistingMaskData.bind(this);
    this._updateImportingText = this._updateImportingText.bind(this);
  }

  onSelectedScanChange(evt) {
    console.log(evt.target.value);

    const val = evt.target.value;

    this.setState({ scanSelected: val });
  }

  onCloseButtonClick() {
    this.props.onImportCancel();
  }

  onChangeRadio(evt, index) {
    this.setState({ segmentationSelected: index });
  }

  async onExportButtonClick() {
    const { importList, scanSelected, segmentationSelected } = this.state;

    console.log(`onExportButtonClick:`);

    const scan = importList[scanSelected];

    console.log(`scan:`);
    console.log(scan);

    if (this._hasExistingMaskData(scan.referencedSeriesInstanceUid)) {
      confirmed = await awaitConfirmationDialog(overwriteConfirmationContent);

      if (!confirmed) {
        return;
      }
    }

    this._updateImportingText("");
    this.setState({ importing: true });

    console.log(`segmentationSelected:`);
    console.log(segmentationSelected);

    console.log(`segmentation:`);
    console.log(scan.segmentations[segmentationSelected]);

    this._importRoiCollection(scan.segmentations[segmentationSelected], scan);
  }

  /**
   * _hasExistingMaskData - Check if we either have an import
   *                        (quicker to check), or we have some data.
   *
   * @returns {boolean}  Whether mask data exists.
   */
  _hasExistingMaskData(seriesInstanceUid) {
    let hasData = false;
    if (brushModule.getters.importMetadata(seriesInstanceUid)) {
      hasData = true;
    } else {
      const metadata =
        brushModule.state.segmentationMetadata[seriesInstanceUid];

      if (metadata) {
        hasData = metadata.some(data => data !== undefined);
      }
    }

    return hasData;
  }

  /**
   * componentWillUnmount - If any promises are active, cancel them to avoid
   * memory leakage by referencing `this`.
   *
   * @returns {null}
   */
  componentWillUnmount() {
    const cancelablePromises = this._cancelablePromises;

    for (let i = 0; i < cancelablePromises.length; i++) {
      if (typeof cancelablePromises[i].cancel === "function") {
        cancelablePromises[i].cancel();
      }
    }
  }

  /**
   * componentDidMount - On mounting, fetch a list of available projects from XNAT.
   *
   * @returns {type}  description
   */
  componentDidMount() {
    if (this.props.id === "NOT_ACTIVE") {
      this.setState({ importListReady: true });

      return;
    }

    const sessions = sessionMap.getSession();

    console.log(`sessions`);
    console.log(sessions);

    this._subjectId = sessionMap.getSubject();
    this._projectId = sessionMap.getProject();

    const promises = [];

    for (let i = 0; i < sessions.length; i++) {
      const experimentId = sessions[i].experimentId;

      const cancelablePromise = fetchJSON(
        `/data/archive/projects/${this._projectId}/subjects/${
          this._subjectId
        }/experiments/${experimentId}/assessors?format=json`
      );
      promises.push(cancelablePromise.promise);
      this._cancelablePromises.push(cancelablePromise);
    }

    Promise.all(promises).then(sessionAssessorLists => {
      const roiCollectionPromises = [];

      console.log(`sessionAssessorLists:`);
      console.log(sessionAssessorLists);

      for (let i = 0; i < sessionAssessorLists.length; i++) {
        const sessionAssessorList = sessionAssessorLists[i];

        const assessors = sessionAssessorList.ResultSet.Result;

        if (
          !assessors.some(
            assessor => assessor.xsiType === "icr:roiCollectionData"
          )
        ) {
          continue;
        }

        const experimentId = assessors[0].session_ID;

        for (let i = 0; i < assessors.length; i++) {
          if (assessors[i].xsiType === "icr:roiCollectionData") {
            const cancelablePromise = fetchJSON(
              `/data/archive/projects/${this._projectId}/subjects/${
                this._subjectId
              }/experiments/${experimentId}/assessors/${
                assessors[i].ID
              }?format=json`
            );

            this._cancelablePromises.push(cancelablePromise);

            roiCollectionPromises.push(cancelablePromise.promise);
          }
        }
      }

      console.log(`roiCollectionPromises:`);
      console.log(roiCollectionPromises);

      if (!roiCollectionPromises.length) {
        this.setState({ importListReady: true });

        return;
      }

      const importList = [];

      Promise.all(roiCollectionPromises).then(promisesJSON => {
        promisesJSON.forEach(roiCollectionInfo => {
          const data_fields = roiCollectionInfo.items[0].data_fields;

          const referencedScan = this._getReferencedScan(roiCollectionInfo);

          if (
            referencedScan &&
            this._collectionEligibleForImport(roiCollectionInfo)
          ) {
            let referencedSeriesNumberList = importList.find(
              element =>
                element.referencedSeriesNumber ===
                  referencedScan.seriesNumber &&
                element.experimentLabel === referencedScan.experimentLabel
            );

            if (!referencedSeriesNumberList) {
              importList.push({
                index: importList.length,
                referencedSeriesNumber: referencedScan.seriesNumber,
                referencedSeriesInstanceUid: referencedScan.seriesInstanceUid,
                experimentLabel: referencedScan.experimentLabel,
                experimentId: referencedScan.experimentId,
                segmentations: []
              });

              referencedSeriesNumberList = importList[importList.length - 1];
            }

            referencedSeriesNumberList.segmentations.push({
              collectionType: data_fields.collectionType,
              label: data_fields.label,
              name: data_fields.name,
              getFilesUri: `/data/archive/experiments/${
                data_fields.imageSession_ID
              }/assessors/${data_fields.ID}/files?format=json`
            });
          }
        });

        console.log(importList);

        const activeSeriesInstanceUid = SeriesInfoProvider.getActiveSeriesInstanceUid();

        const scanSelected = importList.findIndex(
          scan => scan.referencedSeriesInstanceUid === activeSeriesInstanceUid
        );

        this.setState({
          importList,
          importListReady: true,
          scanSelected: scanSelected !== -1 ? scanSelected : 0,
          segmentationSelected: 0
        });
      });
    });
  }

  _updateImportingText(roiCollectionLabel) {
    this.setState({
      progressText: roiCollectionLabel
    });
  }

  async _importRoiCollection(segmentation, scan) {
    const roiList = await fetchJSON(segmentation.getFilesUri).promise;
    const result = roiList.ResultSet.Result;

    // Reduce count if no associated file is found (nothing to import, badly deleted roiCollection).
    if (result.length === 0) {
      this.props.onImportCancel();

      return;
    }

    // Retrieve each ROI from the list that has the same collectionType as the collection.
    // In an ideal world this should always be 1, and any other resources -- if any -- are differently formated representations of the same data, but things happen.
    for (let i = 0; i < result.length; i++) {
      const fileType = result[i].collection;
      if (fileType === segmentation.collectionType) {
        this._getAndImportFile(result[i].URI, segmentation, scan);
      }
    }
  }

  /** @private @async
   * _getAndImportFile - Imports the file from the REST url and loads it into
   *                     cornerstoneTools toolData.
   *
   * @param  {string} uri             The REST URI of the file.
   * @param  {object} segmentation    An object describing the roiCollection to
   *                                  import.
   * @param  {object} scan            The scan to import onto.
   * @returns {null}
   */
  async _getAndImportFile(uri, segmentation, scan) {
    const seriesInstanceUid = scan.referencedSeriesInstanceUid;
    const maskImporter = new MaskImporter(seriesInstanceUid);

    console.log(`_getAndImportFile, seriesInstanceUid:`);
    console.log(seriesInstanceUid);

    switch (segmentation.collectionType) {
      case "SEG":
        this._updateImportingText(segmentation.name);

        // Store that we've imported a collection for this series.
        brushModule.setters.importMetadata(seriesInstanceUid, {
          label: segmentation.label,
          type: "SEG",
          name: segmentation.name,
          modified: false
        });

        const segArrayBuffer = await fetchArrayBuffer(uri).promise;

        await maskImporter.importDICOMSEG(segArrayBuffer);
        break;

      case "NIFTI":
        this._updateImportingText(segmentation.name);

        // Store that we've imported a collection for this series.
        brushModule.setters.importMetadata(seriesInstanceUid, {
          label: segmentation.label,
          type: "NIFTI",
          name: segmentation.name,
          modified: false
        });

        const niftiArrayBuffer = await fetchArrayBuffer(uri).promise;

        maskImporter.importNIFTI(niftiArrayBuffer);
        break;

      default:
        console.error(
          `MaskImportListDialog._getAndImportFile not configured for filetype: ${fileType}.`
        );
    }

    // JamesAPetts
    Session.set("refreshSegmentationMenu", Math.random().toString());
    this.props.onImportComplete();
  }

  /** @private
   * _collectionEligibleForImport - Returns true if the roiCollection references
   * the active series, and hasn't already been imported.
   *
   * @param  {object} collectionInfoJSON  An object containing information about
   *                                      the collection.
   * @returns {boolean}                    Whether the collection is eligible
   *                                      for import.
   */
  _collectionEligibleForImport(collectionInfoJSON) {
    const item = collectionInfoJSON.items[0];
    const children = item.children;

    const collectionType = item.data_fields.collectionType;

    if (!this._validTypes.some(type => type === collectionType)) {
      return false;
    }

    return true;
  }

  _getReferencedScan(collectionInfoJSON) {
    const item = collectionInfoJSON.items[0];
    const children = item.children;

    // Check the collection references this seriesInstanceUid.
    for (let i = 0; i < children.length; i++) {
      if (children[i].field === "references/seriesUID") {
        const referencedSeriesInstanceUidList = children[i].items;

        for (let j = 0; j < referencedSeriesInstanceUidList.length; j++) {
          const seriesInstanceUid =
            referencedSeriesInstanceUidList[j].data_fields.seriesUID;

          const scan = sessionMap.getScan(seriesInstanceUid);

          if (scan) {
            return scan;
          }
        }
      }
    }
  }

  render() {
    const {
      scanSelected,
      segmentationSelected,
      importList,
      importListReady,
      importing,
      progressText
    } = this.state;

    let importBody;

    if (importListReady) {
      if (importing) {
        importBody = (
          <>
            <h5>
              {progressText}
              <i className="fa fa-spin fa-circle-o-notch fa-fw" />
            </h5>
          </>
        );
      } else if (importList.length === 0) {
        importBody = <p>No data to import.</p>;
      } else {
        importBody = (
          <>
            <select
              className="form-themed form-control"
              onChange={this.onSelectedScanChange}
              value={scanSelected}
            >
              {importList.map(scan => (
                <option
                  key={scan.referencedSeriesInstanceUid}
                  value={scan.index}
                >{`${scan.experimentLabel} - ${
                  scan.referencedSeriesNumber
                }`}</option>
              ))}
            </select>

            <hr />

            <table>
              <tbody>
                <tr>
                  <th />
                  <th>Name</th>
                </tr>

                {importList[scanSelected].segmentations.map(
                  (roiCollection, index) => (
                    <tr key={roiCollection.label}>
                      <td>
                        <input
                          className="mask-import-list-item-check"
                          type="radio"
                          name="sync"
                          onChange={evt => this.onChangeRadio(evt, index)}
                          checked={
                            segmentationSelected === index ? true : false
                          }
                          value={segmentationSelected === index ? true : false}
                        />
                      </td>
                      <td className="mask-import-left-cell">
                        {roiCollection.name}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </>
        );
      }
    } else {
      importBody = (
        <h1>
          <i className="fa fa-spin fa-circle-o-notch fa-fw" />
        </h1>
      );
    }

    return (
      <div className="mask-import-list-dialog">
        <div className="mask-import-list-header">
          <h3>Import Segmentation Collections</h3>
          {importing ? null : (
            <a
              className="mask-import-list-cancel btn btn-sm btn-secondary"
              onClick={this.onCloseButtonClick}
            >
              <i className="fa fa-times-circle fa-2x" />
            </a>
          )}
        </div>
        <hr />
        <div className="mask-import-list-body">{importBody}</div>
        <hr />
        <div className="mask-import-list-footer">
          {importing ? null : (
            <a
              className="mask-import-list-confirm btn btn-sm btn-primary"
              onClick={this.onExportButtonClick}
            >
              <svg stroke="#fff">
                <use xlinkHref="packages/icr_xnat-roi/assets/icons.svg#icon-xnat-import" />
              </svg>
            </a>
          )}
        </div>
      </div>
    );
  }
}
