var mysql        = require('mysql');
var connection   = mysql.createConnection({
  supportBigNumbers: true,
  bigNumberStrings: true,
  host     : "",
  user     : "",
  password : "",
  database : ""
});
//mysql -h arceusdb.c4ywf6isqmvs.us-west-2.rds.amazonaws.com -P 3306 -u root -p
module.exports = connection;
