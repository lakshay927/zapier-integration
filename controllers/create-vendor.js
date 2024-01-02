const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

const vendorData = {
  Title: "Ms.",
  Suffix: "Sr.",
};

const findVendors = async () => {
  try {
    const companyID = process.env.REALM_ID
    
    //READING ROSSUM DATA
    const folderPath = path.join(__dirname, "../rossum_data");
    const fileNames = fs.readdirSync(folderPath);

    if (!fileNames.length === 1) {
      console.error("Expected one file in the Rossumdata folder", fileNames);
     return;
    }
    const fileName = fileNames[0];
    const filePath = path.join(folderPath, fileName);

    const rossumData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const results = rossumData.results;
    const itemResults = [];
  
    for (const item of results) {
      const vendorSection = item.content.find(
        (child) => child.schema_id === "vendor_section"
      );

      if (!vendorSection) {
        console.error("No vendor_section found");
       return;
      }
      const senderName = vendorSection.children.find(
        (datapoint) => datapoint.schema_id === "sender_name"
      );

      if (senderName.value == "") {
        console.error("Sender Name empty");
       return;
      }
      const senderNameValue = senderName.value;

      const findResponse = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from vendor where DisplayName='${senderNameValue}'&minorversion=69`,
        method: "GET",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const queryResult = JSON.parse(findResponse.body);
// console.log("The query result is ", queryResult)
      if (Object.keys(queryResult.QueryResponse).length > 0) {
        // if the vendor is found
        const vendorId = queryResult.QueryResponse.Vendor[0].Id;
        itemResults.push(vendorId);
        // console.log("The vendor_id is ", vendorId);
        // return vendorId;
      } else {

        const createVendor = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/vendor?minorversion=69`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...vendorData,
            DisplayName: senderNameValue,
          }),
        });
        // console.log("The create vendor response is ", createVendor);
        const createVendorResponse = JSON.parse(createVendor.body);
        const vendorId = createVendorResponse.QueryResponse.Vendor.Id;
        itemResults.push(vendorId);
        // console.log("The response of create vendor: ", createVendor);
        // return vendorId;
      }
    }

    return itemResults;
  } catch (error) {
    console.error("The vendor error is ", );
   
    return;
  }
};

module.exports = findVendors;
