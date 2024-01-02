const fs = require("fs");
const path = require("path");
const { oauthClient } = require("./quick-books-oAuth");

const itemData = {
  Type: "Inventory",
};

const findItems = async (i) => {
  try {
    const companyID = process.env.REALM_ID;
    // console.log("company ID", companyID);
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
    //console.log(items)

    const itemResults = [];
    // for (const item of items) {
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
    // console.log(lineItems.children.length);

    for (const item of lineItems.children) {

      
      // const lineItem = item.children.find(
      //   (datapoint) => datapoint.schema_id === "line_item"
      // );
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
      const itemNameValue = itemDescription.value||'other';
      const itemName = itemNameValue.substring(0, 15).trim();
      const itemAmountTotalValue = itemAmountTotal.value;
      const itemQuantityValue = itemQuantity.value;
      const itemAmountValue = itemAmount.value;
      // console.log("The item name is ", itemName);

      const findResponse = await oauthClient.makeApiCall({
        url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/query?query=select * from Item where Name='${itemName}'&minorversion=69`,
        method: "GET",
        headers: {
          "Content-Type": "text/plain",
        },
      });
      console.log("The item_ name  is ", itemName);
      const queryResponse = JSON.parse(findResponse.body);
       
      if (Object.keys(queryResponse.QueryResponse).length > 0) {
  

        const itemId = queryResponse.QueryResponse.Item[0].Id;
        const itemObject={id:itemId,name:itemName,amount:itemAmountValue,quantity:itemQuantityValue,amountTotal:itemAmountTotalValue}
        
        itemResults.push(itemObject);
       
        console.log("The item_id is ", itemId);
        
      } else {
        console.log("created new item ",queryResponse)
        const createItem = await oauthClient.makeApiCall({
          url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyID}/item`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ExpenseAccountRef: {
              name: "Cost of Goods Sold",
              value: '80',
            },
            Name: itemName,
          }),
        });

        const createItemResponse = await JSON.parse(createItem.body);
        // console.log("The create item is ", createItemResponse);
        const itemId = createItemResponse.Item.Id;
        // console.log("The response of create item: ", createItemResponse);
        const itemObject={id:itemId,name:itemName,amount:itemAmountValue,quantity:itemQuantityValue,amountTotal:itemAmountTotalValue}

        itemResults.push(itemObject);
        
      }
    }
    // console.log("The item results are ", itemResults);
    return itemResults;
  } catch (error) {
    console.error("The item error is", error);
    return;
  }
};

module.exports = findItems;
