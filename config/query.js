var connection = require('../lib/dbconn.js');

var connectionQuery = {
    getSymptomsIds : function(req, callback) {
        console.log('Get symptomsIds from query.')
        connection.query("select * from symptoms where name in (?)", [req.body.symptoms], function(err, rows){
            if(err && err != "") {
                console.log(err);
                return callback(err);
            }
            //if(!rows.length){ return done(null, false, req.flash('message','Invalid username or password.')); }
            var symptomsIds = "[";
            for(var i=0;i<rows.length;i++) {
                if(i!=0) {
                    symptomsIds = symptomsIds + ',';
                }
                symptomsIds = symptomsIds + '\"' + rows[i].id + '\"';
            }
            symptomsIds += "]";
            return callback(null, symptomsIds);
        });
    },
    getNearestDoctor: function(req, callback) {
        connection.query("select * from doctors as d join specdocmapping as sdm on sdm.docId = d.docId join specapimed as s on s.apiMedId = sdm.apiMedSpecId where apiMedSpec = ? order by (lon-?)*(lon-?) + (lat-?)*(lat-?) ASC", [req.body.specialistRequired,req.body.lon,req.body.lon,req.body.lat,req.body.lat], function(err, rows){
            if(err && err != "") {
                console.log(err);
                return callback(err);
            }
            return callback(null, rows[0]);
        });
    },
    getTestDetails: function(req, callback) {
        connection.query("select * from tests where name = ?",[req.body.testReq], function(err, rows){
            if(err && err != "") {
                console.log(err);
                return callback(err);
            }
            return callback(null, rows[0]);
        });
    }
    
}

module.exports = connectionQuery;