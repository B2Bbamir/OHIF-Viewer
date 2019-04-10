import React from "react";
import XNATSubjectLabel from "./XNATSubjectLabel.js";
import XNATSessionList from "./XNATSessionList.js";
import SubjectRouter from "./helpers/SubjectRouter.js";
import fetchJSON from "./helpers/fetchJSON.js";
import onExpandIconClick from "./helpers/onExpandIconClick.js";
import getExpandIcon from "./helpers/getExpandIcon.js";
import compareOnProperty from "./helpers/compareOnProperty.js";
import { sessionMap } from "meteor/icr:series-info-provider";
import navigateConfirmationContent from "./helpers/navigateConfirmationContent.js";
import { getUnsavedRegions } from "meteor/icr:peppermint-tools";
import awaitConfirmationDialog from "../../../../lib/IO/awaitConfirmationDialog.js";
import progressDialog from "../../../../lib/util/progressDialog.js";

export default class XNATSubject extends React.Component {
  constructor(props) {
    super(props);

    const active =
      this.props.projectId === sessionMap.get("session", "projectId") &&
      this.props.ID === sessionMap.get("session", "subjectId");
    const subjectViewActive =
      active && sessionMap.get("session", "experimentId") === undefined;

    const shared = this.props.parentProjectId !== this.props.projectId;

    this.state = {
      sessions: [],
      active,
      subjectViewActive,
      shared,
      expanded: false,
      fetched: false
    };

    this.onViewSubjectClick = this.onViewSubjectClick.bind(this);

    this.getExpandIcon = getExpandIcon.bind(this);
    this.onExpandIconClick = onExpandIconClick.bind(this);

    this._cancelablePromises = [];

    console.log(this);
  }

  componentWillUnmount() {
    const cancelablePromises = this._cancelablePromises;

    for (let i = 0; i < cancelablePromises.length; i++) {
      if (typeof cancelablePromises[i].cancel === "function") {
        cancelablePromises[i].cancel();
      }
    }
  }

  /**
   * fetchData - Fetches the Subject's list of sessions.
   *
   * @returns {Object} A cancelablePromise.
   */
  fetchData() {
    const cancelablePromise = fetchJSON(
      `/data/archive/projects/${this.props.projectId}/subjects/${
        this.props.ID
      }/experiments?format=json`
    );

    this._cancelablePromises.push(cancelablePromise);

    cancelablePromise.promise
      .then(result => {
        if (!result) {
          return;
        }

        const sessions = result.ResultSet.Result;

        sessions.sort((a, b) => compareOnProperty(a, b, "label"));

        this.setState({
          sessions,
          fetched: true
        });
      })
      .catch(err => console.log(err));

    return cancelablePromise.promise;
  }

  /**
   * onViewSubjectClick - Check if there are any unsaved annotations and warn
   * the user if there. Then route to subject view.
   *
   * @returns {type}  description
   */
  onViewSubjectClick() {
    if (this.state.subjectViewActive) {
      return;
    }

    const unsavedRegions = getUnsavedRegions();

    if (unsavedRegions.hasUnsavedRegions) {
      const content = navigateConfirmationContent(unsavedRegions);

      awaitConfirmationDialog(content).then(result => {
        if (result === true) {
          this._routeToSubjectView();
        }
      });
      return;
    } else {
      if (this.state.fetched) {
        this._routeToSubjectView();
      } else {
        this.fetchData().then(() => this._routeToSubjectView());
      }
    }
  }

  /**
   * _routeToSubjectView - Initialise Router and route to new subject view.
   *
   * @returns {null}
   */
  _routeToSubjectView() {
    const { projectId, parentProjectId, ID, label } = this.props;
    const { sessions } = this.state;

    subjectRouter = new SubjectRouter(
      projectId,
      parentProjectId,
      ID,
      label,
      sessions
    );
    subjectRouter.go();
  }

  /**
   * _getSubjectButtonClassNames - Returns the class names for the subject
   * button based on state.
   *
   * @returns {string}  A string of the classnames.
   */
  _getSubjectButtonClassNames() {
    let subjectButtonClassNames = "btn btn-sm btn-primary xnat-nav-button";

    if (this.state.subjectViewActive) {
      subjectButtonClassNames += " xnat-nav-button-disabled";
    }

    return subjectButtonClassNames;
  }

  render() {
    const { ID, label, projectId, parentProjectId } = this.props;
    const { sessions, active, shared, fetched, expanded } = this.state;
    const subjectButtonClassNames = this._getSubjectButtonClassNames();

    return (
      <>
        <div className="xnat-nav-horizontal-box">
          <a
            className="btn btn-sm btn-secondary"
            onClick={this.onExpandIconClick}
          >
            <i className={this.getExpandIcon()} />
          </a>
          <a
            className={subjectButtonClassNames}
            onClick={this.onViewSubjectClick}
          >
            <i className="fa fa-eye" />
          </a>
          <XNATSubjectLabel
            ID={ID}
            label={label}
            active={active}
            shared={shared}
            parentProjectId={parentProjectId}
          />
        </div>
        {expanded ? (
          <XNATSessionList
            projectId={projectId}
            parentProjectId={parentProjectId}
            subjectId={ID}
            sessions={sessions}
            fetched={fetched}
          />
        ) : null}
      </>
    );
  }
}
