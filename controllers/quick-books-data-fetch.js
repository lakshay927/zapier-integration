const OAuthClient = require("intuit-oauth");
const fs = require("fs");
const path = require("path");
const { oauthClient, createAccessToken } = require("./quick-books-oAuth");
const findItems = require("./create-items");
const findVendors = require("./create-vendor");
const { response } = require("express");

const billObject = {
  Line: [
    {
      DetailType: "ItemBasedExpenseLineDetail",
      Amount: 200.0,
      Id: "1",
      ItemBasedExpenseLineDetail: {
        ItemRef: {
          value: "28",
        },
        Qty: "1",
        UnitPrice: "10",
        TaxCodeRef: {
          value: "5",
        },
      },
    },
    {
      DetailType: "ItemBasedExpenseLineDetail",
      Amount: 400.0,
      Id: "2",
      ItemBasedExpenseLineDetail: {
        ItemRef: {
          value: "29",
          // TaxAmount:15
        },
        TaxCodeRef: {
          value: "5",
        },
      },
    },
  ],
  VendorRef: {
    value: "67",
  },
};

// const getCompanyInfo = (req, res) => {
//   const companyID = oauthClient.getToken().realmId;

//   const url = OAuthClient.environment.sandbox;

//   oauthClient
//     .makeApiCall({
//       url: `${url}v3/company/${companyID}/companyinfo/${companyID}`,
//     })
//     .then(function (authResponse) {
//       console.log(
//         `The response for API call is :${JSON.stringify(authResponse)}`
//       );
//       res.send(JSON.parse(authResponse.text()));
//     })
//     .catch(function (e) {
//       console.error(e);
//     });
// };

const createBill = async (req, res) => {
  try {
    const token = await createAccessToken();
    // console.log("The token is ", token);
    if (!token) {
      return res.status(401).send({ message: "Failed to create access token" });
    }

    // find and create vendors
    const vendorsResponse = await findVendors(res);
    // console.log("The vendor Results are ", vendorsResponse);
    if (!vendorsResponse) {
      res.status(500).send({ message: "Error in vendor" });
      return; // Stop execution if there are no vendors
    }

    const mappedData = await vendorsResponse.map(async (e, i) => {
      // find and create items
      const itemsResponse = await findItems(i);

      if (!itemsResponse) {
        res.status(500).send({ message: "Error in items" });
        return; // Stop execution if there are no items
      }
      const line = await itemsResponse.map((e,i)=>( {
        DetailType: "ItemBasedExpenseLineDetail",
        Amount: `${e.amountTotal}`,
        Id: `${i}`,
        ItemBasedExpenseLineDetail: {
          ItemRef: {
            value: `${e.id}`,
          },
          Qty: `${e.quantity}`,
          UnitPrice: `${e.amount}`,
          TaxCodeRef: {
            value: "5",
          },
        },
      }))
      // console.log("The items results are ", line);

      return line;
      
    });

    if (!mappedData) {
      res.status(500).send({ message: "Error in mapping" });
      return; // Stop execution if there are no items
    }
    console.log(mappedData)
    // const companyID = process.env.REALM_ID;
    // const folderPath = path.join(__dirname, "../rossum_data");
    // const fileNames = fs.readdirSync(folderPath);

    // //READING ROSSUM DATA
    // if (fileNames.length === 1) {
    //   const fileName = fileNames[0];
    //   const filePath = path.join(folderPath, fileName);

    //   const rossumData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    //   const results = rossumData.results;
    //   const data = results.map((item) => {
    //     return {
    //       label: item.content.map((content) => content.schema_id),
    //     };
    //   });
      // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

      const response = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/bill?minorversion=69`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billObject),
      });

      console.log("Bill created successfully! ");
      res.status(200).send({ message: "Bill created successfully!" });
    
    // else {
    //   console.error("Expected one file in the Rossumdata folder", fileNames);
    //   res.status(500).send("Error creating bill");
    // }
  } catch (error) {
    console.error("The error is in bill", error);
    res.status(500).send("Error creating bill");
  }
};

module.exports = { createBill };
