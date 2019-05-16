import React from "react";
import { SeriesInfoProvider } from "meteor/icr:series-info-provider";
import RoiImporter from "../../../../lib/IO/classes/RoiImporter.js";
import fetchJSON from "../../../../lib/IO/fetchJSON.js";
import fetchXML from "../../../../lib/IO/fetchXML.js";
import fetchArrayBuffer from "../../../../lib/IO/fetchArrayBuffer.js";
import { cornerstoneTools } from "meteor/ohif:cornerstone";
import { sessionMap } from "meteor/icr:series-info-provider";

const modules = cornerstoneTools.store.modules;

export default class RoiImportListDialog extends React.Component {
  constructor(props = {}) {
    super(props);

    selectedCheckboxes = [];

    console.log("RoiImportListDialog");

    this.state = {
      selectAllChecked: true,
      selectedCheckboxes,
      importListReady: false,
      importList: [],
      importing: false,
      progressText: ""
    };

    this._cancelablePromises = [];
    this._validTypes = ["AIM", "RTSTRUCT"];

    this.onChangeCheckbox = this.onChangeCheckbox.bind(this);
    this.onChangeSelectAllCheckbox = this.onChangeSelectAllCheckbox.bind(this);
    this.onExportButtonClick = this.onExportButtonClick.bind(this);
    this.onCloseButtonClick = this.onCloseButtonClick.bind(this);
    this._getVolumeManagementLabels = this._getVolumeManagementLabels.bind(
      this
    );
    this._collectionEligibleForImport = this._collectionEligibleForImport.bind(
      this
    );
    this._updateImportingText = this._updateImportingText.bind(this);
    this._closeDialog = this._closeDialog.bind(this);
    this._incrementNumCollectionsParsed = this._incrementNumCollectionsParsed.bind(
      this
    );
  }

  onCloseButtonClick() {
    this._closeDialog();
  }

  onChangeCheckbox(evt, index) {
    const selectedCheckboxes = this.state.selectedCheckboxes;

    selectedCheckboxes[index] = evt.target.checked;
    this.setState({ selectedCheckboxes });
  }

  onChangeSelectAllCheckbox(evt) {
    const selectedCheckboxes = this.state.selectedCheckboxes;
    const checked = evt.target.checked;

    for (let i = 0; i < selectedCheckboxes.length; i++) {
      selectedCheckboxes[i] = checked;
    }

    this.setState({ selectAllChecked: evt.target.checked, selectedCheckboxes });
  }

