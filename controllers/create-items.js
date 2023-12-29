
const { oauthClient } = require('./quick-books-oAuth');

const findItems = async (itemName, vendorData, sendResponse) => {
    try {
        const companyID = oauthClient.getToken().realmId;

        const findResponse = await oauthClient.makeApiCall({
            url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from Item where Name='${itemName}'&minorversion=69`,
            method: 'GET',
            headers: {
              'Content-Type': 'text/plain',
            },
        });
        console.log('The API response is: ', findResponse);

        if (findResponse && findResponse.QueryResponse && findResponse.QueryResponse.maxResults > 0) {
            console.log('Item found!');
        }

        const createItem = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/item?minorversion=69`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vendorData),
        });

        console.log('The response of create item: ', createItem);
        sendResponse({ message: 'Items successfully!' });

    } catch (error) {
        console.error('The error is ', error);
    }
};

module.exports = findItems;