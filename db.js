/**
 * 数据库连接
 * @type {exports}
 */
var config = require('./config');
var oracledb = require('oracledb');
var db = {};

//创建连接池，默认连接池名称  default
db.oraclePool = oracledb.createPool(config.db.oraclePool, function(err, pool) {
    if(err) return console.error(err.message);
    console.log(pool.poolAlias); // 'default'
});

module.exports = db;
