'use strict';

var usernames = ['bamtech1', 'bamtech2', 'bamtech3'];
var passwords = ['b1pass', 'b2pass', 'b3pass'];

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: "3306",
  password: "12jaja12",
  database: "BAMTECHChat"
});

con.connect(function(err) {
  if (err) throw err;
});
  
for(var i = 0; i < usernames.length; i++){
	var sql = "INSERT INTO Users (username, password) VALUES ('" + usernames[i] + "', '" + passwords[i] + "');";
	con.query(sql, function(err, result, fields){
		if(err){
			console.log(err);
			return;
		}
		console.log(result);
	});
}