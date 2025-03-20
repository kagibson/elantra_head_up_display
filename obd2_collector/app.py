import obd
import paho.mqtt.client as mqtt
import time
import json
import os

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'mqtt')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = 'car/data'

# OBD2 Commands we want to monitor
COMMANDS = {
    'rpm': obd.commands.RPM,
    'fuel_level': obd.commands.FUEL_LEVEL,
    'accelerator_pos': obd.commands.ACCELERATOR_POS_D,
    'brake_position': obd.commands.BRAKE_POSITION,
    'gear': obd.commands.CURRENT_GEAR
}

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")

def main():
    # Connect to MQTT broker
    client = mqtt.Client()
    client.on_connect = on_connect
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    # Connect to OBD2 adapter
    connection = obd.OBD()
    
    if not connection.is_connected():
        print("Failed to connect to OBD2 adapter")
        return

    print("Connected to OBD2 adapter")

    while True:
        data = {}
        
        # Collect data for each command
        for key, cmd in COMMANDS.items():
            try:
                response = connection.query(cmd)
                if response.is_null():
                    data[key] = None
                else:
                    data[key] = response.value.magnitude
            except Exception as e:
                print(f"Error reading {key}: {e}")
                data[key] = None

        # Publish data to MQTT
        client.publish(MQTT_TOPIC, json.dumps(data))
        
        # Wait for 100ms (10Hz)
        time.sleep(0.1)

if __name__ == "__main__":
    main() 