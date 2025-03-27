import obd
import paho.mqtt.client as mqtt
import time
import json
import os

# MQTT Configuration
MQTT_BROKER = os.getenv('MQTT_BROKER', 'mqtt')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_TOPIC = 'car/data'
MQTT_COMMAND_TOPIC = 'car/command'

# OBD2 Commands we want to monitor
COMMANDS = {
    'rpm': obd.commands.RPM,
    'fuel_level': obd.commands.FUEL_LEVEL,
    'accelerator_position': obd.commands.RELATIVE_THROTTLE_POS,
    'dtcs': obd.commands.GET_DTC,  # Add DTC monitoring
}

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with result code {rc}")
    client.subscribe(MQTT_COMMAND_TOPIC)

def on_message(client, userdata, msg):
    try:
        command = json.loads(msg.payload.decode())
        if command.get('command') == 'clear_dtcs':
            print("Clearing DTCs...")
            connection = userdata.get('obd_connection')
            if connection and connection.is_connected():
                response = connection.query(obd.commands.CLEAR_DTC)
                print(f"DTCs cleared: {response.value}")
            else:
                print("No active OBD connection available")
    except Exception as e:
        print(f"Error handling command: {e}")

def main():
    # Connect to OBD2 adapter first
    connection = obd.OBD()
    
    if not connection.is_connected():
        print("Failed to connect to OBD2 adapter")
        return

    print("Connected to OBD2 adapter")

    # Connect to MQTT broker
    client = mqtt.Client(userdata={'obd_connection': connection})
    client.on_connect = on_connect
    client.on_message = on_message
    print(MQTT_BROKER)
    print(MQTT_PORT)
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()

    while True:
        data = {}
        
        # Collect data for each command
        for key, cmd in COMMANDS.items():
            try:
                response = connection.query(cmd)
                if response.is_null():
                    data[key] = None
                else:
                    if key == 'dtcs':
                        # Convert DTCs to list of strings
                        data[key] = [str(dtc) for dtc in response.value]
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