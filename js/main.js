document.addEventListener('DOMContentLoaded', function () {
  let platformClient = window.require('platformClient');

  let pcEnvironment = "mypurecloud.com.au"
  if (!pcEnvironment) {
    setErrorState('Cannot identify App Embeddding context');
    return;
  }
  let pcOAuthClientIds = {
    'mypurecloud.com.au': '5ad96df6-f5a5-418c-b6b2-ab703849d965'
  };
  let clientId = pcOAuthClientIds[pcEnvironment];
  if (!clientId) {
    setErrorState(pcEnvironment + ': Unknown/Unsupported PureCloud Environment');
    return;
  }

  let client = platformClient.ApiClient.instance;
  client.setEnvironment(pcEnvironment);

  let clientApp = null;
  try {
    clientApp = new window.purecloud.apps.ClientApp({
      pcEnvironment: pcEnvironment
    });
  } catch (e) {
    setErrorState(pcEnvironment + ': Unknown/Unsupported PureCloud Embed Context');
    return;
  }
  let redirectUrl = window.location.origin;
  if (!redirectUrl) {
    redirectUrl = window.location.protocol + '//' + window.location.host;
  }
  redirectUrl += window.location.pathname;

  client.loginImplicitGrant(clientId, redirectUrl, {
      state: ('pcEnvironment=' + pcEnvironment)
    })
    .then(function () {
      authenticated = true;
      console.log("User authenticated!!")
      return new platformClient.UsersApi().getUsersMe({
        'expand': ['authorization']
      });
    })
    .then(function (profileData) {
      console.log(profileData)
    })

  //Utility
  function extractParams(paramStr) {
    let result = {};

    if (paramStr) {
      let params = paramStr.split('&');
      params.forEach(function (currParam) {
        if (currParam) {
          let paramTokens = currParam.split('=');
          let paramName = paramTokens[0];
          let paramValue = paramTokens[1];
          if (paramName) {
            paramName = decodeURIComponent(paramName);
            paramValue = paramValue ? decodeURIComponent(paramValue) : null;

            if (!result.hasOwnProperty(paramName)) {
              result[paramName] = paramValue;
            } else if (Array.isArray(result[paramName])) {
              result[paramName].push(paramValue);
            } else {
              result[paramName] = [result[paramName], paramValue];
            }
          }
        }
      });
    }

    return result;
  }

  /**
   * Determine the embedding PureCloud environment seeded on the query string or
   * being returned through the OAuth2 Implicit grant state hash param.
   *
   * @returns A string indicating the embedding PC env (e.g. mypurecloud.com, mypurecloud.jp); otherwise, null.
   */
  function getEmbeddingPCEnv() {
    let result = null;

    if (window.location.hash && window.location.hash.indexOf('access_token') >= 0) {
      let oauthParams = extractParams(window.location.hash.substring(1));
      if (oauthParams && oauthParams.access_token && oauthParams.state) {
        // OAuth2 spec dictates this encoding
        // See: https://tools.ietf.org/html/rfc6749#appendix-B
        let stateSearch = unescape(oauthParams.state);
        result = extractParams(stateSearch).pcEnvironment;
      }
    }

    if (!result && window.location.search) {
      result = extractParams(window.location.search.substring(1)).pcEnvironment || null;
    }

    return result;
  }

  /**
   * Sets the base mode of the app to error and show the provided message
   */
  function setErrorState(errorMsg) {
    console.log(errorMsg)
  }

  function isPermission(item, targetItem) {
    let isItem = item === '*' || targetItem === '*';
    if (!isItem) {
      isItem = item === targetItem;
    }
    return isItem;
  }

  /**
   * Parse the permissions array and check whether or not the match the specified required ones.
   *
   * @returns A boolean indicating if the user possesses the required permissions.
   */
  function checkPermission(permissions, permissionValue) {
    let isAllowed = false;

    if (!permissions) {
      permissions = [];
    }

    if (permissionValue.match(/^[a-zA-Z0-9]+:\*$/)) {
      permissionValue = permissionValue.replace('*', '*:*');
    }

    const permissionsToValidate = permissionValue.split(':'),
      targetDomain = permissionsToValidate[0],
      targetEntity = permissionsToValidate[1],
      targetAction = permissionsToValidate[2];

    permissions.forEach(function (permission) {
      const permissions = permission.split(':'),
        domain = permissions[0],
        entity = permissions[1],
        actionSet = permissions[2];

      if (targetDomain === domain) {
        const matchesEntity = isPermission(targetEntity, entity),
          matchesAction = isPermission(targetAction, actionSet);

        if (matchesEntity && matchesAction) {
          isAllowed = true;
        }
      }
    });

    return isAllowed;
  }
});