  onExportButtonClick() {
    const { importList, selectedCheckboxes } = this.state;

    this._numCollectionsParsed = 0;
    this._numCollectionsToParse = 0;

    for (let i = 0; i < importList.length; i++) {
      if (selectedCheckboxes[i]) {
        this._numCollectionsToParse++;
      }
    }

    if (this._numCollectionsToParse === 0) {
      return;
    }

    this._updateImportingText("");
    this.setState({ importing: true });

    for (let i = 0; i < importList.length; i++) {
      if (selectedCheckboxes[i]) {
        this._importRoiCollection(importList[i]);
      }
    }
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
   * componentDidMount - On mounting, fetch a list of available ROICollections from XNAT.
   *
   * @returns {type}  description
   */
  componentDidMount() {
    if (this.props.id === "NOT_ACTIVE") {
      this.setState({ importListReady: true });

      return;
    }

    const sessions = sessionMap.getSession();

    console.log(`sessions:`);
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

    this._volumeManagementLabels = this._getVolumeManagementLabels();

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
            importList.push({
              collectionType: data_fields.collectionType,
              label: data_fields.label,
              experimentId: data_fields.imageSession_ID,
              experimentLabel: referencedScan.experimentLabel,
              referencedSeriesInstanceUid: referencedScan.seriesInstanceUid,
              referencedSeriesNumber: referencedScan.seriesNumber,
              name: data_fields.name,
              getFilesUri: `/data/archive/experiments/${
                data_fields.imageSession_ID
              }/assessors/${data_fields.ID}/files?format=json`
            });
          }
        });

        const selectedCheckboxes = [];

        for (let i = 0; i < importList.length; i++) {
          selectedCheckboxes.push(true);
        }

        console.log(importList);

        this.setState({
          importList,
          importListReady: true,
          selectedCheckboxes
        });
      });
    });
  }

  _closeDialog() {
    const dialog = document.getElementById("roiImportListDialog");
    dialog.close();
  }

  _updateImportingText(roiCollectionLabel) {
    this.setState({
      progressText: `${roiCollectionLabel} ${this._numCollectionsParsed}/${
        this._numCollectionsToParse
      }`
    });
  }

  async _importRoiCollection(roiCollectionInfo) {
    const roiList = await fetchJSON(roiCollectionInfo.getFilesUri).promise;
    const result = roiList.ResultSet.Result;

    // Reduce count if no associated file is found (nothing to import, badly deleted roiCollection).
    if (result.length === 0) {
      this._incrementNumCollectionsParsed(roiCollectionInfo.name);

      return;
    }

    // Retrieve each ROI from the list that has the same collectionType as the collection.
    // In an ideal world this should always be 1, and any other resources -- if any -- are differently formated representations of the same data, but things happen.
    for (let i = 0; i < result.length; i++) {
      const fileType = result[i].collection;
      if (fileType === roiCollectionInfo.collectionType) {
        this._getAndImportFile(result[i].URI, roiCollectionInfo);
      }
    }
  }

  /** @private @async
   * _getAndImportFile - Imports the file from the REST url and loads it into
   *                     cornerstoneTools toolData.
   *
   * @param  {string} uri             The REST URI of the file.
   * @param  {object} collectionInfo  An object describing the roiCollection to
   *                                  import.
   * @returns {null}
   */
  async _getAndImportFile(uri, roiCollectionInfo) {
    const roiImporter = new RoiImporter(
      roiCollectionInfo.referencedSeriesInstanceUid
    );

    switch (roiCollectionInfo.collectionType) {
      case "AIM":
        this._updateImportingText(roiCollectionInfo.name);
        const aimFile = await fetchXML(uri).promise;

        if (!aimFile) {
          break;
        }

        roiImporter.importAIMfile(
          aimFile,
          roiCollectionInfo.name,
          roiCollectionInfo.label
        );
        break;
      case "RTSTRUCT":
        this._updateImportingText(roiCollectionInfo.name);
        const rtStructFile = await fetchArrayBuffer(uri).promise;

        if (!rtStructFile) {
          break;
        }

        roiImporter.importRTStruct(
          rtStructFile,
          roiCollectionInfo.name,
          roiCollectionInfo.label
        );
        break;
      default:
        console.error(
          `RoiImportListDialog._getAndImportFile not configured for filetype: ${fileType}.`
        );
    }

    this._incrementNumCollectionsParsed(roiCollectionInfo.name);
  }

  /** @private
   * _incrementNumCollectionsParsed - Increases the number of collections
   * parsed, and closes the progress dialog if the collections have all been
   * imported.
   *
   * @returns {null}
   */
  _incrementNumCollectionsParsed(roiCollectionName) {
    this._updateImportingText(roiCollectionName);

    this._numCollectionsParsed++;

    if (this._numCollectionsParsed === this._numCollectionsToParse) {
      Session.set("refreshRoiContourMenu", Math.random().toString());
      this._closeDialog();
    }
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

    // Check collection isn't already imported.
    const roiCollectionLabel = item.data_fields.label;

    const collectionAlreadyImported = this._volumeManagementLabels.some(
      label => label === roiCollectionLabel
    );

    if (collectionAlreadyImported) {
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

  /** @private
   * _getVolumeManagementLabels - Construct a list of roiCollections
   *                               already imported.
   *
   * @returns {string[]} An array of the labels of roiCollections already imported.
   */
  _getVolumeManagementLabels() {
    const freehand3DStore = modules.freehand3D;
    const structureSetUids = [];

    const seriesCollection = freehand3DStore.state.seriesCollection;

    seriesCollection.forEach(series => {
      const structureSetCollection = series.structureSetCollection;

      for (let i = 0; i < structureSetCollection.length; i++) {
        const label = structureSetCollection[i].uid;

        if (label !== "DEFAULT") {
          structureSetUids.push(label);
        }
      }
    });

    return structureSetUids;
  }

  render() {
    const {
      selectAllChecked,
      selectedCheckboxes,
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
          <table>
            <tbody>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    value={selectAllChecked}
                    onChange={this.onChangeSelectAllCheckbox}
                  />
                </th>
                <th>Name</th>
                <th>Referenced Scan</th>
              </tr>

              {importList.map((roiCollection, index) => (
                <tr key={`${roiCollection.name}_${roiCollection.index}`}>
                  <td>
                    <input
                      className="roi-import-list-item-check"
                      type="checkbox"
                      name="sync"
                      onChange={evt => this.onChangeCheckbox(evt, index)}
                      checked={selectedCheckboxes[index]}
                      value={selectedCheckboxes[index]}
                    />
                  </td>
                  <td className="roi-import-left-cell">{roiCollection.name}</td>
                  <td className="roi-import-left-cell">
                    {`${roiCollection.experimentLabel} - ${
                      roiCollection.referencedSeriesNumber
                    }`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <div>
        <div className="roi-import-list-header">
          <h3>Import ROI Contour Collections</h3>
          {importing ? null : (
            <a
              className="roi-import-list-cancel btn btn-sm btn-secondary"
              onClick={this.onCloseButtonClick}
            >
              <i className="fa fa-times-circle fa-2x" />
            </a>
          )}
        </div>
        <hr />
        <div className="roi-import-list-body">{importBody}</div>
        <hr />
        <div className="roi-import-list-footer">
          {importing ? null : (
            <a
              className="roi-import-list-confirm btn btn-sm btn-primary"
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
