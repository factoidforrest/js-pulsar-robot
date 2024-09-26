#!/bin/bash

# Start Unison synchronization for auv-nats
unison auv-nats-sync

# If Unison exits, restart it after a short delay
while true; do
    sleep 5
    unison auv-nats-sync
done