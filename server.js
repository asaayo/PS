var express = require("express");
var configFile = require("./config.js");
var sql = require("mssql");
// config for sql connection
const config = {
	user: configFile.db.username,
	password: configFile.db.password,
	server: configFile.db.server,
	database: configFile.db.database,
	options: {
		instanceName: configFile.db.instance
	}
};

var app = express();

// Get the attachment types for a database
app.get("/categories", function(req, res){
	sql.connect(config, function(err){
		if(err) console.log(err);
		var request = new sql.Request();
		request.query("select attach_id from im_attach_mstr where client_name = 'finplus52'", function(err, result){
			if(err){
				console.log(err);
				res.send(err);
			} else{
				var output = [];
				result.recordset.forEach(function(element){
					output.push(element.attach_id.trim());
				});
				res.send(output);
			}
		});
	});
	//sql.close();
});

// Get attachments for a type?
app.get("/attach", function(req, res){
	
});

// Post an attachment
app.post("/attach", function(req, res){

});

app.get("/", function(req, res){
	res.send("What are you doing here?");
});

app.listen(3000, function(){
	console.log("Listening on port 3000");
});