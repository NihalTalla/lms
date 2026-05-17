#!/bin/bash

ulimit -t 10
ulimit -v 131072
ulimit -f 50
ulimit -n 16
ulimit -u 16

exec "$@"
