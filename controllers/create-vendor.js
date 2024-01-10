const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

const vendorData = {
  Title: "Ms.",
  Suffix: "Sr.",
};

function escapeStringForJson(str) {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/&/g, " ")
    .replace(/\./g, "") // Escape period
    .replace(/'/g, "") // Escape single quotes
    .replace(/"/g, "") // Escape double quotes
    .replace(/\n/g, " ") // Remove newlines and replace with a space
    .replace(/\r/g, "")
    .replace(":", "")
    .trim(); // Remove carriage returns
}

const findVendors = async () => {
  try {
    const companyID = process.env.REALM_ID;

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
      const senderAddress = vendorSection.children.find(
        (datapoint) => datapoint.schema_id === "sender_address"
      );

      const senderNameValue = escapeStringForJson(senderName.value)||'other';
      console.log("The sender name is", senderNameValue);

      const findResponse = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from vendor where DisplayName='${senderNameValue}'&minorversion=69`,
        method: "GET",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const queryResult = JSON.parse(findResponse.body);
      console.log("The query result is ", queryResult.QueryResponse.Vendor);
      if (Object.keys(queryResult.QueryResponse).length > 0) {
        // if the vendor is found
        const vendorId = queryResult.QueryResponse.Vendor[0].Id;

        itemResults.push(vendorId);
      } else {
        const createVendor = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/vendor?minorversion=69`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            DisplayName: senderNameValue,
            BillAddr: {
              Line1: senderAddress.value,
            },
          }),
        });
        // console.log("The create vendor respone is ", createVendor);
        const createVendorResponse = JSON.parse(createVendor.body);
        const vendorId = createVendorResponse.Vendor.Id;

        itemResults.push(vendorId);
      }
    }

    return itemResults;
  } catch (error) {
    console.error("The vendor error is", error);

    return;
  }
};

module.exports = findVendors;
