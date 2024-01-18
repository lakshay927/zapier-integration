const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const fetchData = (req, res) => {
  const queue_id = process.env.QUEUE_ID;
  const loginUrl = process.env.LOGIN_URL;
  const username = process.env.USEREMAIL;
  const password = process.env.PASSWORD;


  const getCurrentDateTimeString = () => {
    const now = new Date();
    const pad = (number) => (number < 10 ? '0' + number : number);
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };


  const makeUrl = (id) =>
    `https://elis.rossum.ai/api/v1/queues/${id}/export?format=json&status=confirmed&page_size=100&page=1`;

  const createHeaders = (token) => ({
    headers: {
      "Content-Type": "application/xml",
      Authorization: `token ${token}`,
    },
  });

  const fetchXMLs = (token) => {
    const dateTimeString = getCurrentDateTimeString();
    const filePath = path.join(
      __dirname,
      "../rossum_data",
      "data_" + dateTimeString + ".xml"
    );
    const dataStream = fs.createWriteStream(filePath);
    fetch(makeUrl(queue_id), createHeaders(token))
      .then((r) => r.body.pipe(dataStream))
      .catch(console.error);
  };




  fetch(loginUrl, {
    method: "POST",
    body: JSON.stringify({ username, password }),
    headers: { "Content-Type": "application/json" },
  })
    .then((r) => r.json())
    .then(({ key }) => {
      fetchXMLs(key);
    });

  console.log("Data are being fetched from Rossum...");
 
   
  res.send("Data are fetched from Rossum...");
};




const dataStatusChanged = (req,res) => {
  const queue_id = process.env.QUEUE_ID;
  const loginUrl = process.env.LOGIN_URL;
  const username = process.env.USEREMAIL;
  const password = process.env.PASSWORD;

  const makeUrl = (id) =>
    `https://elis.rossum.ai/api/v1/queues/${id}/export?format=xml&status=confirmed&to_status=exported`;

  const createHeaders = (token) => ({
    method: "POST",
    headers: {
      "Content-Type": "application/xml",
      Authorization: `token ${token}`,
    },
  });

  // Use the key in your API call
  const fetchXMLs = (token) => {
    fetch(makeUrl(queue_id), createHeaders(token))
      .then(async(r) => {
        const data = r;
        // Handle the response as needed
        console.log("Response from dataStatusChanged API:", data);
        res.status(200).send("Data status changed in Rossum...");
      })
      .catch((error) => {
        console.log("Error in dataStatusChanged API:", error);
        res.status(400).send("error occured");
      });
  };

  fetch(loginUrl, {
    method: "POST",
    body: JSON.stringify({ username, password }),
    headers: { "Content-Type": "application/json" },
  })
    .then((r) => r.json())
    .then(({ key }) => {
      fetchXMLs(key);
    })
    .catch((error) => {
      console.error("Error during login:", error);
    });

  console.log("Data status changed in Rossum...");
};

module.exports = { fetchData, dataStatusChanged };
