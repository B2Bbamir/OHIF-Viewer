// Refresh the XNAT session every minute when the viewer is open.
setInterval(function() {
  console.log("request session refresh...");
  getBuildInfo();
}, 60000);

/**
 * getBuildInfo - Queries the buildInfo (only used to maintain a connection open to XNAT).
 *
 * @returns {null}
 */
function getBuildInfo() {
  const xhr = new XMLHttpRequest();

  xhr.open("GET", `${Session.get("rootUrl")}/xapi/siteConfig/buildInfo`);
  xhr.send();
}
