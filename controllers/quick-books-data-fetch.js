const OAuthClient = require('intuit-oauth');
const fs = require('fs');
const path = require('path');
const { oauthClient } = require('./quick-books-oAuth');
const findItems = require('./create-items');


const getCompanyInfo = (req, res) => {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == 'sandbox'
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({ url: `${url}v3/company/${companyID}/companyinfo/${companyID}` })
    .then(function (authResponse) {
      console.log(`The response for API call is :${JSON.stringify(authResponse)}`);
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
};





const createBill = async (req, res) => {
  try {
    const itemName = req.body.itemName;
    const vendorData = req.body;
    
    await findItems(itemName, vendorData, (response) => {
      res.status(200).send(response);
  });

    const companyID = oauthClient.getToken().realmId;
    const folderPath = path.join(__dirname, '../rossum_data');
    const fileNames = fs.readdirSync(folderPath);

    if (fileNames.length === 1) {
      const fileName = fileNames[0];
      const filePath = path.join(folderPath, fileName);

      const rossumData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const results = rossumData.results;
      const data = results.map((item) => {
        return {
          label: item.content.map((content) => content.schema_id),
        }
      })
    const body = req.body;
    const response = await oauthClient.makeApiCall({
      url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/bill?minorversion=69`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('The API response is: ', response);
    res.status(200).send({ message: 'Bill created successfully!' });
  } else {
    console.error('Expected one file in the Rossumdata folder', fileNames);
    res.status(500).send('Error creating bill');
  }
  } catch (error) {
    console.error('The error is ', error);
    res.status(500).send('Error creating bill');
  }
};

module.exports = { getCompanyInfo, createBill };