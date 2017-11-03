/**
 * 公用配置文件
 */
var CommonConfig = {
    /**
     * oracle连接池,可配置多个
     */
    db:{
        oraclePool: {
            user          : '****',
            password      : '****',
            connectString : 'IP:PORT/SCHEMA'
        }
    }
};

module.exports = CommonConfig;
