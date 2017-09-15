var express = require("express");
var configFile = require("./config.js");
var sql = require("mssql");
var dateTime = require("node-datetime")
var uuid4 = require("uuid/v4");
var multer = require("multer");
var upload = multer();
// Bad, but temporary fix for SOAP requests requiring TLS
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
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
app.set("json spaces", 2);

var getDocId = function(){
	sql.connect(config, err =>{
		if(err) console.log(err);
		var request = new sql.Request();
		request.query("select max(doc_id) from im_attach_mstr", (err, result) => {
			if(err) console.log(err);
			return result.recordset[0].doc_id;
		});
	});
};

var insertAttachment = function(attachId, attachment, description, userId){
	var dt = dateTime.create();
	var now = dt.format("y-m-d H:M:S:N");
	var uniqueKey = uuid4().toString;
	var docId = getDocId();
	var fileType = attachment.originalname.split(".").pop();
	try{
		const transaction = new sql.Transaction(/* [pool] */);
		var rollback = false;
		transaction.begin(err => {
			new sql.Request(transaction)
				.input("access_dt", sql.DateTime, now)
				.input("archive_dt", sql.DateTime, now)
				.input("clsid", sql.Char, fileType)
				.input("create_dt", sql.DateTime, now)
				.input("description", sql.VarChar, description || "Generic description")
				.input("discard_dt", sql.DateTime, now)
				.input("doc_id", sql.Int, docId)
				.input("refresh_dt", sql.DateTime, now)
				.input("user_id", sql.Char, userId)
				.input("storage_object", sql.Char, "455C061B-A9A0-4A67-A45C-194F0950732E")
				.input("client_name", sql.Char, configFile.queryDb)
				.input("unique_key", sql.Char, uniqueKey)
				.query("insert into im_info \
						([access_dt],[access_ttl],[archive_dt],[archived_flag],[batch_id],[clsid],[create_dt],[description],[discard_dt],[doc_id] \
						,[doc_type],[form_id],[icr_flag],[page_count],[status],[refresh_dt],[user_id],[viewer],[storage_object],[email_type] \
						,[email_address],[attach_id],[client_name],[unique_key]) \
					values (@access_dt, 0, @archive_dt, 'N', 0, @clsid, @create_dt, @description, @discard_dt, (select max(doc_id)+1 from im_info), \
						NULL, NULL, NULL, 1, NULL, @refresh_date, @user_id, 2, @storage_object, null \
						null, null, @client_name, @unique_key", (err) =>{
						if(err) console.log(err);

						new sql.Request(transaction)
							.input("object_id", sql.Char, "455C061B-A9A0-4A67-A45C-194F0950732E")
							.input("object_instance", sql.VarChar, "eFinancePLUS.Documents.Storage.FinanceStorage")
							.input("object_description", sql.VarChar, "Finance Storage Object")
							.input("object_assembly", sql.varchar, "eFinancePLUS.Documents.dll")
							.input("client_name", sql.Char, configFile.queryDb)
							.input("unique_key", sql.Char, uniqueKey)
							.query("insert into im_objects \
								([object_id],[object_instance],[object_description],[object_assembly] \
								,[object_type],[status_cd],[client_name],[unique_key]) \
								values \
								(@object_id, @object_instance, @object_description, @object_assembly, \
								'S', 'A', @client_name, @unique_key)", (err) =>{
									if(err) console.log(err);
									new sql.Request(transaction)
										.input("clsid", sql.Char, fileType)
										.input("doc_id", sql.Int, docId)
										.input("doc_size", sql.Int, attachment.size)
										.input("document", sql.Image, attachment.buffer)
										.input("client_name", sql.Char, configFile.queryDb)
										.input("unique_key", sql.Char, uniqueKey)
										.query("insert into im_page values(@clsid, @doc_id, 1, @document, @client_name, @unique_key", err =>{
											//if(err) console.log(err);
											transaction.commit(err =>{
												console.log(err);
											});
										});
								});
					});
			transaction.on("rollback", function(){
				rollback = true;
			});
		});
		

		sql.connect(config).then(pool =>{
			return pool.request()
				.input("access_dt", sql.DateTime, now)
				.input("archive_dt", sql.DateTime, now)
				.input("clsid", sql.Char, fileType)
				.input("create_dt", sql.DateTime, now)
				.input("description", sql.VarChar, description || "Generic description")
				.input("discard_dt", sql.DateTime, now)
				.input("refresh_dt", sql.DateTime, now)
				.input("user_id", sql.Char, userId)
				.input("storage_object", sql.Char, "455C061B-A9A0-4A67-A45C-194F0950732E")
				.input("client_name", sql.Char, configFile.queryDb)
				.input("unique_key", sql.Char, uniqueKey)
				.query("insert into im_info \
							([access_dt],[access_ttl],[archive_dt],[archived_flag],[batch_id],[clsid],[create_dt],[description],[discard_dt],[doc_id] \
							,[doc_type],[form_id],[icr_flag],[page_count],[status],[refresh_dt],[user_id],[viewer],[storage_object],[email_type] \
							,[email_address],[attach_id],[client_name],[unique_key]) \
						values (@access_dt, 0, @archive_dt, 'N', 0, @clsid, @create_dt, @description, @discard_dt, (select max(doc_id)+1 from im_info), \
							NULL, NULL, NULL, 1, NULL, @refresh_date, @user_id, 2, @storage_object, null \
							null, null, @client_name, @unique_key");
		}).then(result => {
			console.log(result);
		}).catch(err => {
			console.log(err);
		});
	} catch (ex){
		console.log(ex);
	}finally{
		sql.close();
	}
};

// Get the attachment types for a database
app.get("/PS/categories", function(req, res){
	try{
		sql.connect(config, function(err){
			if(err) console.log(err);
			var request = new sql.Request();
			request.query("select attach_id from im_attach_mstr where client_name = '" + configFile.db.queryDb + "'", function(err, result){
				if(err){
					console.log(err);
					res.send(err);
				} else{
					result.recordset.forEach(function(element){
						element.attach_id = element.attach_id.trim();
					});
					res.json(result.recordset);
				}
				sql.close();
			});			
		});
	} catch(ex) {
		console.log(ex);
	}
});

// Get attachments for a type?
app.get("/PS/attach", function(req, res){

});

// Post an attachment
app.post("/PS/attach", upload.single("attachment"), function(req, res){
	// if(!req.params.attachId || !req.params.attachment || !req.params.fileType || req.params.userId){
	// 	res.send(418);
	// } else{
	// 	res.send(102);
	// }
	insertAttachment(req.params.attachId, req.file, req.params.description, req.params.userId);
	res.send(102);	
});

app.get("/PS", function(req, res){
	res.send("What are you doing here?");
});

app.get("*", function(req, res){
	res.send("Howdy");
});

app.listen(process.env.PORT || 3000, function(){
	console.log("Listening on port 3000");
});