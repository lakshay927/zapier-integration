const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

function naiveRound(num, decimalPlaces = 0) {
  var p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
}

function escapeStringForJson(str) {
  return (
    str
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/&/g, " ")
      .replace(/#/g, " ")

      // .replace(/\[/g, "") // Escape brackets
      // .replace(/\]/g, "") // Escape brackets
      // .replace(/\./g, "") // Escape period
      .replace(/\u2013/g, "") // Remove en dash
      .replace(/'/g, "") // Escape single quotes
      .replace(/"/g, "") // Escape double quotes
      .replace(/\n/g, " ") // Remove newlines and replace with a space
      .replace(/\r/g, "")
      .replace(":", "")
      .substring(0, 100)
      .trim()
  ); // Remove carriage returns
}

const findItems = async (i) => {
  var itemName = "";
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

    const taxSection = items.find(
      (child) => child.schema_id === "amounts_section"
    );

    if (!taxSection) {
      console.error("No tax_section found");
      return;
    }

    const itemResults = [];

    const itemSection = items.find(
      (child) => child.schema_id === "line_items_section"
    );

    if (!itemSection) {
      console.error("No item_section found");
      return;
    }

    const tax = taxSection.children.find(
      (datapoint) => datapoint.schema_id === "amount_total_tax"
    );
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
      itemName = escapeStringForJson(itemNameValue);
      const taxPercentage = 13;
      let newAmount = 0;
      if (tax.value == "") {
        const amountWithoutTax = itemAmountTotal.value / (1 + taxPercentage / 100);
        newAmount = naiveRound(amountWithoutTax, 2);
      }
      const itemAmountTotalValue =
        tax.value == "" ? newAmount : itemAmountTotal.value ;
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
        try {
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
        } catch (error) {
          const errorBody = JSON.parse(error.authResponse.body);
          const bodyResponse = errorBody.Fault;
          if (bodyResponse.Error.length > 0) {
            if (
              bodyResponse.Error[0].Detail.includes(
                "The name supplied already exists"
              )
            ) {
              console.log(
                "The duplicate item id is",
                parseInt(bodyResponse.Error[0].Detail.substring(39))
              );
              const itemObject = {
                id: parseInt(bodyResponse.Error[0].Detail.substring(39)),
                name: itemName,
                amount: itemAmountValue,
                quantity: itemQuantityValue,
              };
              itemResults.push(itemObject);
            }
          }
        }
      }
    }
    console.log(`The items for Bill ${i} are ready !!!!!!!!`);
    return itemResults;
  } catch (error) {
    console.error("The item error is", itemName, "@@", error);
    return;
  }
};

module.exports = findItems;
