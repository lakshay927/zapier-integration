const { oauthClient, createAccessToken } = require("./quick-books-oAuth");
const fs = require("fs/promises");

const updatedBills = async (req, res) => {
  try {
    const token = await createAccessToken();

    if (!token) {
      return res.status(401).send({ message: "Failed to create access token" });
    }
    console.log("Token is created #########");

    let mappedData = [];

    const dataMappedPath = "./dataMapped.json";
    const idsPath = "./ids.json";
    const vendorsPath = "./vendors.json";

    const data = await fs.readFile(dataMappedPath, "utf-8");
    // Parse the JSON string into an array
    mappedData = JSON.parse(data);
    const ids = await fs.readFile(idsPath, "utf-8");
    idsData=JSON.parse(ids)
    const vendors = await fs.readFile(vendorsPath, "utf-8");
vendorsData=JSON.parse(vendors)
    console.log("read file");

    const companyID = process.env.REALM_ID;
    const updateBills = [
      "640",
      "641",
      "642",
      "643",
      "646",
      "647",
      "648",
      "649",
      "652",
    ];

    for (let i = 0; i < idsData.length; i++) {
      let a=2;
      
      //   console.log("bill line", mappedData[i]);
      mappedData[i].forEach((element) => {
        console.log(element.ItemBasedExpenseLineDetail.ItemRef);
      });
      const updatedBill = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/bill?minorversion=69`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Id: `${idsData[i]}`,
          VendorRef: {
            value: `${vendorsData[i]}`,
          },
          Line: mappedData[i],
          SyncToken: `${a}`,
          GlobalTaxCalculation:'TaxInclusive'
        }),
      });
      console.log(
        `Bill ${i + 1} updated successfully! `
        // updateBills[i],
        // updatedBill
      );
    }
    return res.status(200).send({ message: "All bills updated successfully!" });
  } catch (error) {
    console.error("The error is in bill", error);
    return res.status(500).send("Error updating bill");
  }
};

module.exports = { updatedBills };
