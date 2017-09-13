var express = require("express");
var mssql = require("mssql");
var bodyParser = require("body-parser");
var config = require("./config.js");
const dbConfig = {
    user: config.db.username,
    password: config.db.password,
    server: config.db.server,
    database: config.db.database
}

var app = express();
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

//app.get("/types", function(request, response) {
    try {
        mssql.connect(config, function(err){
            var request = new mssql.Request(config);
            request.query("select top 1 * from employee", function(err, result){
                if(err) console.log(err);
                else console.log(recordset);
            });
        });
    } catch (err) {
        // ... error checks 
    }
//});