const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

const findItems = async (i) => {
  try {
    const companyID = process.env.REALM_ID;
    const folderPath = path.join(__dirname, "../rossum_data");
    const fileNames = fs.readdirSync(folderPath);

    if (!fileNames.length === 1) {
      console.error("Expected one file in the Rossumdata folder", fileNames);
      return;
    }
    const fileName = fileNames[0];
    const filePath = path.join(folderPath, fileName);
    const rossumData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const items = rossumData.results[i].content;

    const itemResults = [];

    const itemSection = items.find(
      (child) => child.schema_id === "line_items_section"
    );

    if (!itemSection) {
      console.error("No item_section found");
      return;
    }
    const lineItems = itemSection.children.find(
      (datapoint) => datapoint.schema_id === "line_items"
    );

    for (const item of lineItems.children) {
      const itemDescription = item.children.find(
        (datapoint) => datapoint.schema_id === "item_description"
      );
      const itemAmountTotal = item.children.find(
        (datapoint) => datapoint.schema_id === "item_amount_total"
      );
      const itemQuantity = item.children.find(
        (datapoint) => datapoint.schema_id === "item_quantity"
      );
      const itemAmount = item.children.find(
        (datapoint) => datapoint.schema_id === "item_amount"
      );

      const itemNameValue = itemDescription.value || "other";
      const itemName = itemNameValue.substring(0, 15).trim();
      const itemAmountTotalValue = itemAmountTotal.value;
      const itemQuantityValue = itemQuantity.value;
      const itemAmountValue = itemAmount.value;

      const findResponse = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from Item where Name='${itemName}'&minorversion=69`,
        method: "GET",
        headers: {
          "Content-Type": "text/plain",
        },
      });

      const queryResponse = JSON.parse(findResponse.body);

      if (Object.keys(queryResponse.QueryResponse).length > 0) {
        const itemId = queryResponse.QueryResponse.Item[0].Id;
        const itemObject = {
          id: itemId,
          name: itemName,
          amount: itemAmountValue,
          quantity: itemQuantityValue,
          amountTotal: itemAmountTotalValue,
        };

        itemResults.push(itemObject);
      } else {
        const createItem = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/item`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ExpenseAccountRef: {
              name: "Cost of Goods Sold",
              value: "80",
            },
            Name: itemName,
          }),
        });

        const createItemResponse = await JSON.parse(createItem.body);
        const itemId = createItemResponse.Item.Id;
        const itemObject = {
          id: itemId,
          name: itemName,
          amount: itemAmountValue,
          quantity: itemQuantityValue,
          amountTotal: itemAmountTotalValue,
        };

        itemResults.push(itemObject);
      }
    }
     console.log(`The items for Bill ${i} are ready !!!!!!!!`);
    return itemResults;
  } catch (error) {
    console.error("The item error is", error);
    return;
  }
};

module.exports = findItems;
