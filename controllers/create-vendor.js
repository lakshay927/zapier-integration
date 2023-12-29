const fs = require('fs');
const path = require('path');
const { oauthClient } = require('./quick-books-oAuth');

const findVendors = async (req, res) => {
    try {
      const companyID = oauthClient.getToken().realmId;
      const folderPath = path.join(__dirname, '../rossum_data');
      const fileNames = fs.readdirSync(folderPath);
  
      if (fileNames.length === 1) {
        const fileName = fileNames[0];
        const filePath = path.join(folderPath, fileName);
  
        const rossumData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const results = rossumData.results;
        const vendorNames = results.map(async (item) => {
          const vendorSection = item.content.find(child => child.schema_id === 'vendor_section');
  
          if (vendorSection) {
            const senderName = vendorSection.children.find(datapoint => datapoint.schema_id === 'sender_name');
  
            if (senderName) {
              const senderNameValue = senderName.value;
            
                const response = await oauthClient.makeApiCall({
                  url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from vendor where DisplayName='${senderNameValue}'&minorversion=69`,
                  method: 'GET',
                  headers: {
                    'Content-Type': 'text/plain',
                  },
                });
                console.log('The API response is: ', response);
              // console.log('The sender name is ', senderNameValue);
              if (senderNameValue === req.body.senderName) {
                //
                return senderNameValue;
              } else {
                //create
                const body = req.body;
                const createVendor = await oauthClient.makeApiCall({
                  url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/vendor?minorversion=69`,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body),
                });
  
                // console.log('The Create API response is: ', createVendor);
                console.error('Sender_name does not match');
                return null;
              }
            
            } else {
              console.error('No sender_name found');
              return null;
            }
          } else {
            console.error('No vendor_section found');
            return null;
          }
        });
  
      console.log('The body is ', vendorNames);
      res.status(200).send({ message: 'Vendor successfully!' });
    } else {
      console.error('Expected one file in the Rossumdata folder', fileNames);
      res.status(500).send('Error creating');
    }
    } catch (error) {
      console.error('The error is ', error);
      res.status(500).send('Error creating');
    }
  };

  module.exports = findVendors;