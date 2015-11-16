#! /bin/bash

rm -f scheduletask-*.zip
now=$(date +"%Y%m%d%H%M%S")
find \
	scheduletask.js \
	node_modules \
| grep -v "/\." | zip scheduletask-$now.zip -@
