const express = require("express");
const app = express();
const https = require("https");

const settings = require("../core/config.json");
const checksum_lib = require("./Paytm/checksum");

const parseJson = express.json({ extended: false });
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.render("index");
});

app.post("/paynow", parseJson, (req, res) => {
  // Route for making payment

  var paymentDetails = {
    amount: req.body.amount,
    customerId: req.body.name.replace(/\s/g, ""),
    customerEmail: req.body.email,
    customerPhone: req.body.phone,
  };
  if (
    !paymentDetails.amount ||
    !paymentDetails.customerId ||
    !paymentDetails.customerEmail ||
    !paymentDetails.customerPhone
  ) {
    res.status(400).send("Payment failed");
  } else {
    var params = {};
    params["MID"] = settings.PAYTM.MID;
    params["WEBSITE"] = settings.PAYTM.WEBSITE;
    params["CHANNEL_ID"] = settings.PAYTM.CHANNEL_ID;
    params["INDUSTRY_TYPE_ID"] = settings.PAYTM.INDUSTRY_TYPE_ID;
    params["ORDER_ID"] = "TEST_" + new Date().getTime();
    params["CUST_ID"] = paymentDetails.customerId;
    params["TXN_AMOUNT"] = paymentDetails.amount;
    params["CALLBACK_URL"] = settings.PAYTM.CALLBACK_URL;
    params["EMAIL"] = paymentDetails.customerEmail;
    params["MOBILE_NO"] = paymentDetails.customerPhone;
    const queryParams = `mid=${settings.PAYTM.MID}&orderId=${params.ORDER_ID}`;
    checksum_lib.genchecksum(
      params,
      settings.PAYTM.KEY,
      function (err, checksum) {
        var txn_url =
          "https://securegw.paytm.in/theia/processTransaction?" + queryParams; // for production
        var form_fields = "";
        for (var x in params) {
          form_fields +=
            "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
        }
        form_fields +=
          "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";

        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(
          '<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' +
            txn_url +
            '" name="f1">' +
            form_fields +
            '</form><script type="text/javascript">document.f1.submit();</script></body></html>'
        );
        res.end();
      }
    );
  }
});
app.post("/callback", (req, res) => {
  // Route for verifiying payment\
  var body = req.body;

  /*
  var body = req.body;
   code ended here , to cross validationof payement further code is being used  
  */
  var checksumhash = body.CHECKSUMHASH;
  var result = checksum_lib.verifychecksum(
    body,
    settings.PAYTM.KEY,
    checksumhash
  );

  // Send Server-to-Server request to verify Order Status
  var params = { MID: settings.PAYTM.KEY, ORDERID: body.ORDERID };

  checksum_lib.genchecksum(
    params,
    settings.PAYTM.KEY,
    function (err, checksum) {
      params.CHECKSUMHASH = checksum;
      post_data = "JsonData=" + JSON.stringify(params);

      var options = {
        // hostname: "securegw-stage.paytm.in", // for staging
        hostname: "securegw.paytm.in", // for production
        port: 443,
        path: "/merchant-status/getTxnStatus",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": post_data.length,
        },
      };
      // Set up the request
      var response = "";
      var post_req = https.request(options, function (post_res) {
        post_res.on("data", function (chunk) {
          response += chunk;
        });
        post_res.on("end", function () {
          console.log("S2S Response: ", response, "\n");
          var _result = JSON.parse(response);
          if (_result.STATUS == "TXN_SUCCESS") {
            /*
            write your on code on  payment succes here
            
            */
            res.send("payment sucess");
          } else {
            /*
            write your on code on  payment failded here
            
            */
            res.send("payment failed");
          }
          res.end();
          f;
        });
      });
      // post the data
      post_req.write(post_data);
      post_req.end();
    }
  );
});

module.exports = app;
