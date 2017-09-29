'use strict';

var usernames = ['bamtech1', 'bamtech2', 'bamtech3'];
var passwords = ['b1pass', 'b2pass', 'b3pass'];

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  port: "3306",
  password: "appchat",
  database: "BAMTECHChat"
});

con.connect(function(err) {
  if (err) throw err;
});

var sql = "CREATE TABLE `BAMTECHChat`.`Users` (`id` INT NOT NULL AUTO_INCREMENT,`username` VARCHAR(45) NOT NULL,`password` VARCHAR(45) NOT NULL,PRIMARY KEY (`id`),UNIQUE INDEX `id_UNIQUE` (`id` ASC),UNIQUE INDEX `username_UNIQUE` (`username` ASC));";
con.query(sql, function(err, result, fields){
	if(err){
		console.log(err);
	}
	console.log(result);
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