import React, { useState, useEffect } from 'react';
import { Link, withRouter } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import ConnectedUserPreferencesForm from '../../connectedComponents/ConnectedUserPreferencesForm';
import { Dropdown, AboutContent, withModal, Icon } from '@ohif/ui';
import OHIFLogo from '../OHIFLogo/OHIFLogo.js';
import './Header.css';

// Context
import AppContext from './../../context/AppContext';

function OptionsElement(props) {
  return (
    <React.Fragment>
      <Icon
        name="xnat-settings"
        className="dd-item-icon"
        style={{ margin: '0 5 0 0' }}
      />
      <span className="dd-title">Settings</span>
    </React.Fragment>
  );
};

function Header(props) {
  const {
    t,
    user,
    userManager,
    modal: { show },
    home,
    location,
    children,
  } = props;

  const [options, setOptions] = useState([]);

  useEffect(() => {
    const optionsValue = [
      // {
      //   title: t('About'),
      //   icon: { name: 'info' },
      //   onClick: () =>
      //     show({
      //       content: AboutContent,
      //       title: t('OHIF Viewer - About'),
      //     }),
      // },
      {
        title: t('Preferences'),
        icon: {
          name: 'user',
        },
        onClick: () =>
          show({
            content: ConnectedUserPreferencesForm,
            title: t('User Preferences'),
          }),
      },
    ];

    if (user && userManager) {
      optionsValue.push({
        title: t('Logout'),
        icon: { name: 'power-off' },
        onClick: () => userManager.signoutRedirect(),
      });
    }

    setOptions(optionsValue);
  }, [setOptions, show, t, user, userManager]);

  const { appConfig = {} } = AppContext;
  const showStudyList =
    appConfig.showStudyList !== undefined ? appConfig.showStudyList : true;

  // ANTD -- Hamburger, Drawer, Menu
  return (
    <>
      {/*<div className="notification-bar">{t('INVESTIGATIONAL USE ONLY')}</div>*/}
      <div className={`entry-header ${home ? 'header-big' : ''}`}>
        <div className="header-left-box">
          {location && location.studyLink && (
            <Link
              to={location.studyLink}
              className="header-btn header-viewerLink"
            >
              {t('Back to Viewer')}
            </Link>
          )}

          {children}

          {/*{showStudyList && !home && (*/}
          {/*  <Link*/}
          {/*    className="header-btn header-studyListLinkSection"*/}
          {/*    to={{*/}
          {/*      pathname: '/',*/}
          {/*      state: { studyLink: location.pathname },*/}
          {/*    }}*/}
          {/*  >*/}
          {/*    {t('Study list')}*/}
          {/*  </Link>*/}
          {/*)}*/}
        </div>

        <div className="header-menu">
          <span className="research-use">{t('DEV-RELEASE | INVESTIGATIONAL USE ONLY')}</span>
          {/*<Dropdown title={t('Options')} list={options} align="right" />*/}
          <Dropdown titleElement={<OptionsElement/>} list={options} align="right" />
        </div>
      </div>
    </>
  );
}

Header.propTypes = {
  home: PropTypes.bool.isRequired,
  location: PropTypes.object.isRequired,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
  userManager: PropTypes.object,
  user: PropTypes.object,
  modal: PropTypes.object,
};

Header.defaultProps = {
  home: true,
  children: OHIFLogo(),
};

export default withTranslation(['Header', 'AboutModal'])(
  withRouter(withModal(Header))
);
