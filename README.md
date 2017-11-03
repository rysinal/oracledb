# oracledb
oracledb Connection Pool demo

oracledb 连接池 使用demo示例

## linux 或 win 安装 oracledb

请移步 [nodejs 使用官方oracledb库连接数据库 教程](https://www.cnblogs.com/rysinal/p/7779055.html)

## 使用连接池

当应用程序短时间使用大量连接时，Oracle建议使用连接池来提高效率。
每个池可以包含一个或多个连接。
池可以根据需要增长或缩小。
每个节点oracledb进程可以使用一个或多个本地连接池。

以下摘自官方关于连接池使用的说明：

### <a name="connpooling"></a> Connection Pooling

Pool expansion happens when the following are all true:
(i) [`getConnection()`](#getconnectionpool) is called and (ii) all the
currently established connections in the pool are "checked out" by
previous `getConnection()` calls and are in-use by the application,
and (iii) the number of those connections is less than the pool's
`poolMax` setting.

A pool is created by calling the
[`oracledb.createPool()`](#createpool) method. Internally
[OCI Session Pooling](https://docs.oracle.com/database/122/LNOCI/oci-programming-advanced-topics.htm#LNOCI16617)
is used.

A connection is returned with the
[`pool.getConnection()`](#getconnectionpool) function:

```javascript
var oracledb = require('oracledb');

oracledb.createPool (
  {
    user          : "hr"
    password      : "welcome"
    connectString : "localhost/XE"
  },
  function(err, pool)
  {
    pool.getConnection (
      function(err, connection)
      {
      . . .  // use connection
      });
  });
```

Connections should be released with [`connection.close()`](#connectionclose) when no
longer needed:

```javascript
    connection.close(
      function(err)
      {
        if (err) { console.error(err.message); }
      });
```

Make sure to release connections in all codes paths, include error
handlers.

After an application finishes using a connection pool, it should
release all connections and terminate the connection pool by calling
the [`pool.close()`](#poolclose) method.

The growth characteristics of a connection pool are determined by the
Pool attributes [`poolIncrement`](#proppoolpoolincrement),
[`poolMax`](#proppoolpoolmax), [`poolMin`](#proppoolpoolmin) and
[`poolTimeout`](#proppoolpooltimeout).  Note that when External
Authentication is used, the pool behavior is different, see
[External Authentication](#extauth).

The Oracle Real-World Performance Group's general recommendation for
client connection pools is for the minimum and maximum number of
connections to be the same.  This avoids connection storms which can
decrease throughput.  They also recommend sizing connection pools so
that the sum of all connections from all applications accessing a
database gives 1-10 connections per database server CPU core.
See
[About Optimizing Real-World Performance with Static Connection Pools](http://docs.oracle.com/cd/E82638_01/JJUCP/optimizing-real-world-performance.htm#JJUCP-GUID-BC09F045-5D80-4AF5-93F5-FEF0531E0E1D).

The Pool attribute [`stmtCacheSize`](#propconnstmtcachesize) can be
used to set the statement cache size used by connections in the pool,
see [Statement Caching](#stmtcache).

#### <a name="connpoolcache"></a> 8.3.1 Connection Pool Cache

Node-oracledb has an internal connection pool cache which can be used
to facilitate sharing pools across modules and simplify getting
connections.  At creation time, a pool can be given a named alias.
The alias can later be used to retrieve the related pool object for
use.

Methods that can affect or use the connection pool cache include:
- [oracledb.createPool()](#createpool) - can add a pool to the cache
- [oracledb.getPool()](#getpool) - retrieves a pool from the cache (synchronous)
- [oracledb.getConnection()](#getconnectiondb) - can use a pool in the cache to retrieve connections
- [pool.close()](#poolclose) - automatically removes the pool from the cache if needed

Pools are added to the cache if
a [`poolAlias`](#createpoolpoolattrspoolalias) property is provided in
the [`poolAttrs`](#createpoolpoolattrs) object when invoking
`oracledb.createPool()`.  There can be multiple pools in the cache if
each pool is created with a unique alias.

If a pool is created without providing a pool alias, and a pool with
an alias of 'default' is not in the cache already, this pool will be
cached using the alias 'default'.  This pool is used by default in
methods that utilize the connection pool cache.  If subsequent pools
are created without explicit aliases, they will be not stored in the
pool cache.

##### Examples using the default pool

Assuming the connection pool cache is empty, the following will create a new pool
and cache it using the pool alias 'default':
```javascript
var oracledb = require('oracledb');

oracledb.createPool (
  {
    user: 'hr',
    password: 'welcome',
    connectString: 'localhost/XE'
  },
  function(err, pool) {
    console.log(pool.poolAlias); // 'default'
  }
);
```

Note that `createPool()` is not synchronous.

Once cached, the default pool can be retrieved using [oracledb.getPool()](#getpool) without
passing the `poolAlias` parameter:

```javascript
var oracledb = require('oracledb');
var pool = oracledb.getPool();

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

This specific sequence can be simplified by using the shortcut to
[oracledb.getConnection()](#getconnectiondb) that returns a connection
from a pool:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection(function(err, conn) {
  . . . // Use connection from the previously created 'default' pool and then release it
});
```

##### Examples using multiple pools

If the application needs to use more than one pool at a time, unique pool aliases
can be used when creating the pools:

```javascript
var oracledb = require('oracledb');

var hrPoolPromise = oracledb.createPool({
  poolAlias: 'hrpool',
  users: 'hr',
  password: 'welcome',
  connectString: 'localhost/XE'
});

var shPoolPromise = oracledb.createPool({
  poolAlias: 'shpool',
  user: 'sh',
  password: 'welcome',
  connectString: 'localhost/XE'
});

Promise.all([hrPoolPromise, shPoolPromise])
  .then(function(pools) {
    console.log(pools[0].poolAlias); // 'hrpool'
    console.log(pools[1].poolAlias); // 'shpool'
  })
  .catch(function(err) {
    . . . // handle error
  })
```

To use the methods or attributes of a pool in the cache, a pool can be retrieved
from the cache by passing its pool alias to [oracledb.getPool()](#getpool):

```javascript
var oracledb = require('oracledb');
var pool = oracledb.getPool('hrpool'); // or 'shpool'

pool.getConnection(function(err, conn) {
  . . . // Use connection from the pool and then release it
});
```

The [oracledb.getConnection()](#getconnectiondb) shortcut can also be used with a pool alias:

```javascript
var oracledb = require('oracledb');

oracledb.getConnection('hrpool', function(err, conn) { // or 'shpool'
  . . . // Use connection from the pool and then release it
});
```

#### <a name="connpoolqueue"></a> 8.3.2 Connection Pool Queue

If the application has called `getConnection()` so that all
connections in the pool are in use, and
further [`pool.getConnection()`](#getconnectionpool) requests
(or [`oracledb.getConnection()`](#getconnectiondb) calls that use a
pool) are made, then each new request will be queued until an in-use
connection is released back to the pool
with [`connection.close()`](#connectionclose).  If `poolMax` has not
been reached, then connections can be satisfied and are not queued.

The pool queue can be disabled by setting the pool property
[`queueRequests`](#propdbqueuerequests) to *false*.  When the queue is
disabled, `getConnection()` requests to a pool that cannot immediately be
satisfied will return an error.

The amount of time that a queued request will wait for a free
connection can be configured with [queueTimeout](#propdbqueuetimeout).
When connections are timed out of the queue, they will return the
error *NJS-040: connection request timeout* to the application.

Internally the queue is implemented in node-oracledb's JavaScript top
level.  A queued connection request is dequeued and passed down to
node-oracledb's underlying C++ connection pool when an active
connection is [released](#connectionclose), and the number of
connections in use drops below the value of
[`poolMax`](#proppoolpoolmax).

#### <a name="connpoolmonitor"></a> 8.3.3 Connection Pool Monitoring and Throughput

Connection pool usage should be monitored to choose the appropriate
connection pool settings for your workload.

The Pool attributes [`connectionsInUse`](#proppoolconnectionsinuse)
and [`connectionsOpen`](#proppoolconnectionsopen) provide basic
information about an active pool.

When using a [pool queue](#propdbqueuerequests), further statistics
can be enabled by setting the [`createPool()`](#createpool)
`poolAttrs` parameter `_enableStats` to *true*.  Statistics
can be output to the console by calling the `pool._logStats()`
method.  The underscore prefixes indicate that these are private
attributes and methods.  **This interface may be altered or
enhanced in the future**.

To enable recording of queue statistics:

```javascript
oracledb.createPool (
  {
    queueRequests : true,  // default is true
    _enableStats  : true,   // default is false
    user          : "hr",
    password      : "welcome",
    connectString : "localhost/XE"
  },
  function(err, pool)
  {
  . . .
```

The application can later, on some developer-chosen event, display the
current statistics to the console by calling:

```javascript
pool._logStats();
```

The current implementation of `_logStats()` displays pool queue
statistics, pool settings, and related environment variables.

##### Statistics

The statistics displayed by `_logStats()` in this release are:

Statistic                 | Description
--------------------------|-------------
total up time             | The number of milliseconds this pool has been running.
total connection requests | Number of `getConnection()` requests made by the application to this pool.
total requests enqueued   | Number of `getConnection()` requests that could not be immediately satisfied because every connection in this pool was already being used, and so they had to be queued waiting for the application to return an in-use connection to the pool.
total requests dequeued   | Number of `getConnection()` requests that were dequeued when a connection in this pool became available for use.
total requests failed     | Number of `getConnection()` requests that invoked the underlying C++ `getConnection()` callback with an error state. Does not include queue request timeout errors.
total request timeouts    | Number of queued `getConnection()` requests that were timed out after they had spent [queueTimeout](#propdbqueuetimeout) or longer in this pool's queue.
max queue length          | Maximum number of `getConnection()` requests that were ever waiting at one time.
sum of time in queue      | The sum of the time (milliseconds) that dequeued requests spent in the queue.
min time in queue         | The minimum time (milliseconds) that any dequeued request spent in the queue.
max time in queue         | The maximum time (milliseconds) that any dequeued request spent in the queue.
avg time in queue         | The average time (milliseconds) that dequeued requests spent in the queue.
pool connections in use   | The number of connections from this pool that `getConnection()` returned successfully to the application and have not yet been released back to the pool.
pool connections open     | The number of connections in this pool that have been established to the database.

Note that for efficiency, the minimum, maximum, average, and sum of
times in the queue are calculated when requests are removed from the
queue.  They do not take into account times for connection requests
still waiting in the queue.

##### Attribute Values

The `_logStats()` method also shows attribute values in effect for the pool:

Attribute                                   |
--------------------------------------------|
[`poolAlias`](#createpoolpoolattrspoolalias)|
[`queueRequests`](#propdbqueuerequests)     |
[`queueTimeout`](#propdbqueuetimeout)       |
[`poolMin`](#propdbpoolmin)                 |
[`poolMax`](#propdbpoolmax)                 |
[`poolIncrement`](#propdbpoolincrement)     |
[`poolTimeout`](#propdbpooltimeout)         |
[`poolPingInterval`](#propdbpoolpinginterval) |
[`stmtCacheSize`](#propdbstmtcachesize)     |

##### Related Environment Variables

One related environment variable is is shown by `_logStats()`:

Environment Variable                                 | Description
-----------------------------------------------------|-------------
[`process.env.UV_THREADPOOL_SIZE`](#numberofthreads) | The number of worker threads for this process.  Note, if this variable is set after the thread pool starts it will be ignored and the thread pool will still be restricted to the default size of 4.

#### <a name="connpoolpinging"></a> 8.3.4 Connection Pool Pinging

Node-oracledb can 'ping' connections returned from pooled
`getConnection()` calls to check for their aliveness.  The frequency
of pinging can be controlled with
the [`oracledb.poolPingInterval`](#propdbpoolpinginterval) property or
during [pool creation](#createpool).  The default ping interval is
`60` seconds.

Without pinging, when connections are idle in a connection pool, there
is the possibility that a network or Database instance failure makes
those connections unusable.  A `getConnection()` call will happily
return a connection from the pool but an error will occur when the
application later uses the connection.

Note that explicit pinging is unnecessary and is not performed when
node-oracledb is built with version 12.2 of the underlying Oracle
client library.  This has its own lightweight, always-enabled
connection check.  It will return a valid connection to the
node-oracledb driver, which in turn returns it via `getConnection()`.
The value of `poolPingInterval` is ignored.

With Oracle client 12.1 and earlier, when a
pool [`getConnection()`](#getconnectionpool) is called and the
connection has been idle in the pool (not "checked out" to the
application by `getConnection()`) for the specified `poolPingInterval`
then an internal "ping" will be performed first.  At the cost of some
overhead for infrequently accessed connection pools, connection
pinging improves the chance a pooled connection is valid when it is
first used because identified un-unusable connections will not be
returned to the application by `getConnection()`.  For active
applications that are getting and releasing connections rapidly, the
connections will generally not have been idle longer than
`poolPingInterval` so no pings will be performed and there will be no
overhead.

If a ping detects the connection is invalid, for example if the
network had disconnected, then node-oracledb internally drops the
unusable connection and obtains another from the pool.  This second
connection may also need a ping.  This ping-and-release process may be
repeated until:

- an existing connection that doesn't qualify for pinging is obtained. The `getConnection()` call returns this to the application.  Note it is not guaranteed to  be usable
- a new, usable connection is opened. This is returned to the application
- a number of unsuccessful attempts to find a valid connection have been made, after which an error is returned to the application

Applications should continue to do appropriate error checking when
using connections in case they have become invalid in the time since
`getConnection()` was called.  This error checking will also protect
against cases where there was a network outage but a connection was
idle in the pool for less than `poolPingInterval` seconds and so
`getConnection()` did not ping.

In all cases, when a bad connection is [released](#connectionclose)
back to the pool, the connection is automatically destroyed.  This
allows a valid connection to be opened by some subsequent
`getConnection()` call.

You can tune `poolPingInterval` to meet your quality of service
requirements.


