require("dotenv").config();
const express = require('express');
const  fetchData  = require('./controllers/rossum-data-fetch');
const { getCompanyInfo, createBill } = require('./controllers/quick-books-data-fetch');
const findVendors = require('./controllers/create-vendor');
const { redirectToAuthUri, parseRedirect } = require("./controllers/quick-books-oAuth");
const findItems = require("./controllers/create-items");

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
}
);
app.get('/fetch',fetchData)
// Route OAuth process
app.get('/auth', redirectToAuthUri);
app.get('/callback', parseRedirect);
app.get('/getCompanyInfo', getCompanyInfo);
app.post('/createBill', createBill);
app.post('/vendor', findVendors);
app.post('/items', findItems);

app.listen(3000, () => {
    console.log('Server is running on port 3000');
}
);
