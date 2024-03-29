const OAuthClient = require("intuit-oauth");
const fs = require("fs");

const oauthClient = new OAuthClient({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  environment: process.env.ENVIRONMENT,
  redirectUri: process.env.REDIRECT_URI,
  refreshToken: process.env.REFRESH_TOKEN,
});

const redirectToAuthUri = (req, res) => {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: "testState",
  });
  console.log("The authUri is " + authUri);
  res.redirect(authUri);
};

const parseRedirect = async (req, res) => {
  try {
    // Parse the redirect URL for authCode and exchange them for tokens
    const redirectUri = req.url;

    // Exchange the auth code retrieved from the **req.url** on the redirectUri
    const authResponse = await oauthClient.createToken(redirectUri);
    const refreshToken = authResponse.getJson().refresh_token;

    // Store the refresh token in file
    const filePath = "./token.txt";
    fs.writeFileSync(filePath, refreshToken);
    
    console.log("The Token is  " + JSON.stringify(authResponse.getJson()));
    res.status(200).send(authResponse.getJson());
  } catch (e) {
    console.error("The error message :" + e);
    res.status(500).send(e.originalMessage);
    // console.error(e.intuit_tid);
  }
};

const createAccessToken = async (req, res) => {
  try {
    if (oauthClient.isAccessTokenValid()) {
      // console.log("The access_token is valid");
      return oauthClient;
    }

    if (!oauthClient.isAccessTokenValid()) {
      console.log("the access token is being generated")
      const filePath = "./token.txt";
      const refreshToken = fs.readFileSync(filePath, "utf8");
      const authResponse = await oauthClient.refreshUsingToken(refreshToken);
      
      return oauthClient;
    }
  } catch (e) {
    console.error("The error message is :" + e);
    // console.error(e.intuit_tid);
    return;
  }
};

module.exports = {
  oauthClient,
  redirectToAuthUri,
  parseRedirect,
  createAccessToken,
};
