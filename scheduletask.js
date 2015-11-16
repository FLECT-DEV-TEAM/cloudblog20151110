var util  = require('util');
var async = require('async');
var _     = require('underscore');
var AWS   = require('aws-sdk');

TOKYO_REGION = {region: 'ap-northeast-1'};
EC2      = new AWS.EC2(TOKYO_REGION);
LAMBDA   = new AWS.Lambda(TOKYO_REGION);
REDSHIFT = new AWS.Redshift(TOKYO_REGION);
ROUTE53  = new AWS.Route53(TOKYO_REGION);

function getFunctionDescription(context, cb) {
	if (_.isString(context)) {
		return cb(null, context);
	}
	LAMBDA.getFunction(
		{
			FunctionName: context.functionName
		},
		function(err, data) {
			if (err) {
				cb(err);
				return;
			}
			
			var desc = data.Configuration.Description;
			
			cb(null, desc);
			return;
		} // end of callback
	); // end of getFunction
} // end of getFunctionDescription



function operateInstance(
	context,
	fnOperateInstance, 
	strOp,
	cb0
) {
	var lFn = [
		function (cb) {
			getFunctionDescription(
				context, 
				function(err, data) {
					return cb(err, data);
				}
			);	
		},
		function (desc, cb) {
			var lI = JSON.parse(desc).Instances;
			var params = {
				DryRun: false,
				InstanceIds: lI 
			};
			//fnOperateInstance(
			fnOperateInstance.call(
				EC2,
				params,
				function (err, data) {
					cb(err, lI);
				}
			); // end of startInstances
		},
		function(lI, cb) {
			var logMsg = JSON.stringify(lI) + strOp;
			console.log(logMsg);
			cb(null);
		}
	]; // end of lFn

	async.waterfall(
		lFn,
		function(err) {
			if (err) {
				x('ERROR:' + err);
			}
			console.log('FINISH');
			cb0(err);
		}
	); // end of waterfall
	
} // end of startStopInstances

exports.startEc2 = function(event, context) {
	try {
		operateInstance(
			context,
			EC2.startInstances,
			'STARTED',
			function(err) {
				if (_.isObject(context)) {
					context.succeed();
				}
			}
		);
	}
	catch (ex) {
		x('exception', ex);
	}
} // end of event.startEc2

exports.stopEc2 = function(event, context) {
	try {
		operateInstance(
			context,
			EC2.stopInstances,
			'STOPPED',
			function(err) {
				if (_.isObject(context)) {
					context.succeed();
				}
			}
		);
	}
	catch (ex) {
		x('exception', ex);
	}
} // end of event.stopEc2


exports.startRedshift = function(event, context) {
try {
	var lFn = [
		function(cb) {
			getFunctionDescription(
				context, 
				function(err, data) {
					if (err) {
						return cb(err);
					}
					var ctx = JSON.parse(data);
					return cb(null, ctx);
				}
			);	
		},
		function(ctx, cb) {
console.log('restoring cluster...');
			var params = {
				ClusterIdentifier:      ctx.ClusterId,
				SnapshotIdentifier:     ctx.SnapshotId,
				AvailabilityZone:       ctx.AvailabilityZone,
				ClusterSubnetGroupName: 'default',
				VpcSecurityGroupIds:    ctx.VpcSecurityGroupIds,
				PubliclyAccessible:     false,
				AutomatedSnapshotRetentionPeriod: 0
			};
			
			REDSHIFT.restoreFromClusterSnapshot(
				params, 
				function(err, data) {
					if (err) {
						return cb(err);
					}
					cb(null, ctx);
				}
			); // end of restoreFromClusterSnapshot
		}
	]; // end of lFn

	async.waterfall(
		lFn,
		function(err) {
			if (err) {
				x('ERROR:' + err);
			}
			console.log('FINISH');
			if (_.isObject(context)) {
				context.succeed();
			}
		}
	); // end of waterfall
}
catch (ex) { x('exception', ex); }
} // end of startRedshift

exports.udpateRedshiftDnsCname = function(event, context) {
try {
	var lFn = [
		function(cb) {
			getFunctionDescription(
				context, 
				function(err, data) {
					if (err) {
						return cb(err);
					}
					var ctx = JSON.parse(data);
					return cb(null, ctx);
				}
			);	
		},
		function(ctx, cb) {
			var params = {
				ClusterIdentifier: ctx.ClusterId
			};
			REDSHIFT.describeClusters(
				params,
				function(err, data) {
					if (err) {
						return cb(err);
					}
					var clusters = data.Clusters;
					if (clusters.length <= 0) {
						return cb('cluster ' + ctx.ClusterId + ' is not found');
					}
					var c = clusters[0];
					if (c.ClusterStatus != 'available') {
						return cb('cluster ' + ctx.ClusterId + ' is not available (' + c.ClusterStatus + ')');
					}
					
					ctx.Endpoint = c.Endpoint.Address;
					cb(null, ctx);
				}
			); // end of describeClusters
		},
		function(ctx, cb) {
console.log('registering internal DNS...');
			var params = {
				HostedZoneId: ctx.HostedZoneId,
				ChangeBatch: {
					Changes: [{
						Action: 'UPSERT',
						ResourceRecordSet: {
							Name: 'redshift.internal',
							Type: 'CNAME',
							TTL: 60,
							ResourceRecords: [{Value: ctx.Endpoint}]
						}
					}] // end of Changes
				} // end of ChangeBatch
			};
			ROUTE53.changeResourceRecordSets(
				params,
				function(err, data) {
					if (err) {
						return cb(err);
					}
					cb(null, ctx);
				}
			); // end of changeResourceRecordSets
		}
	]; // end of lFn

	async.waterfall(
		lFn,
		function(err) {
			if (err) {
				x('ERROR:' + err);
			}
			console.log('FINISH');
			if (_.isObject(context)) {
				context.succeed();
			}
		}
	); // end of waterfall
}
catch (ex) { x('exception', ex); }
} // end of startRedshift2

exports.stopRedshift = function(event, context) {
try {
	var lFn = [
		function(cb) {
			getFunctionDescription(
				context, 
				function(err, data) {
					if (err) {
						return cb(err);
					}
					var ctx = JSON.parse(data);
					return cb(null, ctx);
				}
			);	
		},
		function(ctx, cb) {
console.log('deleting existing snapshot...');
			var params = {
				SnapshotClusterIdentifier: ctx.ClusterId,
				SnapshotIdentifier:        ctx.SnapshotId
			};
			
			REDSHIFT.deleteClusterSnapshot(
				params, 
				function(err, data) {
					cb(null, ctx);
				}
			); // end of restoreFromClusterSnapshot
		},
		function(ctx, cb) {
console.log('shutdown cluster into final snapshot...');
			var params = {
				ClusterIdentifier:              ctx.ClusterId,
				FinalClusterSnapshotIdentifier: ctx.SnapshotId
			};
			
			REDSHIFT.deleteCluster(
				params, 
				function(err, data) {
					if (err) {
						return cb(err);
					}
					cb(null, ctx);
				}
			); // end of deleteCluster
		}		
	]; // end of lFn

	async.waterfall(
		lFn,
		function(err) {
			if (err) {
				x('ERROR:' + err);
			}
			console.log('FINISH');
			if (_.isObject(context)) {
				context.succeed();
			}
		}
	); // end of waterfall
}
catch (ex) { x('exception', ex); }
} // end of event.stopEc2


function x(msg, obj) {
	var s = msg;
	if (obj) {
		var strObj = util.inspect(obj, {depth: null});
		s += (': ' + strObj);
	}
	console.log(s);
} // end of x