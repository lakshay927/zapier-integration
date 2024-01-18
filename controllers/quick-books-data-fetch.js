const fs = require("fs");
const path = require("path");
const { oauthClient, createAccessToken } = require("./quick-books-oAuth");
const findItems = require("./create-items");
const findVendors = require("./create-vendor");
const findTerms = require("./create-terms");
const OAuthClient = require("intuit-oauth");
const { dataStatusChanged } = require("./rossum-data-fetch");

const getCompanyInfo = (req, res) => {
  const companyID = oauthClient.getToken().realmId;

  const url =
    oauthClient.environment == "sandbox"
      ? OAuthClient.environment.sandbox
      : OAuthClient.environment.production;

  oauthClient
    .makeApiCall({
      url: `${url}v3/company/${companyID}/companyinfo/${companyID}`,
    })
    .then(function (authResponse) {
      console.log(
        `The response for API call is :${JSON.stringify(authResponse)}`
      );
      res.send(JSON.parse(authResponse.text()));
    })
    .catch(function (e) {
      console.error(e);
    });
};

const createBill = async (req, res) => {
  try {

    const folderPath = path.join(__dirname, "../rossum_data");
    const fileNames = fs.readdirSync(folderPath);

    if (!fileNames.length === 1) {
      console.error("Expected one file in the Rossumdata folder", fileNames);
      return;
    }

    const token = await createAccessToken();

    if (!token) {
      return res.status(401).send({ message: "Failed to create access token" });
    }
    console.log("Token is created #########");
    // find and create vendors
    const vendorsResponse = await findVendors(res);

    if (!vendorsResponse) {
      return res.status(500).send({ message: "Error in vendor" });
    }
    console.log("Vendors ready @@@@@@@");

    const termsResponse = await findTerms(res);

    if (!termsResponse) {
      return res.status(500).send({ message: "Error in terms" });
    }
    console.log("Terms ready @@@@@@@");

    const mappedDataPromises = vendorsResponse.map(async (e, i) => {
      // find and create items
      const itemsResponse = await findItems(i);
      if (!itemsResponse) {
        throw new Error("Error in items");
      }

      const line = itemsResponse.map((e, i) => ({
        DetailType: "ItemBasedExpenseLineDetail",
        Amount: `${e.amountTotal || 0}`,
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
      }));

      return line;
    });

    const mappedData = await Promise.all(mappedDataPromises);
    if (!mappedData) {
      return res.status(500).send({ message: "Error in mapping" });
    }
    console.log("Data is mapped");

    const companyID = process.env.REALM_ID;
    //READING ROSSUM DATA
    

    const fileName = fileNames[0];
    const filePath = path.join(folderPath, fileName);
    const rossumData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const billData = rossumData.results;

    for (let i = 0; i < vendorsResponse.length; i++) {
      const invoiceSection = billData[i].content.find(
        (child) => child.schema_id === "invoice_info_section"
      );
      const taxSection = billData[i].content.find(
        (child) => child.schema_id === "amounts_section"
      );

      if (!invoiceSection) {
        console.error("No invoice_section found");
        return;
      }
      if (!taxSection) {
        console.error("No tax_section found");
        return;
      }

      const issueDate = invoiceSection.children.find(
        (datapoint) => datapoint.schema_id === "date_issue"
      );
      const dueDate = invoiceSection.children.find(
        (datapoint) => datapoint.schema_id === "date_due"
      );
      const billNumber = invoiceSection.children.find(
        (datapoint) => datapoint.schema_id === "document_id"
      );
      const tax = taxSection.children.find(
        (datapoint) => datapoint.schema_id === "amount_total_tax"
      );

      if (mappedData[i].length === 0) {
        continue;
      }
      let GTC = "TaxExcluded";
      if (tax.value == "") {
        GTC = "TaxExcluded";
      }
      console.log(
        "The bill number is",
        i,
        mappedData[i][0].ItemBasedExpenseLineDetail.TaxCodeRef
      );

      const createdBill = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/bill?minorversion=69`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          VendorRef: { value: `${vendorsResponse[i]}` },
          Line: mappedData[i],
          DueDate: dueDate.value,
          TxnDate: issueDate.value,
          DocNumber: billNumber.value,
          SalesTermRef: { value: `${termsResponse[i]}` },
          TxnTaxDetail: {
            TotalTax: tax.value,
          },
          GlobalTaxCalculation: GTC,
        }),
      });

      const createBillData = JSON.parse(createdBill.body);
      const billId = createBillData.Bill.Id;
      console.log(`Bill ${i + 1} created successfully! `, billId);
    }
    console.log(`All Bills created successfully! `);

    // Data status changed in Rossum
    dataStatusChanged();

    // Delete the rossum file after successful processing bills
    fs.unlinkSync(filePath);
    console.log(`File ${fileName} deleted after successful processing.`);

    return res.status(200).send({ message: "All bills created successfully!" });
  } catch (error) {
    console.error("The error is in bill", error);
    return res.status(500).send("Error creating bill");
  }
};

module.exports = { createBill, getCompanyInfo };
