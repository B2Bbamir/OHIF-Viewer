import React from "react";
import XNATSessionLabel from "./XNATSessionLabel.js";
import fetchJSON from "./helpers/fetchJSON.js";
import SessionRouter from "./helpers/SessionRouter.js";
import navigateConfirmationContent from "./helpers/navigateConfirmationContent.js";
import { getUnsavedRegions } from "meteor/icr:peppermint-tools";
import { sessionMap } from "meteor/icr:series-info-provider";
import awaitConfirmationDialog from "../../../../lib/dialogUtils/awaitConfirmationDialog.js";

export default class XNATSession extends React.Component {
  constructor(props) {
    super(props);

    const active =
      this.props.projectId === sessionMap.get("session", "projectId") &&
      this.props.subjectId === sessionMap.get("session", "subjectId") &&
      this.props.ID === sessionMap.get("session", "experimentId");

    const shared = this.props.parentProjectId !== this.props.projectId;

    this.state = {
      active,
      shared,
      hasRois: false,
      maskCount: 0,
      contourCount: 0
    };

    this.onViewSessionClick = this.onViewSessionClick.bind(this);

    this._cancelablePromises = [];

    console.log(this);

    this._fetchROICollectionInfo();
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

  async onViewSessionClick() {
    if (this.state.active) {
      return;
    }

    const unsavedRegions = getUnsavedRegions();

    if (unsavedRegions.hasUnsavedRegions) {
      const content = navigateConfirmationContent(unsavedRegions);

      awaitConfirmationDialog(content).then(result => {
        if (result === true) {
          this._routeToSessionView();
        }
      });
      return;
    } else {
      this._routeToSessionView();
    }
  }

  /**
   * _routeToSessionView - Initialise Router and route to new session view.
   *
   * @returns {null}
   */
  _routeToSessionView() {
    const { projectId, parentProjectId, subjectId, ID, label } = this.props;

    console.log(this.props);
    console.log(subjectId);

    subjectRouter = new SessionRouter(
      projectId,
      parentProjectId,
      subjectId,
      ID,
      label
    );
    subjectRouter.go();
  }

  /**
   * _getSessionButtonClassNames - Returns the class names for the subject
   * button based on state.
   *
   * @returns {string}  A string of the classnames.
   */
  _getSessionButtonClassNames() {
    let sessionButtonClassNames =
      "btn btn-sm btn-primary xnat-nav-button xnat-nav-session";

    if (this.state.active) {
      sessionButtonClassNames += " xnat-nav-button-disabled";
    }

    return sessionButtonClassNames;
  }

  /**
   * _fetchROICollectionInfo - Fetches the list of ROICollections, and counts up
   * the number of contour and mask based segmentations.
   *
   * @returns {null}
   */
  _fetchROICollectionInfo() {
    const cancelablePromise = fetchJSON(
      `/data/archive/projects/${this.props.projectId}/subjects/${
        this.props.subjectId
      }/experiments/${this.props.ID}/assessors?format=json`
    );

    this._cancelablePromises.push(cancelablePromise);

    cancelablePromise.promise
      .then(result => {
        if (!result) {
          return;
        }

        const assessors = result.ResultSet.Result;

        if (
          assessors.some(
            assessor => assessor.xsiType === "icr:roiCollectionData"
          )
        ) {
          this.setState({ hasRois: true });
        }

        this._getRoiCollectionCounts(result.ResultSet.Result);
      })
      .catch(err => console.log(err));
  }

  _getRoiCollectionCounts(assessors) {
    const promises = [];

    for (let i = 0; i < assessors.length; i++) {
      if (assessors[i].xsiType === "icr:roiCollectionData") {
        const cancelablePromise = fetchJSON(
          `/data/archive/projects/${this.props.projectId}/subjects/${
            this.props.subjectId
          }/experiments/${this.props.ID}/assessors/${
            assessors[i].ID
          }?format=json`
        );

        this._cancelablePromises.push(cancelablePromise);

        promises.push(cancelablePromise.promise);
      }
    }

    let maskCount = 0;
    let contourCount = 0;

    Promise.all(promises).then(promisesJSON => {
      promisesJSON.forEach(roiCollectionInfo => {
        const type = roiCollectionInfo.items[0].data_fields.collectionType;

        switch (type) {
          case "RTSTRUCT":
          case "AIM":
            contourCount++;
            break;
          case "SEG":
          case "NIFTI":
            maskCount++;
            break;
        }
      });

      this.setState({
        maskCount,
        contourCount
      });
    });
  }

  render() {
    const { ID, label, parentProjectId } = this.props;
    const { active, shared, hasRois, maskCount, contourCount } = this.state;
    const sessionButtonClassNames = this._getSessionButtonClassNames();

    return (
      <>
        <div className="xnat-nav-horizontal-box">
          <a
            className={sessionButtonClassNames}
            onClick={this.onViewSessionClick}
          >
            <i className="fa fa-eye" />
          </a>
          <XNATSessionLabel
            ID={ID}
            label={label}
            active={active}
            shared={shared}
            parentProjectId={parentProjectId}
            hasRois={hasRois}
            maskCount={maskCount}
            contourCount={contourCount}
          />
        </div>
      </>
    );
  }
}
