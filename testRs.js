st = require('./scheduletask.js');

if (process.argv.length < 3) {
	console.log('USAGE node test [start/dns/stop]');
	return;
}

var ctx = JSON.stringify({
	"ClusterId":           "xxxxxxxx",
	"SnapshotId":          "xxxxxxxx",
	"AvailabilityZone":    "ap-northeast-1c",
	"VpcSecurityGroupIds": ["sg-xxxxxxxx" /* redshift-sg */],
	"HostedZoneId":        "XXXXXXXXXXXXX"
}); // end of ctx
if (process.argv[2] == 'start') {
	console.log('starting');
	st.startRedshift(null, ctx);
}
else if (process.argv[2] == 'dns') {
	console.log('updating dns');
	st.udpateRedshiftDnsCname(null, ctx);
}
else if (process.argv[2] == 'stop') {
	console.log('stopping');
	st.stopRedshift(null, ctx);
}

