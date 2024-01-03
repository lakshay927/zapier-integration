const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

const findTerms = async () => {
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
    const termsData = rossumData.results;

    const termsResults = [];

    for (const item of termsData) {
      const termsSection = item.content.find(
        (child) => child.schema_id === "payment_info_section"
      );

      if (!termsSection) {
        console.error("No term_section found");
        return;
      }

      const billTerms = termsSection.children.find(
        (datapoint) => datapoint.schema_id === "terms"
      );
      const termsValue = billTerms.value.trim();
      //   console.log("The terms value is ", termsValue);
      if (termsValue == "" || termsValue == "Due Upon Receipt") {
        termsResults.push(1);
        continue;
      }
      const findResponse = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from Term where Name='${termsValue}'&minorversion=69`,
        method: "GET",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const queryResult = JSON.parse(findResponse.body);
      //   console.log("The query result is ", queryResult);
      if (Object.keys(queryResult.QueryResponse).length > 0) {
        // if the term is found
        const termId = queryResult.QueryResponse.Term[0].Id;

        termsResults.push(termId);
      } else {
        const createTerm = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/term?minorversion=69`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Name: termsValue,
          }),
        });
        console.log("The create term response is ", createTerm);
        const createTermResponse = JSON.parse(createTerm.body);
        const termId = createTermResponse.QueryResponse.Term.Id;

        termsResults.push(termId);
      }
    }
    return termsResults;
  } catch (error) {
    console.error("The term error is ", error);

    return;
  }
};

module.exports = findTerms;
