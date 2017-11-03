var oracledb = require('oracledb');
var oraclePool;

/**
 * oracle数据服务模块
 *
 * linux 和 win 安装oracledb 请参考 https://www.cnblogs.com/rysinal/p/7779055.html
 *
 * @constructor
 */
function OracleService() {

}

/**
 * 获取连接池（默认default）
 */
OracleService.startGetPool = function () {
    oraclePool = oracledb.getPool();
};

//是否开启调试日志模式
OracleService.debug = true;


/**
 * oracle数据库查询
 * @param sql
 * @param callback
 */
OracleService.exec = function (sql, callback) {
    this.startGetPool();
    if(OracleService.debug) {
        console.log('[' + new Date() + '][SQL] ' + sql);
    }
    oraclePool.getConnection(function(err, conn) {
        if (err) {
            console.error("Oracle getConn fail: ==>", err, "<==");
            conn.close(function (err) {
                if (err) console.error(err.message);
            });
            return callback(err);
        }
        conn.execute(sql, function(err, result) {
            if (err) {
                console.error(err.message);
                doRelease(conn);
                return callback(err);
            }
            if(OracleService.debug) {
                console.log('[' + new Date() + '][Res] ' + JSON.stringify(result.rows));
            }
            //打印返回的表结构
            // console.log(result.metaData);
            callback(null, result.rows);
        });
    });
}

/**
 * 释放连接
 * @param connection
 */
function doRelease(connection) {
    connection.close(function(err) {
        if (err) {
            console.error(err.message);
        }
    });
}

module.exports = OracleService;
