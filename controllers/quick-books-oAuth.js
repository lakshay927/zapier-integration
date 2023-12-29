const OAuthClient = require('intuit-oauth');

const oauthClient = new OAuthClient({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET ,
    environment: process.env.ENVIRONMENT,
    redirectUri: process.env.REDIRECT_URI,
});

const redirectToAuthUri = (req, res) => {
    const authUri = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: 'testState',
    });
    console.log('The authUri is ' + authUri);
    res.redirect(authUri);
;}
    
const parseRedirect = (req, res) => {
    // Parse the redirect URL for authCode and exchange them for tokens
    const redirectUri = req.url;
    
    // Exchange the auth code retrieved from the **req.url** on the redirectUri
    oauthClient
      .createToken(redirectUri)
      .then(function (authResponse) {
        console.log('The Token is  ' + JSON.stringify(authResponse.getJson()));
      })
      .catch(function (e) {
        console.error('The error message is :' + e.originalMessage);
        console.error(e.intuit_tid);
      });
};

module.exports = { oauthClient, redirectToAuthUri, parseRedirect};