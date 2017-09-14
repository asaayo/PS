var express = require("express");
var bodyParser = require("body-parser");
var configFile = require("./config.js");
var sql = require("mssql");
const config = {
    user: configFile.db.username,
    password: configFile.db.password,
    server: configFile.db.server,
    database: configFile.db.database,
    options: {
        instanceName: configFile.db.instance
    }
}

var app = express();

// sql.connect(config, function(err){
//     var request = new sql.Request();
//     request.query("select top 1 * from employee", function(err, result){
//         if(err) console.log(err);
//         console.log(result);
//     });
// });

(async function() {
    try {
        let pool = await sql.connect(config);
        let result = await pool.request().query("select top 1 * from employee");
        console.log(result);
        return(0);
    } catch (err){
        console.log(err);
    }
})();