import React from "react";
import XNATProjectList from "./XNATProjectList.js";
import XNATProject from "./XNATProject.js";
import fetchJSON from "./helpers/fetchJSON.js";
import compareOnProperty from "./helpers/compareOnProperty.js";
import { icrXnatRoiSession } from "meteor/icr:xnat-roi-namespace";

export default class XNATNavigation extends React.Component {
  constructor(props = {}) {
    super(props);
    this.state = {
      activeProjects: [],
      otherProjects: []
    };
  }

  /**
   * componentDidMount - On mounting, fetch a list of available projects from XNAT.
   *
   * @returns {type}  description
   */
  componentDidMount() {
    fetchJSON("/data/archive/projects/?format=json")
      .promise.then(result => {
        if (!result) {
          return;
        }

        const otherProjects = result.ResultSet.Result;

        const activeProjectId = icrXnatRoiSession.get("projectId");
        const thisProjectIndex = otherProjects.findIndex(
          element => element.ID === activeProjectId
        );

        const activeProjects = otherProjects.splice(thisProjectIndex, 1);

        otherProjects.sort((a, b) => compareOnProperty(a, b, "name"));

        this.setState({
          activeProjects,
          otherProjects
        });
      })
      .catch(err => console.log(err));
  }

  render() {
    const { activeProjects, otherProjects } = this.state;

    return (
      <>
        <div className="xnat-navigation-tree">
          <ul>
            <h4>This Project</h4>
            {activeProjects.map(project => (
              <li key={project.ID}>
                <XNATProject ID={project.ID} name={project.name} />
              </li>
            ))}
            <XNATProjectList projects={otherProjects} />
          </ul>
        </div>
      </>
    );
  }
}
