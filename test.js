st = require('./scheduletask.js');

if (process.argv.length < 3) {
	console.log('USAGE node test [start/stop]');
	return;
}

if (process.argv[2] == 'start') {
	console.log('starting');
	st.start(null, 'i-xxxxxxxx');
}
else if (process.argv[2] == 'stop') {
	st.stop(null, 'i-xxxxxxxx');
}
