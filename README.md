Initial Cursor Prompt:

```
I would like to make a heads up display for my car. To start I would like the following. I believe I need 3 Docker containers running. One will be for interfacing with the car via it's OBD2 port and getting data. The other will be an MQTT broker. The last one will host a web app that displays the actual data. 

For the first container. I want to run a python application that reads from an OBD2 to serial connector. It should get accelerator position (if that is possible), fuel level, gear, RPM's and brake position (if that is possible). It should publish MQTT messages at a rate of 10Hz for each .

For the app container, I want to host an app that I can hit from localhost:8888. It should receive the MQTT messages and use the data to display on the screen. It should be a single page with an RPM gauge, an accelerator pedal (or vertical bar with percentage of max) and a brake pedal.

I would like to launch everything with docker-compose.

Is there anything else you need from me?
```
